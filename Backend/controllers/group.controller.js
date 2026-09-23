const crypto = require('crypto');
const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');
const { sendOfficialInviteEmail } = require('../utils/mail.util');
const { getLiveAppUrl } = require('../utils/url.util');
const { verifyGroupAccess } = require('../utils/groupAuth.util');
const { sendGroupInviteNotification, sendMemberRemovedNotification } = require('../utils/notification.util');

module.exports = {
    createGroup,
    getGroupById,
    getMyGroups,
    updateGroup,
    deleteGroup,
    addGroupMember,
    removeGroupMember,
    resendInvite
};

/**
 * Helper to generate a unique 8-character invite code
 */
function generateInviteCode() {
    return 'TRIP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Create a new Group / Trip with members and auto-generated invite code
 */
async function createGroup(req, res) {
    const client = await pool.connect();
    try {
        const userId = req.userKey; // from verifyToken middleware
        const {
            groupName,
            destination,
            startDate,
            endDate,
            tripType = 'Friends',
            currency = 'INR',
            expenseSplit = 'equal',
            description = '',
            coverImage = null,
            travelers = [],
            payment = null
        } = req.body;

        if (!groupName || !groupName.trim()) {
            client.release();
            return sendError(res, "Group name is required", null, 400);
        }
        if (!destination || !destination.trim()) {
            client.release();
            return sendError(res, "Destination is required", null, 400);
        }

        // Fetch organizer details
        let organizerName = 'Organizer';
        let organizerEmail = '';
        if (userId) {
            const userRes = await client.query('SELECT username, email_id FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length > 0) {
                organizerName = userRes.rows[0].username;
                organizerEmail = userRes.rows[0].email_id;
            }
        }

        // Calculate distinct members count
        const distinctMembers = new Set();
        if (organizerEmail) {
            distinctMembers.add(organizerEmail.toLowerCase());
        }
        for (const traveler of travelers) {
            const email = (traveler.email || '').trim().toLowerCase();
            if (email) {
                distinctMembers.add(email);
            } else if (traveler.name && traveler.name.trim()) {
                distinctMembers.add(traveler.name.trim().toLowerCase());
            }
        }
        const totalMemberCount = Math.max(distinctMembers.size, travelers.length);
        const isLargeGroup = totalMemberCount > 6;
        const requiredFee = 19;

        let memberTier = 'FREE';
        let paymentStatus = 'FREE';
        let paymentAmount = 0;
        let paymentTransactionId = null;
        let paidAt = null;

        // Payment validation for groups with more than 6 members
        if (isLargeGroup) {
            const isPaymentValid = payment && 
                (payment.status === 'PAID' || payment.status === 'SUCCESS' || payment.paid === true) &&
                (payment.amount === undefined || Number(payment.amount) >= requiredFee);

            if (!isPaymentValid) {
                client.release();
                return res.status(402).json({
                    success: false,
                    message: `Groups with more than 6 members require a ₹${requiredFee} upgrade fee. Only up to 6 members are free.`,
                    data: {
                        requiresPayment: true,
                        freeLimit: 6,
                        memberCount: totalMemberCount,
                        fee: requiredFee,
                        currency: 'INR'
                    }
                });
            }

            memberTier = 'PREMIUM';
            paymentStatus = 'PAID';
            paymentAmount = requiredFee;
            paymentTransactionId = payment.transactionId || ('TXN-' + crypto.randomBytes(4).toString('hex').toUpperCase());
            paidAt = new Date();
        }

        await client.query('BEGIN');

        const groupId = crypto.randomUUID();

        // 1. Insert Group Record with Tier and Payment Data
        const groupInsertQuery = `
            INSERT INTO groups (
                id, name, destination, start_date, end_date, trip_type, 
                currency, expense_split, description, cover_image, created_by,
                member_tier, payment_status, payment_amount, payment_transaction_id, paid_at,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
            RETURNING *
        `;
        const groupResult = await client.query(groupInsertQuery, [
            groupId,
            groupName.trim(),
            destination.trim(),
            startDate || null,
            endDate || null,
            tripType,
            currency,
            expenseSplit,
            description ? description.trim() : '',
            coverImage,
            userId || null,
            memberTier,
            paymentStatus,
            paymentAmount,
            paymentTransactionId,
            paidAt
        ]);

        const createdGroup = groupResult.rows[0];

        // 2. Insert Organizer as Group Member with ACCEPTED status
        if (organizerEmail) {
            await client.query(`
                INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, is_registered, status, joined_at)
                VALUES ($1, $2, $3, $4, $5, 'Organizer', '#059669', TRUE, 'ACCEPTED', NOW())
                ON CONFLICT (group_id, email) DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    role = 'Organizer',
                    status = 'ACCEPTED'
            `, [crypto.randomUUID(), groupId, userId, organizerName, organizerEmail.toLowerCase()]);
        }

        const baseUrl = getLiveAppUrl(req);

        // 3. Process Initial Travelers (All invited travelers start in PENDING status until approved)
        const membersList = [];
        if (organizerEmail) {
            membersList.push({
                name: organizerName,
                email: organizerEmail,
                role: 'Organizer',
                isRegistered: true,
                status: 'ACCEPTED',
                avatarBg: '#059669'
            });
        }

        const inviteExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days valid
        const pendingInviteEmails = [];
        const processedEmails = new Set();
        if (organizerEmail) {
            processedEmails.add(organizerEmail.trim().toLowerCase());
        }

        for (const traveler of travelers) {
            const email = (traveler.email || '').trim().toLowerCase();
            const name = (traveler.name || '').trim() || email.split('@')[0];
            const role = traveler.role || 'Traveler';
            const avatarBg = traveler.avatarBg || '#0284c7';

            // Skip empty emails, organizer's own email, or already processed duplicate emails
            if (!email || processedEmails.has(email)) continue;
            processedEmails.add(email);

            // Check if traveler is registered on platform
            const regCheck = await client.query(
                'SELECT id, username FROM users WHERE LOWER(email_id) = $1 AND is_temp = FALSE LIMIT 1',
                [email]
            );

            const isRegistered = regCheck.rows.length > 0;
            const travelerUserId = isRegistered ? regCheck.rows[0].id : null;
            const displayName = isRegistered ? regCheck.rows[0].username : name;

            // Participant starts in PENDING status until their approval
            const memberId = crypto.randomUUID();
            await client.query(`
                INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, is_registered, status, joined_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW())
                ON CONFLICT (group_id, email) DO UPDATE SET
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                    avatar_bg = EXCLUDED.avatar_bg,
                    is_registered = EXCLUDED.is_registered,
                    status = 'PENDING'
            `, [memberId, groupId, travelerUserId, displayName, email, role, avatarBg, isRegistered]);

            // Create dedicated official invitation code for this traveler
            const travelerInviteCode = 'TRIP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
            await client.query(`
                INSERT INTO group_invitations (id, group_id, invite_code, invited_by, invited_email, role, status, expires_at, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, NOW())
            `, [crypto.randomUUID(), groupId, travelerInviteCode, userId || null, email, role, inviteExpiry]);

            const travelerInviteUrl = `${baseUrl}/join/${travelerInviteCode}`;

            membersList.push({
                id: memberId,
                name: displayName,
                email,
                role,
                avatarBg,
                isRegistered,
                status: 'PENDING',
                userId: travelerUserId,
                inviteCode: travelerInviteCode,
                inviteUrl: travelerInviteUrl
            });

            pendingInviteEmails.push({
                email,
                name: displayName,
                inviteCode: travelerInviteCode,
                inviteUrl: travelerInviteUrl
            });
        }

        // 4. Create General Shareable Group Invitation Code
        const generalInviteCode = generateInviteCode();
        await client.query(`
            INSERT INTO group_invitations (id, group_id, invite_code, invited_by, role, status, expires_at, created_at)
            VALUES ($1, $2, $3, $4, 'Traveler', 'PENDING', $5, NOW())
        `, [crypto.randomUUID(), groupId, generalInviteCode, userId || null, inviteExpiry]);

        // 5. Audit Log Entry for Group Creation
        await client.query(`
            INSERT INTO ledger_audit_log (id, group_id, event_type, actor_id, actor_name, description, created_at)
            VALUES ($1, $2, 'GROUP_CREATED', $3, $4, $5, NOW())
        `, [
            crypto.randomUUID(),
            groupId,
            userId || null,
            organizerName,
            `Trip "${createdGroup.name}" created by ${organizerName}. Invited ${pendingInviteEmails.length} member(s).`
        ]);

        await client.query('COMMIT');

        const generalInviteUrl = `${baseUrl}/join/${generalInviteCode}`;

        // Dispatch official branded invitation emails and push notifications asynchronously to all invited participants
        for (const item of pendingInviteEmails) {
            sendOfficialInviteEmail({
                recipientEmail: item.email,
                recipientName: item.name,
                inviterName: organizerName,
                groupName: createdGroup.name,
                destination: createdGroup.destination,
                startDate: createdGroup.start_date,
                endDate: createdGroup.end_date,
                tripType: createdGroup.trip_type,
                expenseSplit: createdGroup.expense_split,
                currency: createdGroup.currency,
                inviteUrl: item.inviteUrl,
                inviteCode: item.inviteCode
            }).catch(e => console.warn(`Async invite mail error for ${item.email}:`, e.message));

            sendGroupInviteNotification({
                inviteeEmail: item.email,
                inviterName: organizerName,
                groupName: createdGroup.name,
                groupId: createdGroup.id,
                inviteCode: item.inviteCode
            }).catch(e => console.warn(`Async invite push error for ${item.email}:`, e.message));
        }

        return sendSuccess(res, "Group created successfully", {
            id: createdGroup.id,
            groupId: createdGroup.id,
            name: createdGroup.name,
            destination: createdGroup.destination,
            startDate: createdGroup.start_date,
            endDate: createdGroup.end_date,
            tripType: createdGroup.trip_type,
            currency: createdGroup.currency,
            expenseSplit: createdGroup.expense_split,
            description: createdGroup.description,
            memberTier: createdGroup.member_tier,
            paymentStatus: createdGroup.payment_status,
            paymentAmount: Number(createdGroup.payment_amount || 0),
            paymentTransactionId: createdGroup.payment_transaction_id,
            paidAt: createdGroup.paid_at,
            inviteCode: generalInviteCode,
            inviteUrl: generalInviteUrl,
            shareLinks: {
                whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join our trip "${createdGroup.name}" to ${createdGroup.destination} on Triptual: ${generalInviteUrl}`)}`,
                telegram: `https://t.me/share/url?url=${encodeURIComponent(generalInviteUrl)}&text=${encodeURIComponent(`Join our group trip to ${createdGroup.destination}!`)}`,
                sms: `sms:?body=${encodeURIComponent(`Join our trip "${createdGroup.name}" to ${createdGroup.destination}: ${generalInviteUrl}`)}`,
                copyLink: generalInviteUrl
            },
            members: membersList,
            createdAt: createdGroup.created_at
        }, 201);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Create Group Error:", error);
        return sendError(res, "Failed to create group", error, 500);
    } finally {
        client.release();
    }
}

/**
 * Get Group Details by ID with members and invite code
 * Strictly checks user membership to prevent IDOR / unauthorized access
 */
async function getGroupById(req, res) {
    try {
        const { groupId } = req.params;
        const userId = req.userKey;
        if (!groupId) {
            return sendError(res, "Group ID is required", null, 400);
        }
        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        // Security Check: Strictly enforce multi-tenant isolation and verify requester membership
        const access = await verifyGroupAccess(groupId, userId);
        if (access.notFound) {
            return sendError(res, "Group not found", null, 404);
        }
        if (!access.isAuthorized) {
            return sendError(res, "Access denied. You are not a member of this trip.", null, 403);
        }

        const group = access.group;

        const baseUrl = getLiveAppUrl(req);

        // Fetch latest active general invite code
        const inviteQuery = await pool.query(`
            SELECT invite_code as "inviteCode", expires_at as "expiresAt"
            FROM group_invitations 
            WHERE group_id = $1 AND expires_at > NOW() 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [groupId]);

        const inviteCode = inviteQuery.rows[0]?.inviteCode || null;
        const inviteUrl = inviteCode ? `${baseUrl}/join/${inviteCode}` : null;

        // Fetch members with approval status and their personal invite link if pending
        const membersQuery = await pool.query(`
            SELECT gm.id, gm.user_id as "userId", gm.name, gm.email, gm.role, gm.avatar_bg as "avatarBg", 
                   gm.is_registered as "isRegistered", gm.status as status, gm.joined_at as "joinedAt",
                   gi.invite_code as "inviteCode"
            FROM group_members gm
            LEFT JOIN LATERAL (
                SELECT invite_code 
                FROM group_invitations 
                WHERE group_id = gm.group_id AND (LOWER(invited_email) = LOWER(gm.email) OR invited_email IS NULL)
                ORDER BY (LOWER(invited_email) = LOWER(gm.email)) DESC, created_at DESC 
                LIMIT 1
            ) gi ON true
            WHERE gm.group_id = $1 
            ORDER BY gm.role DESC, gm.joined_at ASC
        `, [groupId]);

        const members = membersQuery.rows.map(m => ({
            ...m,
            inviteUrl: m.inviteCode ? `${baseUrl}/join/${m.inviteCode}` : (inviteUrl || null)
        }));

        return sendSuccess(res, "Group fetched successfully", {
            id: group.id,
            groupId: group.id,
            name: group.name,
            destination: group.destination,
            startDate: group.start_date,
            endDate: group.end_date,
            tripType: group.trip_type,
            currency: group.currency,
            expenseSplit: group.expense_split,
            description: group.description,
            coverImage: group.cover_image,
            createdBy: group.created_by,
            memberTier: group.member_tier,
            paymentStatus: group.payment_status,
            paymentAmount: Number(group.payment_amount || 0),
            paymentTransactionId: group.payment_transaction_id,
            paidAt: group.paid_at,
            inviteCode,
            inviteUrl,
            shareLinks: inviteUrl ? {
                whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join our trip "${group.name}" to ${group.destination} on Triptual: ${inviteUrl}`)}`,
                telegram: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`Join our group trip to ${group.destination}!`)}`,
                sms: `sms:?body=${encodeURIComponent(`Join our trip "${group.name}" to ${group.destination}: ${inviteUrl}`)}`,
                copyLink: inviteUrl
            } : null,
            members,
            createdAt: group.created_at,
            updatedAt: group.updated_at
        });

    } catch (error) {
        console.error("Get Group Error:", error);
        return sendError(res, "Failed to retrieve group details", error, 500);
    }
}

