const { sendError } = require('../utils/response.util');

/**
 * Middleware to validate and sanitize trip data payloads for fairness analysis.
 * Prevents corrupted data, injection of negative values, and non-array collections.
 */
function validateTripFairnessPayload(req, res, next) {
    const rawTrip = req.body?.tripData ?? req.body;

    if (!rawTrip || typeof rawTrip !== 'object' || Array.isArray(rawTrip)) {
        return sendError(
            res,
            'Invalid request payload: "tripData" must be a valid JSON object.',
            { code: 'INVALID_PAYLOAD' },
            400
        );
    }

    const participants = rawTrip.participants || rawTrip.members || rawTrip.travelers;
    if (participants !== undefined && !Array.isArray(participants)) {
        return sendError(
            res,
            'Invalid participants: expected an array of travelers.',
            { code: 'INVALID_PARTICIPANTS' },
            400
        );
    }

    const bookings = rawTrip.bookings || rawTrip.expenses || rawTrip.reservations;
    if (bookings !== undefined) {
        if (!Array.isArray(bookings)) {
            return sendError(
                res,
                'Invalid bookings/expenses: expected an array.',
                { code: 'INVALID_BOOKINGS' },
                400
            );
        }

        for (let i = 0; i < bookings.length; i++) {
            const b = bookings[i];
            if (!b || typeof b !== 'object') {
                return sendError(
                    res,
                    `Invalid booking at index ${i}: must be an object.`,
                    { code: 'MALFORMED_BOOKING_ENTRY' },
                    400
                );
            }
            const amt = b.amount ?? b.total ?? b.cost ?? b.totalAmount;
            if (amt !== undefined && isNaN(Number(amt))) {
                return sendError(
                    res,
                    `Invalid amount for booking "${b.title || i}": must be a valid numeric value.`,
                    { code: 'INVALID_BOOKING_AMOUNT' },
                    400
                );
            }
        }
    }

    const payments = rawTrip.payments || rawTrip.settlements;
    if (payments !== undefined) {
        if (!Array.isArray(payments)) {
            return sendError(
                res,
                'Invalid payments/settlements: expected an array.',
                { code: 'INVALID_PAYMENTS' },
                400
            );
        }

        for (let i = 0; i < payments.length; i++) {
            const p = payments[i];
            if (!p || typeof p !== 'object') {
                return sendError(
                    res,
                    `Invalid payment at index ${i}: must be an object.`,
                    { code: 'MALFORMED_PAYMENT_ENTRY' },
                    400
                );
            }
            const amt = p.amount ?? p.value;
            if (amt !== undefined && (isNaN(Number(amt)) || Number(amt) < 0)) {
                return sendError(
                    res,
                    `Invalid payment amount at index ${i}: must be a non-negative numeric value.`,
                    { code: 'INVALID_PAYMENT_AMOUNT' },
                    400
                );
            }
        }
    }

    // Attach sanitized reference for downstream controllers
    req.validatedTripData = rawTrip;
    next();
}

module.exports = {
    validateTripFairnessPayload
};
