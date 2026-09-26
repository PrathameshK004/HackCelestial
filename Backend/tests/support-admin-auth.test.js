const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const jwt = require('jsonwebtoken');
const authenticateSupportAdmin = require('../middleware/support-admin.middleware');

const testSecret = 'support-admin-test-secret';
const originalSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = testSecret;

after(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
});

function authorize(token) {
    const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
    const res = {
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
    let nextCalled = false;

    authenticateSupportAdmin(req, res, () => {
        nextCalled = true;
    });

    return { req, res, nextCalled };
}

test('accepts a signed dashboard access token', () => {
    const token = jwt.sign({ sub: 'admin-123', email: 'admin@example.com', type: 'access' }, testSecret, { expiresIn: '1m' });
    const result = authorize(token);

    assert.equal(result.nextCalled, true);
    assert.deepEqual(result.req.admin, { id: 'admin-123', email: 'admin@example.com' });
});

test('rejects missing and invalid tokens', () => {
    assert.equal(authorize().res.statusCode, 401);
    assert.equal(authorize('not-a-jwt').res.statusCode, 401);
});

test('rejects non-admin and expired access tokens', () => {
    const userToken = jwt.sign({ sub: 'user-123', type: 'user' }, testSecret, { expiresIn: '1m' });
    const expiredToken = jwt.sign({ sub: 'admin-123', type: 'access' }, testSecret, { expiresIn: '-1s' });

    assert.equal(authorize(userToken).res.statusCode, 403);
    assert.equal(authorize(expiredToken).res.statusCode, 401);
});