/**
 * Get all groups associated with the authenticated user
 * Strictly returns ONLY trips created by or joined by the user (no cross-user leakage)
 */
async function getMyGroups(req, res) {
    try {
        const userId = req.userKey;
        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        // Fetch user email
        const userRes = await pool.query('SELECT email_id FROM users WHERE id = $1', [userId]);
        const userEmail = (userRes.rows[0]?.email_id || '').trim().toLowerCase();

        const groupsQuery = await pool.query(`
            SELECT DISTINCT g.id, g.id as "groupId", g.name, g.destination, g.start_date as "startDate", 
                   g.end_date as "endDate", g.trip_type as "tripType", g.currency, 
                   g.expense_split as "expenseSplit", g.description, g.cover_image as "coverImage",
                   g.created_by as "createdBy", 
                   g.member_tier as "memberTier", g.payment_status as "paymentStatus",
                   g.payment_amount as "paymentAmount",
                   g.created_at as "createdAt",
                   COUNT(DISTINCT gm.id) as "memberCount"
            FROM groups g
            LEFT JOIN group_members gm ON g.id = gm.group_id AND COALESCE(gm.status, 'ACCEPTED') = 'ACCEPTED'
            WHERE (
                g.created_by = $1 
                OR g.id IN (
                    SELECT group_id FROM group_members 
                    WHERE (user_id = $1 OR (LOWER(email) = LOWER($2) AND $2 != ''))
                      AND COALESCE(status, 'ACCEPTED') = 'ACCEPTED'
                )
            )
            GROUP BY g.id
            ORDER BY g.created_at DESC
        `, [userId, userEmail]);

        return sendSuccess(res, "My groups fetched successfully", groupsQuery.rows);

    } catch (error) {
        console.error("Get My Groups Error:", error);
        return sendError(res, "Failed to fetch user groups", error, 500);
    }
}

