require('dotenv').config();
const { Client } = require('pg');

const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;

if (!sourceUrl || !targetUrl) {
    throw new Error('SOURCE_DATABASE_URL/DATABASE_URL and TARGET_DATABASE_URL are required');
}

const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;
const tableRef = (name) => `public.${quote(name)}`;

async function getTables(client) {
    const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
    `);
    return result.rows.map(row => row.table_name);
}

async function ensureLegacyTables(target) {
    await target.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS admin_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            admin_id UUID NOT NULL,
            refresh_token_hash TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS triptual_admin_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS triptual_admin_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            admin_id UUID NOT NULL,
            refresh_token_hash TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS broadcast_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            channels TEXT[] NOT NULL,
            target_audience TEXT NOT NULL,
            action_url TEXT,
            category TEXT DEFAULT 'general',
            stats JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS settlement_records (
            id UUID PRIMARY KEY,
            group_id UUID NOT NULL,
            paid_by UUID NOT NULL,
            paid_to UUID NOT NULL,
            amount NUMERIC(14, 2) NOT NULL,
            payment_method VARCHAR(20) NOT NULL,
            remarks VARCHAR(255) NOT NULL,
            created_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS user_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            type TEXT DEFAULT 'broadcast',
            action_url TEXT,
            category TEXT DEFAULT 'general',
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
}

async function getColumns(client, table) {
    const result = await client.query(`
        SELECT column_name, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
    `, [table]);
    return result.rows.map(row => row.column_name);
}

async function getColumnTypes(client, table) {
    const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
    `, [table]);
    return new Map(result.rows.map(row => [row.column_name, row.data_type]));
}

async function getDependencies(client, tables) {
    const result = await client.query(`
        SELECT
            tc.table_name AS child_table,
            ccu.table_name AS parent_table
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
    `);
    const allowed = new Set(tables);
    const dependencies = new Map(tables.map(table => [table, new Set()]));
    for (const row of result.rows) {
        if (allowed.has(row.child_table) && allowed.has(row.parent_table) && row.child_table !== row.parent_table) {
            dependencies.get(row.child_table).add(row.parent_table);
        }
    }
    return dependencies;
}

function dependencyOrder(tables, dependencies) {
    const remaining = new Map([...dependencies].map(([table, deps]) => [table, new Set(deps)]));
    const ordered = [];
    while (remaining.size > 0) {
        const ready = [...remaining.entries()]
            .filter(([, deps]) => deps.size === 0)
            .map(([table]) => table)
            .sort();
        if (ready.length === 0) {
            throw new Error(`Foreign-key cycle detected among: ${[...remaining.keys()].join(', ')}`);
        }
        for (const table of ready) {
            ordered.push(table);
            remaining.delete(table);
        }
        for (const deps of remaining.values()) {
            ready.forEach(table => deps.delete(table));
        }
    }
    return ordered;
}

async function copyTable(source, target, table) {
    const [sourceColumns, targetColumns, targetTypes] = await Promise.all([
        getColumns(source, table),
        getColumns(target, table),
        getColumnTypes(target, table),
    ]);
    const columns = sourceColumns.filter(column => targetColumns.includes(column));
    if (columns.length === 0) return 0;

    const rows = (await source.query(`SELECT ${columns.map(quote).join(', ')} FROM ${tableRef(table)}`)).rows;
    if (rows.length === 0) return 0;

    const columnSql = columns.map(quote).join(', ');
    for (const row of rows) {
        const values = columns.map(column => {
            const value = row[column];
            if (value !== null && (targetTypes.get(column) === 'json' || targetTypes.get(column) === 'jsonb') && typeof value === 'object') {
                return JSON.stringify(value);
            }
            return value;
        });
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        try {
            await target.query(
                `INSERT INTO ${tableRef(table)} (${columnSql}) VALUES (${placeholders})`,
                values
            );
        } catch (error) {
            const badColumn = columns.find((column, index) => typeof values[index] === 'string' && values[index].trim().startsWith('{'));
            throw new Error(`Failed copying ${table}: ${error.message}${badColumn ? ` (possible JSON column ${badColumn})` : ''}`);
        }
    }
    return rows.length;
}

async function resetSequences(target, tables) {
    for (const table of tables) {
        const result = await target.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
              AND column_default LIKE 'nextval(%'
              AND data_type IN ('integer', 'bigint')
            LIMIT 1
        `, [table]);
        if (result.rows.length === 0) continue;
        const column = result.rows[0].column_name;
        await target.query(`
            SELECT setval(
                pg_get_serial_sequence($1, $2),
                COALESCE((SELECT MAX(${quote(column)}) FROM ${tableRef(table)}), 1),
                EXISTS (SELECT 1 FROM ${tableRef(table)})
            )
        `, [`public.${table}`, column]);
    }
}

async function main() {
    const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
    const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });
    await source.connect();
    await target.connect();

    try {
        await ensureLegacyTables(target);
        const sourceTables = await getTables(source);
        const targetTables = new Set(await getTables(target));
        const tables = sourceTables.filter(table => targetTables.has(table));
        const dependencies = await getDependencies(target, tables);
        const order = dependencyOrder(tables, dependencies);

        await target.query('BEGIN');
        if (tables.length > 0) {
            await target.query(`TRUNCATE TABLE ${tables.map(tableRef).join(', ')} RESTART IDENTITY CASCADE`);
        }

        const counts = {};
        for (const table of order) {
            counts[table] = await copyTable(source, target, table);
        }
        await resetSequences(target, tables);
        await target.query('COMMIT');

        console.log(JSON.stringify({ migratedTables: order.length, rowCounts: counts }, null, 2));
    } catch (error) {
        await target.query('ROLLBACK').catch(() => { });
        throw error;
    } finally {
        await source.end();
        await target.end();
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});