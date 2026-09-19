/**
 * Automated Verification Script for Local Ledger & Settlement Engine
 */

import { ledgerEngine } from '../src/sync/ledgerEngine';
import { Participant, Expense, SettlementTransfer } from '../src/types';

console.log('=== Running GroupTrip Ledger Offline Engine Verification ===\n');

// 1. Test Equal Split Recalculation
const members: Participant[] = [
  { id: 'u1', tripId: 't1', name: 'Yogesh', role: 'Organizer', avatarBg: '#059669', isUser: true, balance: 0 },
  { id: 'u2', tripId: 't1', name: 'Rahul', role: 'Traveler', avatarBg: '#0284c7', isUser: false, balance: 0 },
  { id: 'u3', tripId: 't1', name: 'Sneha', role: 'Traveler', avatarBg: '#7c3aed', isUser: false, balance: 0 },
  { id: 'u4', tripId: 't1', name: 'Aditya', role: 'Traveler', avatarBg: '#ea580c', isUser: false, balance: 0 },
];

const expenses: Expense[] = [
  // Yogesh paid 4000 for equal dinner (1000 each)
  {
    id: 'e1',
    tripId: 't1',
    title: 'Dinner',
    amount: 4000,
    currency: 'INR',
    category: 'Food',
    paidById: 'u1',
    paidByName: 'Yogesh',
    splitModel: 'EQUAL',
    splitCount: 4,
    paymentMethod: 'UPI',
    date: '2026-08-25',
    time: '20:00',
    syncStatus: 'SYNCED',
  },
  // Sneha paid 2000 for cab for all 4 (500 each)
  {
    id: 'e2',
    tripId: 't1',
    title: 'Cab',
    amount: 2000,
    currency: 'INR',
    category: 'Transport',
    paidById: 'u3',
    paidByName: 'Sneha',
    splitModel: 'EQUAL',
    splitCount: 4,
    paymentMethod: 'CASH',
    date: '2026-08-26',
    time: '11:00',
    syncStatus: 'SYNCED',
  },
];

console.log('1. Testing Equal Cost-Sharing Model:');
const balances = ledgerEngine.recalculateBalances(members, expenses, []);
console.log('Balances:', balances);
// Yogesh paid 4000, owes 1000 + 500 = 1500 -> net +2500
// Rahul paid 0, owes 1000 + 500 = 1500 -> net -1500
// Sneha paid 2000, owes 1000 + 500 = 1500 -> net +500
// Aditya paid 0, owes 1000 + 500 = 1500 -> net -1500
// Sum of balances must equal 0: 2500 - 1500 + 500 - 1500 = 0!
const sum = Object.values(balances).reduce((a, b) => a + b, 0);
if (Math.abs(sum) < 0.01 && balances['u1'] === 2500 && balances['u2'] === -1500) {
  console.log('✅ Equal split passed. Total net balance sums to 0.');
} else {
  console.error('❌ Equal split test failed!');
  process.exit(1);
}

// 2. Test Organizer-Paid Cost-Sharing Model
console.log('\n2. Testing Organizer-Paid Cost-Sharing Model:');
const organizerExpense: Expense = {
  id: 'e3',
  tripId: 't1',
  title: 'Sponsored Welcome Drinks',
  amount: 5000,
  currency: 'INR',
  category: 'Food',
  paidById: 'u1',
  paidByName: 'Yogesh',
  splitModel: 'ORGANIZER_PAID',
  splitCount: 4,
  paymentMethod: 'UPI',
  date: '2026-08-26',
  time: '22:00',
  syncStatus: 'SYNCED',
};
const balancesWithSponsored = ledgerEngine.recalculateBalances(members, [...expenses, organizerExpense], []);
console.log('Balances with sponsored drinks:', balancesWithSponsored);
if (balancesWithSponsored['u1'] === 2500 && balancesWithSponsored['u2'] === -1500) {
  console.log('✅ Organizer-Paid passed. Zero debt impact on travelers.');
} else {
  console.error('❌ Organizer-Paid test failed!');
  process.exit(1);
}

// 3. Test Min-Cash-Flow Smart Settlement Optimizer
console.log('\n3. Testing Min-Cash-Flow Debt Simplification:');
const membersWithBalances = members.map((m) => ({ ...m, balance: balances[m.id] }));
const optimal = ledgerEngine.calculateOptimalSettlements(membersWithBalances, 't1', 'INR', '₹');
console.log('Simplified Transfers:', optimal.transfers.map(t => `${t.fromMemberName} -> ₹${t.amount} -> ${t.toMemberName}`));
console.log(`Reduction: ${optimal.reductionPercentage}% (${optimal.originalTxCount} -> ${optimal.optimizedTxCount} transactions)`);

if (optimal.transfers.length === 3 && optimal.totalVolume === 3000) {
  console.log('✅ Min-Cash-Flow algorithm passed. Accurately resolved all debts with minimum transactions.');
} else {
  console.error('❌ Min-Cash-Flow test failed!');
  process.exit(1);
}

// 4. Test Settlement Recording
console.log('\n4. Testing Settlement Recording:');
const settlements: SettlementTransfer[] = [
  {
    id: 's1',
    tripId: 't1',
    fromMemberId: 'u2',
    fromMemberName: 'Rahul',
    toMemberId: 'u1',
    toMemberName: 'Yogesh',
    amount: 1500,
    currency: 'INR',
    currencySymbol: '₹',
    status: 'completed',
    paymentMethod: 'UPI',
    syncStatus: 'SYNCED',
  },
];
const settledBalances = ledgerEngine.recalculateBalances(members, expenses, settlements);
console.log('Balances after Rahul settles ₹1,500 to Yogesh:', settledBalances);
if (settledBalances['u2'] === 0 && settledBalances['u1'] === 1000) {
  console.log('✅ Settlement recording passed. Rahul is now at ₹0 balance.');
} else {
  console.error('❌ Settlement recording failed!');
  process.exit(1);
}

console.log('\n🎉 ALL OFFLINE ENGINE TESTS PASSED SUCCESSFULLY!');
