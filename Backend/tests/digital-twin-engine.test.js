const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateImpact, compareImpacts } = require('../services/digital-twin.engine');

const weather = (overrides = {}) => ({
    location: { latitude: 19.076, longitude: 72.877 },
    current: { temp: 28, wind_speed: 4, humidity: 70, weather: [{ main: 'Clear' }], ...overrides },
    hourly: [{ dt: 1 }],
    daily: []
});

test('baseline model differentiates normal and extreme weather', () => {
    const normal = calculateImpact({ weather: weather() });
    const extreme = calculateImpact({
        weather: weather({ temp: 35, wind_speed: 18, weather: [{ main: 'Rain' }] }),
        overrides: { rainfall: 80, stormDuration: 6, weatherSeverity: 1.4 }
    });

    assert.equal(normal.impactLevel, 'LOW');
    assert.ok(['HIGH', 'SEVERE'].includes(extreme.impactLevel));
    assert.ok(extreme.tripImpact.prediction > normal.tripImpact.prediction);
    assert.ok(extreme.tripImpact.lowerBound <= extreme.tripImpact.prediction);
    assert.ok(extreme.tripImpact.upperBound >= extreme.tripImpact.prediction);
    assert.equal(extreme.effects[1].propagationLevel, 'SECONDARY');
});

test('simulation comparison is virtual and reports before/after changes', () => {
    const before = calculateImpact({ weather: weather() });
    const after = calculateImpact({ weather: weather(), overrides: { rainfall: 80, stormDuration: 6 } });
    const changes = compareImpacts(before, after);

    assert.ok(changes.tripImpact.after > changes.tripImpact.before);
    assert.ok(changes.transportDisruption.change > 0);
    assert.ok(changes.cancellationRisk.change > 0);
});
