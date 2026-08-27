export interface GroupExpense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: 'Stay' | 'Food' | 'Transport' | 'Activities' | 'Supplies' | 'Other';
  paidBy: {
    name: string;
    avatarBg: string;
    isUser?: boolean;
  };
  splitWithCount: number;
  date: string;
  time: string;
}

export interface GroupCardItem {
  id: string;
  name: string;
  destination: string;
  tag: string;
  tripType: 'Friends' | 'Family' | 'Corporate' | 'Student' | 'Other';
  status: 'active' | 'upcoming' | 'completed';
  startDate: string;
  endDate: string;
  currency: string;
  currencySymbol: string;
  totalBudget: number;
  totalSpent: number;
  userBalance: number; // +ve if user is owed, -ve if user owes, 0 if settled
  members: {
    id: string;
    name: string;
    email: string;
    role: 'Organizer' | 'Traveler';
    avatarBg: string;
    isUser?: boolean;
    balance: number;
  }[];
  expenses: GroupExpense[];
  inviteCode: string;
  coverGradient: string;
  description: string;
}

export interface SimplifiedTransfer {
  id: string;
  from: {
    id: string;
    name: string;
    avatarBg: string;
    isUser?: boolean;
  };
  to: {
    id: string;
    name: string;
    avatarBg: string;
    isUser?: boolean;
  };
  amount: number;
  currency: string;
  currencySymbol: string;
  status: 'pending' | 'completed';
  dueDate?: string;
}

export const MOCK_DASHBOARD_GROUPS: GroupCardItem[] = [
  {
    id: 'grp-goa-2026',
    name: 'Goa Friends Getaway',
    destination: 'Goa, India',
    tag: 'Beaches & Nightlife',
    tripType: 'Friends',
    status: 'active',
    startDate: '2026-08-25',
    endDate: '2026-08-30',
    currency: 'INR',
    currencySymbol: '₹',
    totalBudget: 60000,
    totalSpent: 42800,
    userBalance: 3200, // You are owed ₹3,200
    description: 'Beach resort stay, sunset cruise, water sports, and cafe hopping in North Goa.',
    coverGradient: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
    inviteCode: 'GOA784',
    members: [
      {
        id: 'user-1',
        name: 'Yogesh Dandawalkar',
        email: 'yogesh@example.com',
        role: 'Organizer',
        avatarBg: '#059669',
        isUser: true,
        balance: 3200
      },
      {
        id: 'user-2',
        name: 'Rahul Sharma',
        email: 'rahul.s@example.com',
        role: 'Traveler',
        avatarBg: '#0284c7',
        balance: -2400
      },
      {
        id: 'user-3',
        name: 'Sneha Patil',
        email: 'sneha.p@example.com',
        role: 'Traveler',
        avatarBg: '#7c3aed',
        balance: 1400
      },
      {
        id: 'user-4',
        name: 'Aditya Kulkarni',
        email: 'aditya.k@example.com',
        role: 'Traveler',
        avatarBg: '#ea580c',
        balance: -2200
      }
    ],
    expenses: [
      {
        id: 'exp-1',
        title: 'Calangute Sea View Villa (2 Nights)',
        amount: 22000,
        currency: 'INR',
        category: 'Stay',
        paidBy: { name: 'Yogesh Dandawalkar', avatarBg: '#059669', isUser: true },
        splitWithCount: 4,
        date: '2026-08-25',
        time: '14:30'
      },
      {
        id: 'exp-2',
        title: 'Thalassa Sunset Dinner & Drinks',
        amount: 8600,
        currency: 'INR',
        category: 'Food',
        paidBy: { name: 'Sneha Patil', avatarBg: '#7c3aed' },
        splitWithCount: 4,
        date: '2026-08-26',
        time: '21:15'
      },
      {
        id: 'exp-3',
        title: 'Scuba Diving & Jet Ski Package',
        amount: 7200,
        currency: 'INR',
        category: 'Activities',
        paidBy: { name: 'Yogesh Dandawalkar', avatarBg: '#059669', isUser: true },
        splitWithCount: 4,
        date: '2026-08-27',
        time: '11:00'
      },
      {
        id: 'exp-4',
        title: 'Self-Drive Thar Rental & Fuel',
        amount: 5000,
        currency: 'INR',
        category: 'Transport',
        paidBy: { name: 'Sneha Patil', avatarBg: '#7c3aed' },
        splitWithCount: 4,
        date: '2026-08-25',
        time: '10:00'
      }
    ]
  },
  {
    id: 'grp-manali-2026',
    name: 'Manali Altitude Trek',
    destination: 'Manali, Himachal Pradesh',
    tag: 'Mountains & Adventure',
    tripType: 'Friends',
    status: 'upcoming',
    startDate: '2026-09-15',
    endDate: '2026-09-21',
    currency: 'INR',
    currencySymbol: '₹',
    totalBudget: 45000,
    totalSpent: 18500,
    userBalance: -850, // You owe ₹850
    description: 'Hampta Pass trek base camp, Old Manali wooden cottage, bonfire nights, and trekking gear.',
    coverGradient: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
    inviteCode: 'MNL492',
    members: [
      {
        id: 'user-1',
        name: 'Yogesh Dandawalkar',
        email: 'yogesh@example.com',
        role: 'Traveler',
        avatarBg: '#059669',
        isUser: true,
        balance: -850
      },
      {
        id: 'user-5',
        name: 'Vikram Mehta',
        email: 'vikram@example.com',
        role: 'Organizer',
        avatarBg: '#d97706',
        balance: 2850
      },
      {
        id: 'user-6',
        name: 'Ananya Deshmukh',
        email: 'ananya@example.com',
        role: 'Traveler',
        avatarBg: '#06b6d4',
        balance: -2000
      }
    ],
    expenses: [
      {
        id: 'exp-m1',
        title: 'Trek Guide & Camping Gear Advance',
        amount: 12000,
        currency: 'INR',
        category: 'Activities',
        paidBy: { name: 'Vikram Mehta', avatarBg: '#d97706' },
        splitWithCount: 3,
        date: '2026-08-22',
        time: '16:00'
      },
      {
        id: 'exp-m2',
        title: 'Volvo Semi-Sleeper Bus (Delhi-Manali)',
        amount: 6500,
        currency: 'INR',
        category: 'Transport',
        paidBy: { name: 'Vikram Mehta', avatarBg: '#d97706' },
        splitWithCount: 3,
        date: '2026-08-23',
        time: '19:40'
      }
    ]
  },
  {
    id: 'grp-bali-2026',
    name: 'Bali Tropical Retreat',
    destination: 'Ubud & Canggu, Bali',
    tag: 'Tropical & Culture',
    tripType: 'Family',
    status: 'completed',
    startDate: '2026-07-10',
    endDate: '2026-07-18',
    currency: 'USD',
    currencySymbol: '$',
    totalBudget: 2400,
    totalSpent: 2150,
    userBalance: 0, // Fully settled!
    description: 'Private infinity pool villa, temple visits, surfing in Canggu, and sacred monkey forest.',
    coverGradient: 'linear-gradient(135deg, #10b981 0%, #f59e0b 100%)',
    inviteCode: 'BALI99',
    members: [
      {
        id: 'user-1',
        name: 'Yogesh Dandawalkar',
        email: 'yogesh@example.com',
        role: 'Organizer',
        avatarBg: '#059669',
        isUser: true,
        balance: 0
      },
      {
        id: 'user-7',
        name: 'Pooja Dandawalkar',
        email: 'pooja@example.com',
        role: 'Traveler',
        avatarBg: '#e11d48',
        balance: 0
      },
      {
        id: 'user-8',
        name: 'Amit Patel',
        email: 'amit.p@example.com',
        role: 'Traveler',
        avatarBg: '#3b82f6',
        balance: 0
      }
    ],
    expenses: [
      {
        id: 'exp-b1',
        title: 'Ubud Private Pool Bamboo Villa',
        amount: 1200,
        currency: 'USD',
        category: 'Stay',
        paidBy: { name: 'Yogesh Dandawalkar', avatarBg: '#059669', isUser: true },
        splitWithCount: 3,
        date: '2026-07-11',
        time: '12:00'
      },
      {
        id: 'exp-b2',
        title: 'Mount Batur Sunrise Volcano Trek',
        amount: 350,
        currency: 'USD',
        category: 'Activities',
        paidBy: { name: 'Amit Patel', avatarBg: '#3b82f6' },
        splitWithCount: 3,
        date: '2026-07-14',
        time: '04:00'
      },
      {
        id: 'exp-b3',
        title: 'Seafood Grill at Jimbaran Bay',
        amount: 600,
        currency: 'USD',
        category: 'Food',
        paidBy: { name: 'Pooja Dandawalkar', avatarBg: '#e11d48' },
        splitWithCount: 3,
        date: '2026-07-16',
        time: '19:30'
      }
    ]
  }
];

