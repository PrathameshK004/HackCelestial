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
};

module.exports = { pool, initializeDatabase };