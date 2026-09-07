const crypto = require('crypto');
const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');
const {
    round2,
    calculateExpenseSplits,
    calculateNetBalances,
    calculateOptimalSettlements
} = require('../utils/recalculation.engine');

/**
 * Normalizes group's expense_split configuration to splitModel
 */
function mapGroupSplitToModel(split) {
    if (!split) return 'EQUAL';
    const s = split.toString().trim().toUpperCase();
    if (s === 'PARTICIPANT' || s === 'PARTICIPANT_BASED') return 'PARTICIPANT_BASED';
    if (s === 'ORGANIZER' || s === 'ORGANIZER_PAID') return 'ORGANIZER_PAID';
    if (s === 'ROOM' || s === 'ROOM_SHARE') return 'ROOM_SHARE';
    if (s === 'ACTIVITY' || s === 'ACTIVITY_BASED') return 'ACTIVITY_BASED';
    return 'EQUAL';
}

/**
 * 1. Get all payment records for authenticated user across all groups:
 * - Expenses paid by user
 * - Settlements paid by user
 * - Settlements received by user
 */
async function getMyPayments(req, res) {
    try {
        const userId = req.userKey;
        if (!userId) {
            return sendError(res, "Unauthorized", null, 401);
        }

        // 1. Fetch expenses paid by user or user's group member identity
        const expensesRes = await pool.query(`
            SELECT 
                e.id,
                e.group_id as "groupId",
                g.name as "groupName",
                g.expense_split as "groupExpenseSplit",
                e.description,
                e.amount,
                e.category,
                e.currency,
                e.split_model as "splitModel",
                e.payment_method as "paymentMethod",
                e.payment_reference as "paymentReference",
                e.created_at as "timestamp",
                'EXPENSE' as "type",
                'OUTGOING' as "direction",
                'COMPLETED' as "status",
                gm.name as "paidByName",
                gm.id as "paidByMemberId"
            FROM expenses e
            JOIN groups g ON e.group_id = g.id
            JOIN group_members gm ON e.paid_by_member_id = gm.id
            WHERE e.paid_by = $1 OR gm.user_id = $1
            ORDER BY e.created_at DESC
        `, [userId]);

        // 2. Fetch settlements where user is the sender (OUTGOING)
        const settlementsPaidRes = await pool.query(`
            SELECT 
                s.id,
                s.group_id as "groupId",
                g.name as "groupName",
                COALESCE(s.remarks, 'Settlement to ' || m_to.name) as "description",
                s.amount,
                'Settlement' as "category",
                s.currency,
                'DIRECT' as "splitModel",
                s.payment_method as "paymentMethod",
                s.payment_reference as "paymentReference",
                s.settled_at as "timestamp",
                'SETTLEMENT' as "type",
                'OUTGOING' as "direction",
                s.status,
                m_from.name as "paidByName",
                m_to.name as "recipientName",
                m_to.id as "recipientMemberId"
            FROM settlements s
            JOIN groups g ON s.group_id = g.id
            JOIN group_members m_from ON s.from_member_id = m_from.id
            JOIN group_members m_to ON s.to_member_id = m_to.id
            WHERE s.from_user_id = $1 OR m_from.user_id = $1
            ORDER BY s.settled_at DESC
        `, [userId]);

        // 3. Fetch settlements where user is the receiver (INCOMING)
        const settlementsReceivedRes = await pool.query(`
            SELECT 
                s.id,
                s.group_id as "groupId",
                g.name as "groupName",
                COALESCE(s.remarks, 'Settlement from ' || m_from.name) as "description",
                s.amount,
                'Settlement' as "category",
                s.currency,
                'DIRECT' as "splitModel",
                s.payment_method as "paymentMethod",
                s.payment_reference as "paymentReference",
                s.settled_at as "timestamp",
                'SETTLEMENT' as "type",
                'INCOMING' as "direction",
                s.status,
                m_from.name as "senderName",
                m_from.id as "senderMemberId",
                m_to.name as "paidByName"
            FROM settlements s
            JOIN groups g ON s.group_id = g.id
            JOIN group_members m_from ON s.from_member_id = m_from.id
            JOIN group_members m_to ON s.to_member_id = m_to.id
            WHERE s.to_user_id = $1 OR m_to.user_id = $1
            ORDER BY s.settled_at DESC
        `, [userId]);

        // Map categories to modern icon types
        const mapCategoryIcon = (cat) => {
            const c = (cat || '').toLowerCase();
            if (c.includes('food') || c.includes('drink') || c.includes('dining')) return 'food';
            if (c.includes('stay') || c.includes('hotel') || c.includes('villa')) return 'stay';
            if (c.includes('transport') || c.includes('cab') || c.includes('flight') || c.includes('fuel')) return 'transport';
            if (c.includes('activity') || c.includes('tour') || c.includes('trek')) return 'travel';
            if (c.includes('health') || c.includes('fitness')) return 'health';
            if (c.includes('settlement') || c.includes('income')) return 'income';
            return 'entertainment';
        };

        const now = new Date();
        const todayStr = now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        const getDateGroup = (dateObj) => {
            const d = new Date(dateObj);
            const str = d.toDateString();
            if (str === todayStr) return 'Today';
            if (str === yesterdayStr) return 'Yesterday';
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };

        const formatTime = (dateObj) => {
            const d = new Date(dateObj);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        // Assemble unified transaction ledger
        const transactions = [
            ...expensesRes.rows.map(r => ({
                id: `exp-${r.id}`,
                rawId: r.id,
                txId: r.paymentReference || ('EXP-' + r.id.slice(0, 8).toUpperCase()),
                title: r.description,
                category: r.category || 'Other',
                note: `Trip Expense (${r.splitModel} split)`,
                dateGroup: getDateGroup(r.timestamp),
                timestamp: formatTime(r.timestamp),
                type: 'sent',
                amount: Number(r.amount),
                currencySymbol: r.currency === 'USD' ? '$' : (r.currency === 'EUR' ? '€' : '₹'),
                counterpart: r.groupName,
                groupName: r.groupName,
                groupId: r.groupId,
                method: r.paymentMethod || 'UPI',
                iconType: mapCategoryIcon(r.category),
                status: r.status,
                splitModel: r.splitModel
            })),
            ...settlementsPaidRes.rows.map(r => ({
                id: `stl-out-${r.id}`,
                rawId: r.id,
                txId: r.paymentReference || ('STL-' + r.id.slice(0, 8).toUpperCase()),
                title: r.description,
                category: 'Settlement',
                note: `Settled peer debt to ${r.recipientName}`,
                dateGroup: getDateGroup(r.timestamp),
                timestamp: formatTime(r.timestamp),
                type: 'sent',
                amount: Number(r.amount),
                currencySymbol: r.currency === 'USD' ? '$' : (r.currency === 'EUR' ? '€' : '₹'),
                counterpart: r.recipientName,
                groupName: r.groupName,
                groupId: r.groupId,
                method: r.paymentMethod || 'UPI',
                iconType: 'income',
                status: r.status,
                splitModel: 'DIRECT'
            })),
            ...settlementsReceivedRes.rows.map(r => ({
                id: `stl-in-${r.id}`,
                rawId: r.id,
                txId: r.paymentReference || ('REC-' + r.id.slice(0, 8).toUpperCase()),
                title: r.description,
                category: 'Settlement',
                note: `Received settlement from ${r.senderName}`,
                dateGroup: getDateGroup(r.timestamp),
                timestamp: formatTime(r.timestamp),
                type: 'received',
                amount: Number(r.amount),
                currencySymbol: r.currency === 'USD' ? '$' : (r.currency === 'EUR' ? '€' : '₹'),
                counterpart: r.senderName,
                groupName: r.groupName,
                groupId: r.groupId,
                method: r.paymentMethod || 'UPI',
                iconType: 'income',
                status: r.status,
                splitModel: 'DIRECT'
            }))
        ];

        // Sort descending by raw timestamp
        transactions.sort((a, b) => new Date(b.dateGroup + ' ' + b.timestamp).getTime() - new Date(a.dateGroup + ' ' + a.timestamp).getTime());

        let totalSpent = 0;
        let totalReceived = 0;
        for (const t of transactions) {
            if (t.type === 'sent') {
                totalSpent += t.amount;
            } else {
                totalReceived += t.amount;
            }
        }

        return sendSuccess(res, "Payments retrieved successfully", {
            totalSpent: round2(totalSpent),
            totalReceived: round2(totalReceived),
            count: transactions.length,
            transactions
        });

    } catch (error) {
        console.error("Get My Payments Error:", error);
        return sendError(res, "Failed to retrieve payment records", error, 500);
    }
}

/**
 * 2. Record a unified payment:
 * - Can be an EXPENSE added to a trip: automatically split by the group's default splitting ratio!
 * - Can be a SETTLEMENT paid to a companion: clears balance on the trip's debt ledger!
 */
async function recordUnifiedPayment(req, res) {
    const client = await pool.connect();
    try {
        const userId = req.userKey;
        const {
            groupId,
            type = 'EXPENSE', // 'EXPENSE' | 'SETTLEMENT'
            description,
            amount,
            category = 'Food',
            currency,
            paymentMethod = 'UPI',
            paymentReference,
            toMemberId, // Required for SETTLEMENT
            splitModel // Optional, defaults to group's expense_split
        } = req.body;

        if (!groupId) {
            client.release();
            return sendError(res, "Trip / Group selection is required", null, 400);
        }

        const numAmount = round2(Number(amount));
        if (isNaN(numAmount) || numAmount <= 0) {
            client.release();
            return sendError(res, "A valid positive amount is required", null, 400);
        }

        // Fetch group
        const groupRes = await client.query('SELECT id, name, currency, expense_split FROM groups WHERE id = $1', [groupId]);
        if (groupRes.rows.length === 0) {
            client.release();
            return sendError(res, "Group trip not found", null, 404);
        }
        const group = groupRes.rows[0];

        // Fetch group members
        const membersRes = await client.query('SELECT id, user_id, name, email, role, avatar_bg, upi_id FROM group_members WHERE group_id = $1', [groupId]);
        if (membersRes.rows.length === 0) {
            client.release();
            return sendError(res, "Group has no members", null, 400);
        }
        const allMembers = membersRes.rows;

        // Resolve current user as payer member
        const userMember = allMembers.find(m => m.user_id === userId);
        const payer = userMember || allMembers[0];

        await client.query('BEGIN');

        if (type.toUpperCase() === 'SETTLEMENT') {
            if (!toMemberId) {
                await client.query('ROLLBACK');
                client.release();
                return sendError(res, "Recipient companion is required for settlement", null, 400);
            }

            const toMember = allMembers.find(m => String(m.id) === String(toMemberId));
            if (!toMember) {
                await client.query('ROLLBACK');
                client.release();
                return sendError(res, "Recipient companion not found in trip group", null, 404);
            }

            const settlementId = crypto.randomUUID();
            const ref = paymentReference || ('STL-' + crypto.randomBytes(4).toString('hex').toUpperCase());
            const remarksText = description || `Settlement payment to ${toMember.name}`;

            await client.query(`
                INSERT INTO settlements (
                    id, group_id, from_member_id, to_member_id, from_user_id, to_user_id,
                    amount, currency, payment_method, payment_reference, remarks, status, settled_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'COMPLETED', NOW())
            `, [
                settlementId, groupId, payer.id, toMember.id,
                userId || null, toMember.user_id || null,
                numAmount, currency || group.currency, paymentMethod, ref, remarksText
            ]);

            // Append to audit log
            await client.query(`
                INSERT INTO ledger_audit_log (
                    id, group_id, event_type, actor_id, actor_name, description, change_diff, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [
                crypto.randomUUID(),
                groupId,
                'SETTLEMENT_RECORDED',
                userId || null,
                payer.name,
                `${payer.name} paid ${currency || group.currency} ${numAmount.toFixed(2)} to ${toMember.name} via ${paymentMethod}`,
                JSON.stringify({ settlementId, from: payer.name, to: toMember.name, amount: numAmount, paymentMethod, ref })
            ]);

            await client.query('COMMIT');
            client.release();

            return sendSuccess(res, "Settlement payment recorded successfully", {
                id: settlementId,
                type: 'SETTLEMENT',
                groupId,
                groupName: group.name,
                amount: numAmount,
                currency: currency || group.currency,
                toName: toMember.name,
                paymentMethod,
                paymentReference: ref
            }, 201);

        } else {
            // EXPENSE: Automatically split according to group's default ratio
            const effectiveSplitModel = splitModel ? splitModel.toUpperCase() : mapGroupSplitToModel(group.expense_split);
            const expenseId = crypto.randomUUID();
            const ref = paymentReference || ('EXP-' + crypto.randomBytes(4).toString('hex').toUpperCase());
            const desc = description ? description.trim() : `${category} payment`;

            // Prepare all group members as participants
            const participants = allMembers.map(m => ({
                memberId: m.id,
                userId: m.user_id,
                shareType: 'EQUAL_UNIT',
                shareValue: 1.0,
                isOptedIn: true
            }));

            const computedSplits = calculateExpenseSplits(numAmount, effectiveSplitModel, participants);

            await client.query(`
                INSERT INTO expenses (
                    id, group_id, paid_by, paid_by_member_id, description,
                    amount, category, currency, split_model, payment_method, payment_reference,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            `, [
                expenseId, groupId, userId || null, payer.id, desc,
                numAmount, category, currency || group.currency, effectiveSplitModel, paymentMethod, ref
            ]);

            for (const split of computedSplits) {
                await client.query(`
                    INSERT INTO expense_splits (
                        id, expense_id, member_id, user_id, share_type, share_value, computed_amount, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                `, [
                    crypto.randomUUID(), expenseId, split.memberId, split.userId || null,
                    split.shareType, split.shareValue, split.computedAmount
                ]);
            }

            // Append to audit log
            await client.query(`
                INSERT INTO ledger_audit_log (
                    id, group_id, event_type, actor_id, actor_name, description, change_diff, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [
                crypto.randomUUID(),
                groupId,
                'EXPENSE_CREATED',
                userId || null,
                payer.name,
                `${payer.name} recorded trip expense "${desc}" of ${currency || group.currency} ${numAmount.toFixed(2)} (${effectiveSplitModel} split)`,
                JSON.stringify({ expenseId, description: desc, amount: numAmount, splitModel: effectiveSplitModel, payer: payer.name })
            ]);

            await client.query('COMMIT');
            client.release();

            return sendSuccess(res, "Trip expense recorded and split across group successfully", {
                id: expenseId,
                type: 'EXPENSE',
                groupId,
                groupName: group.name,
                description: desc,
                amount: numAmount,
                currency: currency || group.currency,
                splitModel: effectiveSplitModel,
                splitsCount: computedSplits.length,
                paymentMethod,
                paymentReference: ref
            }, 201);
        }

    } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        console.error("Record Unified Payment Error:", error);
        return sendError(res, "Failed to record payment", error, 500);
    }
}

/**
 * 3. Official Payment Callback / Gateway Verification Endpoint
 * Validates transaction reference, prevents double-recording (idempotent),
 * and commits the verified UPI payment to the group's ledger.
 */
async function verifyPaymentStatus(req, res) {
    const client = await pool.connect();
    try {
        const userId = req.userKey;
        const {
            txnRef,
            groupId,
            amount,
            description,
            category = 'Food',
            paymentMethod = 'UPI',
            utr,
            vendorUpi,
            vendorName
        } = req.body;

        if (!groupId) {
            client.release();
            return sendError(res, "groupId is required for verification", null, 400);
        }
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            client.release();
            return sendError(res, "Valid amount is required", null, 400);
        }

        const numAmount = round2(Number(amount));
        const finalRef = (utr && utr.trim()) ? utr.trim() : (txnRef || `UPI-VERIF-${Date.now()}`);

        // 1. Check idempotency: has this transaction reference already been recorded?
        const existingTx = await client.query(`
            SELECT id, description, amount, split_model as "splitModel", created_at as "timestamp"
            FROM expenses
            WHERE group_id = $1 AND (payment_reference = $2 OR payment_reference = $3)
            LIMIT 1
        `, [groupId, txnRef || '', finalRef]);

        if (existingTx.rows.length > 0) {
            client.release();
            return sendSuccess(res, "Transaction verified (already confirmed)", {
                verified: true,
                status: 'SUCCESS',
                isDuplicate: true,
                expenseId: existingTx.rows[0].id,
                amount: existingTx.rows[0].amount,
                reference: finalRef
            });
        }

        await client.query('BEGIN');

        // 2. Fetch Group details
        const groupRes = await client.query(`
            SELECT id, name, currency, expense_split
            FROM groups
            WHERE id = $1
            LIMIT 1
        `, [groupId]);

        if (groupRes.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return sendError(res, "Group not found", null, 404);
        }
        const group = groupRes.rows[0];

        // 3. Fetch Group members
        const membersRes = await client.query(`
            SELECT id, group_id, user_id, name, role
            FROM group_members
            WHERE group_id = $1
            ORDER BY joined_at ASC
        `, [groupId]);

        if (membersRes.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return sendError(res, "No members found in group", null, 400);
        }

        // 4. Determine payer identity
        let payer = membersRes.rows.find(m => m.user_id && m.user_id === userId);
        if (!payer) payer = membersRes.rows[0];

        // 5. Calculate split using group's preset ratio
        const effectiveSplitModel = mapGroupSplitToModel(group.expense_split);
        const participants = membersRes.rows.map(m => ({
            memberId: m.id,
            userId: m.user_id,
            shareType: 'EQUAL_UNIT',
            shareValue: 1.0,
            isOptedIn: true
        }));
        const computedSplits = calculateExpenseSplits(numAmount, effectiveSplitModel, participants);

        const expenseId = crypto.randomUUID();
        const desc = description && description.trim()
            ? description.trim()
            : (vendorName ? `Paid to ${vendorName}` : 'UPI Payment');

        await client.query(`
            INSERT INTO expenses (
                id, group_id, paid_by, paid_by_member_id, description,
                amount, category, currency, split_model, payment_method, payment_reference, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `, [
            expenseId, groupId, userId || null, payer.id, desc,
            numAmount, category, group.currency, effectiveSplitModel, paymentMethod, finalRef
        ]);

        for (const split of computedSplits) {
            await client.query(`
                INSERT INTO expense_splits (
                    id, expense_id, member_id, user_id, share_type, share_value, computed_amount, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [
                crypto.randomUUID(), expenseId, split.memberId, split.userId || null,
                split.shareType, split.shareValue, split.computedAmount
            ]);
        }

        // 6. Audit Trail
        await client.query(`
            INSERT INTO ledger_audit_log (
                id, group_id, event_type, actor_id, actor_name, description, change_diff, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
            crypto.randomUUID(),
            groupId,
            'UPI_PAYMENT_VERIFIED',
            userId || null,
            payer.name,
            `UPI payment of ${group.currency} ${numAmount.toFixed(2)} verified via ${paymentMethod} (${finalRef})`,
            JSON.stringify({
                expenseId,
                amount: numAmount,
                vendorUpi: vendorUpi || null,
                vendorName: vendorName || null,
                splitModel: effectiveSplitModel,
                reference: finalRef
            })
        ]);

        await client.query('COMMIT');
        client.release();

        return sendSuccess(res, "Payment successfully verified and recorded to trip", {
            verified: true,
            status: 'SUCCESS',
            expenseId,
            groupId,
            groupName: group.name,
            amount: numAmount,
            currency: group.currency,
            description: desc,
            splitModel: effectiveSplitModel,
            paymentMethod,
            paymentReference: finalRef,
            utr: utr || null,
            timestamp: new Date().toISOString()
        }, 200);

    } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        console.error("Verify Payment Error:", error);
        return sendError(res, "Failed to verify payment status", error, 500);
    }
}

module.exports = {
    getMyPayments,
    recordUnifiedPayment,
    verifyPaymentStatus
};
