const crypto = require('crypto');
const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');
const { verifyGroupAccess } = require('../utils/groupAuth.util');
const {
    round2,
    calculateExpenseSplits,
    calculateNetBalances,
    calculateOptimalSettlements
} = require('../utils/recalculation.engine');
const {
    sendExpenseNotification,
    sendExpenseDeletedNotification,
    sendSettlementNotification,
    sendGroupSettledNotification
} = require('../utils/notification.util');

module.exports = {
    addExpense,
    getGroupExpenses,
    deleteExpense,
    getGroupSettlement,
    recordSettlement,
    settleGroup,
    getAuditLog,
    reviewExpenseApproval
};

async function getExpenseReplayPayload(client, expense, payer) {
    const splitsRes = await client.query(`
        SELECT es.id, es.member_id as "memberId", es.share_type as "shareType",
               es.share_value as "shareValue", es.computed_amount as "computedAmount",
               gm.name as "memberName"
        FROM expense_splits es
        JOIN group_members gm ON gm.id = es.member_id
        WHERE es.expense_id = $1
        ORDER BY es.created_at ASC, es.id ASC
    `, [expense.id]);

    return {
        id: expense.id,
        expenseId: expense.id,
        description: expense.description,
        amount: Number(expense.amount),
        category: expense.category,
        currency: expense.currency,
        splitModel: expense.splitModel,
        paymentMethod: expense.paymentMethod,
        verificationStatus: expense.verificationStatus,
        approvals: expense.approvals || [],
        requiredApprovals: expense.requiredApprovals || 0,
        createdAt: expense.createdAt,
        paidBy: {
            id: payer.id,
            name: payer.name,
            role: payer.role,
            avatarBg: payer.avatar_bg
        },
        splits: splitsRes.rows.map((split) => ({
            ...split,
            shareValue: Number(split.shareValue),
            computedAmount: Number(split.computedAmount)
        }))
    };
}

function canonicalizePayload(value) {
    if (Array.isArray(value)) return value.map(canonicalizePayload);
    if (value && typeof value === 'object') {
        return Object.keys(value).sort().reduce((result, key) => {
            result[key] = canonicalizePayload(value[key]);
            return result;
        }, {});
    }
    return value;
}

/**
 * 1. Add a new group expense with participation splits and audit log
 */
