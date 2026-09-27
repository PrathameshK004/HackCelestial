const test = require('node:test');
const assert = require('node:assert/strict');

const {
    round2,
    normalizeTripFairnessInput,
    calculateGiniCoefficient,
    computeMinTransferSet,
    analyzeTripFairnessData,
    callNugenTripAnalysis
} = require('../services/nugen.service');

const sampleTrip = {
    tripName: 'Goa Weekend',
    participants: [
        { id: 'u1', name: 'Aditi' },
        { id: 'u2', name: 'Riya' },
        { id: 'u3', name: 'Karan' }
    ],
    bookings: [
        {
            id: 'b1',
            title: 'Hotel Stay',
            amount: 9000,
            splitModel: 'EQUAL',
            participants: ['u1', 'u2', 'u3'],
            payer: 'u1'
        },
        {
            id: 'b2',
            title: 'Water Sports',
            amount: 3000,
            splitModel: 'EQUAL',
            participants: ['u1', 'u2'],
            payer: 'u2'
        }
    ],
    payments: [
        { from: 'u1', to: 'u2', amount: 3000 },
        { from: 'u2', to: 'u1', amount: 1000 }
    ]
};

test('fairness analyzer flags an unfair group split and returns structured risk info', () => {
    const result = analyzeTripFairnessData(sampleTrip);

    assert.ok(result.fairnessScore >= 0 && result.fairnessScore <= 100);
    assert.ok(Array.isArray(result.issues));
    assert.ok(Array.isArray(result.detailedIssues));
    assert.ok(Array.isArray(result.recommendations));
    assert.ok(result.summary.length > 0);
    assert.ok(result.settlementStrategy);
    assert.ok(Array.isArray(result.settlementStrategy.minTransferSet));
    assert.ok(Array.isArray(result.settlementStrategy.travelerBreakdown));
    assert.ok(result.scoreBreakdown);
    assert.ok(typeof result.scoreBreakdown.giniCoefficient === 'number');
});

test('handles empty trip ledger gracefully without crashing', () => {
    const result = analyzeTripFairnessData({ tripName: 'Empty Trip', participants: [{ id: 'u1', name: 'Solo' }] });

    assert.equal(result.fairnessScore, 100);
    assert.equal(result.riskLevel, 'low');
    assert.equal(result.settlementStrategy.minTransferSet.length, 0);
    assert.ok(result.summary.includes('No expense or booking data'));
});

test('accurately normalizes uneven splits with custom exact amounts', () => {
    const tripWithCustomSplits = {
        tripName: 'Manali Trek',
        participants: [
            { id: 'p1', name: 'Arjun' },
            { id: 'p2', name: 'Sneha' },
            { id: 'p3', name: 'Kabir' }
        ],
        bookings: [
            {
                id: 'b10',
                title: 'Cabin Rental',
                amount: 6000,
                splitModel: 'EXACT',
                payer: 'p1',
                splits: [
                    { participantId: 'p1', amount: 2000 },
                    { participantId: 'p2', amount: 2500 },
                    { participantId: 'p3', amount: 1500 }
                ]
            }
        ]
    };

    const result = analyzeTripFairnessData(tripWithCustomSplits);
    const breakdown = result.settlementStrategy.travelerBreakdown;

    const p1 = breakdown.find(b => b.id === 'p1');
    const p2 = breakdown.find(b => b.id === 'p2');
    const p3 = breakdown.find(b => b.id === 'p3');

    assert.equal(p1.paid, 6000);
    assert.equal(p1.share, 2000);
    assert.equal(p1.netBalance, 4000); // Fronted 6000, owes 2000 => +4000

    assert.equal(p2.paid, 0);
    assert.equal(p2.share, 2500);
    assert.equal(p2.netBalance, -2500); // Owes 2500

    assert.equal(p3.paid, 0);
    assert.equal(p3.share, 1500);
    assert.equal(p3.netBalance, -1500); // Owes 1500

    // Min-cash-flow check: p2 pays p1 ₹2,500, p3 pays p1 ₹1,500
    const transfers = result.settlementStrategy.minTransferSet;
    assert.equal(transfers.length, 2);
    assert.ok(transfers.some(t => t.from === 'p2' && t.to === 'p1' && t.amount === 2500));
    assert.ok(transfers.some(t => t.from === 'p3' && t.to === 'p1' && t.amount === 1500));
});

