const test = require('node:test');
const assert = require('node:assert/strict');
const { ILLUSTRATIONS, ILLUSTRATION_CATEGORIES, getIllustrations } = require('../controllers/illustration.controller');

test('Illustration Catalog: contains exactly 10 real Google-style traveler illustrations', () => {
    assert.equal(ILLUSTRATIONS.length, 10, 'Must have exactly 10 illustrations');

    for (const item of ILLUSTRATIONS) {
        assert.ok(item.id.startsWith('ill_'), `Item id ${item.id} must start with ill_`);
        assert.ok(item.name && item.name.length > 0, `Item ${item.id} must have a name`);
        assert.ok(item.category, `Item ${item.id} must have a category`);
        assert.ok(item.imageUrl && item.imageUrl.endsWith('.jpg'), `Item ${item.id} must have a .jpg imageUrl`);
        assert.ok(Array.isArray(item.tags) && item.tags.length > 0, `Item ${item.id} must have tags`);
    }
});

test('Illustration Controller: getIllustrations responds with 10 items and categories', async () => {
    let responseData = null;
    const req = { query: {} };
    const res = {
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            responseData = data;
            return this;
        }
    };

    await getIllustrations(req, res);

    assert.ok(responseData, 'Response data must be sent');
    assert.equal(responseData.statusCode, 200);
    assert.equal(responseData.data.illustrations.length, 10);
    assert.ok(responseData.data.categories.length > 0);
});
