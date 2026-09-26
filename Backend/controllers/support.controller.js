const crypto = require('crypto');
const path = require('path');
const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');
const { uploadSupportDocumentToS3 } = require('../utils/s3.util');
const { sendTicketCreatedEmail } = require('../utils/mail.util');

/**
 * Create a new support ticket
 * Requirements:
 * 1. Ticket ID starts with "TICKET"
 * 2. Upload document to AWS S3 rather than SQL
 * 3. Send email to user saying "We will looking into Issue"
 */
async function createTicket(req, res) {
    const { subject, message, category = 'other' } = req.body || {};
    if (!subject || !String(subject).trim() || !message || !String(message).trim()) {
        return sendError(res, 'Subject and description are required', null, 400);
    }

    try {
        // Ticket created ID must start from "TICKET"
        const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const ticketNumber = `TICKET-${suffix}`;
        const ticketId = crypto.randomUUID();
        const attachment = req.file || null;

        let attachmentUrl = null;
        let attachmentKey = null;

        // Save uploaded document in AWS S3 rather than SQL
        if (attachment && attachment.buffer) {
            try {
                const uploadResult = await uploadSupportDocumentToS3({
                    buffer: attachment.buffer,
                    mimeType: attachment.mimetype,
                    originalName: attachment.originalname,
                    ticketNumber
                });
                attachmentUrl = uploadResult.url;
                attachmentKey = uploadResult.key;
            } catch (uploadErr) {
                console.warn('[Support S3 Upload Warning]:', uploadErr.message);
                // Do not block ticket creation if upload fails, continue with null attachment
            }
        }

        const userName = req.user?.username || 'User';
        const client = await pool.connect();
        let createdTicket;
        try {
            await client.query('BEGIN');
            const result = await client.query(
                `INSERT INTO support_tickets
                 (id, user_id, ticket_number, category, subject, message, status, attachment_name, attachment_type, attachment_size, attachment_url, attachment_key)
                 VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', $7, $8, $9, $10, $11)
                 RETURNING ticket_number AS "ticketNumber", category, subject, message, status,
                           attachment_name AS "attachmentName", attachment_type AS "attachmentType",
                           attachment_size AS "attachmentSize", attachment_url AS "attachmentUrl",
                           created_at AS "createdAt"`,
                [
                    ticketId,
                    req.userKey,
                    ticketNumber,
                    String(category),
                    String(subject).trim(),
                    String(message).trim(),
                    attachment?.originalname || null,
                    attachment?.mimetype || null,
                    attachment?.size || null,
                    attachmentUrl,
                    attachmentKey
                ]
            );
            createdTicket = result.rows[0];
            await client.query(
                `INSERT INTO support_ticket_messages
                 (id, ticket_id, sender_id, sender_name, sender_role, message, attachment_url, attachment_name, attachment_type, attachment_size)
                 VALUES ($1, $2, $3, $4, 'USER', $5, $6, $7, $8, $9)`,
                [
                    crypto.randomUUID(),
                    ticketId,
                    req.userKey,
                    userName,
                    String(message).trim(),
                    attachmentUrl,
                    attachment?.originalname || null,
                    attachment?.mimetype || null,
                    attachment?.size || null
                ]
            );
            await client.query('COMMIT');
        } catch (transactionError) {
            await client.query('ROLLBACK').catch(() => {});
            throw transactionError;
        } finally {
            client.release();
        }

        // Send email to user saying "We will looking into Issue"
        let userEmail = req.user?.emailId;
        if (!userEmail) {
            try {
                const uRes = await pool.query('SELECT email_id, username FROM users WHERE id = $1 LIMIT 1', [req.userKey]);
                if (uRes.rows.length > 0) {
                    userEmail = uRes.rows[0].email_id;
                }
            } catch (uErr) {
                console.warn('[Fetch User Email Warning]:', uErr.message);
            }
        }

        if (userEmail) {
            sendTicketCreatedEmail({
                to: userEmail,
                username: userName,
                ticketNumber,
                subject: String(subject).trim(),
                category: String(category)
            }).catch((mailErr) => console.warn('[Ticket Confirmation Mail Error]:', mailErr.message));
        }

        return sendSuccess(res, 'Support ticket submitted successfully', createdTicket, 201);
    } catch (error) {
        console.error('Create support ticket error:', error.message);
        return sendError(res, 'Failed to submit support ticket', error, 500);
    }
}

/**
 * Get all support tickets created by the authenticated user
 */