test('handles refunds and reversals correctly by adjusting balances', () => {
    const tripWithRefund = {
        participants: [
            { id: 'u1', name: 'Aditi' },
            { id: 'u2', name: 'Riya' }
        ],
        bookings: [
            {
                id: 'b1',
                title: 'Flight Tickets',
                amount: 10000,
                splitModel: 'EQUAL',
                payer: 'u1',
                participants: ['u1', 'u2']
            },
            {
                id: 'b2',
                title: 'Flight Partial Refund',
                amount: 4000,
                isRefund: true,
                splitModel: 'EQUAL',
                payer: 'u1',
                participants: ['u1', 'u2']
            }
        ]
    };

    const result = analyzeTripFairnessData(tripWithRefund);
    const u1 = result.settlementStrategy.travelerBreakdown.find(b => b.id === 'u1');
    const u2 = result.settlementStrategy.travelerBreakdown.find(b => b.id === 'u2');

    // Net spend is 6000 (10000 - 4000 refund), split equally is 3000 each.
    // u1 paid 6000 net, share is 3000 => u1 balance +3000
    // u2 paid 0 net, share is 3000 => u2 balance -3000
    assert.equal(u1.netBalance, 3000);
    assert.equal(u2.netBalance, -3000);

    const transfers = result.settlementStrategy.minTransferSet;
    assert.equal(transfers.length, 1);
    assert.equal(transfers[0].from, 'u2');
    assert.equal(transfers[0].to, 'u1');
    assert.equal(transfers[0].amount, 3000);
});

test('flags duplicate settlement payments as critical anomalies', () => {
    const tripWithDuplicates = {
        participants: [
            { id: 'u1', name: 'Aditi' },
            { id: 'u2', name: 'Riya' }
        ],
        bookings: [
            { id: 'b1', title: 'Hotel', amount: 4000, payer: 'u1', participants: ['u1', 'u2'] }
        ],
        payments: [
            { from: 'u2', to: 'u1', amount: 2000 },
            { from: 'u2', to: 'u1', amount: 2000 } // Duplicate identical payment
        ]
    };

    const result = analyzeTripFairnessData(tripWithDuplicates);
    assert.ok(result.detailedIssues.some(i => i.id === 'duplicate-payments' && i.severity === 'critical'));
    assert.ok(result.scoreBreakdown.anomalyDeductions >= 15);
    assert.equal(result.settlementStrategy.priority, 'critical');
});

test('min-cash-flow algorithm simplifies multi-person circular debt', () => {
    // 3 participants where balances sum to 0:
    // A owes B 100, B owes C 100 => Min transfer: A pays C 100 (1 transfer instead of 2)
    const balances = {
        'A': -100,
        'B': 0,
        'C': 100
    };
    const map = new Map([
        ['A', { name: 'Alice' }],
        ['B', { name: 'Bob' }],
        ['C', { name: 'Charlie' }]
    ]);

    const transfers = computeMinTransferSet(balances, map, 'INR');
    assert.equal(transfers.length, 1);
    assert.equal(transfers[0].from, 'A');
    assert.equal(transfers[0].to, 'C');
    assert.equal(transfers[0].amount, 100);
});

test('nugen adapter returns a consistent production-ready contract with local fallback metadata', async () => {
    const result = await callNugenTripAnalysis({
        apiKey: 'demo-key',
        tripData: sampleTrip,
        modelId: 'trip-fairness-core',
        systemPrompt: 'Analyze trip fairness and settlement risk.'
    });

    assert.equal(result.ok, true);
    // When cloud inference fails, model reflects the explicitly passed modelId or offline-edge-ai-v1
    assert.ok(result.data.model === 'trip-fairness-core' || result.data.model === 'offline-edge-ai-v1');
    // Source is now 'offline-local-ai' when running on local edge engine
    assert.ok(
        result.data.source === 'offline-local-ai' || result.data.source === 'local-domain-analysis',
        `Unexpected source: ${result.data.source}`
    );
    assert.ok(Array.isArray(result.data.issues));
    assert.ok(Array.isArray(result.data.detailedIssues));
    assert.ok(Array.isArray(result.data.recommendations));
    assert.ok(result.data.summary.length > 0);
    assert.ok(result.data.settlementStrategy);
    assert.ok(Array.isArray(result.data.settlementStrategy.minTransferSet));
    // Offline AI narrative must always be present (our core USP)
    assert.ok(typeof result.data.aiNarrative === 'string' && result.data.aiNarrative.length > 0,
        'aiNarrative must be populated by the local edge AI engine');
});

// ============================================================================
// Phase 5 & 6 Test Coverage
// ============================================================================

const {
    computeOrganizerHubTransfers,
    computeThresholdFilteredTransfers,
    getFairnessTelemetry,
    resetFairnessTelemetry
} = require('../services/nugen.service');
const { validateTripFairnessPayload } = require('../middleware/tripFairnessValidation.middleware');

test('computes organizer hub settlement strategy correctly', () => {
    const netBalances = {
        'org1': 5000,
        'u2': -3000,
        'u3': -2000
    };
    const map = new Map([
        ['org1', { name: 'Organizer Raj' }],
        ['u2', { name: 'User 2' }],
        ['u3', { name: 'User 3' }]
    ]);

    const hubTransfers = computeOrganizerHubTransfers(netBalances, map, 'org1', 'INR');
    assert.equal(hubTransfers.length, 2);
    assert.ok(hubTransfers.every(t => t.to === 'org1' || t.from === 'org1'));
    assert.ok(hubTransfers.some(t => t.from === 'u2' && t.to === 'org1' && t.amount === 3000));
    assert.ok(hubTransfers.some(t => t.from === 'u3' && t.to === 'org1' && t.amount === 2000));
});

