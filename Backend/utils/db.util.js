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
            upi_id VARCHAR(255),
            is_temp BOOLEAN NOT NULL DEFAULT FALSE,
            code_hash TEXT,
            code_expiry TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255)`);

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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`ALTER TABLE groups ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'`);
    await pool.query(`ALTER TABLE groups ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ`);

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
            upi_id VARCHAR(255),
            is_registered BOOLEAN NOT NULL DEFAULT FALSE,
            joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT unique_group_member_email UNIQUE (group_id, email)
        )
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

    await pool.query(`
        CREATE TABLE IF NOT EXISTS expenses (
            id UUID PRIMARY KEY,
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            description VARCHAR(255) NOT NULL,
            amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
            paid_by UUID NOT NULL REFERENCES group_members(id) ON DELETE RESTRICT,
            shares JSONB NOT NULL,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255)`);
    await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH'`);
    await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255)`);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS settlement_records (
            id UUID PRIMARY KEY,
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            paid_by UUID NOT NULL REFERENCES group_members(id) ON DELETE RESTRICT,
            paid_to UUID NOT NULL REFERENCES group_members(id) ON DELETE RESTRICT,
            amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
            payment_method VARCHAR(20) NOT NULL,
            remarks VARCHAR(255) NOT NULL,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
};

module.exports = { pool, initializeDatabase };