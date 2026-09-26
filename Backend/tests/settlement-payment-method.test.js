const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettlementPaymentMethod } = require('../controllers/expense.controller');

test('settlement payment method accepts Cash and UPI case-insensitively', () => {
  assert.equal(normalizeSettlementPaymentMethod('cash'), 'CASH');
  assert.equal(normalizeSettlementPaymentMethod('UPI'), 'UPI');
});

test('settlement payment method defaults to UPI and rejects unsupported methods', () => {
  assert.equal(normalizeSettlementPaymentMethod(), 'UPI');
  assert.equal(normalizeSettlementPaymentMethod('CARD'), null);
});
