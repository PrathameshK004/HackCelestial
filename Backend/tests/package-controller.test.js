const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizePackageRow, normalizePackagesPayload, validateReservationPayload } = require('../controllers/package.controller');
const { mockRestaurants } = require('../services/dine/providers/mock.provider');

test('package normalization keeps INR pricing metadata', () => {
  const pkg = normalizePackageRow({
    id: 'pkg-1',
    title: 'Golden Coast Stay',
    type: 'Hotel',
    category: 'hotel',
    destination: 'Goa',
    base_price: '18000',
    total_nights: 5,
    rating: 4.9,
    description: 'A seaside stay'
  });

  assert.equal(pkg.currency, 'INR');
  assert.equal(pkg.basePrice, 18000);
  assert.equal(pkg.pricePerNight, 3600);
});

test('package payload normalizer unwraps cached arrays', () => {
  const data = normalizePackagesPayload({ value: [{ id: 'p1' }, { id: 'p2' }] });
  assert.deepEqual(data.map((item) => item.id), ['p1', 'p2']);
});

test('reservation payload validation accepts a valid INR booking request', () => {
  const result = validateReservationPayload({
    guestCount: 3,
    startDate: '2026-10-12',
    endDate: '2026-10-15',
    notes: 'Arriving in the evening'
  });

  assert.deepEqual(result.value, {
    guestCount: 3,
    startDate: '2026-10-12',
    endDate: '2026-10-15',
    notes: 'Arriving in the evening',
    tripId: null
  });
});

test('reservation payload keeps an optional existing trip id', () => {
  const tripId = '5f50fa51-fd39-4db8-a95b-efed6d28331c';
  const result = validateReservationPayload({
    guestCount: 2,
    startDate: '2026-10-12',
    endDate: '2026-10-15',
    tripId
  });

  assert.equal(result.value.tripId, tripId);
});

test('reservation payload rejects malformed existing trip ids', () => {
  assert.match(validateReservationPayload({
    guestCount: 2,
    startDate: '2026-10-12',
    endDate: '2026-10-15',
    tripId: 'not-a-trip'
  }).error, /valid trip/);
});

test('reservation payload validation rejects invalid guests and date ranges', () => {
  assert.match(validateReservationPayload({ guestCount: 0, startDate: '2026-10-15', endDate: '2026-10-12' }).error, /Guest count/);
  assert.match(validateReservationPayload({ guestCount: 2, startDate: '2026-02-30', endDate: '2026-03-01' }).error, /date range/);
});

test('fallback restaurant seed set includes at least twenty entries', () => {
  assert.ok(Array.isArray(mockRestaurants));
  assert.ok(mockRestaurants.length >= 20, `Expected at least 20 restaurants, received ${mockRestaurants.length}`);
});
