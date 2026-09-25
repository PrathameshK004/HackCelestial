const test = require('node:test');
const assert = require('node:assert');

const {
    calculateSettlementPlan,
    simplifyDebtGraph,
    calculateNetBalances,
    calculateOptimalSettlements,
    calculateExpenseSplits
} = require('../utils/recalculation.engine');

function money(value) {
    return Number((Number(value) || 0).toFixed(2));
}

test('settlement engine resolves a simple debtor/creditor obligation', () => {
    const result = calculateSettlementPlan({ A: 100, B: -100 }, { A: { name: 'A' }, B: { name: 'B' } }, 'INR');
    assert.deepStrictEqual(
        result.map(t => ({ from: t.fromMemberId, to: t.toMemberId, amount: money(t.amount) })),
        [{ from: 'B', to: 'A', amount: 100 }]
    );

    const transfer = calculateSettlementPlan({ A: 150, B: 50, C: -100, D: -100 }, {
        A: { name: 'A' }, B: { name: 'B' }, C: { name: 'C' }, D: { name: 'D' }
    }, 'INR');

    assert.deepStrictEqual(
        transfer.map(t => ({ from: t.fromMemberId, to: t.toMemberId, amount: money(t.amount) })),
        [
            { from: 'C', to: 'A', amount: 100 },
            { from: 'D', to: 'A', amount: 50 },
            { from: 'D', to: 'B', amount: 50 }
        ]
    );
});

test('simplifyDebtGraph nets reciprocal edges and cancels cycle debt', () => {
    const graph = [
        { from: 'A', to: 'B', amount: 100 },
        { from: 'B', to: 'A', amount: 100 },
        { from: 'A', to: 'B', amount: 100 },
        { from: 'B', to: 'C', amount: 100 },
        { from: 'C', to: 'A', amount: 100 }
    ];

    const simplified = simplifyDebtGraph(graph);
    assert.deepStrictEqual(simplified, []);
});

test('simplifyDebtGraph handles partial cycle cancellation', () => {
    const simplified = simplifyDebtGraph([
        { from: 'A', to: 'B', amount: 100 },
        { from: 'B', to: 'C', amount: 80 },
        { from: 'C', to: 'A', amount: 60 }
    ]);

    assert.deepStrictEqual(
        simplified.map(t => ({ from: t.from, to: t.to, amount: money(t.amount) })),
        [
            { from: 'A', to: 'B', amount: 40 },
            { from: 'B', to: 'C', amount: 20 }
        ]
    );
});

test('settlement engine preserves exact decimal arithmetic in INR minor units', () => {
    const result = calculateSettlementPlan({ A: 100.50, B: -25.25, C: -75.25 }, {
        A: { name: 'A' }, B: { name: 'B' }, C: { name: 'C' }
    }, 'INR');

    assert.deepStrictEqual(
        result.map(t => ({ from: t.fromMemberId, to: t.toMemberId, amount: money(t.amount) })),
        [
            { from: 'C', to: 'A', amount: 75.25 },
            { from: 'B', to: 'A', amount: 25.25 }
        ]
    );
});

test('calculateOptimalSettlements handles duplicate edges and idempotent outcomes', () => {
    const balances = { A: 70, B: -70 };
    const result = calculateOptimalSettlements(balances, { A: { name: 'A' }, B: { name: 'B' } }, 'INR');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(money(result[0].amount), 70);
    assert.strictEqual(result[0].fromMemberId, 'B');
    assert.strictEqual(result[0].toMemberId, 'A');

    const again = calculateOptimalSettlements({ A: 70, B: -70 }, { A: { name: 'A' }, B: { name: 'B' } }, 'INR');
    assert.deepStrictEqual(result, again);
});

test('inconsistent balances are rejected before generating settlements', () => {
    assert.throws(() => {
        calculateSettlementPlan({ A: 100, B: -40, C: -40 }, { A: { name: 'A' }, B: { name: 'B' }, C: { name: 'C' } }, 'INR');
    }, /inconsistent|zero/i);
});


test('calculateNetBalances reflects direct settlement adjustment correctly', () => {
    const summary = calculateNetBalances(
        [
            { id: 'A', name: 'A' },
            { id: 'B', name: 'B' }
        ],
        [
            { amount: 100, paid_by_member_id: 'A', splits: [{ member_id: 'A', computed_amount: 50 }, { member_id: 'B', computed_amount: 50 }] },
            { amount: 60, paid_by_member_id: 'B', splits: [{ member_id: 'A', computed_amount: 30 }, { member_id: 'B', computed_amount: 30 }] }
        ],
        [
            { from_member_id: 'B', to_member_id: 'A', amount: 20 }
        ]
    );

    assert.deepStrictEqual(
        Object.fromEntries(Object.entries(summary.balances).map(([id, value]) => [id, money(value)])),
        { A: 0, B: 0 }
    );
});

