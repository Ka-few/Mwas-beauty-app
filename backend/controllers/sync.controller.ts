import { Request, Response } from 'express';
import { initializeDB } from '../db/database';
import axios from 'axios';

// Tables to sync in dependency order
const SYNC_TABLES = [
    'users',
    'clients',
    'stylists',
    'services',
    'products',
    'services',
    'products',
    // 'branches', // Don't sync branches definition yet
    'consumables',
    'consumables',
    'bookings',
    'booking_services',
    'sales',
    'sale_services',
    'sale_products',
    'expenses',
    'consumable_usage'
];

// --- SERVER SIDE HANDLERS (OWNER PC) ---

export async function pushData(req: Request, res: Response) {
    // Branch sending data to us
    const { branch_id, changes } = req.body;
    const db = await initializeDB();

    console.log(`[SYNC] Received PUSH from branch: ${branch_id}`);

    try {
        await db.transaction(async (tx: any) => {
            // Log the sync attempt
            await tx.run(
                'INSERT INTO sync_logs (branch_id, direction, status, details) VALUES (?, ?, ?, ?)',
                branch_id, 'PUSH', 'PARTIAL', 'Started processing push'
            );

            let processedCount = 0;

            for (const table of SYNC_TABLES) {
                if (!changes[table] || !Array.isArray(changes[table])) continue;

                for (const record of changes[table]) {
                    // 1. Check if record exists by record_id
                    const existing = await tx.get(`SELECT * FROM ${table} WHERE record_id = ?`, record.record_id);

                    if (existing) {
                        // Conflict Resolution: Last Modified Wins
                        // If incoming record is newer, update.
                        const incomingDate = new Date(record.last_modified).getTime();
                        const existingDate = new Date(existing.last_modified).getTime();

                        if (incomingDate > existingDate) {
                            // Update
                            // We need to construct the UPDATE query dynamically
                            const keys = Object.keys(record).filter(k => k !== 'id'); // Don't update local PK 'id'
                            const setters = keys.map(k => `${k} = ?`).join(', ');
                            const values = keys.map(k => record[k]);

                            await tx.run(`UPDATE ${table} SET ${setters} WHERE record_id = ?`, ...values, record.record_id);
                            processedCount++;
                        }
                    } else {
                        // Check for Unique Constraint Violations (Smart Merge)
                        let conflict = null;

                        if (table === 'clients' && record.phone) {
                            conflict = await tx.get(`SELECT * FROM clients WHERE phone = ?`, record.phone);
                        } else if (table === 'users' && record.username) {
                            conflict = await tx.get(`SELECT * FROM users WHERE username = ?`, record.username);
                        }

                        if (conflict) {
                            // MERGE: Update the existing record with incoming data AND incoming record_id
                            // This unifies them under the remote ID.
                            const keys = Object.keys(record).filter(k => k !== 'id');
                            const setters = keys.map(k => `${k} = ?`).join(', ');
                            const values = keys.map(k => record[k]);

                            // We update the record identified by its LOCAL ID (conflict.id)
                            // effectively overwriting it with remote data + remote record_id
                            await tx.run(`UPDATE ${table} SET ${setters} WHERE id = ?`, ...values, conflict.id);
                            processedCount++;
                            console.log(`[SYNC] Smart merged ${table} record (Local ID: ${conflict.id} -> Remote Record ID: ${record.record_id})`);
                        } else {
                            // Insert
                            const keys = Object.keys(record).filter(k => k !== 'id');
                            const placeholders = keys.map(() => '?').join(', ');
                            const values = keys.map(k => record[k]);

                            await tx.run(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, ...values);
                            processedCount++;
                        }
                    }
                }
            }

            await tx.run(
                'INSERT INTO sync_logs (branch_id, direction, status, records_processed, details) VALUES (?, ?, ?, ?, ?)',
                branch_id, 'PUSH', 'SUCCESS', processedCount, 'Completed push'
            );
        });

        res.json({ message: 'Push processed successfully' });
    } catch (error: any) {
        console.error('[SYNC] Push error:', error);
        res.status(500).json({ message: 'Error processing push', error: error.message });
    }
}

