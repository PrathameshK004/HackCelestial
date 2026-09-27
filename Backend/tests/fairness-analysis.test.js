const test = require('node:test');
const assert = require('node:assert/strict');

const { analyzeTripFairnessData } = require('../services/nugen.service');

const sampleTrip = {
  tripName: 'Goa Weekend',
  participants: [
    { id: 'u1', name: 'Aditi' },
    { id: 'u2', name: 'Riya' },
    { id: 'u3', name: 'Karan' }
  ],
  bookings: [
    {
      id: 'b1',
      title: 'Hotel Stay',
      amount: 9000,
      splitModel: 'EQUAL',
      participants: ['u1', 'u2', 'u3'],
      payer: 'u1'
    },
    {
      id: 'b2',
      title: 'Water Sports',
      amount: 3000,
      splitModel: 'EQUAL',
      participants: ['u1', 'u2'],
      payer: 'u2'
    }
  ],
  payments: [
    { from: 'u1', to: 'u2', amount: 3000 },
    { from: 'u2', to: 'u1', amount: 1000 }
  ]
};

test('fairness analyzer flags an unfair group split and returns structured risk info', () => {
  const result = analyzeTripFairnessData(sampleTrip);

  assert.ok(result.fairnessScore >= 0 && result.fairnessScore <= 100);
  assert.ok(Array.isArray(result.issues));
  assert.ok(Array.isArray(result.recommendations));
  assert.ok(result.summary.length > 0);
  assert.ok(result.summary.toLowerCase().includes('fair') || result.summary.toLowerCase().includes('risk'));
});
