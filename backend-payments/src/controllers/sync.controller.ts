import { Request, Response } from "express";
import { pool } from "../db/postgres";

const SYNC_TABLES = [
    'users',
    'clients',
    'stylists',
    'services',
    'products',
    'bookings',
    'booking_services',
    'sales',
    'sale_services',
    'sale_products',
    'expenses',
    'consumables',
    'consumable_usage'
];

export class SyncController {

    /**
     * POST /api/sync/push
     * Handles incoming data from branches
     */
    public static async pushData(req: Request, res: Response) {
        const { branch_id, changes } = req.body;

        console.log(`[SYNC] PUSH from branch: ${branch_id}`);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let processedCount = 0;

            for (const table of SYNC_TABLES) {
                if (!changes[table] || !Array.isArray(changes[table])) continue;

                for (const record of changes[table]) {
                    // 1. Conflict Resolution: Last Modified Wins
                    const existing = await client.query(
                        `SELECT last_modified FROM ${table} WHERE record_id = $1`,
                        [record.record_id]
                    );

                    const incomingDate = new Date(record.last_modified).getTime();

                    if (existing.rows.length > 0) {
                        const existingDate = new Date(existing.rows[0].last_modified).getTime();
                        if (incomingDate > existingDate) {
                            // Update existing record
                            const keys = Object.keys(record).filter(k => k !== 'id' && k !== 'record_id');
                            const setters = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
                            const values = [record.record_id, ...keys.map(k => record[k])];

                            await client.query(
                                `UPDATE ${table} SET ${setters} WHERE record_id = $1`,
                                values
                            );
                            processedCount++;
                        }
                    } else {
                        // Insert new record
                        const keys = Object.keys(record).filter(k => k !== 'id');
                        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                        const values = keys.map(k => record[k]);

                        await client.query(
                            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
                            values
                        );
                        processedCount++;
                    }
                }
            }

            await client.query(
                `INSERT INTO sync_logs (branch_id, direction, status, records_processed, details) 
                 VALUES ($1, 'PUSH', 'SUCCESS', $2, 'Processed push')`,
                [branch_id, processedCount]
            );

            await client.query('COMMIT');
            res.json({ success: true, processed: processedCount });
        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error('[SYNC] Push error:', error);
            res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    /**
     * GET /api/sync/pull
     * Sends updates to branches
     */
    public static async pullData(req: Request, res: Response) {
        const { branch_id, last_sync } = req.query;
        const lastSyncTime = last_sync ? String(last_sync) : '1970-01-01T00:00:00Z';

        console.log(`[SYNC] PULL for branch: ${branch_id} since ${lastSyncTime}`);

        try {
            const changes: any = {};
            for (const table of SYNC_TABLES) {
                const result = await pool.query(
                    `SELECT * FROM ${table} WHERE last_modified > $1`,
                    [lastSyncTime]
                );
                if (result.rows.length > 0) {
                    changes[table] = result.rows;
                }
            }

            res.json({
                timestamp: new Date().toISOString(),
                changes
            });
        } catch (error: any) {
            console.error('[SYNC] Pull error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
