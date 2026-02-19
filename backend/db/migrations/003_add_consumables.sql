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
