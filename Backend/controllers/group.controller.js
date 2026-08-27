const crypto = require('crypto');
const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');

module.exports = {
    createGroup,
    getGroupById,
    getMyGroups,
    updateGroup,
    deleteGroup,
    addGroupMember,
    removeGroupMember
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
            travelers = []
        } = req.body;

        if (!groupName || !groupName.trim()) {
            return sendError(res, "Group name is required", null, 400);
        }
        if (!destination || !destination.trim()) {
            return sendError(res, "Destination is required", null, 400);
        }

        await client.query('BEGIN');

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

        const groupId = crypto.randomUUID();

        // 1. Insert Group Record
        const groupInsertQuery = `
            INSERT INTO groups (
                id, name, destination, start_date, end_date, trip_type, 
                currency, expense_split, description, cover_image, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
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
            userId || null
        ]);

        const createdGroup = groupResult.rows[0];

        // 2. Insert Organizer as Group Member
        if (organizerEmail) {
            await client.query(`
                INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, is_registered, joined_at)
                VALUES ($1, $2, $3, $4, $5, 'Organizer', '#059669', TRUE, NOW())
                ON CONFLICT (group_id, email) DO NOTHING
            `, [crypto.randomUUID(), groupId, userId, organizerName, organizerEmail.toLowerCase()]);
        }

        // 3. Process Initial Travelers
        const membersList = [];
        if (organizerEmail) {
            membersList.push({
                name: organizerName,
                email: organizerEmail,
                role: 'Organizer',
                isRegistered: true,
                avatarBg: '#059669'
            });
        }

        for (const traveler of travelers) {
            const email = (traveler.email || '').trim().toLowerCase();
            const name = (traveler.name || '').trim() || email.split('@')[0];
            const role = traveler.role || 'Traveler';
            const avatarBg = traveler.avatarBg || '#0284c7';

            if (!email || email === organizerEmail.toLowerCase()) continue;

            // Check if traveler is registered on platform
            const regCheck = await client.query(
                'SELECT id, username FROM users WHERE LOWER(email_id) = $1 AND is_temp = FALSE LIMIT 1',
                [email]
            );

            const isRegistered = regCheck.rows.length > 0;
            const travelerUserId = isRegistered ? regCheck.rows[0].id : null;
            const displayName = isRegistered ? regCheck.rows[0].username : name;

            const memberId = crypto.randomUUID();
            await client.query(`
                INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, is_registered, joined_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (group_id, email) DO UPDATE SET
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                    avatar_bg = EXCLUDED.avatar_bg,
                    is_registered = EXCLUDED.is_registered
            `, [memberId, groupId, travelerUserId, displayName, email, role, avatarBg, isRegistered]);

            membersList.push({
                id: memberId,
                name: displayName,
                email,
                role,
                avatarBg,
                isRegistered,
                userId: travelerUserId
            });
        }

        // 4. Create Shareable Group Invitation Code
        const inviteCode = generateInviteCode();
        const inviteExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days valid
        await client.query(`
            INSERT INTO group_invitations (id, group_id, invite_code, invited_by, role, status, expires_at, created_at)
            VALUES ($1, $2, $3, $4, 'Traveler', 'PENDING', $5, NOW())
        `, [crypto.randomUUID(), groupId, inviteCode, userId || null, inviteExpiry]);

        await client.query('COMMIT');

        const baseUrl = process.env.APP_URL || 'http://localhost:3000';
        const inviteUrl = `${baseUrl}/join/${inviteCode}`;

        return sendSuccess(res, "Group created successfully", {
            groupId: createdGroup.id,
            name: createdGroup.name,
            destination: createdGroup.destination,
            startDate: createdGroup.start_date,
            endDate: createdGroup.end_date,
            tripType: createdGroup.trip_type,
            currency: createdGroup.currency,
            expenseSplit: createdGroup.expense_split,
            description: createdGroup.description,
            inviteCode,
            inviteUrl,
            shareLinks: {
                whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join our trip "${createdGroup.name}" to ${createdGroup.destination} on Triptual: ${inviteUrl}`)}`,
                telegram: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`Join our group trip to ${createdGroup.destination}!`)}`,
                sms: `sms:?body=${encodeURIComponent(`Join our trip "${createdGroup.name}" to ${createdGroup.destination}: ${inviteUrl}`)}`,
                copyLink: inviteUrl
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
 */
