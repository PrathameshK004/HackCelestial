const test = require('node:test');
const assert = require('node:assert/strict');
const { unwrapRedisCacheValue } = require('../utils/cache.util');

test('unwrapRedisCacheValue decodes the Upstash value/ex cache envelope', () => {
  const restaurants = [{ id: 'restaurant-1', name: 'Coastal Table' }];
  const envelope = JSON.stringify({ value: JSON.stringify(restaurants), ex: 600 });

  assert.deepEqual(unwrapRedisCacheValue(envelope), restaurants);
});

test('unwrapRedisCacheValue preserves ordinary cached objects', () => {
  const cached = { value: 'business-value', ex: 'not-a-ttl', metadata: true };

  assert.deepEqual(unwrapRedisCacheValue(cached), cached);
});
