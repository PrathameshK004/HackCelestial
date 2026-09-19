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

export const syncService = {
  /**
   * Initial synchronization run after authentication or manual refresh
   */
  async downloadServerData(): Promise<{ success: boolean; tripCount: number; error?: string }> {
    try {
      const res = await groupService.getMyGroups();
      const serverGroups = res?.data || [];

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

      // Synchronize detailed expenses & settlements for each group
      for (const g of serverGroups) {
        const tripId = String(g.id || g.group_id);
        try {
          const expRes = await groupService.getExpenses(tripId);
          if (Array.isArray(expRes?.data)) {
            for (const e of expRes.data) {
              const exp: Expense = {
                id: String(e.id),
                tripId,
                title: e.description || e.title || 'Expense',
                description: e.description || '',
                amount: Number(e.amount || 0),
                currency: e.currency || 'INR',
                category: (e.category as any) || 'Food',
                paidById: String(e.paidByMemberId || e.paidById || 'user-1'),
                paidByName: e.paidByName || 'Member',
                splitModel: (e.splitModel as any) || 'EQUAL',
                splitCount: Number(e.splitCount || 1),
                paymentMethod: (e.paymentMethod as any) || 'CASH',
                paymentReference: e.paymentReference,
                date: e.date || new Date().toISOString().split('T')[0],
                time: e.time || '12:00',
                syncStatus: 'SYNCED'
              };
              expenseRepo.addExpense(exp);
            }
          }
        } catch {
          // Continue if single group sub-query has transient error
        }

        try {
          const settleRes = await groupService.getSettlement(tripId);
          if (settleRes?.data?.settlementPlan?.transfers) {
            for (const t of settleRes.data.settlementPlan.transfers) {
              const st: SettlementTransfer = {
                id: String(t.id || `settle-${tripId}-${Math.random()}`),
                tripId,
                fromMemberId: String(t.fromMemberId || t.from?.id),
                fromMemberName: t.fromMemberName || t.from?.name || 'Debtor',
                toMemberId: String(t.toMemberId || t.to?.id),
                toMemberName: t.toMemberName || t.to?.name || 'Creditor',
                amount: Number(t.amount || 0),
                currency: t.currency || 'INR',
                currencySymbol: '₹',
                status: t.status === 'SETTLED' ? 'completed' : 'pending',
                dueDate: 'Instant UPI',
                syncStatus: 'SYNCED'
              };
              settlementRepo.upsertSettlement(st);
            }
          }
        } catch {
          // Continue
        }
      }

      return { success: true, tripCount: serverGroups.length };
    } catch (err: any) {
      console.warn('Initial data sync encountered error (offline fallback active):', err);
      return { success: false, tripCount: 0, error: err.message };
    }
  }
};
