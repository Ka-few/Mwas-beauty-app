import * as sqlite3 from 'sqlite3';
import { open, Database as SQLiteDB } from 'sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: SQLiteDB | null = null;

export async function initializeDB(): Promise<SQLiteDB> {
    if (dbInstance) {
        return dbInstance;
    }

    const dbPath = process.env.DB_PATH || path.join(__dirname, 'salon.db');

    // Ensure directory exists (only check once)
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
        dbInstance = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Define Migrations
        await runMigrations(dbInstance);

        console.log('SQLite DB initialized successfully at:', dbPath);
        return dbInstance;
    } catch (error) {
        console.error('CRITICAL: Failed to open database at', dbPath, error);
        throw error;
    }
}

async function runMigrations(db: SQLiteDB) {
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
        // console.log('Schema check passed.'); 
    } catch (error) {
        console.error('CRITICAL: Failed to apply schema', error);
        throw error;
    }

    // 2. Safe migration: Add commission_rate if missing from old tables
    try {
        await db.exec('ALTER TABLE stylists ADD COLUMN commission_rate REAL DEFAULT 20.0;');
        console.log('Successfully added commission_rate column to stylists table');
    } catch (e: any) {
        // Ignore "duplicate column name" errors silently for cleaner logs
        if (!e.message || !e.message.includes('duplicate column name')) {
            // Only log other errors
            // console.log('Migration info:', e.message);
        }
    }
}

export const getDB = initializeDB; // Alias for backward compatibility or clarity