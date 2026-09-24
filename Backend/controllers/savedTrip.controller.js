const crypto = require('crypto');
const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');

const allowedFields = [
    'id', 'name', 'type', 'category', 'destination', 'dateRange', 'guests',
    'matchScore', 'rating', 'pricePerNight', 'totalNights', 'style', 'distance',
    'image', 'altImages', 'metrics', 'whyMatched', 'highlights'
];

function cleanStayData(payload = {}) {
    return allowedFields.reduce((stay, field) => {
        if (payload[field] !== undefined) stay[field] = payload[field];
        return stay;
    }, {});
}

async function getSavedTrips(req, res) {
    try {
        const result = await pool.query(
            'SELECT stay_data AS "stayData", created_at AS "createdAt" FROM user_saved_trips WHERE user_id = $1 ORDER BY created_at DESC',
            [req.userKey]
        );
        return sendSuccess(res, 'Saved trips fetched successfully', result.rows.map((row) => ({
            ...row.stayData,
            createdAt: row.createdAt
        })));
    } catch (error) {
        console.error('Get saved trips error:', error.message);
        return sendError(res, 'Failed to fetch saved trips', error, 500);
    }
}

async function saveTrip(req, res) {
    const stay = cleanStayData(req.body || {});
    if (!stay.id || !stay.name) return sendError(res, 'A valid trip stay is required', null, 400);

    try {
        const result = await pool.query(
            `INSERT INTO user_saved_trips (id, user_id, stay_id, stay_data)
             VALUES ($1, $2, $3, $4::jsonb)
             ON CONFLICT (user_id, stay_id) DO UPDATE SET stay_data = EXCLUDED.stay_data, updated_at = NOW()
             RETURNING stay_data AS "stayData", created_at AS "createdAt"`,
            [crypto.randomUUID(), req.userKey, String(stay.id), JSON.stringify(stay)]
        );
        return sendSuccess(res, 'Trip saved successfully', {
            ...result.rows[0].stayData,
            createdAt: result.rows[0].createdAt
        }, 201);
    } catch (error) {
        console.error('Save trip error:', error.message);
        return sendError(res, 'Failed to save trip', error, 500);
    }
}

async function removeSavedTrip(req, res) {
    const stayId = String(req.params.stayId || '').trim();
    if (!stayId) return sendError(res, 'Stay ID is required', null, 400);

    try {
        await pool.query('DELETE FROM user_saved_trips WHERE user_id = $1 AND stay_id = $2', [req.userKey, stayId]);
        return sendSuccess(res, 'Trip removed from saved trips', { stayId });
    } catch (error) {
        console.error('Remove saved trip error:', error.message);
        return sendError(res, 'Failed to remove saved trip', error, 500);
    }
}

module.exports = { getSavedTrips, saveTrip, removeSavedTrip };