const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeRestaurantPayload,
  dedupeRestaurants,
  buildRestaurantSearchCacheKey,
  isRestaurantOpenNow,
  buildRestaurantTimeSlots,
  buildNearbyQueryKey,
  parseOptionalBoolean
} = require('../utils/dine.util');

const {
  createFallbackProvider
} = require('../services/dine/providers/mock.provider');

test('normalizeRestaurantPayload produces a stable internal shape', () => {
  const restaurant = normalizeRestaurantPayload({
    provider: 'fallback',
    providerId: 'p-1001',
    name: 'Cedar & Bloom',
    cuisines: ['Italian', 'Cafe'],
    rating: 4.8,
    review_count: 512,
    address: 'Baga, Goa',
    city: 'Baga',
    latitude: 15.5555,
    longitude: 73.7528,
    opening_hours: [{ day: 'MON', intervals: [{ open: '09:00', close: '22:00' }] }],
    phone: '+91 90000 23456',
    website: 'https://example.com',
    price_level: '₹₹₹',
    is_group_friendly: true,
    photos: [{ url: 'https://example.com/food.jpg' }],
    description: 'A light-filled dining spot.'
  });

  assert.equal(restaurant.provider, 'fallback');
  assert.equal(restaurant.providerPlaceId, 'p-1001');
  assert.equal(restaurant.name, 'Cedar & Bloom');
  assert.deepEqual(restaurant.cuisine, ['Italian', 'Cafe']);
  assert.equal(restaurant.groupFriendly, true);
  assert.equal(restaurant.priceLevel, '₹₹₹');
  assert.ok(Array.isArray(restaurant.hours));
  assert.ok(Array.isArray(restaurant.photos));
});

test('dedupeRestaurants removes duplicates with same provider and place id', () => {
  const restaurants = [
    { id: 'r-1', provider: 'fallback', providerPlaceId: 'p-101', name: 'Coastal Kitchen', latitude: 15.5, longitude: 73.8 },
    { id: 'r-2', provider: 'fallback', providerPlaceId: 'p-101', name: 'Coastal Kitchen', latitude: 15.5, longitude: 73.8 },
    { id: 'r-3', provider: 'fallback', providerPlaceId: 'p-202', name: 'Coastal Kitchen', latitude: 15.51, longitude: 73.81 },
  ];

  const deduped = dedupeRestaurants(restaurants);
  assert.equal(deduped.length, 2);
  assert.ok(deduped.some((entry) => entry.id === 'r-1'));
  assert.ok(deduped.some((entry) => entry.id === 'r-3'));
});

test('search cache key is deterministic for nearby filters', () => {
  const first = buildRestaurantSearchCacheKey({ query: 'seafood', latitude: 15.49, longitude: 73.82, radius: 5000, cuisine: 'Seafood', sort: 'rating' });
  const second = buildRestaurantSearchCacheKey({ query: 'seafood', latitude: 15.49, longitude: 73.82, radius: 5000, cuisine: 'Seafood', sort: 'rating' });
  assert.equal(first, second);
  assert.match(first, /^dine:search:/);
});

test('optional boolean filters preserve undefined for absent values', () => {
  assert.equal(parseOptionalBoolean(undefined), undefined);
  assert.equal(parseOptionalBoolean('true'), true);
  assert.equal(parseOptionalBoolean('false'), false);
  assert.equal(parseOptionalBoolean('1'), true);
  assert.equal(parseOptionalBoolean('0'), false);
});

test('open-now calculation respects restaurant timezone and hours', () => {
  const restaurant = {
    timezone: 'Asia/Kolkata',
    hours: [
      { day: 'MON', intervals: [{ open: '09:00', close: '22:00' }] },
      { day: 'TUE', intervals: [{ open: '09:00', close: '22:00' }] }
    ],
    specialHours: []
  };

  const now = new Date('2026-09-28T20:30:00+05:30');
  assert.equal(isRestaurantOpenNow(restaurant, now), true);

  const closed = new Date('2026-09-28T23:30:00+05:30');
  assert.equal(isRestaurantOpenNow(restaurant, closed), false);
});

test('time slots stay within restaurant opening hours and respect closed days', () => {
  const hours = [
    { day: 'MON', intervals: [{ open: '17:00:00', close: '20:00:00' }] },
    { day: 'TUE', isClosed: true, intervals: [] },
  ];

  const mondaySlots = buildRestaurantTimeSlots(hours, '2026-09-28');
  assert.deepEqual(mondaySlots[0], { startTime: '17:00', endTime: '18:00' });
  assert.deepEqual(mondaySlots.at(-1), { startTime: '19:00', endTime: '20:00' });
  assert.equal(mondaySlots.some((slot) => slot.startTime === '19:30'), false);
  assert.deepEqual(buildRestaurantTimeSlots(hours, '2026-09-29'), []);
});

test('fallback provider can supply a realistic restaurant list', async () => {
  const provider = createFallbackProvider();
  const results = await provider.searchRestaurants({ query: 'coastal', latitude: 15.49, longitude: 73.82, radius: 5000, limit: 5 });
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);
  assert.equal(results[0].name.length > 0, true);
});

test('nearby cache key includes geohash and filters', () => {
  const key = buildNearbyQueryKey({ latitude: 15.49, longitude: 73.82, radius: 5000, priceLevel: '₹₹', openNow: true });
  assert.match(key, /^dine:nearby:/);
  assert.ok(key.length > 20);
});
