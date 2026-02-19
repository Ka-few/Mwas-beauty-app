import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

let dbInstance: any = null;
let sqlInstance: any = null;
let initPromise: Promise<any> | null = null;

// Simple lock mechanism to serialize DB operations
let dbQueue: Promise<any> = Promise.resolve();

// Generate UUID for record_id
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function enqueue<T>(op: () => Promise<T>): Promise<T> {
    const next = dbQueue.then(op);
    dbQueue = next.catch(() => { });
    return next;
}

export async function initializeDB(): Promise<any> {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        if (dbInstance) return dbInstance;

        const dbPath = process.env.DB_PATH || path.join(__dirname, 'salon.db');

        // Ensure directory exists
        try {
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log('Created database directory:', dir);
            }
        } catch (err) {
            console.error('Failed to create database directory:', err);
        }

        try {
            // Initialize sql.js
            if (!sqlInstance) {
                sqlInstance = await initSqlJs({
                    locateFile: (file) => path.join(__dirname, file)
                });
            }

            let buffer: Uint8Array | undefined;
            if (fs.existsSync(dbPath)) {
                buffer = new Uint8Array(fs.readFileSync(dbPath));
            }

            const db = new sqlInstance.Database(buffer);

            const saveDB = () => {
                try {
                    const data = db.export();
                    const nodeBuffer = Buffer.from(data);
                    fs.writeFileSync(dbPath, nodeBuffer);
                } catch (err) {
                    console.error('CRITICAL: Failed to save database to disk:', err);
                }
            };

            const wrapper = {
                exec: (sql: string) => enqueue(async () => {
                    db.run(sql);
                    saveDB();
                }),
                get: (sql: string, ...params: any[]) => enqueue(async () => {
                    const stmt = db.prepare(sql);
                    if (params.length > 0) stmt.bind(params);
                    const result = stmt.step() ? stmt.getAsObject() : undefined;
                    stmt.free();
                    return result;
                }),
                all: (sql: string, ...params: any[]) => enqueue(async () => {
                    const stmt = db.prepare(sql);
                    if (params.length > 0) stmt.bind(params);
                    const results = [];
                    while (stmt.step()) {
                        results.push(stmt.getAsObject());
                    }
                    stmt.free();
                    return results;
                }),
                run: (sql: string, ...params: any[]) => enqueue(async () => {
                    if (params.length > 0) {
                        db.run(sql, params);
                    } else {
                        db.run(sql);
                    }
                    saveDB();

                    let lastID = 0;
                    let changes = 0;
                    try {
                        const lastIDResult = db.exec("SELECT last_insert_rowid() as id;");
                        if (lastIDResult && lastIDResult.length > 0 && lastIDResult[0].values.length > 0) {
                            lastID = lastIDResult[0].values[0][0] as number;
                        }

                        const changesResult = db.exec("SELECT changes() as changes;");
                        if (changesResult && changesResult.length > 0 && changesResult[0].values.length > 0) {
                            changes = changesResult[0].values[0][0] as number;
                        }
                    } catch (e) {
                        // Ignore metadata fetch errors
                    }

                    return { lastID, changes };
                }),
                transaction: async (work: (tx: any) => Promise<any>) => enqueue(async () => {
                    try {
                        db.run('BEGIN TRANSACTION');
                        // Use a restricted nested wrapper for transaction safety
                        const txWrapper = {
                            run: async (sql: string, ...params: any[]) => {
                                db.run(sql, params.length > 0 ? params : undefined);
                                return {
                                    get lastID() {
                                        const res = db.exec("SELECT last_insert_rowid();");
                                        return res[0].values[0][0];
                                    }
                                };
                            },
                            exec: async (sql: string) => db.run(sql),
                            get: async (sql: string, ...params: any[]) => {
                                const stmt = db.prepare(sql);
                                if (params.length > 0) stmt.bind(params);
                                const result = stmt.step() ? stmt.getAsObject() : undefined;
                                stmt.free();
                                return result;
                            },
                            all: async (sql: string, ...params: any[]) => {
                                const stmt = db.prepare(sql);
                                if (params.length > 0) stmt.bind(params);
                                const results = [];
                                while (stmt.step()) {
                                    results.push(stmt.getAsObject());
                                }
                                stmt.free();
                                return results;
                            }
                        };
                        const result = await work(txWrapper);
                        db.run('COMMIT');
                        saveDB();
                        return result;
                    } catch (err) {
                        try { db.run('ROLLBACK'); } catch (e) { }
                        throw err;
                    }
                }),
                close: async () => {
                    db.close();
                }
            };

            // Define Migrations
            await runMigrations(wrapper);

            dbInstance = wrapper;
            console.log('sql.js DB initialized successfully at:', dbPath);
            return dbInstance;
        } catch (error) {
            console.error('CRITICAL: Failed to open database at', dbPath, error);
            initPromise = null; // Reset for retry
            throw error;
        }
    })();

    return initPromise;
}