async function getGroupById(req, res) {
    try {
        const { groupId } = req.params;
        if (!groupId) {
            return sendError(res, "Group ID is required", null, 400);
        }

        const groupQuery = await pool.query('SELECT * FROM groups WHERE id = $1', [groupId]);
        if (groupQuery.rows.length === 0) {
            return sendError(res, "Group not found", null, 404);
        }

        const group = groupQuery.rows[0];

        // Fetch members
        const membersQuery = await pool.query(`
            SELECT id, user_id as "userId", name, email, role, avatar_bg as "avatarBg", 
                   is_registered as "isRegistered", joined_at as "joinedAt"
            FROM group_members 
            WHERE group_id = $1 
            ORDER BY role DESC, joined_at ASC
        `, [groupId]);

        // Fetch latest active invite code
        const inviteQuery = await pool.query(`
            SELECT invite_code as "inviteCode", expires_at as "expiresAt"
            FROM group_invitations 
            WHERE group_id = $1 AND expires_at > NOW() 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [groupId]);

        const inviteCode = inviteQuery.rows[0]?.inviteCode || null;
        const baseUrl = process.env.APP_URL || 'http://localhost:3000';
        const inviteUrl = inviteCode ? `${baseUrl}/join/${inviteCode}` : null;

        return sendSuccess(res, "Group fetched successfully", {
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
            inviteCode,
            inviteUrl,
            shareLinks: inviteUrl ? {
                whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join our trip "${group.name}" to ${group.destination} on Triptual: ${inviteUrl}`)}`,
                telegram: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`Join our group trip to ${group.destination}!`)}`,
                sms: `sms:?body=${encodeURIComponent(`Join our trip "${group.name}" to ${group.destination}: ${inviteUrl}`)}`,
                copyLink: inviteUrl
            } : null,
            members: membersQuery.rows,
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
 */
async function getMyGroups(req, res) {
    try {
        const userId = req.userKey;
        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        // Fetch user email
        const userRes = await pool.query('SELECT email_id FROM users WHERE id = $1', [userId]);
        const userEmail = userRes.rows[0]?.email_id || '';

        const groupsQuery = await pool.query(`
            SELECT DISTINCT g.id, g.name, g.destination, g.start_date as "startDate", 
                   g.end_date as "endDate", g.trip_type as "tripType", g.currency, 
                   g.expense_split as "expenseSplit", g.description, g.created_by as "createdBy", 
                   g.created_at as "createdAt",
                   COUNT(gm.id) as "memberCount"
            FROM groups g
            LEFT JOIN group_members gm ON g.id = gm.group_id
            WHERE g.created_by = $1 OR g.id IN (
                SELECT group_id FROM group_members WHERE LOWER(email) = LOWER($2) OR user_id = $1
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

        const groupCheck = await pool.query('SELECT created_by FROM groups WHERE id = $1', [groupId]);
        if (groupCheck.rows.length === 0) {
            return sendError(res, "Group not found", null, 404);
        }

        if (groupCheck.rows[0].created_by && groupCheck.rows[0].created_by !== userId) {
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

        const groupCheck = await pool.query('SELECT created_by FROM groups WHERE id = $1', [groupId]);
        if (groupCheck.rows.length === 0) {
            return sendError(res, "Group not found", null, 404);
        }

        if (groupCheck.rows[0].created_by && groupCheck.rows[0].created_by !== userId) {
            return sendError(res, "Only the organizer can delete this group", null, 403);
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
        const { name, email, role = 'Traveler', avatarBg = '#0284c7' } = req.body;

        if (!email || !email.trim()) {
            return sendError(res, "Member email is required", null, 400);
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanName = (name || '').trim() || cleanEmail.split('@')[0];

        // Check if user is on platform
        const userRes = await pool.query('SELECT id, username FROM users WHERE LOWER(email_id) = $1 AND is_temp = FALSE', [cleanEmail]);
        const isRegistered = userRes.rows.length > 0;
        const travelerUserId = isRegistered ? userRes.rows[0].id : null;
        const displayName = isRegistered ? userRes.rows[0].username : cleanName;

        const memberId = crypto.randomUUID();
        const memberResult = await pool.query(`
            INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, is_registered, joined_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (group_id, email) DO UPDATE SET
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                avatar_bg = EXCLUDED.avatar_bg,
                is_registered = EXCLUDED.is_registered
            RETURNING id, user_id as "userId", name, email, role, avatar_bg as "avatarBg", is_registered as "isRegistered", joined_at as "joinedAt"
        `, [memberId, groupId, travelerUserId, displayName, cleanEmail, role, avatarBg, isRegistered]);

        return sendSuccess(res, "Member added successfully", memberResult.rows[0]);

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

        await pool.query('DELETE FROM group_members WHERE group_id = $1 AND (id = $2 OR email = $2)', [groupId, memberId]);
        return sendSuccess(res, "Member removed successfully", { memberId });

    } catch (error) {
        console.error("Remove Member Error:", error);
        return sendError(res, "Failed to remove group member", error, 500);
    }
}