export async function pullData(req: Request, res: Response) {
    // Branch requesting updates from us
    const { branch_id, last_sync } = req.query;
    const db = await initializeDB();

    const lastSyncTime = last_sync ? String(last_sync) : '1970-01-01T00:00:00Z';

    console.log(`[SYNC] Handling PULL for branch: ${branch_id}, since: ${lastSyncTime}`);

    const changes: any = {};

    try {
        for (const table of SYNC_TABLES) {
            // Select records modified AFTER last_sync
            // AND exclude records that originated from ANY branch if we want to avoid loops? 
            // Actually, we want to broadcast everything. Last-Write-Wins handles loops (timestamps wont update if no change).
            // But strict Last-Write should be fine.
            const rows = await db.all(
                `SELECT * FROM ${table} WHERE last_modified > ?`,
                lastSyncTime
            );

            if (rows.length > 0) {
                changes[table] = rows;
            }
        }

        res.json({
            timestamp: new Date().toISOString(),
            changes
        });

    } catch (error: any) {
        console.error('[SYNC] Pull error:', error);
        res.status(500).json({ message: 'Error processing pull', error: error.message });
    }
}


// --- CLIENT SIDE HANDLERS (BRANCH APP) ---

// Trigger a sync cycle (Push local changes -> Pull remote changes)
export async function triggerSync(req: Request, res: Response) {
    const { server_url, branch_id } = req.body;
    // In a real app, these might come from settings DB `branches` table or `settings` key.

    if (!server_url || !branch_id) {
        res.status(400).json({ message: 'Missing server_url or branch_id' });
        return;
    }

    const db = await initializeDB();
    const syncResult = { push: 0, pull: 0, status: 'SUCCESS', message: '' };

    try {
        // 1. PUSH: Find pending local changes
        const localChanges: any = {};
        let hasChanges = false;

        for (const table of SYNC_TABLES) {
            const pending = await db.all(`SELECT * FROM ${table} WHERE sync_status = 'pending'`);
            if (pending.length > 0) {
                // Remove 'current_stock' etc if needed? No, send full record.
                localChanges[table] = pending;
                hasChanges = true;
                syncResult.push += pending.length;
            }
        }

        if (hasChanges) {
            console.log(`[SYNC-CLIENT] Pushing...`, Object.keys(localChanges));
            await axios.post(`${server_url}/api/sync/push`, {
                branch_id,
                changes: localChanges
            });

            // If success, mark as synced
            await db.transaction(async (tx: any) => {
                for (const table of Object.keys(localChanges)) {
                    for (const rec of localChanges[table]) {
                        await tx.run(`UPDATE ${table} SET sync_status = 'synced' WHERE id = ?`, rec.id);
                    }
                }
            });
        }

        // 2. PULL: Get updates from server
        // Get last sync timestamp
        const lastSyncRow = await db.get(`SELECT value FROM settings WHERE key = 'last_sync_timestamp'`);
        const lastSync = lastSyncRow ? lastSyncRow.value : '1970-01-01T00:00:00Z';

        console.log(`[SYNC-CLIENT] Pulling since ${lastSync}...`);
        const pullResp = await axios.get(`${server_url}/api/sync/pull`, {
            params: { branch_id, last_sync: lastSync }
        });

        const { timestamp, changes: remoteChanges } = pullResp.data;

        if (remoteChanges && Object.keys(remoteChanges).length > 0) {
            await db.transaction(async (tx: any) => {
                for (const table of SYNC_TABLES) {
                    if (!remoteChanges[table]) continue;

                    for (const record of remoteChanges[table]) {
                        const existing = await tx.get(`SELECT * FROM ${table} WHERE record_id = ?`, record.record_id);

                        // Prepare data (exclude id)
                        const keys = Object.keys(record).filter(k => k !== 'id');
                        const values = keys.map(k => record[k]);

                        if (existing) {
                            // Update local
                            const setters = keys.map(k => `${k} = ?`).join(', ');
                            await tx.run(`UPDATE ${table} SET ${setters}, sync_status = 'synced' WHERE record_id = ?`, ...values, record.record_id);
                        } else {
                            // Insert local
                            const placeholders = keys.map(() => '?').join(', ');
                            await tx.run(`INSERT INTO ${table} (${keys.join(', ')}, sync_status) VALUES (${placeholders}, 'synced')`, ...values);
                        }
                        syncResult.pull++;
                    }
                }
            });
        }

        // Update last sync timestamp
        const exist = await db.get(`SELECT key FROM settings WHERE key='last_sync_timestamp'`);
        if (exist) {
            await db.run(`UPDATE settings SET value = ? WHERE key = 'last_sync_timestamp'`, timestamp);
        } else {
            await db.run(`INSERT INTO settings (key, value) VALUES ('last_sync_timestamp', ?)`, timestamp);
        }

        res.json(syncResult);

    } catch (error: any) {
        console.error('[SYNC-CLIENT] Sync failed:', error.message);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
}