async function getMyTickets(req, res) {
    try {
        const result = await pool.query(
            `SELECT id, ticket_number AS "ticketNumber", category, subject, message, status,
                    attachment_name AS "attachmentName", attachment_type AS "attachmentType",
                    attachment_size AS "attachmentSize", attachment_url AS "attachmentUrl",
                    created_at AS "createdAt"
             FROM support_tickets
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.userKey]
        );
        return sendSuccess(res, 'Support tickets fetched successfully', result.rows);
    } catch (error) {
        console.error('Get support tickets error:', error.message);
        return sendError(res, 'Failed to fetch support tickets', error, 500);
    }
}

/**
 * Update ticket status (e.g. Mark as Solved / Resolved)
 */
async function updateTicketStatus(req, res) {
    const { ticketNumber } = req.params;
    let { status } = req.body || {};

    if (!ticketNumber) {
        return sendError(res, 'Ticket number is required', null, 400);
    }

    if (!status) {
        return sendError(res, 'Status is required', null, 400);
    }

    status = String(status).toUpperCase();
    if (status === 'SOLVED') status = 'RESOLVED';

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
        return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, null, 400);
    }

    try {
        const client = await pool.connect();
        let ticket;
        try {
            await client.query('BEGIN');
            const result = await client.query(
                `UPDATE support_tickets
                 SET status = $1
                 WHERE ticket_number = $2 AND user_id = $3
                 RETURNING id, ticket_number AS "ticketNumber", category, subject, message, status,
                           attachment_name AS "attachmentName", attachment_url AS "attachmentUrl",
                           created_at AS "createdAt"`,
                [status, ticketNumber, req.userKey]
            );
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return sendError(res, 'Ticket not found or unauthorized', null, 404);
            }
            ticket = result.rows[0];
            if (status === 'RESOLVED') {
                await client.query(
                    `INSERT INTO support_ticket_messages
                     (id, ticket_id, sender_id, sender_name, sender_role, message)
                     VALUES ($1, $2, $3, 'System', 'SYSTEM', 'Ticket was marked as solved.')`,
                    [crypto.randomUUID(), ticket.id, req.userKey]
                );
            }
            await client.query('COMMIT');
        } catch (transactionError) {
            await client.query('ROLLBACK').catch(() => {});
            throw transactionError;
        } finally {
            client.release();
        }

        return sendSuccess(res, `Ticket marked as ${status.toLowerCase()}`, ticket);
    } catch (error) {
        console.error('Update ticket status error:', error.message);
        return sendError(res, 'Failed to update ticket status', error, 500);
    }
}

/**
 * Get dedicated chat messages for a ticket
 */
async function getTicketMessages(req, res) {
    const { ticketNumber } = req.params;
    if (!ticketNumber) {
        return sendError(res, 'Ticket number is required', null, 400);
    }

    try {
        const ticketRes = await pool.query(
            `SELECT id, ticket_number AS "ticketNumber", category, subject, message, status,
                    attachment_name AS "attachmentName", attachment_type AS "attachmentType",
                    attachment_size AS "attachmentSize", attachment_url AS "attachmentUrl",
                    created_at AS "createdAt"
             FROM support_tickets
             WHERE ticket_number = $1 AND user_id = $2
             LIMIT 1`,
            [ticketNumber, req.userKey]
        );

        if (ticketRes.rows.length === 0) {
            return sendError(res, 'Ticket not found or unauthorized', null, 404);
        }

        const ticket = ticketRes.rows[0];

        const messagesRes = await pool.query(
            `SELECT m.id, m.ticket_id AS "ticketId", m.sender_id AS "senderId", m.sender_name AS "senderName",
                    m.sender_role AS "senderRole", m.message, m.attachment_url AS "attachmentUrl",
                    m.attachment_name AS "attachmentName", m.attachment_type AS "attachmentType",
                    m.attachment_size AS "attachmentSize", m.created_at AS "createdAt"
             FROM support_ticket_messages m
             WHERE m.ticket_id = $1
             ORDER BY m.created_at ASC`,
            [ticket.id]
        );

        return sendSuccess(res, 'Ticket messages fetched successfully', {
            ticket,
            messages: messagesRes.rows
        });
    } catch (error) {
        console.error('Get ticket messages error:', error.message);
        return sendError(res, 'Failed to fetch ticket messages', error, 500);
    }
}

/**
 * Send a message in a ticket's dedicated chat thread (with optional document upload to AWS S3)
 */
async function sendTicketMessage(req, res) {
    const { ticketNumber } = req.params;
    const { message } = req.body || {};
    const attachment = req.file || null;

    if (!ticketNumber) {
        return sendError(res, 'Ticket number is required', null, 400);
    }

    if ((!message || !String(message).trim()) && !attachment) {
        return sendError(res, 'Message text or attachment is required', null, 400);
    }

    try {
        const ticketRes = await pool.query(
            `SELECT id, ticket_number AS "ticketNumber", status
             FROM support_tickets
             WHERE ticket_number = $1 AND user_id = $2
             LIMIT 1`,
            [ticketNumber, req.userKey]
        );

        if (ticketRes.rows.length === 0) {
            return sendError(res, 'Ticket not found or unauthorized', null, 404);
        }

        const ticket = ticketRes.rows[0];
        let attachmentUrl = null;

        // Upload attachment to AWS S3 rather than SQL
        if (attachment && attachment.buffer) {
            const uploadResult = await uploadSupportDocumentToS3({
                buffer: attachment.buffer,
                mimeType: attachment.mimetype,
                originalName: attachment.originalname,
                ticketNumber
            });
            attachmentUrl = uploadResult.url;
        }

        const userName = req.user?.username || 'User';
        const client = await pool.connect();
        let newMsg;
        try {
            await client.query('BEGIN');
            const insertRes = await client.query(
                `INSERT INTO support_ticket_messages
                 (id, ticket_id, sender_id, sender_name, sender_role, message, attachment_url, attachment_name, attachment_type, attachment_size)
                 VALUES ($1, $2, $3, $4, 'USER', $5, $6, $7, $8, $9)
                 RETURNING id, ticket_id AS "ticketId", sender_id AS "senderId", sender_name AS "senderName",
                           sender_role AS "senderRole", message, attachment_url AS "attachmentUrl",
                           attachment_name AS "attachmentName", attachment_type AS "attachmentType",
                           attachment_size AS "attachmentSize", created_at AS "createdAt"`,
                [
                    crypto.randomUUID(),
                    ticket.id,
                    req.userKey,
                    userName,
                    message ? String(message).trim() : null,
                    attachmentUrl,
                    attachment?.originalname || null,
                    attachment?.mimetype || null,
                    attachment?.size || null
                ]
            );
            newMsg = insertRes.rows[0];
            if (ticket.status === 'RESOLVED') {
                await client.query('UPDATE support_tickets SET status = $1 WHERE id = $2', ['OPEN', ticket.id]);
            }
            await client.query('COMMIT');
        } catch (transactionError) {
            await client.query('ROLLBACK').catch(() => {});
            throw transactionError;
        } finally {
            client.release();
        }

        return sendSuccess(res, 'Message sent successfully', newMsg, 201);
    } catch (error) {
        console.error('Send ticket message error:', error.message);
        return sendError(res, 'Failed to send message', error, 500);
    }
}

/**
 * View or download uploaded document for a ticket
 */
async function getTicketAttachment(req, res) {
    const { ticketNumber } = req.params;
    if (!ticketNumber) {
        return sendError(res, 'Ticket number is required', null, 400);
    }

    try {
        const result = await pool.query(
            `SELECT attachment_name, attachment_type, attachment_url, attachment_data
             FROM support_tickets
             WHERE ticket_number = $1 AND user_id = $2
             LIMIT 1`,
            [ticketNumber, req.userKey]
        );

        if (result.rows.length === 0) {
            return sendError(res, 'Attachment not found or unauthorized', null, 404);
        }

        const doc = result.rows[0];

        // If document is stored in AWS S3 or external URL, redirect directly
        if (doc.attachment_url && (doc.attachment_url.startsWith('http://') || doc.attachment_url.startsWith('https://'))) {
            return res.redirect(doc.attachment_url);
        }

        // If stored locally via fallback
        if (doc.attachment_url && doc.attachment_url.startsWith('/uploads')) {
            const filePath = path.join(__dirname, '..', doc.attachment_url);
            return res.sendFile(filePath);
        }

        // Legacy fallback if stored in PostgreSQL BYTEA
        if (doc.attachment_data) {
            res.setHeader('Content-Type', doc.attachment_type || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${doc.attachment_name || 'document'}"`);
            return res.send(doc.attachment_data);
        }

        return sendError(res, 'No attachment document available for this ticket', null, 404);
    } catch (error) {
        console.error('Get ticket attachment error:', error.message);
        return sendError(res, 'Failed to retrieve attachment', error, 500);
    }
}

module.exports = {
    createTicket,
    getMyTickets,
    updateTicketStatus,
    getTicketMessages,
    sendTicketMessage,
    getTicketAttachment
};