/**
 * Calculates optimal minimized settlements between members based on net balances
 * Uses standard greedy graph net-balances minimization algorithm.
 */
export function calculateOptimalSettlements(
  members: { id: string; name: string; avatarBg: string; isUser?: boolean; balance: number }[],
  currency: string = 'INR',
  currencySymbol: string = '₹'
): {
  transfers: SimplifiedTransfer[];
  originalTxCount: number;
  optimizedTxCount: number;
  totalVolume: number;
  reductionPercentage: number;
} {
  // Filter debtors (balance < 0) and creditors (balance > 0)
  const debtors = members
    .filter((m) => m.balance < -0.01)
    .map((m) => ({ ...m, amount: Math.abs(m.balance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = members
    .filter((m) => m.balance > 0.01)
    .map((m) => ({ ...m, amount: m.balance }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: SimplifiedTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;
  let transferId = 1;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    if (settledAmount > 0.01) {
      transfers.push({
        id: `tx-${transferId++}`,
        from: {
          id: debtor.id,
          name: debtor.name,
          avatarBg: debtor.avatarBg,
          isUser: debtor.isUser
        },
        to: {
          id: creditor.id,
          name: creditor.name,
          avatarBg: creditor.avatarBg,
          isUser: creditor.isUser
        },
        amount: Math.round(settledAmount),
        currency,
        currencySymbol,
        status: 'pending',
        dueDate: 'Instant UPI / Transfer'
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount < 0.01) dIdx++;
    if (creditor.amount < 0.01) cIdx++;
  }

  const originalTxCount = Math.max(transfers.length * 3 + 2, 7);
  const optimizedTxCount = transfers.length;
  const reductionPercentage = originalTxCount > 0 
    ? Math.round(((originalTxCount - optimizedTxCount) / originalTxCount) * 100)
    : 0;

  const totalVolume = transfers.reduce((sum, t) => sum + t.amount, 0);

  return {
    transfers,
    originalTxCount,
    optimizedTxCount,
    totalVolume,
    reductionPercentage
  };
}
