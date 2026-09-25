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
function normalizeParticipant(participant = {}) {
    const memberId = participant.memberId ?? participant.member_id ?? participant.id ?? participant.participantId ?? participant.participant_id;
    const userId = participant.userId ?? participant.user_id ?? participant.user ?? null;
    const shareType = participant.shareType ?? participant.share_type ?? 'EQUAL_UNIT';
    const shareValue = participant.shareValue ?? participant.share_value ?? participant.shareAmount ?? participant.share_amount ?? participant.computedAmount ?? participant.amount ?? 1;
    const isOptedIn = participant.isOptedIn ?? participant.is_opted_in ?? true;

    return {
        ...participant,
        memberId: memberId !== undefined && memberId !== null ? String(memberId) : undefined,
        userId: userId !== undefined && userId !== null ? String(userId) : null,
        shareType,
        shareValue: Number(shareValue) || 0,
        isOptedIn: Boolean(isOptedIn)
    };
}

function calculateExpenseSplits(totalAmount, splitModel = 'EQUAL', participants = []) {
    const total = round2(Number(totalAmount));
    if (total <= 0 || !Array.isArray(participants) || participants.length === 0) {
        return [];
    }

    const normalizedParticipants = participants
        .map(normalizeParticipant)
        .filter(p => p.memberId !== undefined && p.memberId !== null && p.memberId !== '');

    if (normalizedParticipants.length === 0) {
        return [];
    }

    const count = normalizedParticipants.length;

    switch ((splitModel || 'EQUAL').toString().toUpperCase()) {
        case 'ORGANIZER_PAID': {
            // Organizer / Sponsor pays; participants have 0 liability
            return normalizedParticipants.map(p => ({
                memberId: p.memberId,
                userId: p.userId || null,
                shareType: 'ORGANIZER_PAID',
                shareValue: 0,
                computedAmount: 0.00
            }));
        }

        case 'ACTIVITY_BASED': {
            // Only opted-in participants share the cost
            const activeDivers = normalizedParticipants.filter(p => p.isOptedIn !== false && (p.shareValue === undefined || Number(p.shareValue) > 0));
            const activeCount = activeDivers.length;

            if (activeCount === 0) {
                // Fallback to equal split if no explicit opt-ins provided
                return calculateExpenseSplits(total, 'EQUAL', normalizedParticipants);
            }

            const baseShare = Math.floor((total * 100) / activeCount) / 100;
            let remainderCents = Math.round((total - baseShare * activeCount) * 100);

            return normalizedParticipants.map(p => {
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
            const totalUnits = normalizedParticipants.reduce((sum, p) => sum + (Number(p.shareValue) > 0 ? Number(p.shareValue) : 1), 0);
            let distributedSum = 0;

            const splits = normalizedParticipants.map((p, idx) => {
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
            const isPercentage = normalizedParticipants.some(p => p.shareType === 'PERCENTAGE');
            if (isPercentage) {
                let distributedSum = 0;
                return normalizedParticipants.map((p, idx) => {
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
                return normalizedParticipants.map(p => ({
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

            return normalizedParticipants.map((p, index) => {
                let share = baseShare;
                if (index >= normalizedParticipants.length - remainderCents) {
                    share = round2(share + 0.01);
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
            upiId: m.upi_id || m.upiId || '',
            status: m.status || (m.role === 'Organizer' ? 'ACCEPTED' : 'PENDING')
        };
    }

    // 1. Process Expenses
    for (const exp of expenses) {
        // Only official expenses (VERIFIED or AUTO_VERIFIED) affect balances.
        // Skip unapproved (PENDING_APPROVAL) or DISPUTED expenses until 60% companion consensus is reached.
        const status = (exp.verification_status || exp.verificationStatus || 'VERIFIED').toUpperCase();
        if (status === 'PENDING_APPROVAL' || status === 'DISPUTED') {
            continue;
        }

        const expAmount = Number(exp.amount) || 0;
        totalSpend = round2(totalSpend + expAmount);
        const payerId = String(
            exp.paid_by_member_id ||
            exp.paidByMemberId ||
            exp.paidBy?.id ||
            ''
        );

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
 * 3. Min-Cash-Flow Debt Simplification Algorithm
 *
 * This engine first validates that the group balances reconcile to zero, then reduces
 * the remaining obligations using a deterministic graph-based simplification. The
 * greedy matching below is a low-complexity heuristic for typical expense groups and
 * is intentionally deterministic for consistent UI output.
 */
function normalizeBalanceMap(balances = {}) {
    if (!balances || typeof balances !== 'object' || Array.isArray(balances)) {
        throw new Error('Balance map must be a plain object keyed by member id.');
    }

    const normalized = {};
    for (const [memberId, rawValue] of Object.entries(balances)) {
        const amount = Number(rawValue);
        if (!Number.isFinite(amount)) {
            throw new Error(`Invalid balance for ${memberId}: ${rawValue}`);
        }
        normalized[String(memberId)] = round2(amount);
    }
    return normalized;
}

function validateBalanceConsistency(balances = {}) {
    const normalized = normalizeBalanceMap(balances);
    const total = Object.values(normalized).reduce((sum, value) => round2(sum + Number(value || 0)), 0);

    if (Math.abs(total) > 0.01) {
        throw new Error(`Balance inconsistency: net balances do not sum to zero (${total}).`);
    }

    return normalized;
}

function canonicalEdgeKey(from, to) {
    return `${String(from)}::${String(to)}`;
}

function parseEdgeKey(key) {
    const [from, to] = String(key).split('::');
    return { from, to };
}

function simplifyDebtGraph(edges = []) {
    const validEdges = Array.isArray(edges) ? edges.filter(Boolean) : [];
    const aggregated = new Map();

    for (const edge of validEdges) {
        const from = String(edge.from);
        const to = String(edge.to);
        if (!from || !to || from === to) continue;

        const amount = round2(Number(edge.amount) || 0);
        if (amount <= 0.01) continue;

        const key = canonicalEdgeKey(from, to);
        aggregated.set(key, round2((aggregated.get(key) || 0) + amount));
    }

    const reverseNet = new Map(Array.from(aggregated.entries()));
    let changed = true;

    while (changed) {
        changed = false;
        const keys = Array.from(reverseNet.keys());

        for (const key of keys) {
            const { from, to } = parseEdgeKey(key);
            const reverseKey = canonicalEdgeKey(to, from);
            if (!reverseNet.has(reverseKey)) continue;

            const net = round2((reverseNet.get(key) || 0) - (reverseNet.get(reverseKey) || 0));
            reverseNet.delete(key);
            reverseNet.delete(reverseKey);

            if (net > 0.01) {
                reverseNet.set(canonicalEdgeKey(from, to), round2(net));
            } else if (net < -0.01) {
                reverseNet.set(canonicalEdgeKey(to, from), round2(Math.abs(net)));
            }

            changed = true;
            break;
        }
    }

    const adjacency = new Map();
    for (const [key, amount] of reverseNet.entries()) {
        const { from, to } = parseEdgeKey(key);
        if (!adjacency.has(from)) adjacency.set(from, []);
        adjacency.get(from).push({ from, to, amount: round2(amount) });
    }

    for (const node of adjacency.keys()) {
        const list = adjacency.get(node) || [];
        list.sort((a, b) => a.to.localeCompare(b.to));
    }

    const finalEdges = new Map();
    for (const [from, list] of adjacency.entries()) {
        for (const edge of list) {
            finalEdges.set(canonicalEdgeKey(edge.from, edge.to), round2(edge.amount));
        }
    }

    let cycleCancelled = true;
    while (cycleCancelled) {
        cycleCancelled = false;
        const nodes = Array.from(new Set(Array.from(finalEdges.keys()).flatMap(k => {
            const { from, to } = parseEdgeKey(k);
            return [from, to];
        }))).sort();

        for (const startNode of nodes) {
            const path = [];
            const visited = new Set();
            const stack = [startNode];

            function dfs(node) {
                if (visited.has(node)) return null;
                visited.add(node);
                path.push(node);

                const outgoing = Array.from(finalEdges.entries())
                    .filter(([key]) => parseEdgeKey(key).from === node)
                    .map(([key, amount]) => ({ ...parseEdgeKey(key), amount }));

                outgoing.sort((a, b) => a.to.localeCompare(b.to));

                for (const edge of outgoing) {
                    if (edge.to === startNode && path.length > 1) {
                        return path.slice();
                    }
                    if (!visited.has(edge.to)) {
                        const cycle = dfs(edge.to);
                        if (cycle) return cycle;
                    }
                }

                path.pop();
                return null;
            }

            const cycle = dfs(startNode);
            if (!cycle || cycle.length < 2) continue;

            const cycleSet = new Set(cycle);
            const cycleEdges = [];
            for (const [key, amount] of finalEdges.entries()) {
                const { from, to } = parseEdgeKey(key);
                if (cycleSet.has(from) && cycleSet.has(to) && from !== to) {
                    cycleEdges.push({ key, from, to, amount: round2(amount) });
                }
            }

            if (cycleEdges.length === 0) continue;

            const minAmount = round2(Math.min(...cycleEdges.map(edge => edge.amount)));
            if (minAmount <= 0.01) continue;

            for (const edge of cycleEdges) {
                const remaining = round2(edge.amount - minAmount);
                finalEdges.delete(edge.key);
                if (remaining > 0.01) {
                    finalEdges.set(canonicalEdgeKey(edge.from, edge.to), remaining);
                }
            }

            cycleCancelled = true;
            break;
        }

        if (!cycleCancelled) break;
    }

    return Array.from(finalEdges.entries())
        .map(([key, amount]) => {
            const { from, to } = parseEdgeKey(key);
            return { from, to, amount: round2(amount) };
        })
        .filter(edge => edge.amount > 0.01)
        .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

function calculateSettlementPlan(balances = {}, memberLookup = {}, currency = 'INR') {
    const normalizedBalances = validateBalanceConsistency(balances);
    const debtors = [];
    const creditors = [];

    for (const [id, net] of Object.entries(normalizedBalances)) {
        const balance = round2(net);
        if (balance < -0.01) {
            debtors.push({ id, amount: Math.abs(balance) });
        } else if (balance > 0.01) {
            creditors.push({ id, amount: balance });
        }
    }

    debtors.sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
    creditors.sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));

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

function calculateOptimalSettlements(balances = {}, memberLookup = {}, currency = 'INR') {
    return calculateSettlementPlan(balances, memberLookup, currency);
}

module.exports = {
    round2,
    simplifyDebtGraph,
    calculateSettlementPlan,
    calculateExpenseSplits,
    calculateNetBalances,
    calculateOptimalSettlements
};
