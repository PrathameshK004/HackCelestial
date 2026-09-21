/**
 * Trip Context (Local SQLite-First Architecture)
 * Instant local updates -> SQLite persistence -> Ledger recomputation -> Sync queue
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Trip, Expense, Participant, SettlementTransfer, ExpenseParticipantSplit, CostSharingModel } from '../types';
import { tripRepo } from '../database/repositories/tripRepo';
import { expenseRepo } from '../database/repositories/expenseRepo';
import { memberRepo } from '../database/repositories/memberRepo';
import { settlementRepo } from '../database/repositories/settlementRepo';
import { syncQueueRepo } from '../database/repositories/syncQueueRepo';
import { ledgerEngine } from '../sync/ledgerEngine';
import { syncEngine } from '../sync/syncEngine';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface TripContextType {
  trips: Trip[];
  selectedTrip: Trip | null;
  isLoading: boolean;
  selectTrip: (tripId: string) => void;
  clearSelectedTrip: () => void;
  refreshTrips: () => void;
  addExpense: (
    tripId: string,
    expenseData: {
      title: string;
      description?: string;
      amount: number;
      category: 'Stay' | 'Food' | 'Transport' | 'Activities' | 'Supplies' | 'Other';
      paidById: string;
      paidByName: string;
      splitModel: CostSharingModel;
      splits?: ExpenseParticipantSplit[];
      paymentMethod: 'CASH' | 'UPI';
      paymentReference?: string;
    }
  ) => Promise<void>;
  deleteExpense: (tripId: string, expenseId: string) => Promise<void>;
  addMember: (tripId: string, member: { name: string; email?: string; role?: 'Organizer' | 'Traveler' }) => Promise<void>;
  recordSettlement: (
    tripId: string,
    settlement: {
      fromMemberId: string;
      fromMemberName: string;
      toMemberId: string;
      toMemberName: string;
      toUpiId?: string;
      amount: number;
      remarks?: string;
    }
  ) => Promise<void>;
  createTrip: (tripData: Partial<Trip> & { travelers?: Array<{ name: string; email: string; role?: string }> }) => Promise<string>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load trips from SQLite database & strictly deduplicate
  const loadTrips = useCallback(() => {
    try {
      const allTrips = tripRepo.getAllTrips();
      // Populate details for each
      const populated = allTrips.map((t) => tripRepo.getTripById(t.id) || t);
      
      // Strict deduplication by unique trip id to prevent redundant trips in any section
      const seen = new Set<string>();
      const uniqueTrips: Trip[] = [];
      for (const t of populated) {
        if (t && t.id && !seen.has(t.id)) {
          seen.add(t.id);
          uniqueTrips.push(t);
        }
      }
      setTrips(uniqueTrips);
    } catch (e) {
      console.warn('Error loading trips from SQLite:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const selectTrip = (tripId: string) => {
    setSelectedTripId(tripId);
  };

  const clearSelectedTrip = () => {
    setSelectedTripId(null);
  };

  const selectedTrip = selectedTripId
    ? trips.find((t) => t.id === selectedTripId) || tripRepo.getTripById(selectedTripId)
    : null;

  // 1. ADD EXPENSE (Offline-First: SQLite -> UI -> Sync Queue)
  const addExpense = async (
    tripId: string,
    expenseData: {
      title: string;
      description?: string;
      amount: number;
      category: 'Stay' | 'Food' | 'Transport' | 'Activities' | 'Supplies' | 'Other';
      paidById: string;
      paidByName: string;
      splitModel: CostSharingModel;
      splits?: ExpenseParticipantSplit[];
      paymentMethod: 'CASH' | 'UPI';
      paymentReference?: string;
    }
  ): Promise<void> => {
    const localExpId = 'local_exp_' + Date.now();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().substring(0, 5);

    const newExpense: Expense = {
      id: localExpId,
      tripId,
      title: expenseData.title,
      description: expenseData.description || expenseData.title,
      amount: expenseData.amount,
      currency: 'INR',
      category: expenseData.category,
      paidById: expenseData.paidById,
      paidByName: expenseData.paidByName,
      splitModel: expenseData.splitModel,
      splitCount: expenseData.splits?.length || 1,
      paymentMethod: expenseData.paymentMethod,
      paymentReference: expenseData.paymentReference,
      date: dateStr,
      time: timeStr,
      syncStatus: 'PENDING',
      splits: expenseData.splits,
    };

    // 1. Write to SQLite
    expenseRepo.addExpense(newExpense, expenseData.splits || []);

    // 2. Recalculate balances locally
    const currentMembers = memberRepo.getMembersByTrip(tripId);
    const currentExpenses = expenseRepo.getExpensesByTrip(tripId);
    const currentSettlements = settlementRepo.getSettlementsByTrip(tripId);
    const recalculatedBalances = ledgerEngine.recalculateBalances(currentMembers, currentExpenses, currentSettlements);

    // 3. Update SQLite balances
    memberRepo.updateBalances(tripId, recalculatedBalances);

    // 4. Enqueue Sync Operation
    syncQueueRepo.enqueue({
      entityType: 'EXPENSE',
      entityId: localExpId,
      operation: 'CREATE',
      endpoint: `/groups/${tripId}/expenses`,
      httpMethod: 'POST',
      payload: JSON.stringify({
        description: expenseData.title,
        amount: expenseData.amount,
        category: expenseData.category,
        splitModel: expenseData.splitModel,
        paidByMemberId: expenseData.paidById,
        paymentMethod: expenseData.paymentMethod,
        paymentReference: expenseData.paymentReference,
      }),
    });

    // 5. Update local React state instantly (0ms delay)
    loadTrips();

    // 6. Trigger background queue attempt
    syncEngine.processQueue();
  };

  // 2. DELETE EXPENSE
  const deleteExpense = async (tripId: string, expenseId: string): Promise<void> => {
    // 1. Delete from SQLite
    expenseRepo.deleteExpense(expenseId, tripId);

    // 2. Recalculate
    const currentMembers = memberRepo.getMembersByTrip(tripId);
    const currentExpenses = expenseRepo.getExpensesByTrip(tripId);
    const currentSettlements = settlementRepo.getSettlementsByTrip(tripId);
    const recalculatedBalances = ledgerEngine.recalculateBalances(currentMembers, currentExpenses, currentSettlements);
    memberRepo.updateBalances(tripId, recalculatedBalances);

    // 3. Enqueue Sync
    if (!expenseId.startsWith('local_exp_')) {
      syncQueueRepo.enqueue({
        entityType: 'EXPENSE',
        entityId: expenseId,
        operation: 'DELETE',
        endpoint: `/groups/${tripId}/expenses/${expenseId}`,
        httpMethod: 'DELETE',
        payload: JSON.stringify({}),
      });
    }

    // 4. Update UI state
    loadTrips();
    syncEngine.processQueue();
  };

  // 3. ADD MEMBER
  const addMember = async (
    tripId: string,
    member: { name: string; email?: string; role?: 'Organizer' | 'Traveler' }
  ): Promise<void> => {
    const memberId = 'm_' + Date.now();
    const newMember: Participant = {
      id: memberId,
      tripId,
      name: member.name,
      email: member.email || '',
      role: member.role || 'Traveler',
      avatarBg: ['#059669', '#0284c7', '#7c3aed', '#ea580c', '#ec4899'][Math.floor(Math.random() * 5)],
      isUser: false,
      balance: 0,
      syncStatus: 'PENDING',
    };

    memberRepo.upsertMember(newMember);

    syncQueueRepo.enqueue({
      entityType: 'MEMBER',
      entityId: memberId,
      operation: 'CREATE',
      endpoint: `/groups/${tripId}/members`,
      httpMethod: 'POST',
      payload: JSON.stringify({
        name: member.name,
        email: member.email,
        role: member.role,
        avatarBg: newMember.avatarBg,
      }),
    });

    loadTrips();
    syncEngine.processQueue();
  };

  // 4. RECORD SETTLEMENT
  const recordSettlement = async (
    tripId: string,
    s: {
      fromMemberId: string;
      fromMemberName: string;
      toMemberId: string;
      toMemberName: string;
      toUpiId?: string;
      amount: number;
      remarks?: string;
    }
  ): Promise<void> => {
    const settleId = 'settle_' + Date.now();
    const settlement: SettlementTransfer = {
      id: settleId,
      tripId,
      fromMemberId: s.fromMemberId,
      fromMemberName: s.fromMemberName,
      toMemberId: s.toMemberId,
      toMemberName: s.toMemberName,
      toUpiId: s.toUpiId,
      amount: s.amount,
      currency: 'INR',
      currencySymbol: '₹',
      status: 'completed',
      paymentMethod: 'UPI',
      remarks: s.remarks,
      dueDate: 'Instant UPI',
      syncStatus: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    settlementRepo.upsertSettlement(settlement);

    // Recalculate
    const currentMembers = memberRepo.getMembersByTrip(tripId);
    const currentExpenses = expenseRepo.getExpensesByTrip(tripId);
    const currentSettlements = settlementRepo.getSettlementsByTrip(tripId);
    const recalculatedBalances = ledgerEngine.recalculateBalances(currentMembers, currentExpenses, currentSettlements);
    memberRepo.updateBalances(tripId, recalculatedBalances);

    syncQueueRepo.enqueue({
      entityType: 'SETTLEMENT',
      entityId: settleId,
      operation: 'CREATE',
      endpoint: `/groups/${tripId}/settlements`,
      httpMethod: 'POST',
      payload: JSON.stringify({
        fromMemberId: s.fromMemberId,
        paidTo: s.toMemberId,
        amount: s.amount,
        remarks: s.remarks,
        paymentMethod: 'UPI',
      }),
    });

    loadTrips();
    syncEngine.processQueue();
  };

  // 5. CREATE TRIP
  const createTrip = async (
    tripData: Partial<Trip> & { travelers?: Array<{ name: string; email: string; role?: string }> }
  ): Promise<string> => {
    const tripId = generateUUID();
    const newTrip: Trip = {
      id: tripId,
      name: tripData.name || 'New Trip',
      destination: tripData.destination || 'Destination',
      tripType: tripData.tripType || 'Friends',
      status: 'active',
      startDate: tripData.startDate || null as any,
      endDate: tripData.endDate || null as any,
      currency: tripData.currency || 'INR',
      currencySymbol: tripData.currencySymbol || '₹',
      totalBudget: tripData.totalBudget || 50000,
      totalSpent: 0,
      userBalance: 0,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      description: tripData.description || '',
      coverGradient: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
      syncStatus: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    tripRepo.upsertTrip(newTrip);

    // Add current user as organizer
    memberRepo.upsertMember({
      id: 'user-1',
      tripId,
      name: 'Yogesh Dandawalkar',
      email: 'yogesh@example.com',
      role: 'Organizer',
      avatarBg: '#059669',
      isUser: true,
      balance: 0,
      syncStatus: 'PENDING',
    });

    // Add other travelers
    if (tripData.travelers) {
      tripData.travelers.forEach((t, i) => {
        memberRepo.upsertMember({
          id: `traveler_${Date.now()}_${i}`,
          tripId,
          name: t.name,
          email: t.email,
          role: (t.role as any) || 'Traveler',
          avatarBg: ['#0284c7', '#7c3aed', '#ea580c', '#ec4899'][i % 4],
          isUser: false,
          balance: 0,
          syncStatus: 'PENDING',
        });
      });
    }

    syncQueueRepo.enqueue({
      entityType: 'TRIP',
      entityId: tripId,
      operation: 'CREATE',
      endpoint: '/groups',
      httpMethod: 'POST',
      payload: JSON.stringify({
        groupName: newTrip.name,
        destination: newTrip.destination,
        startDate: newTrip.startDate,
        endDate: newTrip.endDate,
        tripType: newTrip.tripType,
        currency: newTrip.currency,
        description: newTrip.description,
        travelers: tripData.travelers || [],
      }),
    });

    loadTrips();
    syncEngine.processQueue();
    return tripId;
  };

  return (
    <TripContext.Provider
      value={{
        trips,
        selectedTrip,
        isLoading,
        selectTrip,
        clearSelectedTrip,
        refreshTrips: loadTrips,
        addExpense,
        deleteExpense,
        addMember,
        recordSettlement,
        createTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrips = (): TripContextType => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrips must be used within a TripProvider');
  }
  return context;
};
