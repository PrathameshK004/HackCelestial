const crypto = require('crypto');
const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');
const { sendEmail } = require('../utils/mail.util');

module.exports = {
    createGroupInvite,
    getInviteDetails,
    acceptInvite,
    rejectInvite,
    getMyPendingInvitations
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
                    g.expense_split as "expenseSplit", g.description, u.username as "organizerName"
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

        // Fetch members of group
        const membersRes = await pool.query(`
            SELECT id, name, role, avatar_bg as "avatarBg", is_registered as "isRegistered", COALESCE(status, 'ACCEPTED') as status
            FROM group_members 
            WHERE group_id = $1 
            ORDER BY role DESC, joined_at ASC
        `, [invite.group_id]);

        const confirmedCount = membersRes.rows.filter(m => m.status === 'ACCEPTED').length;

        return sendSuccess(res, "Invite details retrieved", {
            inviteCode: invite.invite_code,
            groupId: invite.group_id,
            groupName: invite.groupName,
            destination: invite.destination,
            startDate: invite.startDate,
            endDate: invite.endDate,
            tripType: invite.tripType,
            currency: invite.currency,
            expenseSplit: invite.expenseSplit,
            description: invite.description,
            organizerName: invite.organizerName || 'Group Organizer',
            invitedEmail: invite.invited_email,
            role: invite.role || 'Traveler',
            status: invite.status,
            memberCount: confirmedCount,
            members: membersRes.rows,
            expiresAt: invite.expires_at
        });

    } catch (error) {
        console.error("Get Invite Details Error:", error);
        return sendError(res, "Failed to load invitation details", error, 500);
    }
}

/**
 * Accept Invitation and Join Group (requires auth)
 * Unstop-style approval: updates member status from PENDING to ACCEPTED
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

        // Approve and activate group membership (updates status to ACCEPTED)
        const memberId = crypto.randomUUID();
        await client.query(`
            INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, is_registered, status, joined_at)
            VALUES ($1, $2, $3, $4, $5, $6, '#059669', TRUE, 'ACCEPTED', NOW())
            ON CONFLICT (group_id, email) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                name = EXCLUDED.name,
                is_registered = TRUE,
                status = 'ACCEPTED',
                joined_at = NOW()
        `, [memberId, invite.group_id, userId, userName, userEmail, invite.role || 'Traveler']);

        // Update invite status to ACCEPTED
        await client.query('UPDATE group_invitations SET status = $1 WHERE id = $2', ['ACCEPTED', invite.id]);

        // Also if this user had another pending invitation for this group by email, mark accepted
        await client.query(`
            UPDATE group_invitations SET status = 'ACCEPTED' 
            WHERE group_id = $1 AND LOWER(invited_email) = LOWER($2)
        `, [invite.group_id, userEmail]);

        await client.query('COMMIT');

        return sendSuccess(res, `Successfully joined "${invite.groupName}"!`, {
            groupId: invite.group_id,
            groupName: invite.groupName,
            role: invite.role || 'Traveler',
            status: 'ACCEPTED'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Accept Invite Error:", error);
        return sendError(res, "Failed to accept invitation", error, 500);
    } finally {
        client.release();
    }
}

/**
 * Reject / Decline Invitation (requires auth)
 */
async function rejectInvite(req, res) {
    const client = await pool.connect();
    try {
        const { inviteCode } = req.params;
        const userId = req.userKey;

        if (!userId) {
            return sendError(res, "Please log in to decline this invitation", null, 401);
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

        // Fetch user email
        const userRes = await client.query('SELECT email_id FROM users WHERE id = $1', [userId]);
        const userEmail = userRes.rows[0]?.email_id?.toLowerCase() || '';

        await client.query('BEGIN');

        // Update invitation status
        await client.query('UPDATE group_invitations SET status = $1 WHERE id = $2', ['REJECTED', invite.id]);

        // Remove or mark REJECTED in group_members
        if (userEmail) {
            await client.query(`
                UPDATE group_members 
                SET status = 'REJECTED' 
                WHERE group_id = $1 AND (LOWER(email) = LOWER($2) OR user_id = $3)
            `, [invite.group_id, userEmail, userId]);
        }

        await client.query('COMMIT');

        return sendSuccess(res, `Declined invitation for "${invite.groupName}"`, {
            groupId: invite.group_id,
            groupName: invite.groupName,
            status: 'REJECTED'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Reject Invite Error:", error);
        return sendError(res, "Failed to decline invitation", error, 500);
    } finally {
        client.release();
    }
}

/**
 * Get all pending invitations for the logged-in user
 */
async function getMyPendingInvitations(req, res) {
    try {
        const userId = req.userKey;
        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        const userRes = await pool.query('SELECT email_id FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return sendError(res, "User not found", null, 404);
        }
        const userEmail = userRes.rows[0].email_id.toLowerCase();

        const pendingInvites = await pool.query(`
            SELECT DISTINCT gi.id, gi.invite_code as "inviteCode", gi.role, gi.created_at as "createdAt",
                   gi.expires_at as "expiresAt", g.id as "groupId", g.name as "groupName",
                   g.destination, g.start_date as "startDate", g.end_date as "endDate",
                   g.trip_type as "tripType", g.currency, g.expense_split as "expenseSplit",
                   u.username as "organizerName"
            FROM group_invitations gi
            JOIN groups g ON gi.group_id = g.id
            LEFT JOIN users u ON gi.invited_by = u.id
            WHERE (LOWER(gi.invited_email) = LOWER($1) OR gi.group_id IN (
                SELECT group_id FROM group_members WHERE LOWER(email) = LOWER($1) AND status = 'PENDING'
            ))
            AND gi.status = 'PENDING'
            AND gi.expires_at > NOW()
            ORDER BY gi.created_at DESC
        `, [userEmail]);

        return sendSuccess(res, "Pending invitations fetched successfully", pendingInvites.rows);

    } catch (error) {
        console.error("Get My Pending Invites Error:", error);
        return sendError(res, "Failed to fetch pending invitations", error, 500);
    }
}
