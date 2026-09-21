const { pool } = require('./db.util');

/**
 * Validates whether an authenticated user has permission to access a group/trip.
 * Ensures strict multi-tenant isolation and prevents IDOR (Insecure Direct Object Reference).
 * 
 * @param {string} groupId - UUID of the group
 * @param {string} userId - UUID of the authenticated user (from req.userKey)
 * @returns {Promise<{ isAuthorized: boolean, isOrganizer: boolean, group: any, member: any, notFound: boolean }>}
 */
async function verifyGroupAccess(groupId, userId, client = pool) {
    if (!groupId || !userId) {
        return { isAuthorized: false, isOrganizer: false, group: null, member: null, notFound: false };
    }

    const cleanGroupId = String(groupId).trim();
    const cleanUserId = String(userId).trim();

    // 1. Fetch user's email
    const userRes = await client.query('SELECT id, username, email_id FROM users WHERE id = $1', [cleanUserId]);
    if (userRes.rows.length === 0) {
        return { isAuthorized: false, isOrganizer: false, group: null, member: null, notFound: false };
    }
    const userEmail = (userRes.rows[0].email_id || '').trim().toLowerCase();

    // 2. Fetch the group
    const groupRes = await client.query('SELECT * FROM groups WHERE id = $1', [cleanGroupId]);
    if (groupRes.rows.length === 0) {
        return { isAuthorized: false, isOrganizer: false, group: null, member: null, notFound: true };
    }
    const group = groupRes.rows[0];

    const isCreator = group.created_by === cleanUserId;

    // 3. Find if user is in group_members (by user_id OR registered email)
    const memberRes = await client.query(`
        SELECT id, group_id, user_id, name, email, role, avatar_bg, is_registered, status
        FROM group_members
        WHERE group_id = $1 AND (
            user_id = $2 
            OR (LOWER(email) = $3 AND $3 != '')
        ) AND COALESCE(status, 'ACCEPTED') = 'ACCEPTED'
        LIMIT 1
    `, [cleanGroupId, cleanUserId, userEmail]);

    const member = memberRes.rows[0] || null;
    const isMember = Boolean(member);
    const isOrganizer = isCreator || member?.role === 'Organizer';

    return {
        isAuthorized: isCreator || isMember,
        isOrganizer,
        group,
        member,
        notFound: false
    };
}

module.exports = {
    verifyGroupAccess
};