async function addExpense(req, res) {
    const client = await pool.connect();
    try {
        const { groupId } = req.params;
        const userId = req.userKey;
        const {
            description,
            amount,
            category = 'Food',
            currency = 'INR',
            splitModel = 'EQUAL',
            paidByMemberId,
            participants = [],
            paymentMethod = 'CASH',
            paymentReference = null,
            verificationStatus: rawVerificationStatus = null,
            rawSmsProof = null
        } = req.body;

        if (!userId) {
            client.release();
            return sendError(res, "Authentication required", null, 401);
        }

        const mutationId = req.get('Idempotency-Key') || req.body.clientMutationId || null;
        if (mutationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mutationId)) {
            return sendError(res, "Idempotency-Key must be a UUID", null, 400);
        }

        if (!description || !description.trim()) {
            client.release();
            return sendError(res, "Description is required", null, 400);
        }

        const numAmount = round2(Number(amount));
        if (isNaN(numAmount) || numAmount <= 0) {
            client.release();
            return sendError(res, "A valid positive amount is required", null, 400);
        }

        // Verify group access and permissions
        const access = await verifyGroupAccess(groupId, userId, client);
        if (access.notFound) {
            client.release();
            return sendError(res, "Group trip not found", null, 404);
        }
        if (!access.isAuthorized) {
            client.release();
            return sendError(res, "Access denied. You are not a member of this trip.", null, 403);
        }
        const group = access.group;

        const mapGroupSplit = (s) => {
            if (!s) return 'EQUAL';
            const upper = s.toString().trim().toUpperCase();
            if (upper === 'PARTICIPANT' || upper === 'PARTICIPANT_BASED') return 'PARTICIPANT_BASED';
            if (upper === 'ORGANIZER' || upper === 'ORGANIZER_PAID') return 'ORGANIZER_PAID';
            if (upper === 'ROOM' || upper === 'ROOM_SHARE') return 'ROOM_SHARE';
            if (upper === 'ACTIVITY' || upper === 'ACTIVITY_BASED') return 'ACTIVITY_BASED';
            return 'EQUAL';
        };

        const effectiveSplitModel = (req.body.splitModel && req.body.splitModel !== 'EQUAL')
            ? req.body.splitModel.toUpperCase()
            : mapGroupSplit(group.expense_split);

        // Fetch all group members with acceptance status
        const membersRes = await client.query('SELECT id, user_id, name, email, role, COALESCE(status, \'ACCEPTED\') as status FROM group_members WHERE group_id = $1', [groupId]);
        if (membersRes.rows.length === 0) {
            client.release();
            return sendError(res, "Group has no members", null, 400);
        }
        const allMembers = membersRes.rows;

        // Unstop-Style Acceptance Rule:
        // Before invitation acceptance, split expenses CANNOT be allocated to pending travelers!
        const acceptedMembers = allMembers.filter(m => m.status === 'ACCEPTED' || m.role === 'Organizer');
        if (acceptedMembers.length === 0) {
            client.release();
            return sendError(res, "No confirmed members in this trip yet. Invited travelers must accept their invitation before expenses can be split.", null, 400);
        }

        const acceptedMemberIdSet = new Set(acceptedMembers.map(m => String(m.id)));

        // Resolve Payer Member ID (must be a confirmed member or organizer)
        let resolvedPayerMemberId = paidByMemberId;
        if (!resolvedPayerMemberId) {
            const userMember = acceptedMembers.find(m => m.user_id === userId);
            resolvedPayerMemberId = userMember ? userMember.id : acceptedMembers[0].id;
        }

        const payer = acceptedMembers.find(m => String(m.id) === String(resolvedPayerMemberId));
        if (!payer) {
            client.release();
            return sendError(res, "Payer must be a confirmed member of this group", null, 400);
        }

        // Prepare participants list - ONLY accepted members can be allocated splits
        let participantItems = [];
        if (Array.isArray(participants) && participants.length > 0) {
            const normalizedParticipants = participants.map(p => {
                const raw = typeof p === 'string' ? { memberId: p } : p || {};
                const memberId = raw.memberId ?? raw.member_id ?? raw.id ?? raw.participantId ?? raw.participant_id;
                const found = acceptedMembers.find(m => String(m.id) === String(memberId));
                return {
                    ...raw,
                    memberId: memberId !== undefined && memberId !== null ? String(memberId) : undefined,
                    userId: raw.userId ?? raw.user_id ?? (found ? found.user_id : null),
                    shareType: raw.shareType ?? raw.share_type ?? 'EQUAL_UNIT',
                    shareValue: raw.shareValue ?? raw.share_value ?? raw.shareAmount ?? raw.share_amount ?? raw.computedAmount ?? raw.amount ?? 1.0,
                    isOptedIn: raw.isOptedIn ?? raw.is_opted_in ?? true
                };
            }).filter(p => p.memberId !== undefined && p.memberId !== null && p.memberId !== '');

            const participantIds = normalizedParticipants.map(p => String(p.memberId));
            if (new Set(participantIds).size !== participantIds.length) {
                client.release();
                return sendError(res, "Participants must be unique", null, 400);
            }

            // Check if user requested someone who hasn't accepted yet
            const invalidParticipants = normalizedParticipants.filter(p => !acceptedMemberIdSet.has(String(p.memberId)));
            if (invalidParticipants.length > 0) {
                client.release();
                return sendError(res, "All participants must be confirmed members of this group", null, 400);
            }

            const validParticipants = normalizedParticipants;

            if (validParticipants.length === 0) {
                client.release();
                return sendError(res, "Cannot allocate split: The selected traveler(s) have not accepted the trip invitation yet. Only confirmed members can share costs.", null, 400);
            }

            participantItems = validParticipants.map(p => {
                const found = acceptedMembers.find(m => String(m.id) === String(p.memberId));
                return {
                    memberId: p.memberId,
                    userId: found ? found.user_id : (p.userId || null),
                    shareType: p.shareType || 'EQUAL_UNIT',
                    shareValue: p.shareValue !== undefined ? Number(p.shareValue) : 1.0,
                    isOptedIn: p.isOptedIn !== false
                };
            });
        } else {
            // Default to ONLY accepted members
            participantItems = acceptedMembers.map(m => ({
                memberId: m.id,
                userId: m.user_id,
                shareType: 'EQUAL_UNIT',
                shareValue: 1.0,
                isOptedIn: true
            }));
        }

        const computedSplits = calculateExpenseSplits(
            numAmount,
            effectiveSplitModel,
            participantItems
        );

        const splitTotalCents = computedSplits.reduce(
            (sum, split) => sum + Math.round(Number(split.computedAmount || 0) * 100),
            0
        );
        if (computedSplits.length === 0 || splitTotalCents !== Math.round(numAmount * 100)) {
            client.release();
            return sendError(res, "Expense splits must add up exactly to the total amount", null, 400);
        }

        const requestHash = mutationId
            ? crypto.createHash('sha256').update(JSON.stringify(canonicalizePayload({
                groupId: String(groupId),
                userId: String(userId),
                payload: req.body
            }))).digest('hex')
            : null;

        if (mutationId) {
            const priorMutation = await client.query(`
                SELECT id, group_id as "groupId", created_by as "createdBy", idempotency_hash as "idempotencyHash",
                       description, amount, category, currency, split_model as "splitModel",
                       payment_method as "paymentMethod", verification_status as "verificationStatus",
                       approvals, required_approvals as "requiredApprovals", created_at as "createdAt"
                FROM expenses
                WHERE id = $1
                LIMIT 1
            `, [mutationId]);

            if (priorMutation.rows.length > 0) {
                const existing = priorMutation.rows[0];
                if (String(existing.groupId) !== String(groupId) || String(existing.createdBy) !== String(userId) || existing.idempotencyHash !== requestHash) {
                    return sendError(res, "Idempotency key was already used for a different request", null, 409);
                }
                return sendSuccess(res, "Expense already recorded", await getExpenseReplayPayload(client, existing, payer), 200);
            }
        }

        await client.query('BEGIN');

        const expenseId = mutationId || crypto.randomUUID();

        // Calculate 60% approval threshold for group companions
        const otherMembers = allMembers.filter(m => String(m.id) !== String(payer.id));

        let verificationStatus = rawVerificationStatus;
        if (!verificationStatus) {
            // A recorded expense is authoritative financial data. Approval remains
            // available when a caller explicitly requests PENDING_APPROVAL.
            verificationStatus = 'VERIFIED';
        }

        const requiredApprovals = verificationStatus === 'PENDING_APPROVAL'
            ? Math.max(1, Math.ceil(otherMembers.length * 0.60))
            : 0;

        // 1. Insert Expense Record
        const expenseInsert = await client.query(`
            INSERT INTO expenses (
                id, group_id, paid_by, paid_by_member_id, created_by, description,
                amount, category, currency, split_model, payment_method, payment_reference,
                verification_status, approvals, required_approvals, raw_sms_proof, idempotency_hash,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, '[]'::jsonb, $14, $15, $16, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id, description, amount, category, currency, split_model as "splitModel",
                      payment_method as "paymentMethod", verification_status as "verificationStatus",
                      approvals, required_approvals as "requiredApprovals", created_at as "createdAt"
        `, [
            expenseId, groupId, payer.id, payer.id, userId || null, description.trim(),
            numAmount, category, currency || group.currency, effectiveSplitModel, paymentMethod, paymentReference,
            verificationStatus, requiredApprovals, rawSmsProof, requestHash
        ]);

        if (expenseInsert.rows.length === 0) {
            const racedMutation = await client.query(`
                SELECT id, group_id as "groupId", created_by as "createdBy", idempotency_hash as "idempotencyHash",
                       description, amount, category, currency, split_model as "splitModel",
                       payment_method as "paymentMethod", verification_status as "verificationStatus",
                       approvals, required_approvals as "requiredApprovals", created_at as "createdAt"
                FROM expenses
                WHERE id = $1
                LIMIT 1
            `, [expenseId]);
            const existing = racedMutation.rows[0];
            if (!existing || String(existing.groupId) !== String(groupId) || String(existing.createdBy) !== String(userId) || existing.idempotencyHash !== requestHash) {
                await client.query('ROLLBACK');
                return sendError(res, "Idempotency key was already used for a different request", null, 409);
            }
            await client.query('COMMIT');
            return sendSuccess(res, "Expense already recorded", await getExpenseReplayPayload(client, existing, payer), 200);
        }

        // 2. Insert Expense Splits
        const insertedSplits = [];
        for (const split of computedSplits) {
            const splitId = crypto.randomUUID();
            await client.query(`
                INSERT INTO expense_splits (
                    id, expense_id, member_id, user_id, share_type, share_value, computed_amount, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [
                splitId, expenseId, split.memberId, split.userId || null,
                split.shareType, split.shareValue, split.computedAmount
            ]);

            const memberInfo = allMembers.find(m => String(m.id) === String(split.memberId));
            insertedSplits.push({
                id: splitId,
                memberId: split.memberId,
                memberName: memberInfo ? memberInfo.name : 'Unknown',
                shareType: split.shareType,
                shareValue: split.shareValue,
                computedAmount: split.computedAmount
            });
        }

        // 3. Append to Immutable Ledger Audit Log
        const actorRes = userId ? await client.query('SELECT username FROM users WHERE id = $1', [userId]) : null;
        const actorName = actorRes && actorRes.rows[0] ? actorRes.rows[0].username : payer.name;

        await client.query(`
            INSERT INTO ledger_audit_log (
                id, group_id, event_type, actor_id, actor_name, description, change_diff, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
            crypto.randomUUID(),
            groupId,
            'EXPENSE_CREATED',
            userId || null,
            actorName,
            `${actorName} added expense "${description.trim()}" of ${currency || group.currency} ${numAmount.toFixed(2)} paid by ${payer.name}`,
            JSON.stringify({
                expenseId,
                description: description.trim(),
                amount: numAmount,
                splitModel,
                splits: insertedSplits
            })
        ]);

        await client.query('COMMIT');

        // Dispatch Push & In-App Notifications to trip members
        sendExpenseNotification({
            groupId,
            groupName: group.name,
            payerName: payer.name,
            payerUserId: payer.user_id || userId,
            description: description.trim(),
            totalAmount: numAmount,
            currency: currency || group.currency,
            splits: insertedSplits,
            verificationStatus,
            requiredApprovals
        }).catch(pushErr => {
            console.warn("Could not dispatch expense push notifications:", pushErr.message);
        });

        // Real-time broadcast via Socket.IO
        try {
            const { getIO } = require('../utils/socket.util');
            const io = getIO();
            if (io) {
                io.to(groupId).emit('EXPENSE_CREATED', {
                    groupId,
                    expense: {
                        ...expenseInsert.rows[0],
                        paidBy: {
                            id: payer.id,
                            name: payer.name,
                            role: payer.role
                        },
                        splits: insertedSplits
                    }
                });
            }
        } catch (e) {
            console.warn('[Socket] Expense created broadcast warning:', e.message);
        }

        return sendSuccess(res, "Expense recorded successfully", {
            ...expenseInsert.rows[0],
            paidBy: {
                id: payer.id,
                name: payer.name,
                role: payer.role
            },
            splits: insertedSplits
        }, 201);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Add Expense Error:", error);
        return sendError(res, "Failed to record expense", error, 500);
    } finally {
        client.release();
    }
}

