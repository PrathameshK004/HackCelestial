const crypto = require('crypto');
const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');
const { sendEmail } = require('../utils/mail.util');
const { getLiveAppUrl } = require('../utils/url.util');
const { verifyGroupAccess } = require('../utils/groupAuth.util');
const { 
    sendGroupInviteNotification, 
    sendInviteAcceptedNotification, 
    sendInviteRejectedNotification 
} = require('../utils/notification.util');

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
        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        // Security check: Only members or organizer can create invite codes for this group
        const access = await verifyGroupAccess(groupId, userId);
        if (access.notFound) {
            return sendError(res, "Group not found", null, 404);
        }
        if (!access.isAuthorized) {
            return sendError(res, "Access denied. You are not a member of this trip.", null, 403);
        }

        const group = access.group;
        const inviterName = access.member?.name || 'A group member';

        let inviteCode = 'TRIP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        let expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Deduplication: If a direct invite already exists for this email and trip, reuse it
        if (email) {
            const trimmedEmail = email.trim().toLowerCase();
            const existingInvite = await pool.query(`
                SELECT invite_code as "inviteCode", expires_at as "expiresAt"
                FROM group_invitations
                WHERE group_id = $1 AND LOWER(invited_email) = $2 AND status = 'PENDING' AND expires_at > NOW()
                ORDER BY created_at DESC LIMIT 1
            `, [groupId, trimmedEmail]);

            if (existingInvite.rows.length > 0) {
                inviteCode = existingInvite.rows[0].inviteCode;
                expiresAt = existingInvite.rows[0].expiresAt;
            } else {
                await pool.query(`
                    INSERT INTO group_invitations (id, group_id, invite_code, invited_by, invited_email, role, status, expires_at, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, NOW())
                `, [crypto.randomUUID(), groupId, inviteCode, userId || null, trimmedEmail, role, expiresAt]);
            }
        } else {
            await pool.query(`
                INSERT INTO group_invitations (id, group_id, invite_code, invited_by, invited_email, role, status, expires_at, created_at)
                VALUES ($1, $2, $3, $4, null, $5, 'PENDING', $6, NOW())
            `, [crypto.randomUUID(), groupId, inviteCode, userId || null, role, expiresAt]);
        }

        const baseUrl = getLiveAppUrl(req);
        const inviteUrl = `${baseUrl}/join/${inviteCode}`;

        // Send Push Notification if email corresponds to a registered user
        if (email) {
            sendGroupInviteNotification({
                inviteeEmail: email.trim().toLowerCase(),
                inviterName,
                groupName: group.name,
                groupId,
                inviteCode
            }).catch(pushErr => {
                console.warn("Could not dispatch push notification for invite:", pushErr.message);
            });
        }

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

        // Fetch group organizer user_id
        const groupRes = await client.query('SELECT created_by FROM groups WHERE id = $1', [invite.group_id]);
        const organizerUserId = groupRes.rows[0]?.created_by || null;

        await client.query('BEGIN');

        // Approve and activate group membership (updates status to ACCEPTED)
        const updateResult = await client.query(`
            UPDATE group_members 
            SET user_id = $1, name = $2, is_registered = TRUE, status = 'ACCEPTED', joined_at = NOW()
            WHERE group_id = $3 AND (LOWER(TRIM(email)) = LOWER(TRIM($4)) OR (user_id = $1 AND user_id IS NOT NULL))
        `, [userId, userName, invite.group_id, userEmail]);

        if (updateResult.rowCount === 0) {
            // If no pre-existing member row, insert new member with ACCEPTED status
            await client.query(`
                INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, is_registered, status, joined_at)
                VALUES ($1, $2, $3, $4, $5, $6, '#059669', TRUE, 'ACCEPTED', NOW())
                ON CONFLICT (group_id, email) DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    name = EXCLUDED.name,
                    is_registered = TRUE,
                    status = 'ACCEPTED',
                    joined_at = NOW()
            `, [crypto.randomUUID(), invite.group_id, userId, userName, userEmail, invite.role || 'Traveler']);
        }

        // Update invitation status to ACCEPTED for all user invites in this group
        await client.query(`
            UPDATE group_invitations 
            SET status = 'ACCEPTED' 
            WHERE id = $1 OR (group_id = $2 AND LOWER(TRIM(invited_email)) = LOWER(TRIM($3)))
        `, [invite.id, invite.group_id, userEmail]);

        // Log audit event for member acceptance
        await client.query(`
            INSERT INTO ledger_audit_log (id, group_id, event_type, actor_id, actor_name, description, created_at)
            VALUES ($1, $2, 'MEMBER_JOINED', $3, $4, $5, NOW())
        `, [
            crypto.randomUUID(),
            invite.group_id,
            userId,
            userName,
            `${userName} accepted the invitation and joined the trip!`
        ]);

        await client.query('COMMIT');

        // Send notifications asynchronously to organizer
        if (organizerUserId && String(organizerUserId) !== String(userId)) {
            sendInviteAcceptedNotification({
                organizerUserId,
                memberName: userName,
                groupName: invite.groupName,
                groupId: invite.group_id
            }).catch(e => console.warn('Async invite accepted notify error:', e.message));
        }

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

        // Fetch user email & username
        const userRes = await client.query('SELECT username, email_id FROM users WHERE id = $1', [userId]);
        const userName = userRes.rows[0]?.username || 'Traveler';
        const userEmail = (userRes.rows[0]?.email_id || '').trim().toLowerCase();

        // Fetch organizer user_id
        const groupRes = await client.query('SELECT created_by FROM groups WHERE id = $1', [invite.group_id]);
        const organizerUserId = groupRes.rows[0]?.created_by || null;

        await client.query('BEGIN');

        // Mark invitations for this user & group as REJECTED
        await client.query(`
            UPDATE group_invitations 
            SET status = 'REJECTED' 
            WHERE id = $1 OR (group_id = $2 AND LOWER(TRIM(invited_email)) = LOWER(TRIM($3)))
        `, [invite.id, invite.group_id, userEmail]);

        // Mark REJECTED in group_members so this group never shows as pending or joined
        if (userEmail || userId) {
            await client.query(`
                UPDATE group_members 
                SET status = 'REJECTED' 
                WHERE group_id = $1 AND (
                    (LOWER(TRIM(email)) = LOWER(TRIM($2)) AND $2 != '') OR 
                    (user_id = $3 AND $3 IS NOT NULL)
                )
            `, [invite.group_id, userEmail, userId || null]);
        }

        // Log audit event for member decline
        await client.query(`
            INSERT INTO ledger_audit_log (id, group_id, event_type, actor_id, actor_name, description, created_at)
            VALUES ($1, $2, 'MEMBER_DECLINED', $3, $4, $5, NOW())
        `, [
            crypto.randomUUID(),
            invite.group_id,
            userId,
            userName,
            `${userName} declined the invitation.`
        ]);

        await client.query('COMMIT');

        // Send notifications asynchronously to organizer
        if (organizerUserId && String(organizerUserId) !== String(userId)) {
            sendInviteRejectedNotification({
                organizerUserId,
                memberName: userName,
                groupName: invite.groupName,
                groupId: invite.group_id
            }).catch(e => console.warn('Async invite rejected notify error:', e.message));
        }

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
 * Guaranteed strictly SINGLE invitation per trip (deduplicated by group_id)
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
        const userEmail = (userRes.rows[0].email_id || '').trim().toLowerCase();

        // Guaranteed at most ONE invitation per group (preferring dedicated email invite over general invite)
        const pendingInvites = await pool.query(`
            SELECT DISTINCT ON (g.id) 
                   gi.id, gi.invite_code as "inviteCode", gi.role, gi.created_at as "createdAt",
                   gi.expires_at as "expiresAt", g.id as "groupId", g.name as "groupName",
                   g.destination, g.start_date as "startDate", g.end_date as "endDate",
                   g.trip_type as "tripType", g.currency, g.expense_split as "expenseSplit",
                   u.username as "organizerName"
            FROM group_invitations gi
            JOIN groups g ON gi.group_id = g.id
            LEFT JOIN users u ON gi.invited_by = u.id
            WHERE (
                (LOWER(TRIM(gi.invited_email)) = LOWER(TRIM($1)) AND gi.status = 'PENDING')
                OR (
                    gi.invited_email IS NULL 
                    AND gi.status = 'PENDING'
                    AND gi.group_id IN (
                        SELECT group_id FROM group_members WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND status = 'PENDING'
                    )
                )
            )
            AND gi.expires_at > NOW()
            AND g.created_by != $2
            AND g.id NOT IN (
                SELECT group_id FROM group_members 
                WHERE ((LOWER(TRIM(email)) = LOWER(TRIM($1)) AND $1 != '') OR user_id = $2) 
                  AND status IN ('ACCEPTED', 'REJECTED')
            )
            ORDER BY g.id, (CASE WHEN LOWER(TRIM(gi.invited_email)) = LOWER(TRIM($1)) THEN 0 ELSE 1 END), gi.created_at DESC
        `, [userEmail, userId]);

        return sendSuccess(res, "Pending invitations fetched successfully", pendingInvites.rows);

    } catch (error) {
        console.error("Get My Pending Invites Error:", error);
        return sendError(res, "Failed to fetch pending invitations", error, 500);
    }
}