async function runMigrations(db: any) {
    const schema = `
-- Users Table
CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTOINCREMENT,
username TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
role TEXT NOT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default Admin User (password: admin123, hashed)
INSERT OR IGNORE INTO users (username, password_hash, role) VALUES ('admin', '$2a$10$BNO/5FMT3L.6fyc5kLSeI.MoAY62zpfC17.dGysZ9cTIUWY/zwWDu', 'admin');


-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,
phone TEXT UNIQUE NOT NULL,
notes TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Stylists Table
CREATE TABLE IF NOT EXISTS stylists (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,
phone TEXT,
commission_rate REAL DEFAULT 20.0,
is_active BOOLEAN DEFAULT 1,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Services Table
CREATE TABLE IF NOT EXISTS services (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,
price REAL NOT NULL,
duration_minutes INTEGER,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,
category TEXT,
cost_price REAL,
selling_price REAL NOT NULL,
stock_quantity INTEGER DEFAULT 0,
reorder_level INTEGER DEFAULT 5,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
id INTEGER PRIMARY KEY AUTOINCREMENT,
client_id INTEGER,
total_amount REAL NOT NULL,
payment_method TEXT NOT NULL,
status TEXT DEFAULT 'COMPLETED',
mpesa_code TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (client_id) REFERENCES clients(id)
);


-- Sale Services Table
CREATE TABLE IF NOT EXISTS sale_services (
id INTEGER PRIMARY KEY AUTOINCREMENT,
sale_id INTEGER NOT NULL,
service_id INTEGER NOT NULL,
stylist_id INTEGER NOT NULL,
price REAL NOT NULL,
FOREIGN KEY (sale_id) REFERENCES sales(id),
FOREIGN KEY (service_id) REFERENCES services(id),
FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);

-- Sale Products Table
CREATE TABLE IF NOT EXISTS sale_products (
id INTEGER PRIMARY KEY AUTOINCREMENT,
sale_id INTEGER NOT NULL,
product_id INTEGER NOT NULL,
quantity INTEGER NOT NULL,
selling_price REAL NOT NULL,
FOREIGN KEY (sale_id) REFERENCES sales(id),
FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
id INTEGER PRIMARY KEY AUTOINCREMENT,
category TEXT NOT NULL,
amount REAL NOT NULL,
date DATE NOT NULL,
description TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  stylist_id INTEGER,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  end_time TIME,
  source TEXT NOT NULL CHECK(source IN ('whatsapp', 'facebook', 'instagram', 'call')),
  booking_type TEXT NOT NULL DEFAULT 'scheduled' CHECK(booking_type IN ('walk-in', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no-show', 'in-progress')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);


-- Booking Services Junction Table
CREATE TABLE IF NOT EXISTS booking_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  stylist_id INTEGER,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);

-- Consumables Master List
CREATE TABLE IF NOT EXISTS consumables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT, -- e.g., 'ml', 'g', 'count'
    min_level REAL DEFAULT 0,
    current_stock REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Consumable Usage Logs
CREATE TABLE IF NOT EXISTS consumable_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consumable_id INTEGER NOT NULL,
    previous_stock REAL NOT NULL,
    current_stock REAL NOT NULL,
    usage_amount REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consumable_id) REFERENCES consumables(id)
);
`;

    try {
        await db.exec(schema);
    } catch (error) {
        console.error('CRITICAL: Failed to apply schema', error);
        throw error;
    }

    // 2. Safe migration: Add commission_rate if missing from old tables
    try {
        await db.exec('ALTER TABLE stylists ADD COLUMN commission_rate REAL DEFAULT 20.0;');
        console.log('Successfully added commission_rate column to stylists table');
    } catch (e: any) {
        // Ignore errors if column already exists
    }

    // 3. Safe migration: Add mpesa_code if missing from old tables
    try {
        await db.exec('ALTER TABLE sales ADD COLUMN mpesa_code TEXT;');
        console.log('Successfully added mpesa_code column to sales table');
    } catch (e: any) {
        // Ignore errors if column already exists
    }

    // 4. Safe migration: Add settings table if missing for older DBs
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } catch (e: any) {
        // Ignore errors
    }

    // 4b. Safe migration: Add bookings table and enhancements if missing
    try {
        // First check if bookings table exists
        const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='bookings'");

        if (tableCheck) {
            // Check if bookings has the old service_id column
            const columns = await db.all("PRAGMA table_info(bookings)");
            const hasServiceId = columns.some((c: any) => c.name === 'service_id');

            if (hasServiceId) {
                console.log('MIGRATION: Detected old bookings schema with service_id. Starting migration...');

                // 1. Ensure booking_services exists
                await db.exec(`
                        CREATE TABLE IF NOT EXISTS booking_services (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            booking_id INTEGER NOT NULL,
                            service_id INTEGER NOT NULL,
                            stylist_id INTEGER,
                            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
                            FOREIGN KEY (service_id) REFERENCES services(id),
                            FOREIGN KEY (stylist_id) REFERENCES stylists(id)
                        );
                    `);

                // 2. Migrate existing data to booking_services if not already there
                await db.exec(`
                        INSERT INTO booking_services (booking_id, service_id, stylist_id)
                        SELECT id, service_id, stylist_id FROM bookings
                        WHERE service_id IS NOT NULL;
                    `);

                // 3. Recreate bookings table without service_id
                // Note: SQLite doesn't support DROP COLUMN easily for older versions, 
                // and even if it does, it's safer to recreate for consistency.
                await db.exec("ALTER TABLE bookings RENAME TO bookings_old;");

                await db.exec(`
                        CREATE TABLE bookings (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            client_id INTEGER,
                            customer_name TEXT NOT NULL,
                            phone_number TEXT NOT NULL,
                            stylist_id INTEGER,
                            booking_date DATE NOT NULL,
                            booking_time TIME NOT NULL,
                            end_time TIME,
                            source TEXT NOT NULL CHECK(source IN ('whatsapp', 'facebook', 'instagram', 'call', 'physical')),
                            booking_type TEXT NOT NULL DEFAULT 'scheduled' CHECK(booking_type IN ('walk-in', 'scheduled')),
                            status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no-show', 'in-progress')),
                            notes TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (client_id) REFERENCES clients(id),
                            FOREIGN KEY (stylist_id) REFERENCES stylists(id)
                        );
                    `);

                await db.exec(`
                        INSERT INTO bookings (
                            id, client_id, customer_name, phone_number, stylist_id, 
                            booking_date, booking_time, end_time, source, booking_type, status, notes, created_at, updated_at
                        )
                        SELECT 
                            id, client_id, customer_name, phone_number, stylist_id, 
                            booking_date, booking_time, end_time, source, booking_type, status, notes, created_at, updated_at
                        FROM bookings_old;
                    `);

                await db.exec("DROP TABLE bookings_old;");
                console.log('MIGRATION: Bookings table successfully migrated to new multi-service schema.');
            }
        } else {
            // Create table for the first time
            await db.exec(`
                    CREATE TABLE bookings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        client_id INTEGER,
                        customer_name TEXT NOT NULL,
                        phone_number TEXT NOT NULL,
                        stylist_id INTEGER,
                        booking_date DATE NOT NULL,
                        booking_time TIME NOT NULL,
                        end_time TIME,
                        source TEXT NOT NULL CHECK(source IN ('whatsapp', 'facebook', 'instagram', 'call', 'physical')),
                        booking_type TEXT NOT NULL DEFAULT 'scheduled' CHECK(booking_type IN ('walk-in', 'scheduled')),
                        status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no-show', 'in-progress')),
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (client_id) REFERENCES clients(id),
                        FOREIGN KEY (stylist_id) REFERENCES stylists(id)
                    );
                `);
        }

        // Always ensure booking_services exists
        await db.exec(`
                CREATE TABLE IF NOT EXISTS booking_services (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    booking_id INTEGER NOT NULL,
                    service_id INTEGER NOT NULL,
                    stylist_id INTEGER,
                    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
                    FOREIGN KEY (service_id) REFERENCES services(id),
                    FOREIGN KEY (stylist_id) REFERENCES stylists(id)
                );
            `);

        // 4c. Safe migration: Update 'source' check constraint to include 'physical'
        const sourceConstraintCheck = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='bookings'");
        if (sourceConstraintCheck && !sourceConstraintCheck.sql.includes("'physical'")) {
            console.log('MIGRATION: Updating bookings source constraint to include "physical"...');
            await db.exec("ALTER TABLE bookings RENAME TO bookings_old_source;");
            await db.exec(`
                CREATE TABLE bookings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER,
                    customer_name TEXT NOT NULL,
                    phone_number TEXT NOT NULL,
                    stylist_id INTEGER,
                    booking_date DATE NOT NULL,
                    booking_time TIME NOT NULL,
                    end_time TIME,
                    source TEXT NOT NULL CHECK(source IN ('whatsapp', 'facebook', 'instagram', 'call', 'physical')),
                    booking_type TEXT NOT NULL DEFAULT 'scheduled' CHECK(booking_type IN ('walk-in', 'scheduled')),
                    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no-show', 'in-progress')),
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES clients(id),
                    FOREIGN KEY (stylist_id) REFERENCES stylists(id)
                );
            `);
            await db.exec(`
                INSERT INTO bookings (
                    id, client_id, customer_name, phone_number, stylist_id, 
                    booking_date, booking_time, end_time, source, booking_type, status, notes, created_at, updated_at
                )
                SELECT 
                    id, client_id, customer_name, phone_number, stylist_id, 
                    booking_date, booking_time, end_time, source, booking_type, status, notes, created_at, updated_at
                FROM bookings_old_source;
            `);
            await db.exec("DROP TABLE bookings_old_source;");
            console.log('MIGRATION: Bookings source constraint updated successfully.');
        }

        // Safe additions for existing tables
        try { await db.exec('ALTER TABLE bookings ADD COLUMN client_id INTEGER REFERENCES clients(id);'); } catch (e) { }
        try { await db.exec('ALTER TABLE booking_services ADD COLUMN stylist_id INTEGER REFERENCES stylists(id);'); } catch (e) { }

        console.log('Successfully initialized/enhanced bookings and booking_services tables');
    } catch (e: any) {
        console.error('Migration error in bookings section:', e);
    }

    // 4d. Safe migration: Add consumables tables if missing
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS consumables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                unit TEXT,
                min_level REAL DEFAULT 0,
                current_stock REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await db.exec(`
            CREATE TABLE IF NOT EXISTS consumable_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                consumable_id INTEGER NOT NULL,
                previous_stock REAL NOT NULL,
                current_stock REAL NOT NULL,
                usage_amount REAL NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (consumable_id) REFERENCES consumables(id)
            );
        `);
        console.log('Successfully checked/created consumables tables');
    } catch (e) {
        console.error('Migration error in consumables section:', e);
    }

    // 4e. Safe migration: Sync Columns & Tables
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS sync_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                branch_id TEXT,
                direction TEXT CHECK(direction IN ('PUSH', 'PULL')),
                status TEXT CHECK(status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
                records_processed INTEGER DEFAULT 0,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS branches (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                last_sync DATETIME,
                status TEXT DEFAULT 'ACTIVE',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // List of tables to sync
        const tablesToSync = [
            'users', 'clients', 'stylists', 'services', 'products',
            'sales', 'sale_services', 'sale_products', 'expenses',
            'bookings', 'booking_services', 'consumables', 'consumable_usage'
        ];

        for (const table of tablesToSync) {
            try {
                // Add record_id
                const cols = await db.all(`PRAGMA table_info(${table})`);
                const hasRecordId = cols.some((c: any) => c.name === 'record_id');

                if (!hasRecordId) {
                    console.log(`Adding sync columns to ${table}...`);
                    await db.exec(`ALTER TABLE ${table} ADD COLUMN record_id TEXT;`);
                    await db.exec(`ALTER TABLE ${table} ADD COLUMN branch_id TEXT;`);
                    await db.exec(`ALTER TABLE ${table} ADD COLUMN last_modified DATETIME;`);
                    await db.exec(`ALTER TABLE ${table} ADD COLUMN sync_status TEXT DEFAULT 'pending';`); // pending, synced

                    // Backfill record_id for existing rows
                    const rows = await db.all(`SELECT id FROM ${table} WHERE record_id IS NULL`);
                    if (rows.length > 0) {
                        await db.transaction(async (tx: any) => {
                            for (const row of rows) {
                                const uuid = generateUUID();
                                await tx.run(`UPDATE ${table} SET record_id = ?, last_modified = CURRENT_TIMESTAMP, sync_status = 'pending' WHERE id = ?`, uuid, row.id);
                            }
                        });
                        console.log(`Backfilled UUIDs for ${rows.length} rows in ${table}`);
                    }
                }
            } catch (err: any) {
                console.error(`Failed to add sync columns to ${table}:`, err.message);
            }
        }

        console.log('Successfully initialized sync tables and columns');
    } catch (e) {
        console.error('Migration error in sync section:', e);
    }

    // 5. Licensing specific initialization
    try {
        const check = await db.get("SELECT COUNT(*) as count FROM settings WHERE key = 'trial_start_date'");
        if (check && check.count === 0) {
            await db.run("INSERT INTO settings (key, value) VALUES ('trial_start_date', datetime('now'))");
            await db.run("INSERT INTO settings (key, value) VALUES ('is_activated', 'false')");
            await db.run("INSERT INTO settings (key, value) VALUES ('license_key', '')");
            console.log('Successfully initialized licensing settings');
        }
    } catch (e) {
        console.error('Error initializing licensing settings', e);
    }

    // 6. Fix potentially corrupted admin hash from previous bad build
    try {
        const admin = await db.get("SELECT password_hash FROM users WHERE username = 'admin'");
        if (admin && (admin.password_hash.includes('7vN0o8fR') || !admin.password_hash.startsWith('$'))) {
            // It's either the corrupted hash or plain text - update to good hash
            const goodHash = '$2a$10$BNO/5FMT3L.6fyc5kLSeI.MoAY62zpfC17.dGysZ9cTIUWY/zwWDu';
            await db.run("UPDATE users SET password_hash = ? WHERE username = 'admin'", goodHash);
            console.log('Successfully updated/repaired admin password hash');
        }
    } catch (e) {
        console.error('Error repairing admin hash', e);
    }
}

export const getDB = initializeDB;