test('calculateExpenseSplits accepts legacy participantId/shareAmount payloads', () => {
    const result = calculateExpenseSplits(100, 'EQUAL', [
        { participantId: 'A', shareAmount: 50, shareType: 'FIXED_AMOUNT', isOptedIn: true },
        { participantId: 'B', shareAmount: 50, shareType: 'FIXED_AMOUNT', isOptedIn: true }
    ]);

    assert.deepStrictEqual(
        result.map(split => ({ memberId: split.memberId, computedAmount: money(split.computedAmount) })),
        [
            { memberId: 'A', computedAmount: 50 },
            { memberId: 'B', computedAmount: 50 }
        ]
    );
});

test('exact three-member 1000 expense produces two debts and no self-debt', () => {
    const splits = calculateExpenseSplits(1000, 'EQUAL', [
        { memberId: 'A' },
        { memberId: 'B' },
        { memberId: 'C' }
    ]);
    const summary = calculateNetBalances(
        [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }],
        [{ amount: 1000, paid_by_member_id: 'A', verification_status: 'VERIFIED', splits }]
    );
    const transfers = calculateOptimalSettlements(summary.balances, summary.memberLookup, 'INR');

    assert.deepStrictEqual(
        splits.map((split) => money(split.computedAmount)),
        [333.33, 333.33, 333.34]
    );
    assert.deepStrictEqual(
        Object.fromEntries(Object.entries(summary.balances).map(([id, value]) => [id, money(value)])),
        { A: 666.67, B: -333.33, C: -333.34 }
    );
    assert.strictEqual(transfers.length, 2);
    assert.ok(transfers.every((transfer) => transfer.fromMemberId !== transfer.toMemberId));
    assert.deepStrictEqual(
        transfers.map((transfer) => ({ from: transfer.fromMemberId, to: transfer.toMemberId, amount: money(transfer.amount) })),
        [
            { from: 'C', to: 'A', amount: 333.34 },
            { from: 'B', to: 'A', amount: 333.33 }
        ]
    );
});

test('selected participants exclude non-participants and support a payer outside the split', () => {
    const selectedSplits = calculateExpenseSplits(1000, 'EQUAL', [
        { memberId: 'A' },
        { memberId: 'B' },
        { memberId: 'D' }
    ]);
    const selectedSummary = calculateNetBalances(
        [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }, { id: 'D', name: 'D' }],
        [{ amount: 1000, paid_by_member_id: 'A', verification_status: 'VERIFIED', splits: selectedSplits }]
    );
    assert.strictEqual(money(selectedSummary.balances.C), 0);
    assert.deepStrictEqual(
        calculateOptimalSettlements(selectedSummary.balances, selectedSummary.memberLookup).map((transfer) => transfer.fromMemberId),
        ['D', 'B']
    );

    const payerOutsideSplits = calculateExpenseSplits(900, 'EQUAL', [
        { memberId: 'B' },
        { memberId: 'C' },
        { memberId: 'D' }
    ]);
    const payerOutsideSummary = calculateNetBalances(
        [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }, { id: 'D', name: 'D' }],
        [{ amount: 900, paid_by_member_id: 'A', verification_status: 'VERIFIED', splits: payerOutsideSplits }]
    );
    assert.strictEqual(money(payerOutsideSummary.balances.A), 900);
    assert.strictEqual(money(Object.values(payerOutsideSummary.balances).reduce((sum, value) => sum + value, 0)), 0);
});

test('calculateNetBalances accepts the formatted settlement API expense shape', () => {
    const splits = calculateExpenseSplits(1000, 'EQUAL', [
        { memberId: 'A' },
        { memberId: 'B' },
        { memberId: 'C' }
    ]);
    const summary = calculateNetBalances(
        [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }],
        [{
            amount: 1000,
            verificationStatus: 'VERIFIED',
            paidBy: { id: 'A' },
            splits: splits.map((split) => ({ memberId: split.memberId, computedAmount: split.computedAmount }))
        }]
    );

    assert.deepStrictEqual(
        Object.fromEntries(Object.entries(summary.balances).map(([id, value]) => [id, money(value)])),
        { A: 666.67, B: -333.33, C: -333.34 }
    );
});
