import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

let dbInstance: any = null;
let sqlInstance: any = null;

export async function initializeDB(): Promise<any> {
    if (dbInstance) {
        return dbInstance;
    }

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
            exec: async (sql: string) => {
                db.run(sql);
                saveDB();
            },
            get: async (sql: string, ...params: any[]) => {
                const stmt = db.prepare(sql);
                stmt.bind(params);
                const result = stmt.step() ? stmt.getAsObject() : undefined;
                stmt.free();
                return result;
            },
            all: async (sql: string, ...params: any[]) => {
                const stmt = db.prepare(sql);
                stmt.bind(params);
                const results = [];
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                stmt.free();
                return results;
            },
            run: async (sql: string, ...params: any[]) => {
                db.run(sql, params.length > 0 ? params : undefined);
                saveDB();

                // Get last inserted ID and changes
                // sql.js exec returns an array of results for each statement
                const lastIDResult = db.exec("SELECT last_insert_rowid() as id;");
                const lastID = lastIDResult[0].values[0][0];

                const changesResult = db.exec("SELECT changes() as changes;");
                const changes = changesResult[0].values[0][0];

                return { lastID, changes };
            },
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
        throw error;
    }
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

-- Default Admin User
INSERT OR IGNORE INTO users (username, password_hash, role) VALUES ('admin', 'admin123', 'admin');


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
}

export const getDB = initializeDB;