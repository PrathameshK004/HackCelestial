require('dotenv').config();
const { Pool } = require('pg');

const configuredConnectionString = process.env.DATABASE_URL || process.env.CONNECTIONSTRING;

if (!configuredConnectionString) {
    throw new Error('DATABASE_URL is required');
}

const connectionString = configuredConnectionString.includes('sslmode=require') && !configuredConnectionString.includes('uselibpqcompat')
    ? `${configuredConnectionString}&uselibpqcompat=true`
    : configuredConnectionString;

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

    // Ensure user profile columns exist
    await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS travel_style VARCHAR(50) DEFAULT 'Boutique';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS dob VARCHAR(20);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
    `);

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
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_saved_trips (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            stay_id VARCHAR(255) NOT NULL,
            stay_data JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT unique_user_saved_trip UNIQUE (user_id, stay_id)
        )
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_saved_trips_user ON user_saved_trips(user_id, created_at DESC)
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

    // 4. Payment Transactions / Real-time gateway simulation records
    await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
            order_id VARCHAR(255) NOT NULL UNIQUE,
            payment_id VARCHAR(255),
            amount NUMERIC(12, 2) NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'INR',
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            payment_method VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
            payment_gateway VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
            receipt VARCHAR(255),
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            captured_at TIMESTAMPTZ,
            expires_at TIMESTAMPTZ
        )
    `);

    await pool.query(`
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS order_id VARCHAR(255);
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'RAZORPAY';
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50) DEFAULT 'RAZORPAY';
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS receipt VARCHAR(255);
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id) WHERE payment_id IS NOT NULL;
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
        ALTER TABLE group_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    `);

    // 6. Expenses Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS expenses (
            id UUID PRIMARY KEY,
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            paid_by UUID REFERENCES group_members(id) ON DELETE SET NULL,
            paid_by_member_id UUID REFERENCES group_members(id) ON DELETE SET NULL,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
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
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'Other';
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_model VARCHAR(50) NOT NULL DEFAULT 'EQUAL';
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED';
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approvals JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS required_approvals INT DEFAULT 1;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS raw_sms_proof TEXT;
        ALTER TABLE expenses ALTER COLUMN paid_by DROP NOT NULL;
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
    await pool.query(`
        ALTER TABLE settlements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
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

    // 10. User Push Notification Tokens (Firebase Cloud Messaging)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_push_tokens (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL,
            device_type VARCHAR(50) DEFAULT 'mobile',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT unique_user_push_token UNIQUE (user_id, token)
        )
    `);

    // Ensure push token column exists in users table as well
    await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
    `);

    // 11. Persistent In-App Notifications Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS in_app_notifications (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            data JSONB DEFAULT '{}'::jsonb,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        ALTER TABLE in_app_notifications ALTER COLUMN user_id DROP NOT NULL;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS notification_dismissals (
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            notification_id UUID NOT NULL REFERENCES in_app_notifications(id) ON DELETE CASCADE,
            dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (user_id, notification_id)
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notification_reads (
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            notification_id UUID NOT NULL REFERENCES in_app_notifications(id) ON DELETE CASCADE,
            read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (user_id, notification_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS support_tickets (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            ticket_number VARCHAR(32) NOT NULL UNIQUE,
            category VARCHAR(80) NOT NULL DEFAULT 'other',
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
            attachment_name VARCHAR(255),
            attachment_type VARCHAR(100),
            attachment_size INTEGER,
            attachment_data BYTEA,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`
        ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'OPEN';
        ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS attachment_url TEXT;
        ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS attachment_key VARCHAR(512);
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS support_ticket_messages (
            id UUID PRIMARY KEY,
            ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
            sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
            sender_name VARCHAR(120),
            sender_role VARCHAR(32) NOT NULL DEFAULT 'USER',
            message TEXT,
            attachment_url TEXT,
            attachment_name VARCHAR(255),
            attachment_type VARCHAR(100),
            attachment_size INTEGER,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id, created_at ASC);
    `);
    await pool.query('ALTER TABLE support_ticket_messages ALTER COLUMN sender_id DROP NOT NULL');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS support_ticket_event_outbox (
            event_id BIGSERIAL PRIMARY KEY,
            event_type VARCHAR(40) NOT NULL,
            ticket_number VARCHAR(32) NOT NULL,
            payload JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_support_ticket_event_outbox_created
            ON support_ticket_event_outbox(event_id);
        CREATE TABLE IF NOT EXISTS support_ticket_event_consumers (
            consumer_name VARCHAR(80) PRIMARY KEY,
            last_event_id BIGINT NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE OR REPLACE FUNCTION public.notify_support_ticket_event()
        RETURNS trigger AS $support_ticket_event$
        DECLARE
            ticket_number_value TEXT;
            event_payload JSONB;
            event_type_value TEXT;
            new_event_id BIGINT;
        BEGIN
            IF TG_TABLE_NAME = 'support_tickets' THEN
                IF TG_OP = 'INSERT' THEN
                    event_type_value := 'ticket:created';
                    event_payload := jsonb_build_object('ticketNumber', NEW.ticket_number);
                ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
                    event_type_value := 'ticket:status_change';
                    event_payload := jsonb_build_object('ticketNumber', NEW.ticket_number, 'status', NEW.status);
                ELSE
                    RETURN NEW;
                END IF;
                PERFORM pg_advisory_xact_lock(hashtext('triptual_support_event_outbox'));
                INSERT INTO support_ticket_event_outbox (event_type, ticket_number, payload)
                VALUES (event_type_value, NEW.ticket_number, event_payload)
                RETURNING event_id INTO new_event_id;
                PERFORM pg_notify('triptual_support_events', new_event_id::text);
                RETURN NEW;
            END IF;

            SELECT ticket_number INTO ticket_number_value
            FROM support_tickets
            WHERE id = NEW.ticket_id;

            IF ticket_number_value IS NOT NULL THEN
                event_payload := jsonb_build_object('messageId', NEW.id);
                PERFORM pg_advisory_xact_lock(hashtext('triptual_support_event_outbox'));
                INSERT INTO support_ticket_event_outbox (event_type, ticket_number, payload)
                VALUES ('ticket:message', ticket_number_value, event_payload)
                RETURNING event_id INTO new_event_id;
                PERFORM pg_notify('triptual_support_events', new_event_id::text);
            END IF;
            RETURN NEW;
        END;
        $support_ticket_event$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS support_ticket_notify_event ON support_tickets;
        CREATE TRIGGER support_ticket_notify_event
        AFTER INSERT OR UPDATE OF status ON support_tickets
        FOR EACH ROW EXECUTE FUNCTION public.notify_support_ticket_event();

        DROP TRIGGER IF EXISTS support_ticket_message_notify_event ON support_ticket_messages;
        CREATE TRIGGER support_ticket_message_notify_event
        AFTER INSERT ON support_ticket_messages
        FOR EACH ROW EXECUTE FUNCTION public.notify_support_ticket_event();
    `);

    await pool.query(`
        ALTER TABLE IF EXISTS support_ticket_messages
        ALTER COLUMN sender_id DROP NOT NULL
    `);

    // Data Migration: Clean up legacy member status inconsistencies where invited members were erroneously set to ACCEPTED
    await pool.query(`
        UPDATE group_members gm
        SET status = 'PENDING'
        FROM group_invitations gi
        WHERE gm.group_id = gi.group_id 
          AND LOWER(gm.email) = LOWER(gi.invited_email)
          AND gi.status = 'PENDING'
          AND gm.role != 'Organizer'
          AND gm.status = 'ACCEPTED'
    `);

    // Indexes for high performance ledger queries, push tokens, and in-app notifications
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
        CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
        CREATE INDEX IF NOT EXISTS idx_expense_splits_member_id ON expense_splits(member_id);
        CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);
        CREATE INDEX IF NOT EXISTS idx_ledger_audit_group_id ON ledger_audit_log(group_id);
        CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id ON in_app_notifications(user_id, created_at DESC);
    `);

    // 12. Restaurant Discovery & Dining Tables
    await pool.query(`
        CREATE TABLE IF NOT EXISTS dine_restaurants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            provider VARCHAR(64) NOT NULL DEFAULT 'fallback',
            provider_place_id VARCHAR(255) NOT NULL,
            slug VARCHAR(255),
            name TEXT NOT NULL,
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
            city TEXT,
            cuisines JSONB NOT NULL DEFAULT '[]'::jsonb,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            is_partner BOOLEAN NOT NULL DEFAULT FALSE,
            status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
            last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            description TEXT,
            rating NUMERIC(3,2) DEFAULT 0,
            review_count INTEGER DEFAULT 0,
            price_level VARCHAR(16) DEFAULT '₹₹',
            phone VARCHAR(64),
            website TEXT,
            primary_image TEXT,
            address TEXT,
            state VARCHAR(255),
            country VARCHAR(255) DEFAULT 'India',
            postal_code VARCHAR(64),
            timezone VARCHAR(80) DEFAULT 'Asia/Kolkata',
            is_group_friendly BOOLEAN DEFAULT TRUE,
            is_active BOOLEAN DEFAULT TRUE,
            provider_last_synced_at TIMESTAMPTZ,
            UNIQUE (provider, provider_place_id)
        );

        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS provider VARCHAR(64) NOT NULL DEFAULT 'fallback';
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS provider_place_id VARCHAR(255);
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'OPEN';
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS price_level VARCHAR(16) DEFAULT '₹₹';
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS phone VARCHAR(64);
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS website TEXT;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS primary_image TEXT;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS city TEXT;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS state VARCHAR(255);
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS country VARCHAR(255) DEFAULT 'India';
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS postal_code VARCHAR(64);
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS timezone VARCHAR(80) DEFAULT 'Asia/Kolkata';
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS is_group_friendly BOOLEAN DEFAULT TRUE;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS provider_last_synced_at TIMESTAMPTZ;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS cuisines JSONB NOT NULL DEFAULT '[]'::jsonb;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS is_partner BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        ALTER TABLE dine_restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

        CREATE TABLE IF NOT EXISTS dine_restaurant_cuisines (
            restaurant_id UUID NOT NULL REFERENCES dine_restaurants(id) ON DELETE CASCADE,
            cuisine VARCHAR(100) NOT NULL,
            PRIMARY KEY (restaurant_id, cuisine)
        );

        CREATE TABLE IF NOT EXISTS dine_restaurant_hours (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            restaurant_id UUID NOT NULL REFERENCES dine_restaurants(id) ON DELETE CASCADE,
            day_of_week VARCHAR(8) NOT NULL,
            open_time TIME,
            close_time TIME,
            is_closed BOOLEAN NOT NULL DEFAULT FALSE,
            timezone VARCHAR(80) DEFAULT 'Asia/Kolkata',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS dine_restaurant_menu_categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            restaurant_id UUID NOT NULL REFERENCES dine_restaurants(id) ON DELETE CASCADE,
            name VARCHAR(160) NOT NULL,
            description TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (restaurant_id, name)
        );

        CREATE TABLE IF NOT EXISTS dine_restaurant_menu_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category_id UUID NOT NULL REFERENCES dine_restaurant_menu_categories(id) ON DELETE CASCADE,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            price NUMERIC(12,2) NOT NULL DEFAULT 0,
            currency VARCHAR(10) NOT NULL DEFAULT 'INR',
            image_url TEXT,
            is_vegetarian BOOLEAN NOT NULL DEFAULT FALSE,
            is_vegan BOOLEAN NOT NULL DEFAULT FALSE,
            is_available BOOLEAN NOT NULL DEFAULT TRUE,
            dietary_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (category_id, name)
        );

        CREATE TABLE IF NOT EXISTS dine_restaurant_photos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            restaurant_id UUID NOT NULL REFERENCES dine_restaurants(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            is_primary BOOLEAN DEFAULT FALSE,
            caption TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS dine_restaurant_offers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            restaurant_id UUID NOT NULL REFERENCES dine_restaurants(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            discount_type VARCHAR(32) NOT NULL DEFAULT 'PERCENTAGE',
            discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
            starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
            eligibility JSONB NOT NULL DEFAULT '{}'::jsonb,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE dine_restaurant_offers ADD COLUMN IF NOT EXISTS discount_type VARCHAR(32) NOT NULL DEFAULT 'PERCENTAGE';
        ALTER TABLE dine_restaurant_offers ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) NOT NULL DEFAULT 0;
        ALTER TABLE dine_restaurant_offers ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        ALTER TABLE dine_restaurant_offers ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days';
        ALTER TABLE dine_restaurant_offers ADD COLUMN IF NOT EXISTS eligibility JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE dine_restaurant_offers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
        ALTER TABLE dine_restaurant_offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

        CREATE TABLE IF NOT EXISTS dine_restaurant_favorites (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            restaurant_id UUID NOT NULL REFERENCES dine_restaurants(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (user_id, restaurant_id)
        );

        CREATE TABLE IF NOT EXISTS dine_activities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            restaurant_id UUID NOT NULL REFERENCES dine_restaurants(id) ON DELETE RESTRICT,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            activity_date DATE NOT NULL,
            start_time TIME,
            end_time TIME,
            participants JSONB NOT NULL DEFAULT '[]'::jsonb,
            estimated_budget NUMERIC(12,2),
            currency VARCHAR(10) DEFAULT 'INR',
            notes TEXT,
            status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS dine_restaurant_reservations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            restaurant_id UUID NOT NULL REFERENCES dine_restaurants(id) ON DELETE RESTRICT,
            activity_id UUID REFERENCES dine_activities(id) ON DELETE SET NULL,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            reservation_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME,
            guest_count INTEGER NOT NULL CHECK (guest_count BETWEEN 1 AND 40),
            participants JSONB NOT NULL DEFAULT '[]'::jsonb,
            estimated_budget NUMERIC(12,2),
            currency VARCHAR(10) NOT NULL DEFAULT 'INR',
            notes TEXT,
            status VARCHAR(32) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE dine_restaurant_reservations ADD COLUMN IF NOT EXISTS end_time TIME;

        CREATE TABLE IF NOT EXISTS dine_provider_sync_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            provider VARCHAR(64) NOT NULL,
            restaurant_id UUID REFERENCES dine_restaurants(id) ON DELETE SET NULL,
            sync_status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
            provider_payload JSONB,
            error_message TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_dine_restaurants_provider_place ON dine_restaurants(provider, provider_place_id) WHERE provider_place_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_dine_restaurants_provider ON dine_restaurants(provider, provider_place_id);
        CREATE INDEX IF NOT EXISTS idx_dine_restaurants_active_status ON dine_restaurants(is_active, status);
        CREATE INDEX IF NOT EXISTS idx_dine_restaurants_city ON dine_restaurants(city);
        CREATE INDEX IF NOT EXISTS idx_dine_restaurants_location ON dine_restaurants(latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_dine_restaurants_rating ON dine_restaurants(rating DESC);
        CREATE INDEX IF NOT EXISTS idx_dine_restaurants_slug ON dine_restaurants(slug);
        CREATE INDEX IF NOT EXISTS idx_dine_restaurant_hours_restaurant ON dine_restaurant_hours(restaurant_id, day_of_week);
        CREATE INDEX IF NOT EXISTS idx_dine_menu_categories_restaurant ON dine_restaurant_menu_categories(restaurant_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_dine_menu_items_category ON dine_restaurant_menu_items(category_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_dine_restaurant_favorites_user ON dine_restaurant_favorites(user_id, restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_dine_activities_group ON dine_activities(group_id, activity_date);
        CREATE INDEX IF NOT EXISTS idx_dine_reservations_group ON dine_restaurant_reservations(group_id, reservation_date);
    `);

    // 13. Tour Packages Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tour_packages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'Hotel',
            category TEXT NOT NULL DEFAULT 'hotel',
            destination TEXT NOT NULL,
            country TEXT DEFAULT 'India',
            duration TEXT DEFAULT '5D/4N',
            date_range TEXT DEFAULT 'Jun 15-22',
            guests INT DEFAULT 2,
            match_score INT DEFAULT 90,
            rating NUMERIC(3, 2) DEFAULT 4.80,
            base_price NUMERIC(12, 2) NOT NULL DEFAULT 15000,
            total_nights INT DEFAULT 7,
            style TEXT DEFAULT 'Boutique',
            distance TEXT DEFAULT '0.5 km',
            featured BOOLEAN DEFAULT FALSE,
            status TEXT NOT NULL DEFAULT 'Published',
            image TEXT NOT NULL,
            alt_images JSONB DEFAULT '[]'::jsonb,
            metrics JSONB DEFAULT '{"walk": 90, "food": 90, "activity": 90}'::jsonb,
            why_matched JSONB DEFAULT '[]'::jsonb,
            itinerary_highlights JSONB DEFAULT '[]'::jsonb,
            inclusions JSONB DEFAULT '[]'::jsonb,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await pool.query(`
        ALTER TABLE tour_packages ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'INR';
        UPDATE tour_packages SET currency = 'INR' WHERE currency IS DISTINCT FROM 'INR';

        CREATE TABLE IF NOT EXISTS tour_package_reservations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            package_id UUID NOT NULL REFERENCES tour_packages(id) ON DELETE RESTRICT,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
            guest_count INTEGER NOT NULL CHECK (guest_count > 0),
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            status VARCHAR(32) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CHECK (end_date >= start_date)
        );

        ALTER TABLE tour_package_reservations
            ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_package_reservations_user_created
            ON tour_package_reservations(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_package_reservations_group
            ON tour_package_reservations(group_id, created_at DESC);
    `);

    const countRes = await pool.query('SELECT COUNT(*) FROM tour_packages');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
        const seedPackages = [
            {
                title: 'Cozy Den', type: 'Hotel', category: 'hotel', destination: 'Barcelona', country: 'Spain',
                duration: '7D/6N', date_range: 'Jun 15-22', guests: 2, match_score: 91, rating: 4.78, base_price: 14600,
                total_nights: 7, style: 'Boutique', distance: '0.3 km', featured: true, status: 'Published',
                image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
                alt_images: JSON.stringify([
                    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
                    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80'
                ]),
                metrics: JSON.stringify({ walk: 91, food: 91, activity: 91 }),
                why_matched: JSON.stringify([
                    { icon: 'walk', title: 'Walkable to your saved spots', description: '4 of your wishlist places within 800m' },
                    { icon: 'food', title: 'Food scene fits your trips', description: 'Matches where you ate in Lisbon & Rome' }
                ]),
                itinerary_highlights: JSON.stringify(['Gothic Quarter walking tour', 'Sagrada Familia guided visit', 'Tapas tasting session']),
                inclusions: JSON.stringify(['Daily Breakfast', 'Airport Transfer', 'City Pass']),
                description: 'Charming boutique hotel in central Barcelona with historic aesthetic and modern amenities.'
            },
            {
                title: 'Oasis Villa', type: 'Villa', category: 'villa', destination: 'San Francisco', country: 'USA',
                duration: '7D/6N', date_range: 'Jun 15-22', guests: 5, match_score: 95, rating: 4.96, base_price: 28000,
                total_nights: 7, style: 'Modern Minimalist', distance: '0.5 km', featured: true, status: 'Published',
                image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
                alt_images: JSON.stringify([
                    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80'
                ]),
                metrics: JSON.stringify({ walk: 94, food: 96, activity: 88 }),
                why_matched: JSON.stringify([
                    { icon: 'walk', title: 'Central location near Golden Gate parks', description: 'Direct cycling route and cable car access' },
                    { icon: 'quiet', title: 'Hillside retreat with sunset views', description: 'Sound-insulated architecture with private terrace' }
                ]),
                itinerary_highlights: JSON.stringify(['Golden Gate bay cruise', 'Napa Valley wine day trip', 'Private terrace chef sunset session']),
                inclusions: JSON.stringify(['Private Chef', 'EV Charger', 'Luxury Concierge']),
                description: 'Luxury hillside retreat in San Francisco with floor-to-ceiling glass and private sunset deck.'
            },
            {
                title: 'Garden Escape House', type: 'House', category: 'villa', destination: 'Provence', country: 'France',
                duration: '6D/5N', date_range: 'Jun 15-22', guests: 3, match_score: 87, rating: 4.89, base_price: 13200,
                total_nights: 7, style: 'Coastal', distance: '1.2 km', featured: false, status: 'Published',
                image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
                alt_images: JSON.stringify([]),
                metrics: JSON.stringify({ walk: 85, food: 89, activity: 84 }),
                why_matched: JSON.stringify([
                    { icon: 'walk', title: 'Lush botanical garden proximity', description: 'Surrounded by lavender fields' }
                ]),
                itinerary_highlights: JSON.stringify(['Lavender valley photo walk', 'Organic farm dining', 'Winery masterclass']),
                inclusions: JSON.stringify(['Bicycle Rental', 'Wine Tasting', 'Garden Access']),
                description: 'Serene French country home with private botanical gardens and lavender field vistas.'
            }
        ];

        for (const p of seedPackages) {
            await pool.query(`
                INSERT INTO tour_packages (
                    title, type, category, destination, country, duration, date_range, guests, match_score, rating,
                    base_price, total_nights, style, distance, featured, status, image, alt_images, metrics, why_matched,
                    itinerary_highlights, inclusions, description
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
            `, [
                p.title, p.type, p.category, p.destination, p.country, p.duration, p.date_range, p.guests, p.match_score, p.rating,
                p.base_price, p.total_nights, p.style, p.distance, p.featured, p.status, p.image, p.alt_images, p.metrics, p.why_matched,
                p.itinerary_highlights, p.inclusions, p.description
            ]);
        }
    }
    await seedExplorePackages();
};

const seedExplorePackages = async () => {
    const packages = [
        ['Lantern House Stay', 'Hotel', 'hotel', 'Kyoto', 'Japan', '5D/4N', 'Oct 10-14', 2, 94, 4.91, 22400, 4, 'Heritage', true, 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=80', "A calm heritage stay near Kyoto's temple lanes, gardens, and traditional tea houses."],
        ['Lake Pichola Palace Escape', 'Hotel', 'hotel', 'Udaipur', 'India', '4D/3N', 'Nov 06-09', 2, 96, 4.95, 26800, 3, 'Luxury', true, 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1000&q=80', "A lakeside heritage escape with rooftop dining and views across Udaipur's old city."],
        ['South Goa Beachfront Villa', 'Villa', 'villa', 'South Goa', 'India', '6D/5N', 'Dec 12-17', 4, 93, 4.88, 31500, 5, 'Coastal', false, 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=80', 'A relaxed private villa close to quiet beaches, local seafood, and palm-lined lanes.'],
        ['Himalayan Pine Camp', 'Camping', 'camping', 'Manali', 'India', '5D/4N', 'Jan 18-22', 2, 90, 4.82, 17200, 4, 'Adventure', false, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80', 'A mountain camp base for forest walks, alpine views, and guided day hikes.'],
        ['Bali Jungle Wellness Retreat', 'Resort', 'resort', 'Ubud', 'Indonesia', '7D/6N', 'Feb 03-09', 2, 95, 4.94, 38200, 6, 'Wellness', true, 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=80', 'A tropical retreat with a quiet garden setting, wellness sessions, and easy access to Ubud.'],
        ['Jaipur Heritage Haveli', 'House', 'villa', 'Jaipur', 'India', '4D/3N', 'Mar 14-17', 3, 91, 4.87, 19800, 3, 'Heritage', false, 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1000&q=80', "A restored haveli stay within reach of Jaipur's historic forts, markets, and cuisine."]
    ];

    for (const p of packages) {
        await pool.query(`
            INSERT INTO tour_packages (
                title, type, category, destination, country, duration, date_range, guests, match_score,
                rating, base_price, total_nights, style, featured, status, image, description
            )
            SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Published',$15,$16
            WHERE NOT EXISTS (
                SELECT 1 FROM tour_packages WHERE LOWER(title) = LOWER($1) AND LOWER(destination) = LOWER($4)
            )
        `, p);
    }
};

module.exports = { pool, initializeDatabase };