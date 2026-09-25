const test = require('node:test');
const assert = require('node:assert');

const { buildPackageCacheKey, getPackageCacheConfig } = require('../utils/cache.util');

test('buildPackageCacheKey normalizes query params for cache hits', () => {
  assert.strictEqual(buildPackageCacheKey({ category: 'Hotel', destination: '  Barcelona  ' }), 'packages:hotel:barcelona');
  assert.strictEqual(buildPackageCacheKey({ category: 'all', destination: 'Paris' }), 'packages:all:paris');
});

test('package cache config uses sane production defaults', () => {
  const config = getPackageCacheConfig();
  assert.ok(config.ttlSeconds > 0);
  assert.ok(config.staleSeconds > config.ttlSeconds);
  assert.ok(config.enabled === true || config.enabled === false);
});