/**
 * 2. Get All Group Expenses with Splits & Payers
 */
async function getGroupExpenses(req, res) {
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
        if (!access.isAuthorized) {
            return sendError(res, "Access denied. You are not a member of this trip.", null, 403);
        }

        const expensesRes = await pool.query(`
            SELECT e.id, e.description, e.amount, e.category, e.currency,
                   e.split_model as "splitModel", e.payment_method as "paymentMethod",
                   e.payment_reference as "paymentReference", e.created_at as "createdAt",
                   e.verification_status as "verificationStatus",
                   COALESCE(e.approvals, '[]'::jsonb) as "approvals",
                   COALESCE(e.required_approvals, 1) as "requiredApprovals",
                   e.raw_sms_proof as "rawSmsProof",
                   gm.id as "paidById", gm.name as "paidByName", gm.role as "paidByRole", gm.avatar_bg as "paidByAvatar"
            FROM expenses e
            LEFT JOIN group_members gm ON COALESCE(e.paid_by_member_id, e.paid_by) = gm.id
            WHERE e.group_id = $1
            ORDER BY e.created_at DESC
        `, [groupId]);

        if (expensesRes.rows.length === 0) {
            return sendSuccess(res, "No expenses recorded yet", []);
        }

        const uniqueExpenseRows = expensesRes.rows;
        const expenseIds = uniqueExpenseRows.map(e => e.id);
        const splitsRes = await pool.query(`
            SELECT es.id, es.expense_id as "expenseId", es.member_id as "memberId",
                   es.share_type as "shareType", es.share_value as "shareValue",
                   es.computed_amount as "computedAmount",
                   gm.name as "memberName", gm.avatar_bg as "memberAvatar"
            FROM expense_splits es
            JOIN group_members gm ON es.member_id = gm.id
            WHERE es.expense_id = ANY($1::uuid[])
        `, [expenseIds]);

        const splitsMap = {};
        for (const s of splitsRes.rows) {
            if (!splitsMap[s.expenseId]) splitsMap[s.expenseId] = [];
            splitsMap[s.expenseId].push(s);
        }

        const data = uniqueExpenseRows.map(e => ({
            id: e.id,
            description: e.description,
            amount: Number(e.amount),
            category: e.category,
            currency: e.currency,
            splitModel: e.splitModel,
            paymentMethod: e.paymentMethod,
            paymentReference: e.paymentReference,
            verificationStatus: e.verificationStatus || 'VERIFIED',
            approvals: Array.isArray(e.approvals) ? e.approvals : [],
            requiredApprovals: Number(e.requiredApprovals) || 0,
            rawSmsProof: e.rawSmsProof,
            createdAt: e.createdAt,
            paidBy: {
                id: e.paidById,
                name: e.paidByName || 'Unknown',
                role: e.paidByRole,
                avatarBg: e.paidByAvatar
            },
            splits: splitsMap[e.id] || []
        }));

        return sendSuccess(res, "Expenses fetched successfully", data);

    } catch (error) {
        console.error("Get Group Expenses Error:", error);
        return sendError(res, "Failed to fetch expenses", error, 500);
    }
}

