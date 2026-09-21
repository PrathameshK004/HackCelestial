const test = require('node:test');
const assert = require('node:assert');
const { getFirebaseAdmin, saveUserPushToken, removeUserPushToken } = require('../utils/notification.util');
const { initializeDatabase, pool } = require('../utils/db.util');

test('Firebase Admin SDK should initialize properly', () => {
    const admin = getFirebaseAdmin();
    assert.ok(admin, 'Firebase admin instance should be returned');
    assert.strictEqual(typeof admin.messaging, 'function', 'admin.messaging should be a function');
});

test('Database schema initialization includes user_push_tokens', async () => {
    await initializeDatabase();
    const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_push_tokens'
    `);
    const columnNames = res.rows.map(r => r.column_name);
    assert.ok(columnNames.includes('id'), 'user_push_tokens should have id column');
    assert.ok(columnNames.includes('user_id'), 'user_push_tokens should have user_id column');
    assert.ok(columnNames.includes('token'), 'user_push_tokens should have token column');
    assert.ok(columnNames.includes('device_type'), 'user_push_tokens should have device_type column');
});

test('Push token registration and removal handles gracefully', async () => {
    // Test with mock data
    const dummyUserId = '00000000-0000-0000-0000-000000000000';
    const dummyToken = 'mock_fcm_token_123456';
    
    // Removing non-existent token should succeed without throwing
    const removed = await removeUserPushToken(dummyUserId, dummyToken);
    assert.strictEqual(removed, true);
});

test.after(async () => {
    await pool.end();
});
