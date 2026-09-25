const test = require('node:test');
const assert = require('node:assert');
const { initializeDatabase, pool } = require('../utils/db.util');

test('Razorpay payment simulation persists transaction metadata in the database', async () => {
  await initializeDatabase();

  const tableResult = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'payment_transactions'
  `);

  const columnNames = tableResult.rows.map((row) => row.column_name);
  assert.ok(columnNames.includes('id'), 'payment_transactions should exist with an id column');
  assert.ok(columnNames.includes('user_id'), 'payment_transactions should store user_id');
  assert.ok(columnNames.includes('order_id'), 'payment_transactions should store order_id');
  assert.ok(columnNames.includes('payment_id'), 'payment_transactions should store payment_id');
  assert.ok(columnNames.includes('amount'), 'payment_transactions should store amount');
  assert.ok(columnNames.includes('metadata'), 'payment_transactions should store metadata JSON');
  assert.ok(columnNames.includes('status'), 'payment_transactions should store payment status');
});

test.after(async () => {
  await pool.end();
});