/**
 * Update Group Details
 */
async function updateGroup(req, res) {
    try {
        const { groupId } = req.params;
        const userId = req.userKey;
        const { groupName, destination, startDate, endDate, tripType, currency, expenseSplit, description } = req.body;

        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        const access = await verifyGroupAccess(groupId, userId);
        if (access.notFound) {
            return sendError(res, "Group not found", null, 404);
        }
        if (!access.isOrganizer) {
            return sendError(res, "Only the group organizer can update trip settings", null, 403);
        }

        const updateRes = await pool.query(`
            UPDATE groups SET
                name = COALESCE($1, name),
                destination = COALESCE($2, destination),
                start_date = COALESCE($3, start_date),
                end_date = COALESCE($4, end_date),
                trip_type = COALESCE($5, trip_type),
                currency = COALESCE($6, currency),
                expense_split = COALESCE($7, expense_split),
                description = COALESCE($8, description),
                updated_at = NOW()
            WHERE id = $9
            RETURNING *
        `, [groupName, destination, startDate, endDate, tripType, currency, expenseSplit, description, groupId]);

        return sendSuccess(res, "Group updated successfully", updateRes.rows[0]);

    } catch (error) {
        console.error("Update Group Error:", error);
        return sendError(res, "Failed to update group", error, 500);
    }
}

