/**
 * Trip Context (Direct Live Backend Architecture - Single Source of Truth)
 * Reads and mutates directly against live PostgreSQL backend database APIs.
 * Zero local database caching, zero sync queues.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Trip, Expense, Participant, SettlementTransfer, ExpenseParticipantSplit, CostSharingModel } from '../types';
import { groupService } from '../api/group.service';
import { useAuth } from './AuthContext';

interface TripContextType {
  trips: Trip[];
  selectedTrip: Trip | null;
  isLoading: boolean;
  selectTrip: (tripId: string) => void;
  clearSelectedTrip: () => void;
  refreshTrips: () => Promise<void>;
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
      participants?: Array<{
        memberId: string;
        shareType?: string;
        shareValue?: number;
        isOptedIn?: boolean;
      }>;
      splits?: ExpenseParticipantSplit[];
      paymentMethod: 'CASH' | 'UPI';
      paymentReference?: string;
      verificationStatus?: string;
      rawSmsProof?: string;
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
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch live groups directly from authoritative backend PostgreSQL database
  const loadTrips = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const res = await groupService.getMyGroups();
      const rawServerGroups = res?.data || [];
      
      const seenGroupIds = new Set<string>();
      const serverGroups = rawServerGroups.filter((g: any) => {
        const id = String(g.id || g.group_id || '');
        if (!id || seenGroupIds.has(id)) return false;
        seenGroupIds.add(id);
        return true;
      });

      // Fetch group details, expenses, and settlements concurrently in parallel
      const populatedTrips: Trip[] = await Promise.all(
        serverGroups.map(async (g: any) => {
          const tripId = String(g.id || g.group_id);
          const [detailRes, expRes, settleRes] = await Promise.all([
            groupService.getGroupById(tripId).catch(() => null),
            groupService.getExpenses(tripId).catch(() => null),
            groupService.getSettlement(tripId).catch(() => ({ data: null, settlementError: true })),
          ]);

          const detail = detailRes?.data || {};
          const expData = expRes?.data || [];
          const settleData = settleRes?.data || {};

          return mapServerGroupToTrip(
            g,
            detail,
            expData,
            settleData,
            user,
            Boolean(settleRes && 'settlementError' in settleRes && settleRes.settlementError)
          );
        })
      );

      setTrips(populatedTrips);
    } catch (e) {
      console.warn('Error fetching live trips from server:', e);
      setTrips([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
    ? trips.find((t) => t.id === selectedTripId) || null
    : null;

  // 1. ADD EXPENSE (Direct HTTP API request -> Live DB update)
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
      participants?: Array<{
        memberId: string;
        shareType?: string;
        shareValue?: number;
        isOptedIn?: boolean;
      }>;
      splits?: ExpenseParticipantSplit[];
      paymentMethod: 'CASH' | 'UPI';
      paymentReference?: string;
      verificationStatus?: string;
      rawSmsProof?: string;
    }
  ): Promise<void> => {
    const payloadParticipants = Array.isArray(expenseData.participants) && expenseData.participants.length > 0
      ? expenseData.participants
      : (Array.isArray(expenseData.splits) ? expenseData.splits.map((split) => ({
          memberId: split.participantId,
          shareType: split.shareType || 'EQUAL_UNIT',
          shareValue: split.shareValue ?? 1,
          isOptedIn: split.isOptedIn !== false,
        })) : []);

    await groupService.addExpense(tripId, {
      description: expenseData.title,
      amount: expenseData.amount,
      category: expenseData.category,
      splitModel: expenseData.splitModel,
      paidByMemberId: expenseData.paidById,
      paymentMethod: expenseData.paymentMethod,
      paymentReference: expenseData.paymentReference,
      participants: payloadParticipants,
      verificationStatus: expenseData.verificationStatus,
      rawSmsProof: expenseData.rawSmsProof,
    });

    await loadTrips();
  };

  // 2. DELETE EXPENSE (Direct HTTP DELETE)
  const deleteExpense = async (tripId: string, expenseId: string): Promise<void> => {
    await groupService.deleteExpense(tripId, expenseId);
    await loadTrips();
  };

  // 3. ADD MEMBER (Direct HTTP POST)
  const addMember = async (
    tripId: string,
    member: { name: string; email?: string; role?: 'Organizer' | 'Traveler' }
  ): Promise<void> => {
    await groupService.addGroupMember(tripId, {
      name: member.name,
      email: member.email || '',
      role: member.role || 'Traveler',
    });
    await loadTrips();
  };

  // 4. RECORD SETTLEMENT (Direct HTTP POST)
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
    await groupService.recordSettlement(tripId, {
      fromMemberId: s.fromMemberId,
      paidTo: s.toMemberId,
      amount: s.amount,
      remarks: s.remarks,
      paymentMethod: 'UPI',
    });
    await loadTrips();
  };

  // 5. CREATE TRIP (Direct HTTP POST -> Returns new Group ID)
  const createTrip = async (
    tripData: Partial<Trip> & { travelers?: Array<{ name: string; email: string; role?: string }> }
  ): Promise<string> => {
    const res = await groupService.createGroup({
      groupName: tripData.name || 'New Trip',
      destination: tripData.destination || 'Destination',
      startDate: tripData.startDate || null,
      endDate: tripData.endDate || null,
      tripType: tripData.tripType || 'Friends',
      currency: tripData.currency || 'INR',
      description: tripData.description || '',
      travelers: tripData.travelers || [],
    });

    const newGroupId = res?.data?.id || res?.data?.groupId;
    await loadTrips();
    return newGroupId;
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

function mapServerGroupToTrip(g: any, detail: any, expData: any[], settleData: any, currentUser: any, settlementError = false): Trip {
  const tripId = String(g.id || g.group_id);

  // Build a netBalance lookup from server settlement data (members array)
  const settleMemberMap = new Map<string, any>();
  if (Array.isArray(settleData?.members)) {
    for (const sm of settleData.members) {
      // Server memberSummaries use 'id' field
      const key = String(sm.id || sm.memberId || '');
      if (key) settleMemberMap.set(key, sm);
    }
  }

  const members: Participant[] = (detail?.members || g.travelers || g.members || []).map((m: any) => {
    const mKey = String(m.id || m.memberId || m.email);
    const isUser = Boolean(
      m.isUser ||
      (currentUser && String(m.userId || m.user_id || '') === String(currentUser.id || '')) ||
      (currentUser && m.email && String(m.email).toLowerCase() === String(currentUser.email || currentUser.emailId || '').toLowerCase())
    );
    const sm = settleMemberMap.get(mKey);
    // Prefer server-computed netBalance; fall back to group-level balance
    const balance = sm?.netBalance !== undefined
      ? Number(sm.netBalance)
      : Number(m.balance || m.netBalance || 0);
    return {
      id: mKey,
      tripId,
      userId: m.userId || m.user_id || m.id,
      name: m.name || 'Traveler',
      email: m.email || '',
      role: m.role === 'Organizer' ? 'Organizer' : 'Traveler',
      avatarBg: m.avatarBg || m.avatar_bg || '#059669',
      isUser,
      balance,
      status: (m.status || (m.role === 'Organizer' ? 'ACCEPTED' : 'PENDING')) as any,
      inviteCode: m.inviteCode || null,
      syncStatus: 'SYNCED',
    };
  });

  // Deduplicate expenses strictly so each has a unique ID and only 1 entry exists
  const seenExpIds = new Set<string>();
  const seenExpFingerprints = new Set<string>();
  const uniqueExpData = (expData || []).filter((e: any) => {
    const eid = String(e?.id || '');
    if (!eid || seenExpIds.has(eid)) return false;

    const timeKey = e.createdAt ? Math.floor(new Date(e.createdAt).getTime() / 15000) : 0;
    const fp = `${(e.description || e.title || '').trim().toLowerCase()}_${Number(e.amount || 0)}_${e.paidById || e.paidByMemberId || ''}_${timeKey}`;
    if (timeKey > 0 && seenExpFingerprints.has(fp)) return false;

    seenExpIds.add(eid);
    if (timeKey > 0) seenExpFingerprints.add(fp);
    return true;
  });

  const expenses: Expense[] = uniqueExpData.map((e: any) => ({
    id: String(e.id || `exp-${tripId}-${Date.now()}-${Math.random()}`),
    tripId,
    title: e.description || e.title || 'Expense',
    description: e.description || '',
    amount: Number(e.amount || 0),
    currency: e.currency || 'INR',
    category: (e.category as any) || 'Food',
    paidById: String(e.paidById || e.paidByMemberId || 'user-1'),
    paidByName: e.paidByName || e.paidBy?.name || 'Member',
    splitModel: (e.splitModel as any) || 'EQUAL',
    splitCount: Number(e.splitCount || 1),
    paymentMethod: (e.paymentMethod as any) || 'CASH',
    paymentReference: e.paymentReference,
    date: e.date || (e.createdAt ? e.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    time: e.time || (e.createdAt ? e.createdAt.split('T')[1]?.slice(0, 5) : '12:00'),
    syncStatus: 'SYNCED',
    splits: e.splits || [],
    // Verification & 60% consensus approval fields
    verificationStatus: e.verificationStatus || 'VERIFIED',
    approvals: Array.isArray(e.approvals) ? e.approvals : [],
    requiredApprovals: Number(e.requiredApprovals || 0),
    rawSmsProof: e.rawSmsProof || null,
  }));

  // Map settlements audit log from server response (recorded peer-to-peer payments)
  const settlements: SettlementTransfer[] = (settleData?.settlements || []).map((t: any) => ({
    id: String(t.id || `settle-${tripId}-${Math.random()}`),
    tripId,
    fromMemberId: String(t.fromMemberId || t.from_member_id || t.from?.id || ''),
    fromMemberName: t.fromName || t.fromMemberName || t.from?.name || 'Debtor',
    toMemberId: String(t.toMemberId || t.to_member_id || t.to?.id || ''),
    toMemberName: t.toName || t.toMemberName || t.to?.name || 'Creditor',
    amount: Number(t.amount || 0),
    currency: t.currency || 'INR',
    currencySymbol: '₹',
    status: 'completed' as const,
    paymentMethod: t.paymentMethod || t.payment_method || 'UPI',
    paymentReference: t.paymentReference || t.payment_reference,
    remarks: t.remarks || 'Settled',
    dueDate: t.settledAt || t.settled_at || 'Settled',
    syncStatus: 'SYNCED' as const,
    createdAt: t.settledAt || t.settled_at,
  }));

  return {
    id: tripId,
    name: g.groupName || g.name || 'Trip',
    destination: g.destination || 'Destination',
    tripType: g.tripType || 'Friends',
    status: g.status === 'SETTLED' ? 'completed' : 'active',
    startDate: g.startDate || null,
    endDate: g.endDate || null,
    currency: g.currency || 'INR',
    currencySymbol: g.currencySymbol || '₹',
    totalBudget: Number(g.totalBudget || 0),
    totalSpent: Number(settleData?.totalSpend !== undefined ? settleData.totalSpend : (g.totalSpent || 0)),
    userBalance: Number(
      members.find((m) => m.isUser)?.balance ?? g.userBalance ?? 0
    ),
    inviteCode: detail?.inviteCode || g.inviteCode || null,
    createdBy: detail?.createdBy || g.createdBy || null,
    description: g.description || '',
    coverGradient: g.coverGradient || 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
    syncStatus: 'SYNCED',
    createdAt: g.createdAt || new Date().toISOString(),
    members,
    expenses,
    settlements,
    settlementError,
  };
}