/**
 * 3. Delete an Expense & Rebalance Ledger
 */
async function deleteExpense(req, res) {
    const client = await pool.connect();
    try {
        const { groupId, expenseId } = req.params;
        const userId = req.userKey;

        if (!userId) {
            client.release();
            return sendError(res, "Authentication required", null, 401);
        }

        const access = await verifyGroupAccess(groupId, userId, client);
        if (access.notFound) {
            client.release();
            return sendError(res, "Group not found", null, 404);
        }
        if (!access.isAuthorized) {
            client.release();
            return sendError(res, "Access denied. You are not a member of this trip.", null, 403);
        }

        const expRes = await client.query('SELECT description, amount, currency, paid_by_member_id, paid_by, created_by FROM expenses WHERE id = $1 AND group_id = $2', [expenseId, groupId]);
        if (expRes.rows.length === 0) {
            client.release();
            return sendError(res, "Expense not found", null, 404);
        }
        const exp = expRes.rows[0];

        // Ensure ONLY the user who added that expense can delete it
        const callerRes = await client.query('SELECT id, role FROM group_members WHERE group_id = $1 AND (user_id = $2 OR email = (SELECT email FROM users WHERE id = $2))', [groupId, userId]);
        const callerMember = callerRes.rows[0];

        const isOwner = Boolean(
            (exp.created_by && String(exp.created_by) === String(userId)) ||
            (callerMember && String(exp.paid_by_member_id) === String(callerMember.id)) ||
            (callerMember && String(exp.paid_by) === String(callerMember.id))
        );

        if (!isOwner) {
            client.release();
            return sendError(res, "Only the member who added this expense can delete it.", null, 403);
        }

        await client.query('BEGIN');

        await client.query('DELETE FROM expenses WHERE id = $1', [expenseId]);

        const actorRes = userId ? await client.query('SELECT username FROM users WHERE id = $1', [userId]) : null;
        const actorName = actorRes && actorRes.rows[0] ? actorRes.rows[0].username : 'A member';

        await client.query(`
            INSERT INTO ledger_audit_log (
                id, group_id, event_type, actor_id, actor_name, description, change_diff, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
            crypto.randomUUID(),
            groupId,
            'EXPENSE_DELETED',
            userId || null,
            actorName,
            `${actorName} deleted expense "${exp.description}" (${exp.currency} ${Number(exp.amount).toFixed(2)})`,
            JSON.stringify({ expenseId, description: exp.description, amount: exp.amount })
        ]);

        await client.query('COMMIT');

        sendExpenseDeletedNotification({
            groupId,
            groupName: access.group?.name || 'Trip',
            actorName,
            actorUserId: userId,
            description: exp.description,
            amount: Number(exp.amount),
            currency: exp.currency || access.group?.currency
        }).catch(() => { });

        return sendSuccess(res, "Expense deleted and ledger updated successfully", { expenseId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Delete Expense Error:", error);
        return sendError(res, "Failed to delete expense", error, 500);
    } finally {
        client.release();
    }
}

/**
 * 4. Get Group Settlement (Live Net Balances & Min-Cash-Flow Transfers)
 */
async function getGroupSettlement(req, res) {
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
        if (!access.isAuthorized) {
            return sendError(res, "Access denied. You are not a member of this trip.", null, 403);
        }

        const group = access.group;

        // 2. Fetch members
        const membersRes = await pool.query(`
            SELECT id, user_id, name, email, role, avatar_bg, upi_id, COALESCE(status, 'ACCEPTED') as status
            FROM group_members
            WHERE group_id = $1
            ORDER BY joined_at ASC
        `, [groupId]);
        const members = membersRes.rows.map(m => ({
            ...m,
            status: m.status || (m.role === 'Organizer' ? 'ACCEPTED' : 'PENDING')
        }));

        if (members.length === 0) {
            return sendSuccess(res, "Settlement calculated successfully", {
                groupId: group.id,
                groupName: group.name,
                groupStatus: group.status,
                currency: group.currency,
                totalSpend: 0,
                members: [],
                transfers: [],
                rawSettlementsCount: 0,
                settlements: []
            });
        }

        // 3. Fetch expenses with full detail and splits
        const expensesRes = await pool.query(`
            SELECT id, COALESCE(paid_by_member_id, paid_by) as paid_by_member_id, amount, description, category, currency, split_model, payment_method, payment_reference, verification_status, created_at
            FROM expenses
            WHERE group_id = $1
            ORDER BY created_at DESC
        `, [groupId]);

        const expenseIds = expensesRes.rows.map(e => e.id);
        let splits = [];
        if (expenseIds.length > 0) {
            const splitsRes = await pool.query(`
                SELECT es.id, es.expense_id, es.member_id, es.share_type, es.share_value, es.computed_amount,
                       gm.name as "memberName", gm.avatar_bg as "memberAvatar"
                FROM expense_splits es
                JOIN group_members gm ON es.member_id = gm.id
                WHERE es.expense_id = ANY($1::uuid[])
            `, [expenseIds]);
            splits = splitsRes.rows;
        }

        const splitsByExp = {};
        for (const s of splits) {
            if (!splitsByExp[s.expense_id]) splitsByExp[s.expense_id] = [];
            splitsByExp[s.expense_id].push(s);
        }

        const memberLookupMap = {};
        for (const m of members) {
            memberLookupMap[String(m.id)] = m;
        }

        const formattedExpenses = expensesRes.rows.map(e => {
            const payer = memberLookupMap[String(e.paid_by_member_id)] || {
                id: e.paid_by_member_id,
                name: 'Traveler',
                role: 'Traveler',
                avatar_bg: '#10b981'
            };
            const itemSplits = (splitsByExp[e.id] || []).map(s => ({
                id: s.id,
                memberId: s.member_id,
                memberName: s.memberName || (memberLookupMap[String(s.member_id)]?.name || 'Traveler'),
                memberAvatar: s.memberAvatar || memberLookupMap[String(s.member_id)]?.avatar_bg,
                shareType: s.share_type,
                shareValue: Number(s.share_value || 1),
                computedAmount: Number(s.computed_amount || 0)
            }));

            return {
                id: e.id,
                description: e.description,
                amount: Number(e.amount),
                category: e.category || 'Other',
                currency: e.currency || group.currency,
                splitModel: e.split_model || 'EQUAL',
                paymentMethod: e.payment_method || 'CASH',
                paymentReference: e.payment_reference,
                verificationStatus: e.verification_status || 'VERIFIED',
                verification_status: e.verification_status || 'VERIFIED',
                createdAt: e.created_at,
                paidByMemberId: e.paid_by_member_id,
                paidBy: {
                    id: payer.id,
                    name: payer.name,
                    role: payer.role,
                    avatarBg: payer.avatar_bg
                },
                paidByName: payer.name,
                splits: itemSplits
            };
        });

        // 4. Fetch settlements
        const settlementsRes = await pool.query(`
            SELECT s.id, s.from_member_id, s.to_member_id, s.amount, s.currency,
                   s.payment_method, s.payment_reference, s.remarks, s.settled_at,
                   m1.name as "fromName", m2.name as "toName"
            FROM settlements s
            LEFT JOIN group_members m1 ON s.from_member_id = m1.id
            LEFT JOIN group_members m2 ON s.to_member_id = m2.id
            WHERE s.group_id = $1
            ORDER BY s.settled_at DESC
        `, [groupId]);

        // 5. Run Recalculation Engine
        const netResult = calculateNetBalances(members, formattedExpenses, settlementsRes.rows);
        const rawTransfers = calculateOptimalSettlements(netResult.balances, netResult.memberLookup, group.currency);

        // Enrich transfers with resolved member names & avatar colors
        const simplifiedTransfers = rawTransfers.map(t => ({
            ...t,
            fromMemberName: t.from?.name || netResult.memberLookup[t.fromMemberId]?.name || 'Member',
            toMemberName: t.to?.name || netResult.memberLookup[t.toMemberId]?.name || 'Member',
            fromAvatarBg: t.from?.avatarBg || netResult.memberLookup[t.fromMemberId]?.avatarBg || '#dc2626',
            toAvatarBg: t.to?.avatarBg || netResult.memberLookup[t.toMemberId]?.avatarBg || '#059669',
        }));
        const balances = netResult.memberSummaries.map(member => ({
            memberId: member.id,
            userId: member.userId,
            name: member.name,
            totalPaid: member.totalPaid,
            totalShare: member.totalOwed,
            netBalance: member.netBalance,
            currency: group.currency
        }));
        const debts = simplifiedTransfers.map(transfer => ({
            fromUserId: transfer.fromMemberId,
            toUserId: transfer.toMemberId,
            fromName: transfer.fromMemberName,
            toName: transfer.toMemberName,
            amount: transfer.amount,
            currency: transfer.currency
        }));

        return sendSuccess(res, "Settlement calculated successfully", {
            groupId: group.id,
            groupName: group.name,
            groupStatus: group.status,
            currency: group.currency,
            totalSpend: netResult.totalSpend,
            totalDebtors: netResult.memberSummaries.filter(m => m.netBalance < -0.01).length,
            totalCreditors: netResult.memberSummaries.filter(m => m.netBalance > 0.01).length,
            optimizedTxCount: simplifiedTransfers.length,
            members: netResult.memberSummaries,
            transfers: simplifiedTransfers,
            balances,
            debts,
            graph: {
                nodes: members.map(member => ({ id: member.id, name: member.name })),
                edges: debts.map(debt => ({
                    from: debt.fromUserId,
                    to: debt.toUserId,
                    amount: debt.amount,
                    currency: debt.currency
                }))
            },
            // settlementPlan wrapper for backward compatibility
            settlementPlan: {
                transfers: simplifiedTransfers,
                count: simplifiedTransfers.length
            },
            expenses: formattedExpenses,
            rawSettlementsCount: settlementsRes.rows.length,
            settlements: settlementsRes.rows.map(s => ({
                id: s.id,
                fromMemberId: s.from_member_id,
                toMemberId: s.to_member_id,
                fromName: s.fromName || (memberLookupMap[String(s.from_member_id)]?.name || 'Traveler'),
                toName: s.toName || (memberLookupMap[String(s.to_member_id)]?.name || 'Traveler'),
                amount: Number(s.amount),
                currency: s.currency,
                paymentMethod: s.payment_method,
                paymentReference: s.payment_reference,
                remarks: s.remarks,
                settledAt: s.settled_at
            }))
        });

    } catch (error) {
        console.error("Get Group Settlement Error:", error);
        return sendError(res, "Failed to calculate group settlement", error, 500);
    }
}

/**
 * 5. Record a Direct Settlement Payment (Peer-to-peer debt resolution)
 */
async function recordSettlement(req, res) {
    const client = await pool.connect();
    try {
        const { groupId } = req.params;
        const userId = req.userKey;
        const {
            fromMemberId,
            paidTo,
            amount,
            currency = 'INR',
            paymentMethod = 'UPI',
            paymentReference = null,
            remarks = 'Debt settlement'
        } = req.body;

        if (!userId) {
            client.release();
            return sendError(res, "Authentication required", null, 401);
        }

        const access = await verifyGroupAccess(groupId, userId, client);
        if (access.notFound) {
            client.release();
            return sendError(res, "Group not found", null, 404);
        }
        if (!access.isAuthorized) {
            client.release();
            return sendError(res, "Access denied. You are not a member of this trip.", null, 403);
        }

        const toMemberId = paidTo || req.body.toMemberId;
        if (!toMemberId) {
            client.release();
            return sendError(res, "Recipient member ID is required", null, 400);
        }

        const numAmount = round2(Number(amount));
        if (isNaN(numAmount) || numAmount <= 0) {
            client.release();
            return sendError(res, "A valid positive settlement amount is required", null, 400);
        }

        // Fetch members to verify
        const membersRes = await client.query('SELECT id, user_id, name, email FROM group_members WHERE group_id = $1', [groupId]);
        const members = membersRes.rows;

        // Resolve Sender
        let resolvedFromId = fromMemberId;
        if (!resolvedFromId) {
            const userMember = members.find(m => m.user_id === userId);
            resolvedFromId = userMember ? userMember.id : null;
        }

        const authenticatedMember = members.find(m => String(m.user_id) === String(userId));
        if (!authenticatedMember) {
            client.release();
            return sendError(res, "Authenticated user is not a member of this group", null, 403);
        }
        if (String(resolvedFromId) !== String(authenticatedMember.id)) {
            client.release();
            return sendError(res, "Only the authenticated debtor can record a settlement", null, 403);
        }

        const fromMember = members.find(m => String(m.id) === String(resolvedFromId));
        const toMember = members.find(m => String(m.id) === String(toMemberId));

        if (!fromMember || !toMember) {
            client.release();
            return sendError(res, "Both sender and recipient must be valid group members", null, 400);
        }

        await client.query('BEGIN');

        const settlementId = crypto.randomUUID();

        // 1. Insert Settlement Record
        const insertRes = await client.query(`
            INSERT INTO settlements (
                id, group_id, from_member_id, to_member_id, from_user_id, to_user_id,
                amount, currency, payment_method, payment_reference, remarks, status, settled_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'COMPLETED', NOW())
            RETURNING id, amount, currency, payment_method as "paymentMethod", payment_reference as "paymentReference", remarks, settled_at as "settledAt"
        `, [
            settlementId, groupId, fromMember.id, toMember.id,
            fromMember.user_id || null, toMember.user_id || null,
            numAmount, currency, paymentMethod, paymentReference, remarks
        ]);

        // 2. Append to Immutable Ledger Audit Log
        await client.query(`
            INSERT INTO ledger_audit_log (
                id, group_id, event_type, actor_id, actor_name, description, change_diff, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
            crypto.randomUUID(),
            groupId,
            'SETTLEMENT_RECORDED',
            userId || null,
            fromMember.name,
            `${fromMember.name} paid ${currency} ${numAmount.toFixed(2)} to ${toMember.name} via ${paymentMethod}`,
            JSON.stringify({
                settlementId,
                from: { id: fromMember.id, name: fromMember.name },
                to: { id: toMember.id, name: toMember.name },
                amount: numAmount,
                paymentMethod
            })
        ]);

        await client.query('COMMIT');

        sendSettlementNotification({
            groupId,
            groupName: access.group?.name || 'Trip',
            fromName: fromMember.name,
            fromUserId: fromMember.user_id || userId,
            toName: toMember.name,
            toUserId: toMember.user_id,
            amount: numAmount,
            currency,
            paymentMethod
        }).catch(() => { });

        return sendSuccess(res, "Settlement recorded successfully", {
            ...insertRes.rows[0],
            from: { id: fromMember.id, name: fromMember.name },
            to: { id: toMember.id, name: toMember.name }
        }, 201);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Record Settlement Error:", error);
        return sendError(res, "Failed to record settlement", error, 500);
    } finally {
        client.release();
    }
}

