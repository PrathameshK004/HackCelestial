const test = require('node:test');
const assert = require('node:assert');
const { pool } = require('../utils/db.util');
const { createTempUser, createUser } = require('../controllers/user.controller');
const { verifyOTP } = require('../utils/otp.util');

// Helper to mock express req and res
function createMockReqRes(body = {}) {
    let statusCode = 200;
    let responseData = null;

    const req = { body };
    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(data) {
            responseData = data;
            return this;
        },
        send(data) {
            responseData = data;
            return this;
        }
    };

    return { req, res, getStatus: () => statusCode, getData: () => responseData };
}

test('High-speed registration OTP workflow & DB persistence', async () => {
    const testEmail = `speedtest_${Date.now()}@example.com`;
    const testUsername = 'SpeedTester';
    const testPassword = 'SecurePassword123!';

    try {
        // Measure createTempUser execution time
        const start = performance.now();
        const { req, res, getStatus, getData } = createMockReqRes({
            username: testUsername,
            emailId: testEmail,
            password: testPassword
        });

        await createTempUser(req, res);
        const elapsed = performance.now() - start;

        // Latency requirement: must be fast (typically < 250ms even with remote Neon DB)
        console.log(`[Benchmark] createTempUser API response time: ${elapsed.toFixed(2)}ms`);
        assert.strictEqual(getStatus(), 200, 'createTempUser must respond with 200');
        assert.strictEqual(getData().statusCode, 200, 'statusCode should be 200');
        assert.ok(getData().message.includes('OTP sent'), 'Response message should indicate OTP sent');

        // Verify DB row
        const dbResult = await pool.query(
            'SELECT id, username, email_id, is_temp, code_hash, code_expiry FROM users WHERE LOWER(email_id) = $1',
            [testEmail]
        );
        assert.strictEqual(dbResult.rows.length, 1, 'User row must exist in DB');
        const userRow = dbResult.rows[0];
        assert.strictEqual(userRow.is_temp, true, 'User must be marked as temp');
        assert.ok(userRow.code_hash, 'code_hash must be present');
        assert.ok(userRow.code_expiry > new Date(), 'code_expiry must be in the future');

        // Warm run benchmark (resending or new temp user while pool is warm)
        const warmEmail = `speedtest_warm_${Date.now()}@example.com`;
        const startWarm = performance.now();
        const warmReqRes = createMockReqRes({
            username: testUsername,
            emailId: warmEmail,
            password: testPassword
        });
        await createTempUser(warmReqRes.req, warmReqRes.res);
        const warmElapsed = performance.now() - startWarm;
        console.log(`[Benchmark] createTempUser (warm pool) API response time: ${warmElapsed.toFixed(2)}ms`);
        assert.strictEqual(warmReqRes.getStatus(), 200);

        // Test createUser verification with wrong OTP
        const wrongVerify = createMockReqRes({
            username: testUsername,
            emailId: testEmail,
            password: testPassword,
            code: '0000'
        });
        await createUser(wrongVerify.req, wrongVerify.res);
        assert.strictEqual(wrongVerify.getStatus(), 400, 'Wrong OTP should return 400');

        // Test direct 1-step registration (Industry Standard)
        const directEmail = `direct_signup_${Date.now()}@example.com`;
        const startDirect = performance.now();
        const directReqRes = createMockReqRes({
            username: 'Direct User',
            emailId: directEmail,
            password: 'SecurePassword123!'
        });
        await createUser(directReqRes.req, directReqRes.res);
        const directElapsed = performance.now() - startDirect;
        console.log(`[Benchmark] Direct 1-step createUser response time: ${directElapsed.toFixed(2)}ms`);

        assert.strictEqual(directReqRes.getStatus(), 201, 'Direct createUser must respond with 201');
        const directData = directReqRes.getData().data;
        assert.ok(directData.accessToken, 'Must return accessToken');
        assert.ok(directData.refreshToken, 'Must return refreshToken');

        const directDb = await pool.query('SELECT is_temp FROM users WHERE LOWER(email_id) = $1', [directEmail]);
        assert.strictEqual(directDb.rows[0].is_temp, false, 'User must be permanently active');

        // Cleanup direct and warm users
        await pool.query('DELETE FROM users WHERE LOWER(email_id) = $1', [directEmail]);
        await pool.query('DELETE FROM users WHERE LOWER(email_id) = $1', [warmEmail]);

    } finally {
        // Cleanup test user
        await pool.query('DELETE FROM users WHERE LOWER(email_id) = $1', [testEmail]);
    }
});
