const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('../services/digital-twin.service');
const dbUtil = require('../utils/db.util');

const originalFetch = global.fetch;
const originalPoolQuery = dbUtil.pool.query;

const mockOpenWeather = async (url) => {
  const requestUrl = new URL(String(url));
  const payload = {
    lat: Number(requestUrl.searchParams.get('lat')),
    lon: Number(requestUrl.searchParams.get('lon')),
    current: {
      temp: 28,
      humidity: 60,
      wind_speed: 12,
      weather: [{ main: 'Rain', description: 'light rain' }],
      rain: { '1h': 14 }
    },
    hourly: [],
    daily: [],
    alerts: []
  };

  return {
    ok: true,
    json: async () => payload
  };
};

test('buildTripState uses live coordinates when supplied', async () => {
  process.env.API_WEATHER_KEY = 'test-key';
  global.fetch = async (url) => {
    const requestUrl = new URL(String(url));
    if (requestUrl.hostname.includes('openweathermap')) {
      return mockOpenWeather(url);
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  dbUtil.pool.query = async (sql, params) => {
    if (String(sql).includes('FROM social_signals')) {
      return { rows: [] };
    }
    if (String(sql).includes('INSERT INTO digital_twin_states')) {
      return { rows: [] };
    }
    return { rows: [] };
  };

  try {
    const state = await service.buildTripState({
      id: 'trip-123',
      name: 'Weekend trip',
      destination: 'Paris',
      start_date: '2026-09-27T00:00:00.000Z',
      end_date: '2026-09-29T00:00:00.000Z'
    }, { latitude: 12.3456, longitude: 67.89 });

    assert.equal(state.weather.location.latitude, 12.3456);
    assert.equal(state.weather.location.longitude, 67.89);
    assert.equal(state.weather.current.temp, 28);
  } finally {
    global.fetch = originalFetch;
    dbUtil.pool.query = originalPoolQuery;
  }
});
