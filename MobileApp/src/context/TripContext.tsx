/**
 * Trip Context (Direct Live Backend Architecture - Single Source of Truth)
 * Reads and mutates directly against live PostgreSQL backend database APIs.
 * Zero local database caching, zero sync queues.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { Trip, Expense, Participant, SettlementTransfer, ExpenseParticipantSplit, CostSharingModel } from '../types';
import { groupService } from '../api/group.service';
import { useAuth } from './AuthContext';
import { tripRepo } from '../database/repositories/tripRepo';
import { expenseRepo } from '../database/repositories/expenseRepo';
import { syncService } from '../sync/syncService';
import { syncEngine } from '../sync/syncEngine';
import { ledgerEngine } from '../sync/ledgerEngine';
import { useSync } from './SyncContext';

interface TripContextType {
  trips: Trip[];
  selectedTrip: Trip | null;
  isLoading: boolean;
  loadError: string | null;
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
      paymentMethod?: 'CASH' | 'UPI';
      paymentReference?: string;
    }
  ) => Promise<void>;
  createTrip: (tripData: Partial<Trip> & { travelers?: Array<{ name: string; email: string; role?: string }> }) => Promise<string>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch live groups directly from authoritative backend PostgreSQL database
  const loadTrips = useCallback(async (): Promise<void> => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      setTrips([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await groupService.getMyGroups();
      const rawServerGroups = Array.isArray(res?.data) ? res.data : [];
      
      const seenGroupIds = new Set<string>();
      const serverGroups = rawServerGroups.filter((g: any) => {
        const id = String(g.id || g.group_id || '');
        if (!id || seenGroupIds.has(id)) return false;
        seenGroupIds.add(id);
        return true;
      });
    setTrips(localTrips);
  };

      // Fetch group details, expenses, and settlements concurrently in parallel
      const populatedTrips: Trip[] = await Promise.all(
        serverGroups.map(async (g: any) => {
          const tripId = String(g.id || g.group_id);
          const [detailRes, expRes, settleRes] = await Promise.all([
            groupService.getGroupById(tripId),
            groupService.getExpenses(tripId),
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
      const error = e as Error & { status?: number };
      setLoadError(error.status === 401 || error.status === 403
        ? 'Your session could not be verified. Please sign in again to load your trips.'
        : error.message || 'Could not connect to the server. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, isAuthLoading]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  useEffect(() => syncService.subscribe(() => {
    try {
      publishLocalTrips();
    } catch (error) {
      console.warn('Could not read locally cached trips:', error);
    }
  }), []);

  const selectTrip = (tripId: string) => {
    setSelectedTripId(tripId);
  };

  const clearSelectedTrip = () => {
    setSelectedTripId(null);
  };

  const selectedTrip = selectedTripId
    ? trips.find((t) => t.id === selectedTripId) || null
    : null;

  // Persist locally first, then let the durable outbox deliver the expense.
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

    const trip = tripRepo.getTripById(tripId);
    if (!trip) throw new Error('Trip is not available on this device. Connect to the internet and try again.');

    const acceptedMembers = (trip.members || []).filter((member) => member.role === 'Organizer' || member.status === 'ACCEPTED');
    if (!acceptedMembers.some((member) => String(member.id) === String(expenseData.paidById))) {
      throw new Error('The selected payer is not a confirmed member in the cached trip. Sync the trip and try again.');
    }
    if (payloadParticipants.some((participant) => !acceptedMembers.some((member) => String(member.id) === String(participant.memberId)))) {
      throw new Error('Every expense participant must be a confirmed trip member. Sync the trip and try again.');
    }

    const expenseId = Crypto.randomUUID();
    const now = new Date();
    const selectedParticipants = payloadParticipants.length > 0
      ? payloadParticipants
      : acceptedMembers.map((member) => ({ memberId: member.id, shareType: 'EQUAL_UNIT', shareValue: 1, isOptedIn: true }));
    const shares = calculateLocalShares(expenseData.amount, expenseData.splitModel, selectedParticipants);

    const expense: Expense = {
      id: expenseId,
      tripId,
      title: expenseData.title,
      description: expenseData.description || expenseData.title,
      amount: expenseData.amount,
      currency: trip.currency || 'INR',
      category: expenseData.category,
      paidById: expenseData.paidById,
      paidByName: expenseData.paidByName,
      splitModel: expenseData.splitModel,
      splitCount: selectedParticipants.length || 1,
      paymentMethod: expenseData.paymentMethod,
      paymentReference: expenseData.paymentReference,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      syncStatus: 'PENDING',
      verificationStatus: (expenseData.verificationStatus as Expense['verificationStatus']) || 'VERIFIED',
      rawSmsProof: expenseData.rawSmsProof
    };
    const splits: ExpenseParticipantSplit[] = selectedParticipants.map((participant) => ({
      id: Crypto.randomUUID(),
      expenseId,
      participantId: String(participant.memberId),
      shareAmount: shares.get(String(participant.memberId)) || 0,
      isOptedIn: participant.isOptedIn !== false,
      shareType: participant.shareType || 'EQUAL_UNIT',
      shareValue: participant.shareValue ?? 1,
      syncStatus: 'PENDING'
    }));
    const payload = {
      description: expenseData.title,
      amount: expenseData.amount,
      category: expenseData.category,
      currency: expense.currency,
      splitModel: expenseData.splitModel,
      paidByMemberId: expenseData.paidById,
      paymentMethod: expenseData.paymentMethod,
      paymentReference: expenseData.paymentReference,
      participants: payloadParticipants,
      verificationStatus: expenseData.verificationStatus,
      rawSmsProof: expenseData.rawSmsProof,
    };

    expenseRepo.addExpense(expense, splits, {
      entityType: 'EXPENSE',
      entityId: expenseId,
      operation: 'CREATE',
      endpoint: `/groups/${tripId}/expenses`,
      httpMethod: 'POST',
      payload: JSON.stringify(payload),
      idempotencyKey: expenseId
    });
    syncService.notifyListeners();
    syncEngine.processQueue().catch(() => {});
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
      paymentMethod?: 'CASH' | 'UPI';
      paymentReference?: string;
    }
  ): Promise<void> => {
    const currency = trips.find((trip) => trip.id === tripId)?.currency || 'INR';
    await groupService.recordSettlement(tripId, {
      fromMemberId: s.fromMemberId,
      paidTo: s.toMemberId,
      amount: s.amount,
      currency,
      remarks: s.remarks,
      paymentMethod: s.paymentMethod || 'UPI',
      paymentReference: s.paymentReference,
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
        loadError,
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

function calculateLocalShares(
  amount: number,
  splitModel: CostSharingModel,
  participants: Array<{ memberId: string; shareType?: string; shareValue?: number; isOptedIn?: boolean }>
): Map<string, number> {
  const total = Math.round((amount + Number.EPSILON) * 100) / 100;
  const shares = new Map<string, number>();
  const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  if (participants.length === 0) return shares;

  if (splitModel === 'ORGANIZER_PAID') {
    participants.forEach((participant) => shares.set(String(participant.memberId), 0));
    return shares;
  }

  if (splitModel === 'PARTICIPANT_BASED') {
    const isPercentage = participants.some((participant) => participant.shareType === 'PERCENTAGE');
    let distributed = 0;
    participants.forEach((participant, index) => {
      const value = Number(participant.shareValue || 0);
      const share = isPercentage
        ? index === participants.length - 1 ? round2(total - distributed) : round2((total * value) / 100)
        : round2(value);
      shares.set(String(participant.memberId), share);
      if (isPercentage && index !== participants.length - 1) distributed = round2(distributed + share);
    });
    return shares;
  }

  if (splitModel === 'ROOM_SHARE') {
    const units = participants.map((participant) => Number(participant.shareValue) > 0 ? Number(participant.shareValue) : 1);
    const totalUnits = units.reduce((sum, value) => sum + value, 0);
    let distributed = 0;
    participants.forEach((participant, index) => {
      const share = index === participants.length - 1
        ? round2(total - distributed)
        : round2((total * units[index]) / totalUnits);
      shares.set(String(participant.memberId), share);
      if (index !== participants.length - 1) distributed = round2(distributed + share);
    });
    return shares;
  }

  if (splitModel === 'EQUAL') {
    const baseCents = Math.floor((total * 100) / participants.length);
    const remainderCents = Math.round((total - (baseCents / 100) * participants.length) * 100);
    participants.forEach((participant, index) => {
      const receivesRemainder = index >= participants.length - remainderCents;
      shares.set(String(participant.memberId), (baseCents + (receivesRemainder ? 1 : 0)) / 100);
    });
    return shares;
  }

  const liable = splitModel === 'ACTIVITY_BASED'
    ? participants.filter((participant) => participant.isOptedIn !== false && (participant.shareValue === undefined || Number(participant.shareValue) > 0))
    : participants;
  const baseCents = liable.length > 0 ? Math.floor((total * 100) / liable.length) : 0;
  let remainingCents = liable.length > 0 ? Math.round((total - (baseCents / 100) * liable.length) * 100) : 0;
  participants.forEach((participant) => {
    const isLiable = liable.some((entry) => String(entry.memberId) === String(participant.memberId));
    if (!isLiable) {
      shares.set(String(participant.memberId), 0);
      return;
    }
    const share = (baseCents + (remainingCents > 0 ? 1 : 0)) / 100;
    if (remainingCents > 0) remainingCents--;
    shares.set(String(participant.memberId), share);
  });
  return shares;
}

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
    packageReservations: detail?.packageReservations || [],
    restaurantReservations: detail?.restaurantReservations || [],
    settlementError,
  };
}
