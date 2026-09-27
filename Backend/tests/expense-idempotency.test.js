const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalizePayload } = require('../controllers/expense.controller');

test('canonicalizes object keys recursively while preserving array order', () => {
    const first = {
        z: 1,
        participants: [{ memberId: 'member-1', shareValue: 1 }],
        a: { y: 2, x: 3 }
    };
    const reordered = {
        a: { x: 3, y: 2 },
        participants: [{ shareValue: 1, memberId: 'member-1' }],
        z: 1
    };

    assert.equal(
        JSON.stringify(canonicalizePayload(first)),
        JSON.stringify(canonicalizePayload(reordered))
    );
    assert.notEqual(
        JSON.stringify(canonicalizePayload({ items: [1, 2] })),
        JSON.stringify(canonicalizePayload({ items: [2, 1] }))
    );
});