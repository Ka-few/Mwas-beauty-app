-- Complete Sync Schema for Standalone Payments & Sync Backend

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Base Business Tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stylists (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    commission_rate REAL DEFAULT 20.0,
    is_active BOOLEAN DEFAULT TRUE,
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    duration_minutes INTEGER,
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    cost_price DECIMAL(12, 2),
    selling_price DECIMAL(12, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(record_id),
    customer_name TEXT,
    phone_number TEXT,
    stylist_id UUID REFERENCES stylists(record_id),
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_services (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    booking_id UUID REFERENCES bookings(record_id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(record_id),
    stylist_id UUID REFERENCES stylists(record_id),
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(record_id),
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'COMPLETED',
    mpesa_code TEXT,
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_services (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    sale_id UUID REFERENCES sales(record_id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(record_id),
    stylist_id UUID REFERENCES stylists(record_id),
    price DECIMAL(12, 2) NOT NULL,
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_products (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    sale_id UUID REFERENCES sales(record_id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(record_id),
    quantity INTEGER NOT NULL,
    selling_price DECIMAL(12, 2) NOT NULL,
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consumables (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    current_stock REAL DEFAULT 0,
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consumable_usage (
    id SERIAL PRIMARY KEY,
    record_id UUID UNIQUE NOT NULL,
    consumable_id UUID REFERENCES consumables(record_id),
    usage_amount REAL NOT NULL,
    notes TEXT,
    branch_id TEXT,
    last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Payments (Linked to Sales via record_id)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id TEXT NOT NULL,
    invoice_id UUID REFERENCES sales(record_id),
    amount DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'PENDING',
    mpesa_receipt VARCHAR(100) UNIQUE,
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sync Logs
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    branch_id TEXT NOT NULL,
    direction TEXT,
    status TEXT,
    records_processed INTEGER DEFAULT 0,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