/**
 * 6. Mark Entire Group Trip as Settled
 */
async function settleGroup(req, res) {
    const client = await pool.connect();
    try {
        const { groupId } = req.params;
        const userId = req.userKey;

        if (!userId) {
            client.release();
            return sendError(res, "Authentication required", null, 401);
        }

        const access = await verifyGroupAccess(groupId, userId, client);
        if (access.notFound) {
            client.release();
            return sendError(res, "Group not found", null, 404);
        }
        if (!access.isOrganizer) {
            client.release();
            return sendError(res, "Only the group organizer can mark the trip as settled", null, 403);
        }

        await client.query('BEGIN');

        const updateRes = await client.query(`
            UPDATE groups
            SET status = 'SETTLED', updated_at = NOW()
            WHERE id = $1
            RETURNING id, name, status
        `, [groupId]);

        const actorRes = userId ? await client.query('SELECT username FROM users WHERE id = $1', [userId]) : null;
        const actorName = actorRes && actorRes.rows[0] ? actorRes.rows[0].username : 'Organizer';

        await client.query(`
            INSERT INTO ledger_audit_log (
                id, group_id, event_type, actor_id, actor_name, description, change_diff, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
            crypto.randomUUID(),
            groupId,
            'GROUP_SETTLED',
            userId || null,
            actorName,
            `${actorName} closed and marked group trip "${updateRes.rows[0].name}" as fully settled.`,
            JSON.stringify({ groupId, status: 'SETTLED' })
        ]);

        await client.query('COMMIT');

        sendGroupSettledNotification({
            groupId,
            groupName: updateRes.rows[0].name,
            organizerName: actorName,
            organizerUserId: userId
        }).catch(() => { });

        return sendSuccess(res, "Group trip marked as settled successfully", updateRes.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Settle Group Error:", error);
        return sendError(res, "Failed to settle group", error, 500);
    } finally {
        client.release();
    }
}

/**
 * 7. Get Immutable Ledger Audit Log History
 */
async function getAuditLog(req, res) {
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
        if (!access.isAuthorized) {
            return sendError(res, "Access denied. You are not a member of this trip.", null, 403);
        }

        const auditRes = await pool.query(`
            SELECT id, event_type as "eventType", actor_name as "actorName",
                   description, change_diff as "changeDiff", created_at as "createdAt"
            FROM ledger_audit_log
            WHERE group_id = $1
            ORDER BY created_at DESC
        `, [groupId]);

        return sendSuccess(res, "Audit log fetched successfully", auditRes.rows);

    } catch (error) {
        console.error("Get Audit Log Error:", error);
        return sendError(res, "Failed to fetch audit log", error, 500);
    }
}

/**
 * 8. Companion 60% Consensus Approval for Pending Expenses
 */
async function reviewExpenseApproval(req, res) {
    const client = await pool.connect();
    try {
        const { groupId, expenseId } = req.params;
        const userId = req.userKey;
        const { action = 'APPROVE' } = req.body; // 'APPROVE' | 'DISPUTE'

        if (!userId) {
            client.release();
            return sendError(res, "Authentication required", null, 401);
        }

        const access = await verifyGroupAccess(groupId, userId, client);
        if (access.notFound) {
            client.release();
            return sendError(res, "Group not found", null, 404);
        }
        if (!access.isAuthorized) {
            client.release();
            return sendError(res, "Access denied", null, 403);
        }

        // Fetch current user's group member identity
        const memberRes = await client.query(
            'SELECT id, name FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userId]
        );
        if (memberRes.rows.length === 0) {
            client.release();
            return sendError(res, "Group member profile not found", null, 404);
        }
        const reviewer = memberRes.rows[0];

        // Fetch expense
        const expenseRes = await client.query(
            'SELECT * FROM expenses WHERE id = $1 AND group_id = $2',
            [expenseId, groupId]
        );
        if (expenseRes.rows.length === 0) {
            client.release();
            return sendError(res, "Expense not found", null, 404);
        }
        const expense = expenseRes.rows[0];

        // Security Check: Payer cannot vote on their own expense!
        if (String(expense.paid_by_member_id) === String(reviewer.id) || String(expense.created_by) === String(userId)) {
            client.release();
            return sendError(res, "You cannot approve your own expense. Only other trip companions can approve.", null, 400);
        }

        if (expense.verification_status === 'VERIFIED' || expense.verification_status === 'AUTO_VERIFIED') {
            client.release();
            return sendSuccess(res, "Expense is already verified", {
                expenseId,
                status: expense.verification_status,
                alreadyVerified: true
            });
        }

        await client.query('BEGIN');

        // Parse existing approvals
        let approvals = Array.isArray(expense.approvals) ? expense.approvals : [];
        approvals = approvals.filter(a => String(a.memberId) !== String(reviewer.id));
        approvals.push({
            memberId: reviewer.id,
            memberName: reviewer.name,
            userId,
            action: action.toUpperCase(),
            timestamp: new Date().toISOString()
        });

        // 60% requirement from all companions (excluding payer)
        const allMembersRes = await client.query(
            'SELECT id FROM group_members WHERE group_id = $1',
            [groupId]
        );
        const otherMembersCount = Math.max(1, allMembersRes.rows.filter(m => String(m.id) !== String(expense.paid_by_member_id)).length);
        const requiredApprovals = Math.ceil(otherMembersCount * 0.60);
        const approveCount = approvals.filter(a => a.action === 'APPROVE').length;
        const disputeCount = approvals.filter(a => a.action === 'DISPUTE').length;

        let newStatus = 'PENDING_APPROVAL';
        let isFinalized = false;

        if (approveCount >= requiredApprovals) {
            newStatus = 'VERIFIED';
            isFinalized = true;
        } else if (disputeCount > (otherMembersCount - requiredApprovals)) {
            newStatus = 'DISPUTED';
            isFinalized = true;
        }

        await client.query(`
            UPDATE expenses
            SET approvals = $1,
                required_approvals = $2,
                verification_status = $3,
                updated_at = NOW()
            WHERE id = $4
        `, [JSON.stringify(approvals), requiredApprovals, newStatus, expenseId]);

        // Audit log
        await client.query(`
            INSERT INTO ledger_audit_log (
                id, group_id, event_type, actor_id, actor_name, description, change_diff, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
            crypto.randomUUID(),
            groupId,
            isFinalized ? (newStatus === 'VERIFIED' ? 'EXPENSE_APPROVED_FINAL' : 'EXPENSE_DISPUTED_FINAL') : 'EXPENSE_VOTE_CAST',
            userId,
            reviewer.name,
            `${reviewer.name} voted ${action} on "${expense.description}" (${approveCount}/${requiredApprovals} approvals)`,
            JSON.stringify({ expenseId, action, approveCount, requiredApprovals, newStatus })
        ]);

        await client.query('COMMIT');
        client.release();

        // Real-time broadcast
        try {
            const { getIO } = require('../utils/socket.util');
            const io = getIO();
            if (io) {
                io.to(groupId).emit('EXPENSE_APPROVAL_UPDATED', {
                    groupId,
                    expenseId,
                    verificationStatus: newStatus,
                    approvals,
                    approveCount,
                    requiredApprovals,
                    isFinalized
                });
            }
        } catch (e) {
            console.warn('[Socket] Approval update emit warning:', e.message);
        }

        return sendSuccess(res, `Vote recorded (${approveCount}/${requiredApprovals} approvals)`, {
            expenseId,
            verificationStatus: newStatus,
            approvals,
            approveCount,
            requiredApprovals,
            isFinalized
        });

    } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        console.error("Review Expense Error:", error);
        return sendError(res, "Failed to record approval vote", error, 500);
    }
}
