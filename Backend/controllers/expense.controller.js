const crypto = require('crypto');
const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');
const {
    round2,
    calculateExpenseSplits,
    calculateNetBalances,
    calculateOptimalSettlements
} = require('../utils/recalculation.engine');

module.exports = {
    addExpense,
    getGroupExpenses,
    deleteExpense,
    getGroupSettlement,
    recordSettlement,
    settleGroup,
    getAuditLog
};

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
            paymentReference = null
        } = req.body;

        if (!description || !description.trim()) {
            client.release();
            return sendError(res, "Description is required", null, 400);
        }

        const numAmount = round2(Number(amount));
        if (isNaN(numAmount) || numAmount <= 0) {
            client.release();
            return sendError(res, "A valid positive amount is required", null, 400);
        }

        // Verify group exists
        const groupRes = await client.query('SELECT id, name, currency, expense_split FROM groups WHERE id = $1', [groupId]);
        if (groupRes.rows.length === 0) {
            client.release();
            return sendError(res, "Group trip not found", null, 404);
        }
        const group = groupRes.rows[0];

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

        // Fetch all group members
        const membersRes = await client.query('SELECT id, user_id, name, email, role FROM group_members WHERE group_id = $1', [groupId]);
        if (membersRes.rows.length === 0) {
            client.release();
            return sendError(res, "Group has no members", null, 400);
        }
        const allMembers = membersRes.rows;

        // Resolve Payer Member ID
        let resolvedPayerMemberId = paidByMemberId;
        if (!resolvedPayerMemberId) {
            // Find member corresponding to current user
            const userMember = allMembers.find(m => m.user_id === userId);
            resolvedPayerMemberId = userMember ? userMember.id : allMembers[0].id;
        }

        const payer = allMembers.find(m => String(m.id) === String(resolvedPayerMemberId)) || allMembers[0];

        // Prepare participants list
        let participantItems = [];
        if (Array.isArray(participants) && participants.length > 0) {
            participantItems = participants.map(p => {
                if (typeof p === 'string') {
                    const found = allMembers.find(m => String(m.id) === String(p));
                    return {
                        memberId: p,
                        userId: found ? found.user_id : null,
                        shareType: 'EQUAL_UNIT',
                        shareValue: 1.0,
                        isOptedIn: true
                    };
                }
                const found = allMembers.find(m => String(m.id) === String(p.memberId || p.id));
                return {
                    memberId: p.memberId || p.id,
                    userId: found ? found.user_id : (p.userId || null),
                    shareType: p.shareType || 'EQUAL_UNIT',
                    shareValue: p.shareValue !== undefined ? Number(p.shareValue) : 1.0,
                    isOptedIn: p.isOptedIn !== false
                };
            });
        } else {
            // Default to all members
            participantItems = allMembers.map(m => ({
                memberId: m.id,
                userId: m.user_id,
                shareType: 'EQUAL_UNIT',
                shareValue: 1.0,
                isOptedIn: true
            }));
        }

        // Calculate splits via Recalculation Engine
        const computedSplits = calculateExpenseSplits(numAmount, effectiveSplitModel, participantItems);

        await client.query('BEGIN');

        const expenseId = crypto.randomUUID();

        // 1. Insert Expense Record
        const expenseInsert = await client.query(`
            INSERT INTO expenses (
                id, group_id, paid_by, paid_by_member_id, description,
                amount, category, currency, split_model, payment_method, payment_reference,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING id, description, amount, category, currency, split_model as "splitModel", payment_method as "paymentMethod", created_at as "createdAt"
        `, [
            expenseId, groupId, userId || null, payer.id, description.trim(),
            numAmount, category, currency || group.currency, effectiveSplitModel, paymentMethod, paymentReference
        ]);

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

        const expensesRes = await pool.query(`
            SELECT e.id, e.description, e.amount, e.category, e.currency,
                   e.split_model as "splitModel", e.payment_method as "paymentMethod",
                   e.payment_reference as "paymentReference", e.created_at as "createdAt",
                   gm.id as "paidById", gm.name as "paidByName", gm.role as "paidByRole", gm.avatar_bg as "paidByAvatar"
            FROM expenses e
            LEFT JOIN group_members gm ON e.paid_by_member_id = gm.id
            WHERE e.group_id = $1
            ORDER BY e.created_at DESC
        `, [groupId]);

        if (expensesRes.rows.length === 0) {
            return sendSuccess(res, "No expenses recorded yet", []);
        }

        const expenseIds = expensesRes.rows.map(e => e.id);
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

        const data = expensesRes.rows.map(e => ({
            id: e.id,
            description: e.description,
            amount: Number(e.amount),
            category: e.category,
            currency: e.currency,
            splitModel: e.splitModel,
            paymentMethod: e.paymentMethod,
            paymentReference: e.paymentReference,
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

        const expRes = await client.query('SELECT description, amount, currency FROM expenses WHERE id = $1 AND group_id = $2', [expenseId, groupId]);
        if (expRes.rows.length === 0) {
            client.release();
            return sendError(res, "Expense not found", null, 404);
        }
        const exp = expRes.rows[0];

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

        // 1. Fetch group
        const groupRes = await pool.query('SELECT id, name, currency, status FROM groups WHERE id = $1', [groupId]);
        if (groupRes.rows.length === 0) {
            return sendError(res, "Group not found", null, 404);
        }
        const group = groupRes.rows[0];

        // 2. Fetch members
        const membersRes = await pool.query(`
            SELECT id, user_id, name, email, role, avatar_bg, upi_id, status
            FROM group_members
            WHERE group_id = $1
            ORDER BY joined_at ASC
        `, [groupId]);
        const members = membersRes.rows;

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
            SELECT id, paid_by_member_id, amount, description, category, currency, split_model, payment_method, payment_reference, created_at
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
                createdAt: e.created_at,
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
        const simplifiedTransfers = calculateOptimalSettlements(netResult.balances, netResult.memberLookup, group.currency);

        return sendSuccess(res, "Settlement calculated successfully", {
            groupId: group.id,
            groupName: group.name,
            groupStatus: group.status,
            currency: group.currency,
            totalSpend: netResult.totalSpend,
            members: netResult.memberSummaries,
            transfers: simplifiedTransfers,
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

        await client.query('BEGIN');

        const updateRes = await client.query(`
            UPDATE groups
            SET status = 'SETTLED', updated_at = NOW()
            WHERE id = $1
            RETURNING id, name, status
        `, [groupId]);

        if (updateRes.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return sendError(res, "Group not found", null, 404);
        }

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
