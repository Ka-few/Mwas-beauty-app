-- PostgreSQL Schema for Salon Management System with M-Pesa Integration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for Payment Status
CREATE TYPE payment_status AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- Branches table for Multi-branch support
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Payments table (Heart of the system)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id),
    client_id TEXT, -- Can be UUID or string from local SQLite
    invoice_id TEXT NOT NULL, -- Logical ID from the local SQLite (e.g., 'SALE-123')
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    status payment_status DEFAULT 'PENDING',
    payment_method VARCHAR(50) DEFAULT 'MPESA',
    mpesa_receipt VARCHAR(100) UNIQUE, -- From Safaricom callback
    phone_number VARCHAR(20), -- Payer phone number
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Payment Attempts (for retries and STK push history)
CREATE TABLE payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    merchant_request_id TEXT NOT NULL UNIQUE, -- From Daraja response
    checkout_request_id TEXT NOT NULL UNIQUE, -- From Daraja response
    amount DECIMAL(12, 2) NOT NULL,
    status TEXT NOT NULL, -- e.g., 'INITIATED', 'CALLBACK_RECEIVED'
    raw_initiation_response JSONB, -- Full response from STK push API
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- M-Pesa Callback Logs (Audit Trail)
CREATE TABLE mpesa_callbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkout_request_id TEXT NOT NULL,
    merchant_request_id TEXT NOT NULL,
    result_code INTEGER,
    result_description TEXT,
    raw_payload JSONB NOT NULL, -- Complete callback JSON
    source_ip VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Payment Links (Mapping for partial payments)
CREATE TABLE invoice_payment_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id TEXT NOT NULL, -- Logical ID from SQLite
    payment_id UUID NOT NULL REFERENCES payments(id),
    amount_linked DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_mpesa_receipt ON payments(mpesa_receipt);
CREATE INDEX idx_payments_branch_id ON payments(branch_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE INDEX idx_mpesa_callbacks_checkout_id ON mpesa_callbacks(checkout_request_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
