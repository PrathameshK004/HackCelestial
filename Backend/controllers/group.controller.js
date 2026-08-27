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
    removeGroupMember,
    addExpense,
    getSettlement,
    settleGroup,
    recordSettlement
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
        if (!userId) {
            return sendError(res, 'Authentication required to create a group', null, 401);
        }
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
        let organizerUpiId = null;
        if (userId) {
            const userRes = await client.query('SELECT username, email_id, upi_id FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length > 0) {
                organizerName = userRes.rows[0].username;
                organizerEmail = userRes.rows[0].email_id;
                organizerUpiId = userRes.rows[0].upi_id;
            }
        }

        const groupId = crypto.randomUUID();
        const additionalTravelers = Array.isArray(travelers) ? travelers : [];
        const additionalMemberCount = additionalTravelers.filter((traveler) => {
            const email = (traveler?.email || '').trim().toLowerCase();
            return email && email !== organizerEmail.toLowerCase();
        }).length;
        if (additionalMemberCount < 1) {
            return sendError(res, 'At least two group members are required, including you', null, 400);
        }

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
                INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, upi_id, is_registered, joined_at)
                VALUES ($1, $2, $3, $4, $5, 'Organizer', '#059669', $6, TRUE, NOW())
                ON CONFLICT (group_id, email) DO NOTHING
            `, [crypto.randomUUID(), groupId, userId, organizerName, organizerEmail.toLowerCase(), organizerUpiId]);
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

        for (const traveler of additionalTravelers) {
            const email = (traveler.email || '').trim().toLowerCase();
            const name = (traveler.name || '').trim() || email.split('@')[0];
            const role = traveler.role || 'Traveler';
            const avatarBg = traveler.avatarBg || '#0284c7';
            const upiId = (traveler.upiId || '').trim().toLowerCase();

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
                INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, upi_id, is_registered, joined_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (group_id, email) DO UPDATE SET
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                        avatar_bg = EXCLUDED.avatar_bg,
                        upi_id = EXCLUDED.upi_id,
                    is_registered = EXCLUDED.is_registered
                    `, [memberId, groupId, travelerUserId, displayName, email, role, avatarBg, upiId, isRegistered]);

            membersList.push({
                id: memberId,
                name: displayName,
                email,
                role,
                avatarBg,
                isRegistered,
                userId: travelerUserId,
                upiId
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
            SELECT id, user_id as "userId", name, email, role, avatar_bg as "avatarBg", upi_id as "upiId", 
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
                   g.end_date as "endDate", g.trip_type as "tripType", g.currency, g.status,
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
        const { name, email, role = 'Traveler', avatarBg = '#0284c7', upiId } = req.body;

        if (!email || !email.trim()) {
            return sendError(res, "Member email is required", null, 400);
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanName = (name || '').trim() || cleanEmail.split('@')[0];
        const cleanUpiId = (upiId || '').trim().toLowerCase();
        if (!/^\w[\w.-]{1,}@[\w.-]+$/.test(cleanUpiId)) return sendError(res, 'A valid UPI ID is required', null, 400);

        // Check if user is on platform
        const userRes = await pool.query('SELECT id, username, upi_id FROM users WHERE LOWER(email_id) = $1 AND is_temp = FALSE', [cleanEmail]);
        const isRegistered = userRes.rows.length > 0;
        const travelerUserId = isRegistered ? userRes.rows[0].id : null;
        const displayName = isRegistered ? userRes.rows[0].username : cleanName;
        const memberUpiId = isRegistered ? (userRes.rows[0].upi_id || cleanUpiId) : cleanUpiId;
        if (!/^\w[\w.-]{1,}@[\w.-]+$/.test(memberUpiId)) return sendError(res, 'This registered user has no UPI ID. Ask them to update their profile first.', null, 400);

        const memberId = crypto.randomUUID();
        const memberResult = await pool.query(`
            INSERT INTO group_members (id, group_id, user_id, name, email, role, avatar_bg, upi_id, is_registered, joined_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (group_id, email) DO UPDATE SET
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                avatar_bg = EXCLUDED.avatar_bg,
                upi_id = EXCLUDED.upi_id,
                is_registered = EXCLUDED.is_registered
            RETURNING id, user_id as "userId", name, email, role, avatar_bg as "avatarBg", is_registered as "isRegistered", joined_at as "joinedAt"
        `, [memberId, groupId, travelerUserId, displayName, cleanEmail, role, avatarBg, memberUpiId, isRegistered]);

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

async function ensureGroupMember(groupId, userId) {
    const result = await pool.query(`
        SELECT gm.id FROM group_members gm
        LEFT JOIN groups g ON g.id = gm.group_id
        WHERE gm.group_id = $1 AND (gm.user_id = $2 OR g.created_by = $2)
        LIMIT 1
    `, [groupId, userId]);
    return result.rows.length > 0;
}

function parseAmountToCents(value) {
    const text = String(value ?? '').trim();
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
    const [whole, fraction = ''] = text.split('.');
    const cents = Number(`${whole}${fraction.padEnd(2, '0')}`);
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function calculateSettlement(expenses, members, settlementRecords = []) {
    const balances = new Map(members.map((member) => [member.id, 0]));
    for (const expense of expenses) {
        const amountCents = parseAmountToCents(expense.amount);
        if (!amountCents) continue;
        balances.set(expense.paidBy, (balances.get(expense.paidBy) || 0) + amountCents);
        for (const share of expense.shares || []) {
            balances.set(share.memberId, (balances.get(share.memberId) || 0) - Number(share.amountCents));
        }
    }
    for (const record of settlementRecords) {
        const amountCents = parseAmountToCents(record.amount);
        if (!amountCents) continue;
        balances.set(record.paidBy, (balances.get(record.paidBy) || 0) + amountCents);
        balances.set(record.paidTo, (balances.get(record.paidTo) || 0) - amountCents);
    }
    const creditors = [...balances].filter(([, amount]) => amount > 0).map(([memberId, amountCents]) => ({ memberId, amountCents }));
    const debtors = [...balances].filter(([, amount]) => amount < 0).map(([memberId, amountCents]) => ({ memberId, amountCents: -amountCents }));
    const transfers = [];
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
        const debtor = debtors[debtorIndex];
        const creditor = creditors[creditorIndex];
        const amountCents = Math.min(debtor.amountCents, creditor.amountCents);
        transfers.push({ from: debtor.memberId, to: creditor.memberId, amount: (amountCents / 100).toFixed(2) });
        debtor.amountCents -= amountCents;
        creditor.amountCents -= amountCents;
        if (debtor.amountCents === 0) debtorIndex++;
        if (creditor.amountCents === 0) creditorIndex++;
    }
    return transfers;
}

async function addExpense(req, res) {
    const { groupId } = req.params;
    const { description, amount, participants, paymentMethod = 'CASH', paymentReference = null } = req.body;
    try {
        if (!(await ensureGroupMember(groupId, req.userKey))) return sendError(res, 'You are not a member of this group', null, 403);
        const groupState = await pool.query('SELECT status FROM groups WHERE id = $1', [groupId]);
        if (!groupState.rows.length) return sendError(res, 'Group not found', null, 404);
        if (groupState.rows[0].status === 'SETTLED') return sendError(res, 'Settled groups cannot accept new expenses', null, 409);
        const amountCents = parseAmountToCents(amount);
        if (!description?.trim() || !amountCents) return sendError(res, 'Description and amount are required', null, 400);
        if (!['CASH', 'UPI'].includes(paymentMethod)) return sendError(res, 'Unsupported payment method', null, 400);
        const memberResult = await pool.query('SELECT id, user_id as "userId" FROM group_members WHERE group_id = $1 ORDER BY joined_at ASC', [groupId]);
        const memberIds = memberResult.rows.map((member) => member.id);
        const payer = memberResult.rows.find((member) => member.userId === req.userKey);
        if (!payer) return sendError(res, 'Your account is not a member of this group', null, 403);
        const selected = [...new Set((participants || memberIds).filter((id) => memberIds.includes(id)))];
        if (!selected.length) return sendError(res, 'At least one participant is required', null, 400);
        const base = Math.floor(amountCents / selected.length);
        let remainder = amountCents % selected.length;
        const shares = selected.map((memberId) => ({ memberId, amountCents: base + (remainder-- > 0 ? 1 : 0) }));
        const result = await pool.query(`
            INSERT INTO expenses (id, group_id, description, amount, paid_by, shares, created_by, payment_method, payment_reference)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, description, amount, paid_by as "paidBy", shares, payment_method as "paymentMethod", payment_reference as "paymentReference", created_at as "createdAt"
        `, [crypto.randomUUID(), groupId, description.trim(), (amountCents / 100).toFixed(2), payer.id, JSON.stringify(shares), req.userKey, paymentMethod, paymentReference]);
        return sendSuccess(res, 'Expense added successfully', result.rows[0], 201);
    } catch (error) {
        console.error('Add Expense Error:', error);
        return sendError(res, 'Failed to add expense', error, 500);
    }
}

async function getSettlement(req, res) {
    const { groupId } = req.params;
    try {
        if (!(await ensureGroupMember(groupId, req.userKey))) return sendError(res, 'You are not a member of this group', null, 403);
        const [memberResult, expenseResult, settlementResult] = await Promise.all([
            pool.query('SELECT id, user_id as "userId", name, email, upi_id as "upiId" FROM group_members WHERE group_id = $1 ORDER BY joined_at ASC', [groupId]),
            pool.query(`SELECT e.id, e.description, e.amount, e.paid_by as "paidBy", payer.name as "paidByName", e.created_by as "createdBy", creator.username as "createdByName", e.shares, e.payment_method as "paymentMethod", e.payment_reference as "paymentReference", e.created_at as "createdAt" FROM expenses e JOIN group_members payer ON payer.id = e.paid_by LEFT JOIN users creator ON creator.id = e.created_by WHERE e.group_id = $1 ORDER BY e.created_at DESC`, [groupId]),
            pool.query('SELECT paid_by as "paidBy", paid_to as "paidTo", amount FROM settlement_records WHERE group_id = $1', [groupId])
        ]);
        const transfers = calculateSettlement(expenseResult.rows, memberResult.rows, settlementResult.rows);
        const names = Object.fromEntries(memberResult.rows.map((member) => [member.id, member.name]));
        const historyResult = await pool.query(`SELECT sr.id, sr.amount, sr.payment_method as "paymentMethod", sr.remarks, sr.created_at as "createdAt", payer.name as "paidByName", payee.name as "paidToName" FROM settlement_records sr JOIN group_members payer ON payer.id = sr.paid_by JOIN group_members payee ON payee.id = sr.paid_to WHERE sr.group_id = $1 ORDER BY sr.created_at DESC`, [groupId]);
        return sendSuccess(res, 'Settlement calculated successfully', {
            members: memberResult.rows,
            expenses: expenseResult.rows,
            transfers: transfers.map((transfer) => ({ ...transfer, fromName: names[transfer.from], toName: names[transfer.to] })),
            settlementHistory: historyResult.rows
        });
    } catch (error) {
        console.error('Settlement Error:', error);
        return sendError(res, 'Failed to calculate settlement', error, 500);
    }
}

async function settleGroup(req, res) {
    const { groupId } = req.params;
    try {
        const groupResult = await pool.query('SELECT created_by FROM groups WHERE id = $1', [groupId]);
        if (!groupResult.rows.length) return sendError(res, 'Group not found', null, 404);
        if (groupResult.rows[0].created_by !== req.userKey) return sendError(res, 'Only the organizer can settle this group', null, 403);
        const [memberResult, expenseResult, settlementResult] = await Promise.all([
            pool.query('SELECT id, name FROM group_members WHERE group_id = $1 ORDER BY joined_at ASC', [groupId]),
            pool.query('SELECT amount, paid_by as "paidBy", shares FROM expenses WHERE group_id = $1', [groupId]),
            pool.query('SELECT paid_by as "paidBy", paid_to as "paidTo", amount FROM settlement_records WHERE group_id = $1', [groupId])
        ]);
        const transfers = calculateSettlement(expenseResult.rows, memberResult.rows, settlementResult.rows);
        if (transfers.length > 0) return sendError(res, 'The group still has outstanding payments', { transfers }, 409);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const transfer of transfers) {
                await client.query(`INSERT INTO settlement_records (id, group_id, paid_by, paid_to, amount, payment_method, remarks, created_by) VALUES ($1, $2, $3, $4, $5, 'CASH', $6, $7)`, [crypto.randomUUID(), groupId, transfer.from, transfer.to, transfer.amount, 'Settlement transfer', req.userKey]);
            }
            const result = await client.query(`UPDATE groups SET status = 'SETTLED', settled_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, status, settled_at as "settledAt"`, [groupId]);
            await client.query('COMMIT');
            return sendSuccess(res, 'Group marked as settled', { ...result.rows[0], transfers });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Settle Group Error:', error);
        return sendError(res, 'Failed to settle group', error, 500);
    }
}

async function recordSettlement(req, res) {
    const { groupId } = req.params;
    const { paidTo, amount, remarks, paymentMethod = 'CASH', paymentReference = null } = req.body;
    try {
        if (!remarks?.trim() || !/^\d+(\.\d{1,2})?$/.test(String(amount || '')) || !paidTo) return sendError(res, 'Payee, amount, and remarks are required', null, 400);
        if (!['CASH', 'UPI'].includes(paymentMethod)) return sendError(res, 'Unsupported payment method', null, 400);
        const result = await pool.query(`
            SELECT payer.id as "paidBy", payee.id as "paidTo"
            FROM group_members payer
            JOIN group_members payee ON payee.group_id = payer.group_id
            WHERE payer.group_id = $1 AND payer.user_id = $2 AND payee.id = $3
        `, [groupId, req.userKey, paidTo]);
        if (!result.rows.length) return sendError(res, 'You can only settle payments from your own account', null, 403);
        const [membersResult, expensesResult, recordsResult] = await Promise.all([
            pool.query('SELECT id, name FROM group_members WHERE group_id = $1', [groupId]),
            pool.query('SELECT amount, paid_by as "paidBy", shares FROM expenses WHERE group_id = $1', [groupId]),
            pool.query('SELECT paid_by as "paidBy", paid_to as "paidTo", amount FROM settlement_records WHERE group_id = $1', [groupId])
        ]);
        const outstanding = calculateSettlement(expensesResult.rows, membersResult.rows, recordsResult.rows)
            .find((transfer) => transfer.from === result.rows[0].paidBy && transfer.to === result.rows[0].paidTo);
        if (!outstanding || Number(amount) > Number(outstanding.amount)) return sendError(res, 'Settlement amount exceeds the outstanding balance', null, 400);
        const record = await pool.query(`
            INSERT INTO settlement_records (id, group_id, paid_by, paid_to, amount, payment_method, remarks, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, amount, payment_method as "paymentMethod", remarks, created_at as "createdAt"
        `, [crypto.randomUUID(), groupId, result.rows[0].paidBy, result.rows[0].paidTo, amount, paymentMethod, remarks.trim(), req.userKey]);
        return sendSuccess(res, 'Settlement payment recorded', { ...record.rows[0], paymentReference });
    } catch (error) {
        console.error('Record Settlement Error:', error);
        return sendError(res, 'Failed to record settlement payment', error, 500);
    }
}
