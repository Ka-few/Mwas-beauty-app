import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

export async function initializeDB() {
    const dbPath = process.env.DB_PATH || path.join(__dirname, 'salon.db');

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // 1. Run schema first to ensure tables exist
    let schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        schemaPath = path.join(__dirname, '../db/schema.sql');
    }

    if (fs.existsSync(schemaPath)) {
        console.log('Applying schema from:', schemaPath);
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await db.exec(sql);
    } else {
        console.error('CRITICAL: schema.sql not found at', schemaPath);
    }

    // 2. Safe migration: Add commission_rate if missing from old tables
    try {
        await db.exec('ALTER TABLE stylists ADD COLUMN commission_rate REAL DEFAULT 20.0;');
        console.log('Successfully added commission_rate column to stylists table');
    } catch (e: any) {
        if (e.message && e.message.includes('duplicate column name')) {
            console.log('Migration skipped: commission_rate already exists');
        } else {
            console.log('Migration info (can ignore if table is new):', e.message);
        }
    }

    console.log('SQLite DB initialized successfully at:', dbPath);
    return db;
}