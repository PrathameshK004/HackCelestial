const { sendSuccess, sendError } = require('../utils/response.util');
const service = require('../services/digital-twin.service');

function handleError(res, error, fallback) {
    return sendError(res, error.message || fallback, error, error.statusCode || 500);
}

async function getWeather(req, res) {
    try {
        const weather = await service.getWeather({
            destination: req.query.destination,
            latitude: req.query.latitude,
            longitude: req.query.longitude
        });
        return sendSuccess(res, 'Digital Twin weather fetched', weather);
    } catch (error) {
        return handleError(res, error, 'Weather is temporarily unavailable');
    }
}

async function getState(req, res) {
    try {
        const groupId = req.query.tripId || req.query.groupId;
        const latitude = req.query.latitude !== undefined ? Number(req.query.latitude) : undefined;
        const longitude = req.query.longitude !== undefined ? Number(req.query.longitude) : undefined;
        if (!groupId) return sendError(res, 'tripId is required', null, 400);
        const group = await service.getTrip(groupId, req.userKey);
        const state = await service.buildTripState(group, { latitude, longitude });
        return sendSuccess(res, 'Digital Twin state fetched', state);
    } catch (error) {
        return handleError(res, error, 'Digital Twin state is temporarily unavailable');
    }
}

async function getTripImpact(req, res) {
    try {
        const latitude = req.query.latitude !== undefined ? Number(req.query.latitude) : undefined;
        const longitude = req.query.longitude !== undefined ? Number(req.query.longitude) : undefined;
        const group = await service.getTrip(req.params.tripId, req.userKey);
        const state = await service.buildTripState(group, { latitude, longitude });
        return sendSuccess(res, 'Trip weather impact fetched', state.impact);
    } catch (error) {
        return handleError(res, error, 'Trip impact is temporarily unavailable');
    }
}

async function getSocialSignals(req, res) {
    try {
        const signals = await service.getSignals(req.query.location || req.query.destination);
        return sendSuccess(res, 'Digital Twin social signals fetched', { signals, source: 'public signals stored by the backend; no private social data' });
    } catch (error) {
        return handleError(res, error, 'Social signals are temporarily unavailable');
    }
}

async function simulate(req, res) {
    try {
        const { tripId, groupId, destination, latitude, longitude, rainfall, temperature, windSpeed, stormDuration, weatherSeverity } = req.body || {};
        let group = null;
        if (tripId || groupId) group = await service.getTrip(tripId || groupId, req.userKey);
        if (!group && !destination && (latitude === undefined || longitude === undefined)) {
            return sendError(res, 'A tripId or destination coordinates are required', null, 400);
        }
        const result = await service.simulate({ group, userId: req.userKey, destination, latitude, longitude, rainfall, temperature, windSpeed, stormDuration, weatherSeverity });
        return sendSuccess(res, 'Digital Twin simulation created', result, 201);
    } catch (error) {
        return handleError(res, error, 'Simulation is temporarily unavailable');
    }
}

async function getSimulation(req, res) {
    try {
        const result = await require('../utils/db.util').pool.query(`
            SELECT id, group_id AS "groupId", inputs, result, created_at AS "createdAt"
            FROM digital_twin_simulations WHERE id = $1 AND user_id = $2
        `, [req.params.id, req.userKey]);
        if (!result.rows[0]) return sendError(res, 'Simulation not found', null, 404);
        return sendSuccess(res, 'Digital Twin simulation fetched', result.rows[0]);
    } catch (error) {
        return handleError(res, error, 'Simulation is temporarily unavailable');
    }
}

async function searchNearbyPlaces(req, res) {
    try {
        const { latitude, longitude, query, category, destination } = req.query || {};
        const places = await service.searchNearbyPlaces({
            latitude: latitude !== undefined ? Number(latitude) : undefined,
            longitude: longitude !== undefined ? Number(longitude) : undefined,
            query,
            category,
            destination
        });
        return sendSuccess(res, 'Nearby places found', places);
    } catch (error) {
        return handleError(res, error, 'Failed to search nearby places');
    }
}

module.exports = { getWeather, getState, getTripImpact, getSocialSignals, simulate, getSimulation, searchNearbyPlaces };
