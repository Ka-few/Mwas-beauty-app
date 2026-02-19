-- Multi-Branch Sync Support

-- 1. Sync Logs Table
CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id TEXT,
    direction TEXT CHECK(direction IN ('PUSH', 'PULL')),
    status TEXT CHECK(status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
    records_processed INTEGER DEFAULT 0,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Braches/Settings (Extend settings or use separate table?)
-- We'll use the existing 'settings' table to store 'branch_id', 'sync_mode' (OWNER/BRANCH), 'master_server_url'
-- But for OWNER mode, we might want to track known branches.
CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY, -- UUID or custom ID
    name TEXT NOT NULL,
    last_sync DATETIME,
    status TEXT DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add Sync Columns to Transactional/Data Tables
-- We need: record_id (UUID), branch_id, last_modified, sync_status
-- SQLite doesn't support adding multiple columns in one ALTER statement easily in all versions, 
-- but we'll try standard compliant multiple ADDs or separate statements in the migration runner.

-- NO-OP here for the SQL file, the actual column additions are best handled in the code migration runner
-- to handle "IF NOT EXISTS" column logic which pure SQL doesn't always support cleanly for ALTER TABLE.
