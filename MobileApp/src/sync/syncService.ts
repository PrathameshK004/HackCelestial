/**
 * Initial & Incremental Synchronization Service
 * Downloads authoritative server data into SQLite and marks as SYNCED
 */

import { groupService } from '../api/group.service';
import { tripRepo } from '../database/repositories/tripRepo';
import { expenseRepo } from '../database/repositories/expenseRepo';
import { memberRepo } from '../database/repositories/memberRepo';
import { settlementRepo } from '../database/repositories/settlementRepo';
import { getDatabase } from '../database/sqlite';
import { Trip, Participant, Expense, SettlementTransfer } from '../types';

type SyncListener = () => void;
const syncListeners: Set<SyncListener> = new Set();

export const syncService = {
  subscribe(listener: SyncListener): () => void {
    syncListeners.add(listener);
    return () => {
      syncListeners.delete(listener);
    };
  },

  notifyListeners(): void {
    syncListeners.forEach((l) => {
      try {
        l();
      } catch (_) {}
    });
  },

  /**
   * Initial synchronization run after authentication or manual refresh
   */
  async downloadServerData(): Promise<{ success: boolean; tripCount: number; error?: string }> {
    try {
      const res = await groupService.getMyGroups();
      if (res?.message === 'Unauthenticated') {
        throw new Error('Authentication required; cached trips were left unchanged.');
      }
      const rawServerGroups = res?.data || [];
      const seenGroupIds = new Set<string>();
      const serverGroups = rawServerGroups.filter((g: any) => {
        const id = String(g.id || g.group_id || '');
        if (!id || seenGroupIds.has(id)) return false;
        seenGroupIds.add(id);
        return true;
      });

      const db = getDatabase();

      db.withTransactionSync(() => {
        for (const g of serverGroups) {
          const tripId = String(g.id || g.group_id);
          const trip: Trip = {
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
            totalSpent: Number(g.totalSpent || 0),
            userBalance: Number(g.userBalance || 0),
            inviteCode: g.inviteCode || null,
            description: g.description || '',
            coverGradient: g.coverGradient || 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
            syncStatus: 'SYNCED',
            createdAt: g.createdAt || new Date().toISOString()
          };
          tripRepo.upsertTrip(trip);

          // Sync members if provided
          if (Array.isArray(g.travelers || g.members)) {
            const rawMembers = g.travelers || g.members;
            for (const m of rawMembers) {
              const member: Participant = {
                id: String(m.id || m.memberId || m.email),
                tripId,
                userId: m.userId || m.id,
                name: m.name || 'Traveler',
                email: m.email || '',
                role: m.role === 'Organizer' ? 'Organizer' : 'Traveler',
                avatarBg: m.avatarBg || '#059669',
                isUser: Boolean(m.isUser),
                balance: Number(m.balance || 0),
                status: (m.status || (m.role === 'Organizer' ? 'ACCEPTED' : 'PENDING')) as any,
                inviteCode: m.inviteCode || null,
                inviteUrl: m.inviteUrl || null,
                syncStatus: 'SYNCED'
              };
              memberRepo.upsertMember(member);
            }
          }
        }

        // Store sync timestamp
        db.runSync(`
          INSERT INTO sync_metadata (key, value, last_synced_at)
          VALUES ('last_sync', 'ok', ?)
          ON CONFLICT(key) DO UPDATE SET last_synced_at = excluded.last_synced_at
        `, [new Date().toISOString()]);
      });

      // Synchronize detailed expenses & authoritative members for all groups concurrently (Ultra-Fast Parallel Fetch)
      await Promise.all(
        serverGroups.map(async (g: any) => {
          const tripId = String(g.id || g.group_id);
          const [detailRes, expRes, settleRes] = await Promise.all([
            groupService.getGroupById(tripId).catch(() => null),
            groupService.getExpenses(tripId).catch(() => null),
            groupService.getSettlement(tripId).catch(() => null),
          ]);

          if (detailRes?.data?.members && Array.isArray(detailRes.data.members)) {
            for (const m of detailRes.data.members) {
              const member: Participant = {
                id: String(m.id || m.memberId || m.email),
                tripId,
                userId: m.userId || m.id,
                name: m.name || 'Traveler',
                email: m.email || '',
                role: m.role === 'Organizer' ? 'Organizer' : 'Traveler',
                avatarBg: m.avatarBg || '#059669',
                isUser: Boolean(m.isUser),
                balance: Number(m.balance || 0),
                status: (m.status || (m.role === 'Organizer' ? 'ACCEPTED' : 'PENDING')) as any,
                inviteCode: m.inviteCode || null,
                inviteUrl: m.inviteUrl || null,
                syncStatus: 'SYNCED'
              };
              memberRepo.upsertMember(member);
            }
          }

          if (Array.isArray(expRes?.data)) {
            const serverExpenseIds: string[] = [];
            for (const e of expRes.data) {
              serverExpenseIds.push(String(e.id));
              const createdAt = e.createdAt ? new Date(e.createdAt) : new Date();
              const exp: Expense = {
                id: String(e.id),
                tripId,
                title: e.description || e.title || 'Expense',
                description: e.description || '',
                amount: Number(e.amount || 0),
                currency: e.currency || 'INR',
                category: (e.category as any) || 'Food',
                paidById: String(e.paidByMemberId || e.paidById || e.paidBy?.id || ''),
                paidByName: e.paidByName || e.paidBy?.name || 'Member',
                splitModel: (e.splitModel as any) || 'EQUAL',
                splitCount: Number(e.splits?.length || e.splitCount || 1),
                paymentMethod: (e.paymentMethod as any) || 'CASH',
                paymentReference: e.paymentReference,
                date: e.date || createdAt.toISOString().split('T')[0],
                time: e.time || createdAt.toTimeString().slice(0, 5),
                syncStatus: 'SYNCED',
                verificationStatus: e.verificationStatus || 'VERIFIED',
                approvals: e.approvals || [],
                requiredApprovals: Number(e.requiredApprovals || 0)
              };
              const splits = (Array.isArray(e.splits) ? e.splits : []).map((split: any) => ({
                id: String(split.id),
                expenseId: exp.id,
                participantId: String(split.memberId || split.participantId),
                shareAmount: Number(split.computedAmount ?? split.shareAmount ?? 0),
                isOptedIn: split.shareType !== 'ACTIVITY_OPT_OUT',
                shareType: split.shareType || 'EQUAL_UNIT',
                shareValue: Number(split.shareValue ?? 1),
                syncStatus: 'SYNCED' as const
              }));
              expenseRepo.upsertServerExpense(exp, splits);
            }
            expenseRepo.reconcileServerExpenses(tripId, serverExpenseIds);
          }

          if (settleRes?.data?.transfers && Array.isArray(settleRes.data.transfers)) {
            for (const t of settleRes.data.transfers) {
              const st: SettlementTransfer = {
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
                dueDate: 'Settled',
                syncStatus: 'SYNCED',
              };
              settlementRepo.upsertSettlement(st);
            }
          }
        })
      );

      this.notifyListeners();
      return { success: true, tripCount: serverGroups.length };
    } catch (err: any) {
      console.warn('Initial data sync encountered error (offline fallback active):', err);
      return { success: false, tripCount: 0, error: err.message };
    }
  }
};