test('threshold filtering separates micro-debts below given threshold', () => {
    const rawTransfers = [
        { from: 'u1', to: 'u2', amount: 15 },
        { from: 'u3', to: 'u2', amount: 450 },
        { from: 'u4', to: 'u2', amount: 8 }
    ];

    const result = computeThresholdFilteredTransfers(rawTransfers, 20);
    assert.equal(result.activeTransfers.length, 1);
    assert.equal(result.activeTransfers[0].amount, 450);
    assert.equal(result.absorbedTransfers.length, 2);
    assert.equal(result.absorbedTotal, 23);
});

test('evaluates financial stress index, timeline, anomalies, and budget health', () => {
    const tripWithDiverseExpenses = {
        tripName: 'Himachal Tour',
        budget: 50000,
        participants: [
            { id: 'p1', name: 'Aarav' },
            { id: 'p2', name: 'Bhavna' },
            { id: 'p3', name: 'Chirag' }
        ],
        bookings: [
            { id: 'b1', title: 'Luxury Villa', amount: 30000, payer: 'p1', category: 'Stay' },
            { id: 'b2', title: 'Local Taxi', amount: 4000, payer: 'p1', category: 'Travel' },
            { id: 'b3', title: 'Mountain Cafe', amount: 3000, payer: 'p2', category: 'Dining' },
            { id: 'b4', title: 'River Rafting', amount: 6000, payer: 'p1', category: 'Activities' }
        ],
        payments: []
    };

    const analysis = analyzeTripFairnessData(tripWithDiverseExpenses);

    // Stress assessment
    assert.ok(analysis.riskAssessment);
    assert.ok(typeof analysis.riskAssessment.financialStressIndex === 'number');
    assert.ok(['nominal', 'moderate', 'elevated', 'critical'].includes(analysis.riskAssessment.stressLevel));
    assert.ok(analysis.riskAssessment.stressFactors.length > 0);

    // Anomalies
    assert.ok(Array.isArray(analysis.anomalies));
    assert.ok(analysis.anomalies.some(a => a.type === 'LARGE_SHARE_OF_BUDGET' || a.type === 'STATISTICAL_OUTLIER'));

    // Timeline
    assert.ok(Array.isArray(analysis.timeline));
    assert.equal(analysis.timeline.length, 4);
    assert.equal(analysis.timeline[3].cumulativeSpend, 43000);

    // Budget Health
    assert.ok(analysis.budgetHealth);
    assert.equal(analysis.budgetHealth.targetBudget, 50000);
    assert.equal(analysis.budgetHealth.totalSpend, 43000);
    assert.equal(analysis.budgetHealth.remainingBudget, 7000);
    assert.equal(analysis.budgetHealth.status, 'near_limit');
    assert.ok(analysis.budgetHealth.categoryBreakdown.length >= 4);

    // Alternative strategies
    assert.ok(analysis.settlementStrategy.alternativeStrategies);
    assert.ok(Array.isArray(analysis.settlementStrategy.alternativeStrategies.organizerHub));
    assert.ok(analysis.settlementStrategy.alternativeStrategies.thresholdFilter);
});

test('tracks in-memory fairness telemetry correctly', () => {
    resetFairnessTelemetry();
    let stats = getFairnessTelemetry();
    assert.equal(stats.totalAnalyses, 0);

    analyzeTripFairnessData(sampleTrip);
    stats = getFairnessTelemetry();
    assert.equal(stats.totalAnalyses, 1);
    assert.ok(stats.lastAnalyzedAt !== null);
});

test('trip fairness validation middleware rejects malformed payloads and accepts valid ones', () => {
    // 1. Invalid payload (null/primitive)
    let resError = null;
    const mockRes = {
        status: (code) => ({
            json: (payload) => {
                resError = { code, payload };
                return payload;
            }
        })
    };

    validateTripFairnessPayload({ body: 'invalid-string' }, mockRes, () => {});
    assert.equal(resError.code, 400);

    // 2. Invalid non-array participants
    resError = null;
    validateTripFairnessPayload({ body: { tripData: { participants: 'not-an-array' } } }, mockRes, () => {});
    assert.equal(resError.code, 400);
    assert.equal(resError.payload.err.code, 'INVALID_PARTICIPANTS');

    // 3. Invalid non-numeric booking amount
    resError = null;
    validateTripFairnessPayload({
        body: {
            tripData: {
                participants: [{ id: '1', name: 'User' }],
                bookings: [{ title: 'Flight', amount: 'not-a-number' }]
            }
        }
    }, mockRes, () => {});
    assert.equal(resError.code, 400);
    assert.equal(resError.payload.err.code, 'INVALID_BOOKING_AMOUNT');

    // 4. Valid payload passes
    let calledNext = false;
    const validReq = {
        body: {
            tripData: {
                participants: [{ id: '1', name: 'User' }],
                bookings: [{ title: 'Dinner', amount: 500 }]
            }
        }
    };
    validateTripFairnessPayload(validReq, mockRes, () => {
        calledNext = true;
    });
    assert.equal(calledNext, true);
    assert.ok(validReq.validatedTripData);
});

