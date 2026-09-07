/**
 * Industry-Grade Recalculation Engine
 * Handles 5 Cost-Sharing Models, Dynamic Ledger Rebalancing,
 * and Min-Cash-Flow (Debt-Simplification) Graph Algorithm.
 */

/**
 * Helper to round to 2 decimal places safely without floating point artifacts
 */
function round2(num) {
    return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * 1. Pure Cost-Sharing Split Calculator
 * Supports:
 * - EQUAL: Split evenly across all active participants with penny-rounding reconciliation
 * - PARTICIPANT_BASED: Fixed amounts or custom percentages
 * - ROOM_SHARE: Proportional to room occupancy units (e.g. 2 guests in double vs 1 in single)
 * - ACTIVITY_BASED: Opted-in participants absorb cost, non-participants owe 0
 * - ORGANIZER_PAID: Organizer / sponsor covers 100%, participants owe 0
 *
 * @param {number} totalAmount - Total expense cost
 * @param {string} splitModel - EQUAL | PARTICIPANT_BASED | ROOM_SHARE | ACTIVITY_BASED | ORGANIZER_PAID
 * @param {Array<object>} participants - Array of { memberId, userId, shareType, shareValue, isOptedIn }
 * @returns {Array<object>} Computed splits array
 */
function calculateExpenseSplits(totalAmount, splitModel = 'EQUAL', participants = []) {
    const total = round2(Number(totalAmount));
    if (total <= 0 || !Array.isArray(participants) || participants.length === 0) {
        return [];
    }

    const count = participants.length;

    switch (splitModel.toUpperCase()) {
        case 'ORGANIZER_PAID': {
            // Organizer / Sponsor pays; participants have 0 liability
            return participants.map(p => ({
                memberId: p.memberId,
                userId: p.userId || null,
                shareType: 'ORGANIZER_PAID',
                shareValue: 0,
                computedAmount: 0.00
            }));
        }

        case 'ACTIVITY_BASED': {
            // Only opted-in participants share the cost
            const activeDivers = participants.filter(p => p.isOptedIn !== false && (p.shareValue === undefined || Number(p.shareValue) > 0));
            const activeCount = activeDivers.length;

            if (activeCount === 0) {
                // Fallback to equal split if no explicit opt-ins provided
                return calculateExpenseSplits(total, 'EQUAL', participants);
            }

            const baseShare = Math.floor((total * 100) / activeCount) / 100;
            let remainderCents = Math.round((total - baseShare * activeCount) * 100);

            return participants.map(p => {
                const isOptedIn = activeDivers.some(a => a.memberId === p.memberId);
                if (!isOptedIn) {
                    return {
                        memberId: p.memberId,
                        userId: p.userId || null,
                        shareType: 'ACTIVITY_OPT_OUT',
                        shareValue: 0,
                        computedAmount: 0.00
                    };
                }

                let share = baseShare;
                if (remainderCents > 0) {
                    share = round2(share + 0.01);
                    remainderCents--;
                }

                return {
                    memberId: p.memberId,
                    userId: p.userId || null,
                    shareType: 'ACTIVITY_BASED',
                    shareValue: 1.0,
                    computedAmount: share
                };
            });
        }

        case 'ROOM_SHARE': {
            // Divided by room occupancy units (e.g. 1 unit, 0.5 unit, 2 units)
            const totalUnits = participants.reduce((sum, p) => sum + (Number(p.shareValue) > 0 ? Number(p.shareValue) : 1), 0);
            let distributedSum = 0;

            const splits = participants.map((p, idx) => {
                const units = Number(p.shareValue) > 0 ? Number(p.shareValue) : 1;
                let computed = 0;
                if (idx === count - 1) {
                    // Last participant absorbs any rounding remainder
                    computed = round2(total - distributedSum);
                } else {
                    computed = round2((total * units) / totalUnits);
                    distributedSum = round2(distributedSum + computed);
                }

                return {
                    memberId: p.memberId,
                    userId: p.userId || null,
                    shareType: 'ROOM_UNIT',
                    shareValue: units,
                    computedAmount: computed
                };
            });

            return splits;
        }

        case 'PARTICIPANT_BASED': {
            // Fixed amount or percentage per participant
            const isPercentage = participants.some(p => p.shareType === 'PERCENTAGE');
            if (isPercentage) {
                let distributedSum = 0;
                return participants.map((p, idx) => {
                    const pct = Number(p.shareValue) || 0;
                    let computed = 0;
                    if (idx === count - 1) {
                        computed = round2(total - distributedSum);
                    } else {
                        computed = round2((total * pct) / 100);
                        distributedSum = round2(distributedSum + computed);
                    }
                    return {
                        memberId: p.memberId,
                        userId: p.userId || null,
                        shareType: 'PERCENTAGE',
                        shareValue: pct,
                        computedAmount: computed
                    };
                });
            } else {
                // Fixed amounts
                return participants.map(p => ({
                    memberId: p.memberId,
                    userId: p.userId || null,
                    shareType: 'FIXED_AMOUNT',
                    shareValue: round2(p.shareValue || p.computedAmount || 0),
                    computedAmount: round2(p.shareValue || p.computedAmount || 0)
                }));
            }
        }

        case 'EQUAL':
        default: {
            // Equal Split across all participants with penny rounding protection
            const baseShare = Math.floor((total * 100) / count) / 100;
            let remainderCents = Math.round((total - baseShare * count) * 100);

            return participants.map(p => {
                let share = baseShare;
                if (remainderCents > 0) {
                    share = round2(share + 0.01);
                    remainderCents--;
                }
                return {
                    memberId: p.memberId,
                    userId: p.userId || null,
                    shareType: 'EQUAL_UNIT',
                    shareValue: 1.0,
                    computedAmount: share
                };
            });
        }
    }
}

/**
 * 2. Calculate Net Balances for All Group Members
 * Formula:
 * Net Balance = (Expenses Paid as Payer) + (Direct Settlements Paid)
 *             - (Expenses Owed via Splits) - (Direct Settlements Received)
 *
 * @param {Array<object>} members - All group members
 * @param {Array<object>} expenses - All group expenses with their splits
 * @param {Array<object>} settlements - All direct recorded settlement payments
 * @returns {object} Net balance mappings and totals
 */
function calculateNetBalances(members = [], expenses = [], settlements = []) {
    const balances = {};
    const paidTotals = {};
    const owedTotals = {};
    const memberLookup = {};
    let totalSpend = 0;

    // Initialize all group members with 0 balance
    for (const m of members) {
        const id = String(m.id);
        balances[id] = 0;
        paidTotals[id] = 0;
        owedTotals[id] = 0;
        memberLookup[id] = {
            id: m.id,
            userId: m.user_id || m.userId || null,
            name: m.name,
            email: m.email,
            role: m.role || 'Traveler',
            avatarBg: m.avatar_bg || m.avatarBg || '#10b981',
            upiId: m.upi_id || m.upiId || ''
        };
    }

    // 1. Process Expenses
    for (const exp of expenses) {
        const expAmount = Number(exp.amount) || 0;
        totalSpend = round2(totalSpend + expAmount);
        const payerId = String(exp.paid_by_member_id || exp.paidByMemberId);

        // Payer gets credit
        if (balances[payerId] !== undefined) {
            balances[payerId] = round2(balances[payerId] + expAmount);
            paidTotals[payerId] = round2((paidTotals[payerId] || 0) + expAmount);
        }

        // Each split owes debit
        const splits = exp.splits || [];
        for (const s of splits) {
            const memberId = String(s.member_id || s.memberId);
            const shareAmount = Number(s.computed_amount || s.computedAmount) || 0;
            if (balances[memberId] !== undefined) {
                balances[memberId] = round2(balances[memberId] - shareAmount);
                owedTotals[memberId] = round2((owedTotals[memberId] || 0) + shareAmount);
            }
        }
    }

    // 2. Process Direct Settlements
    for (const s of settlements) {
        const amount = Number(s.amount) || 0;
        const fromId = String(s.from_member_id || s.fromMemberId);
        const toId = String(s.to_member_id || s.toMemberId);

        // Sender paid their debt -> balance increases (less negative or positive)
        if (balances[fromId] !== undefined) {
            balances[fromId] = round2(balances[fromId] + amount);
            paidTotals[fromId] = round2((paidTotals[fromId] || 0) + amount);
        }
        // Receiver received money -> balance decreases (credit redeemed)
        if (balances[toId] !== undefined) {
            balances[toId] = round2(balances[toId] - amount);
            owedTotals[toId] = round2((owedTotals[toId] || 0) + amount);
        }
    }

    // Assemble member summary
    const memberSummaries = members.map(m => {
        const id = String(m.id);
        const net = balances[id] || 0;
        return {
            ...memberLookup[id],
            totalPaid: paidTotals[id] || 0,
            totalOwed: owedTotals[id] || 0,
            netBalance: net,
            status: net > 0.01 ? 'OWED' : (net < -0.01 ? 'OWES' : 'SETTLED')
        };
    });

    return {
        balances,
        memberLookup,
        totalSpend: round2(totalSpend),
        memberSummaries
    };
}

/**
 * 3. Min-Cash-Flow Debt Simplification Algorithm (Graph-based greedy solver)
 * Solves the classical N-body debt simplification problem.
 * Reduces complex web of debts into minimum direct transactions.
 *
 * @param {object} balances - Map of memberId -> netBalance
 * @param {object} memberLookup - Map of memberId -> member details
 * @param {string} currency - Group currency code (e.g. 'INR')
 * @returns {Array<object>} Minimal transfers list
 */
function calculateOptimalSettlements(balances = {}, memberLookup = {}, currency = 'INR') {
    const debtors = [];
    const creditors = [];

    // Separate into debtors (negative balance) and creditors (positive balance)
    for (const [id, net] of Object.entries(balances)) {
        const balance = round2(net);
        if (balance < -0.01) {
            debtors.push({ id, amount: Math.abs(balance) });
        } else if (balance > 0.01) {
            creditors.push({ id, amount: balance });
        }
    }

    // Sort: largest debtor first, largest creditor first
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
        const debtor = debtors[dIdx];
        const creditor = creditors[cIdx];

        const settlementAmount = round2(Math.min(debtor.amount, creditor.amount));

        if (settlementAmount > 0.01) {
            const fromInfo = memberLookup[debtor.id] || { id: debtor.id, name: 'Unknown' };
            const toInfo = memberLookup[creditor.id] || { id: creditor.id, name: 'Unknown' };

            transfers.push({
                id: `transfer-${debtor.id}-${creditor.id}-${transfers.length + 1}`,
                fromMemberId: debtor.id,
                toMemberId: creditor.id,
                from: {
                    id: debtor.id,
                    name: fromInfo.name,
                    avatarBg: fromInfo.avatarBg,
                    email: fromInfo.email
                },
                to: {
                    id: creditor.id,
                    name: toInfo.name,
                    avatarBg: toInfo.avatarBg,
                    email: toInfo.email,
                    upiId: toInfo.upiId
                },
                amount: settlementAmount,
                currency
            });
        }

        debtor.amount = round2(debtor.amount - settlementAmount);
        creditor.amount = round2(creditor.amount - settlementAmount);

        if (debtor.amount <= 0.01) dIdx++;
        if (creditor.amount <= 0.01) cIdx++;
    }

    return transfers;
}

module.exports = {
    round2,
    calculateExpenseSplits,
    calculateNetBalances,
    calculateOptimalSettlements
};
