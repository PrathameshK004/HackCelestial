const crypto = require('crypto');
const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');

async function createTicket(req, res) {
    const { subject, message, category = 'other' } = req.body || {};
    if (!subject || !String(subject).trim() || !message || !String(message).trim()) {
        return sendError(res, 'Subject and description are required', null, 400);
    }

    try {
        const ticketNumber = `TRIP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const attachment = req.file || null;
        const result = await pool.query(
            `INSERT INTO support_tickets
             (id, user_id, ticket_number, category, subject, message, attachment_name, attachment_type, attachment_size, attachment_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING ticket_number AS "ticketNumber", created_at AS "createdAt"`,
            [
                crypto.randomUUID(), req.userKey, ticketNumber, String(category), String(subject).trim(), String(message).trim(),
                attachment?.originalname || null, attachment?.mimetype || null, attachment?.size || null, attachment?.buffer || null
            ]
        );
        return sendSuccess(res, 'Support ticket submitted successfully', result.rows[0], 201);
    } catch (error) {
        console.error('Create support ticket error:', error.message);
        return sendError(res, 'Failed to submit support ticket', error, 500);
    }
}

async function getMyTickets(req, res) {
    try {
        const result = await pool.query(
            `SELECT ticket_number AS "ticketNumber", category, subject, message, status,
                    attachment_name AS "attachmentName", created_at AS "createdAt"
             FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.userKey]
        );
        return sendSuccess(res, 'Support tickets fetched successfully', result.rows);
    } catch (error) {
        console.error('Get support tickets error:', error.message);
        return sendError(res, 'Failed to fetch support tickets', error, 500);
    }
}

module.exports = { createTicket, getMyTickets };