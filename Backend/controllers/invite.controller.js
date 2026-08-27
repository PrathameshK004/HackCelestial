const crypto = require('crypto');
const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');
const { sendEmail } = require('../utils/mail.util');

module.exports = {
    createGroupInvite,
    getInviteDetails,
    acceptInvite
};

/**
 * Generate a new invite code and multi-app share links for a group
 */
async function createGroupInvite(req, res) {
    try {
        const { groupId } = req.params;
        const userId = req.userKey;
        const { email, role = 'Traveler', sendDirectEmail = false } = req.body;

        if (!groupId) {
            return sendError(res, "Group ID is required", null, 400);
        }

        // Fetch group details
        const groupRes = await pool.query('SELECT * FROM groups WHERE id = $1', [groupId]);
        if (groupRes.rows.length === 0) {
            return sendError(res, "Group not found", null, 404);
        }
        const group = groupRes.rows[0];

        // Fetch organizer / inviter name
        let inviterName = 'A friend';
        if (userId) {
            const userRes = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length > 0) {
                inviterName = userRes.rows[0].username;
            }
        }

        const inviteCode = 'TRIP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await pool.query(`
            INSERT INTO group_invitations (id, group_id, invite_code, invited_by, invited_email, role, status, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, NOW())
        `, [crypto.randomUUID(), groupId, inviteCode, userId || null, email ? email.trim().toLowerCase() : null, role, expiresAt]);

        const baseUrl = process.env.APP_URL || 'http://localhost:3000';
        const inviteUrl = `${baseUrl}/join/${inviteCode}`;

        // Send Email if requested
        if (sendDirectEmail && email) {
            try {
                await sendEmail(
                    email.trim().toLowerCase(),
                    `You're invited to join "${group.name}" on Triptual!`,
                    `
                        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border-radius: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
                            <div style="text-align: center; background: #059669; padding: 18px; border-radius: 8px; color: #ffffff;">
                                <h2 style="margin: 0; font-size: 22px;">Group Trip Invitation</h2>
                            </div>
                            <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; margin-top: 16px;">
                                <p style="font-size: 16px; color: #1e293b;">Hi there!</p>
                                <p style="font-size: 15px; color: #334155; line-height: 1.5;">
                                    <strong>${inviterName}</strong> has invited you to join the group trip <strong>"${group.name}"</strong> to <strong>${group.destination}</strong>.
                                </p>
                                <div style="text-align: center; margin: 24px 0;">
                                    <a href="${inviteUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: bold; font-size: 15px; display: inline-block;">
                                        Join Trip on Triptual
                                    </a>
                                </div>
                                <p style="font-size: 13px; color: #64748b; text-align: center;">
                                    Or copy this link to join: <br>
                                    <a href="${inviteUrl}" style="color: #059669;">${inviteUrl}</a>
                                </p>
                            </div>
                        </div>
                    `
                );
            } catch (mailErr) {
                console.warn("Could not dispatch direct invite email:", mailErr.message);
            }
        }

        return sendSuccess(res, "Invitation generated successfully", {
            inviteCode,
            inviteUrl,
            expiresAt,
            shareLinks: {
                whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join our group trip "${group.name}" to ${group.destination} on Triptual: ${inviteUrl}`)}`,
                telegram: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`Join our trip to ${group.destination}!`)}`,
                sms: `sms:?body=${encodeURIComponent(`Join our trip "${group.name}" to ${group.destination}: ${inviteUrl}`)}`,
                email: `mailto:${email || ''}?subject=${encodeURIComponent(`Join our group trip "${group.name}" on Triptual`)}&body=${encodeURIComponent(`Hey!\n\n${inviterName} invited you to join "${group.name}" on Triptual: ${inviteUrl}\n\nClick the link to join!`)}`,
                copyLink: inviteUrl
            }
        }, 201);

    } catch (error) {
        console.error("Create Invite Error:", error);
        return sendError(res, "Failed to generate group invitation", error, 500);
    }
}

/**
 * Public endpoint to preview invite details before joining
 */
async function getInviteDetails(req, res) {
    try {
        const { inviteCode } = req.params;
        if (!inviteCode) {
            return sendError(res, "Invite code is required", null, 400);
        }

        const inviteQuery = await pool.query(
            `SELECT gi.*, g.name as "groupName", g.destination, g.start_date as "startDate", 
                    g.end_date as "endDate", g.trip_type as "tripType", g.currency, 
                    g.description, u.username as "organizerName"
             FROM group_invitations gi
             JOIN groups g ON gi.group_id = g.id
             LEFT JOIN users u ON gi.invited_by = u.id
             WHERE UPPER(gi.invite_code) = UPPER($1) LIMIT 1`,
            [inviteCode]
        );

        if (inviteQuery.rows.length === 0) {
            return sendError(res, "Invalid or expired invitation link", null, 404);
        }

        const invite = inviteQuery.rows[0];
        const isExpired = new Date(invite.expires_at).getTime() < Date.now();

        if (isExpired || invite.status === 'EXPIRED') {
            return sendError(res, "This invitation link has expired", null, 410);
        }

        // Count current members
        const countRes = await pool.query('SELECT COUNT(*) as count FROM group_members WHERE group_id = $1', [invite.group_id]);

        return sendSuccess(res, "Invite details retrieved", {
            inviteCode: invite.invite_code,
            groupId: invite.group_id,
            groupName: invite.groupName,
            destination: invite.destination,
            startDate: invite.startDate,
            endDate: invite.endDate,
            tripType: invite.tripType,
            currency: invite.currency,
            description: invite.description,
            organizerName: invite.organizerName || 'Group Organizer',
            memberCount: parseInt(countRes.rows[0]?.count || 1),
            expiresAt: invite.expires_at
        });

    } catch (error) {
        console.error("Get Invite Details Error:", error);
        return sendError(res, "Failed to load invitation details", error, 500);
    }
}

/**
 * Accept Invitation and Join Group (requires auth)
 */
async function acceptInvite(req, res) {
    const client = await pool.connect();
    try {
        const { inviteCode } = req.params;
        const userId = req.userKey;

        if (!userId) {
            return sendError(res, "Please log in or sign up to accept this invitation", null, 401);
        }

        const inviteQuery = await client.query(
            `SELECT gi.*, g.name as "groupName" 
             FROM group_invitations gi
             JOIN groups g ON gi.group_id = g.id
             WHERE UPPER(gi.invite_code) = UPPER($1) LIMIT 1`,
            [inviteCode]
        );

        if (inviteQuery.rows.length === 0) {
            return sendError(res, "Invalid invitation code", null, 404);
        }

        const invite = inviteQuery.rows[0];
        if (new Date(invite.expires_at).getTime() < Date.now()) {
            return sendError(res, "Invitation link has expired", null, 410);
        }

        // Fetch user profile
        const userRes = await client.query('SELECT username, email_id FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return sendError(res, "User profile not found", null, 404);
        }

        const userName = userRes.rows[0].username;
        const userEmail = userRes.rows[0].email_id.toLowerCase();

        await client.query('BEGIN');

        // Add to group members
        const memberId = crypto.randomUUID();
        await client.query(`
            INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, is_registered, joined_at)
            VALUES ($1, $2, $3, $4, $5, $6, '#059669', TRUE, NOW())
            ON CONFLICT (group_id, email) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                name = EXCLUDED.name,
                is_registered = TRUE
        `, [memberId, invite.group_id, userId, userName, userEmail, invite.role || 'Traveler']);

        // Update invite status
        await client.query('UPDATE group_invitations SET status = $1 WHERE id = $2', ['ACCEPTED', invite.id]);

        await client.query('COMMIT');

        return sendSuccess(res, `Successfully joined "${invite.groupName}"!`, {
            groupId: invite.group_id,
            groupName: invite.groupName,
            role: invite.role || 'Traveler'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Accept Invite Error:", error);
        return sendError(res, "Failed to accept invitation", error, 500);
    } finally {
        client.release();
    }
}