/**
 * Delete a Group
 */
async function deleteGroup(req, res) {
    try {
        const { groupId } = req.params;
        const userId = req.userKey;

        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        const access = await verifyGroupAccess(groupId, userId);
        if (access.notFound) {
            return sendError(res, "Group not found", null, 404);
        }
        if (!access.isOrganizer) {
            return sendError(res, "Only the group organizer can delete this trip", null, 403);
        }

        await pool.query('DELETE FROM groups WHERE id = $1', [groupId]);
        return sendSuccess(res, "Group deleted successfully", { groupId });

    } catch (error) {
        console.error("Delete Group Error:", error);
        return sendError(res, "Failed to delete group", error, 500);
    }
}

/**
 * Add a Member to an existing Group
 */
async function addGroupMember(req, res) {
    try {
        const { groupId } = req.params;
        const userId = req.userKey;
        const { name, email, role = 'Traveler', avatarBg = '#0284c7' } = req.body;

        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        const access = await verifyGroupAccess(groupId, userId);
        if (access.notFound) {
            return sendError(res, "Group not found", null, 404);
        }
        if (!access.isAuthorized) {
            return sendError(res, "Access denied. You are not a member of this trip.", null, 403);
        }

        if (!email || !email.trim()) {
            return sendError(res, "Member email is required", null, 400);
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanName = (name || '').trim() || cleanEmail.split('@')[0];

        const currentGroup = access.group;

        // Check if group is on FREE tier and adding this member exceeds 6 members
        if (currentGroup.member_tier === 'FREE' || currentGroup.payment_status !== 'PAID') {
            const countRes = await pool.query('SELECT COUNT(*) as count FROM group_members WHERE group_id = $1', [groupId]);
            const currentCount = parseInt(countRes.rows[0].count, 10);
            const alreadyInGroup = await pool.query('SELECT id FROM group_members WHERE group_id = $1 AND LOWER(email) = $2', [groupId, cleanEmail]);
            if (alreadyInGroup.rows.length === 0 && currentCount >= 6) {
                return res.status(402).json({
                    success: false,
                    message: "Group has reached the 6-member free tier limit. Upgrade to 7+ members for ₹19 to add more travelers.",
                    data: {
                        requiresPayment: true,
                        freeLimit: 6,
                        memberCount: currentCount + 1,
                        fee: 19,
                        currency: 'INR'
                    }
                });
            }
        }

        // Check if user is on platform
        const userRes = await pool.query('SELECT id, username FROM users WHERE LOWER(email_id) = $1 AND is_temp = FALSE', [cleanEmail]);
        const isRegistered = userRes.rows.length > 0;
        const travelerUserId = isRegistered ? userRes.rows[0].id : null;
        const displayName = isRegistered ? userRes.rows[0].username : cleanName;

        const memberId = crypto.randomUUID();
        const baseUrl = getLiveAppUrl(req);
        const inviteCode = 'TRIP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const inviteExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const memberResult = await pool.query(`
            INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, is_registered, status, joined_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW())
            ON CONFLICT (group_id, email) DO UPDATE SET
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                avatar_bg = EXCLUDED.avatar_bg,
                is_registered = EXCLUDED.is_registered,
                status = 'PENDING'
            RETURNING id, user_id as "userId", name, email, role, avatar_bg as "avatarBg", is_registered as "isRegistered", status, joined_at as "joinedAt"
        `, [memberId, groupId, travelerUserId, displayName, cleanEmail, role, avatarBg, isRegistered]);

        // Create official invitation record
        await pool.query(`
            INSERT INTO group_invitations (id, group_id, invite_code, invited_by, invited_email, role, status, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, NOW())
        `, [crypto.randomUUID(), groupId, inviteCode, userId || null, cleanEmail, role, inviteExpiry]);

        const inviteUrl = `${baseUrl}/join/${inviteCode}`;

        // Send official branded invitation email asynchronously
        sendOfficialInviteEmail({
            recipientEmail: cleanEmail,
            recipientName: displayName,
            inviterName: access.member?.name || 'Group Organizer',
            groupName: currentGroup.name || 'Trip Ledger',
            destination: currentGroup.destination || 'Group Trip',
            startDate: currentGroup.start_date,
            endDate: currentGroup.end_date,
            tripType: currentGroup.trip_type,
            expenseSplit: currentGroup.expense_split,
            currency: currentGroup.currency,
            inviteUrl,
            inviteCode
        }).catch(err => console.warn(`Async invite mail error to ${cleanEmail}:`, err.message));

        return sendSuccess(res, "Member invitation created successfully. Member will be added once approved.", {
            ...memberResult.rows[0],
            status: 'PENDING',
            inviteCode,
            inviteUrl
        });

    } catch (error) {
        console.error("Add Member Error:", error);
        return sendError(res, "Failed to add member to group", error, 500);
    }
}

/**
 * Remove a Member from a Group
 */
async function removeGroupMember(req, res) {
    try {
        const { groupId, memberId } = req.params;
        const userId = req.userKey;

        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        const access = await verifyGroupAccess(groupId, userId);
        if (access.notFound) {
            return sendError(res, "Group not found", null, 404);
        }
        if (!access.isAuthorized) {
            return sendError(res, "Access denied. You are not a member of this trip.", null, 403);
        }

        // Only organizer can remove other members, or a member can remove/leave themselves
        const isSelf = access.member && (
            String(access.member.id) === String(memberId) || 
            String(access.member.email).toLowerCase() === String(memberId).toLowerCase() ||
            String(access.member.user_id) === String(userId)
        );

        if (!access.isOrganizer && !isSelf) {
            return sendError(res, "Only the trip organizer can remove other travelers from this trip", null, 403);
        }

        const memRes = await pool.query('SELECT name, user_id FROM group_members WHERE group_id = $1 AND (id = $2 OR email = $2)', [groupId, memberId]);
        const removedMem = memRes.rows[0];

        await pool.query('DELETE FROM group_members WHERE group_id = $1 AND (id = $2 OR email = $2)', [groupId, memberId]);
        // Also cancel/expire any pending invitations for this email/member if matching
        await pool.query('UPDATE group_invitations SET status = $1 WHERE group_id = $2 AND (id = $3 OR invited_email = $3)', ['EXPIRED', groupId, memberId]);

        sendMemberRemovedNotification({
            groupId,
            groupName: access.group?.name || 'Trip',
            removedUserId: removedMem?.user_id,
            removedMemberName: removedMem?.name || 'Traveler',
            actorName: access.member?.name || 'Organizer'
        }).catch(() => {});

        return sendSuccess(res, "Member removed successfully", { memberId });

    } catch (error) {
        console.error("Remove Member Error:", error);
        return sendError(res, "Failed to remove group member", error, 500);
    }
}

/**
 * Resend Official Group Invitation Email
 */
async function resendInvite(req, res) {
    try {
        const { groupId } = req.params;
        const { email } = req.body;
        const userId = req.userKey;

        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        const access = await verifyGroupAccess(groupId, userId);
        if (access.notFound) {
            return sendError(res, "Group not found", null, 404);
        }
        if (!access.isAuthorized) {
            return sendError(res, "Access denied. You are not a member of this trip.", null, 403);
        }

        if (!email || !email.trim()) {
            return sendError(res, "Recipient email is required", null, 400);
        }
        const cleanEmail = email.trim().toLowerCase();

        const group = access.group;

        // Fetch organizer / inviter name
        let inviterName = access.member?.name || 'Group Organizer';

        // Fetch existing recipient name from group_members
        const memberRes = await pool.query('SELECT name FROM group_members WHERE group_id = $1 AND LOWER(email) = $2', [groupId, cleanEmail]);
        const recipientName = memberRes.rows[0]?.name || cleanEmail.split('@')[0];

        // Generate fresh invitation code
        const inviteCode = 'TRIP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const inviteExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await pool.query(`
            INSERT INTO group_invitations (id, group_id, invite_code, invited_by, invited_email, role, status, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, 'Traveler', 'PENDING', $6, NOW())
        `, [crypto.randomUUID(), groupId, inviteCode, userId || null, cleanEmail, inviteExpiry]);

        const baseUrl = getLiveAppUrl(req);
        const inviteUrl = `${baseUrl}/join/${inviteCode}`;

        // Send official email
        await sendOfficialInviteEmail({
            recipientEmail: cleanEmail,
            recipientName,
            inviterName,
            groupName: group.name,
            destination: group.destination,
            startDate: group.start_date,
            endDate: group.end_date,
            tripType: group.trip_type,
            expenseSplit: group.expense_split,
            currency: group.currency,
            inviteUrl,
            inviteCode
        });

        // Dispatch push notification asynchronously
        sendGroupInviteNotification({
            inviteeEmail: cleanEmail,
            inviterName,
            groupName: group.name,
            groupId,
            inviteCode
        }).catch(pushErr => {
            console.warn("Could not dispatch push notification on resend invite:", pushErr.message);
        });

        return sendSuccess(res, `Official invitation sent to ${cleanEmail}`, {
            inviteCode,
            inviteUrl,
            recipientEmail: cleanEmail
        });
    } catch (error) {
        console.error("Resend Invite Error:", error);
        return sendError(res, "Failed to resend invitation email", error, 500);
    }
}
