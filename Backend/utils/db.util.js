require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.CONNECTIONSTRING;

if (!connectionString) {
    throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
});

pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
});

const initializeDatabase = async () => {
    // 1. Users Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            email_id VARCHAR(255) NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            is_temp BOOLEAN NOT NULL DEFAULT FALSE,
            code_hash TEXT,
            code_expiry TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // 2. Refresh Tokens Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash CHAR(64) NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // 3. Groups / Trips Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS groups (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            destination VARCHAR(255) NOT NULL,
            start_date DATE,
            end_date DATE,
            trip_type VARCHAR(50) NOT NULL DEFAULT 'Friends',
            currency VARCHAR(10) NOT NULL DEFAULT 'INR',
            expense_split VARCHAR(50) NOT NULL DEFAULT 'equal',
            description TEXT,
            cover_image TEXT,
            created_by UUID REFERENCES users(id) ON DELETE CASCADE,
            member_tier VARCHAR(50) NOT NULL DEFAULT 'FREE',
            payment_status VARCHAR(50) NOT NULL DEFAULT 'FREE',
            payment_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
            payment_transaction_id VARCHAR(255),
            paid_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // Ensure columns exist on already created tables
    await pool.query(`
        ALTER TABLE groups ADD COLUMN IF NOT EXISTS member_tier VARCHAR(50) NOT NULL DEFAULT 'FREE';
        ALTER TABLE groups ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'FREE';
        ALTER TABLE groups ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
        ALTER TABLE groups ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(255);
        ALTER TABLE groups ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
    `);

    // 4. Group Members Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS group_members (
            id UUID PRIMARY KEY,
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'Traveler',
            avatar_bg VARCHAR(50),
            is_registered BOOLEAN NOT NULL DEFAULT FALSE,
            status VARCHAR(50) NOT NULL DEFAULT 'ACCEPTED',
            joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT unique_group_member_email UNIQUE (group_id, email)
        )
    `);

    // Ensure status column exists in group_members for existing databases
    await pool.query(`
        ALTER TABLE group_members ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACCEPTED';
    `);

    // 5. Group Invitations Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS group_invitations (
            id UUID PRIMARY KEY,
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            invite_code VARCHAR(64) NOT NULL UNIQUE,
            invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
            invited_email VARCHAR(255),
            role VARCHAR(50) NOT NULL DEFAULT 'Traveler',
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // Ensure columns and indexes exist in group_invitations
    await pool.query(`
        ALTER TABLE group_invitations ADD COLUMN IF NOT EXISTS invited_email VARCHAR(255);
        ALTER TABLE group_invitations ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'PENDING';
        CREATE INDEX IF NOT EXISTS idx_group_invitations_code ON group_invitations(invite_code);
        CREATE INDEX IF NOT EXISTS idx_group_invitations_email ON group_invitations(LOWER(invited_email));
        CREATE INDEX IF NOT EXISTS idx_group_members_group_email ON group_members(group_id, LOWER(email));
    `);

    // Ensure status column exists in groups table
    await pool.query(`
        ALTER TABLE groups ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';
        ALTER TABLE group_members ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255);
    `);

    // 6. Expenses Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS expenses (
            id UUID PRIMARY KEY,
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
            paid_by_member_id UUID REFERENCES group_members(id) ON DELETE SET NULL,
            description VARCHAR(255) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL,
            category VARCHAR(50) NOT NULL DEFAULT 'Other',
            currency VARCHAR(10) NOT NULL DEFAULT 'INR',
            split_model VARCHAR(50) NOT NULL DEFAULT 'EQUAL',
            payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
            payment_reference TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // Ensure all columns exist on pre-existing expenses tables
    await pool.query(`
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_by_member_id UUID REFERENCES group_members(id) ON DELETE SET NULL;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'Other';
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_model VARCHAR(50) NOT NULL DEFAULT 'EQUAL';
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        ALTER TABLE expenses ALTER COLUMN paid_by DROP NOT NULL;
        ALTER TABLE expenses ALTER COLUMN shares DROP NOT NULL;
        ALTER TABLE expenses ALTER COLUMN shares SET DEFAULT '[]'::jsonb;
    `);

    // 7. Expense Splits Table (Participants & exact calculated shares)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS expense_splits (
            id UUID PRIMARY KEY,
            expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
            member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            share_type VARCHAR(50) NOT NULL DEFAULT 'EQUAL_UNIT',
            share_value NUMERIC(12, 2) NOT NULL DEFAULT 1.0,
            computed_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT unique_expense_member UNIQUE (expense_id, member_id)
        )
    `);

    // 8. Direct Settlements Table (Peer-to-peer or ledger settle-ups)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS settlements (
            id UUID PRIMARY KEY,
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            from_member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
            to_member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
            from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            amount NUMERIC(12, 2) NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'INR',
            payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI',
            payment_reference TEXT,
            remarks TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
            settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // 9. Immutable Ledger Audit Log Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ledger_audit_log (
            id UUID PRIMARY KEY,
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            event_type VARCHAR(50) NOT NULL,
            actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
            actor_name VARCHAR(255),
            description TEXT NOT NULL,
            change_diff JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // Indexes for high performance ledger queries
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
        CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
        CREATE INDEX IF NOT EXISTS idx_expense_splits_member_id ON expense_splits(member_id);
        CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);
        CREATE INDEX IF NOT EXISTS idx_ledger_audit_group_id ON ledger_audit_log(group_id);
    `);
};

module.exports = { pool, initializeDatabase };