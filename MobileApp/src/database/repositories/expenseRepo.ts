/**
 * Expense Repository (SQLite Local Database)
 */

import { getDatabase } from '../sqlite';
import { Expense, ExpenseParticipantSplit, SyncQueueItem } from '../../types';
import { syncQueueRepo } from './syncQueueRepo';

export const expenseRepo = {
  getExpensesByTrip(tripId: string): Expense[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      'SELECT * FROM expenses WHERE trip_id = ? ORDER BY date DESC, time DESC',
      [tripId]
    );
    return rows.map((r) => ({
      id: r.id,
      tripId: r.trip_id,
      title: r.title,
      description: r.description,
      amount: Number(r.amount || 0),
      currency: r.currency,
      category: r.category,
      paidById: r.paid_by_id,
      paidByName: r.paid_by_name,
      splitModel: r.split_model,
      splitCount: Number(r.split_count || 1),
      paymentMethod: r.payment_method,
      paymentReference: r.payment_reference,
      verificationStatus: r.verification_status || 'VERIFIED',
      approvals: JSON.parse(r.approvals_json || '[]'),
      requiredApprovals: Number(r.required_approvals || 0),
      rawSmsProof: r.raw_sms_proof || undefined,
      date: r.date,
      time: r.time,
      syncStatus: r.sync_status,
      splits: db.getAllSync<any>('SELECT * FROM expense_participants WHERE expense_id = ?', [r.id]).map((s) => ({
        id: s.id,
        expenseId: s.expense_id,
        participantId: s.participant_id,
        shareAmount: Number(s.share_amount || 0),
        isOptedIn: Boolean(s.is_opted_in),
        shareType: s.share_type,
        shareValue: s.share_value ? Number(s.share_value) : undefined,
        syncStatus: s.sync_status
      }))
    }));
  },

  addExpense(
    expense: Expense,
    splits: ExpenseParticipantSplit[] = [],
    queueItem?: Omit<SyncQueueItem, 'id' | 'retryCount' | 'maxRetries' | 'status' | 'createdAt' | 'updatedAt'>
  ): void {
    const db = getDatabase();
    db.withTransactionSync(() => {
      db.runSync(`
        INSERT INTO expenses (id, trip_id, title, description, amount, currency, category, paid_by_id, paid_by_name, split_model, split_count, payment_method, payment_reference, verification_status, approvals_json, required_approvals, raw_sms_proof, date, time, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title,
          description=excluded.description,
          amount=excluded.amount,
          currency=excluded.currency,
          category=excluded.category,
          paid_by_id=excluded.paid_by_id,
          paid_by_name=excluded.paid_by_name,
          split_model=excluded.split_model,
          split_count=excluded.split_count,
          payment_method=excluded.payment_method,
          payment_reference=excluded.payment_reference,
          verification_status=excluded.verification_status,
          approvals_json=excluded.approvals_json,
          required_approvals=excluded.required_approvals,
          raw_sms_proof=excluded.raw_sms_proof,
          date=excluded.date,
          time=excluded.time,
          sync_status=excluded.sync_status
      `, [
        expense.id,
        expense.tripId,
        expense.title,
        expense.description || expense.title,
        expense.amount,
        expense.currency || 'INR',
        expense.category || 'Food',
        expense.paidById,
        expense.paidByName,
        expense.splitModel || 'EQUAL',
        expense.splitCount || 1,
        expense.paymentMethod || 'CASH',
        expense.paymentReference || null,
        expense.verificationStatus || 'VERIFIED',
        JSON.stringify(expense.approvals || []),
        expense.requiredApprovals || 0,
        expense.rawSmsProof || null,
        expense.date,
        expense.time,
        expense.syncStatus || 'PENDING'
      ]);

      // Remove existing splits if updating
      db.runSync('DELETE FROM expense_participants WHERE expense_id = ?', [expense.id]);

      // Insert individual splits
      for (const s of splits) {
        db.runSync(`
          INSERT INTO expense_participants (id, expense_id, participant_id, share_amount, is_opted_in, share_type, share_value, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          s.id,
          expense.id,
          s.participantId,
          s.shareAmount,
          s.isOptedIn ? 1 : 0,
          s.shareType || 'EQUAL_UNIT',
          s.shareValue ?? null,
          s.syncStatus || 'PENDING'
        ]);
      }

      // Update trip total spent in SQLite
      const sumRow = db.getFirstSync<{ total: number }>(
        'SELECT SUM(amount) as total FROM expenses WHERE trip_id = ?',
        [expense.tripId]
      );
      const newTotal = sumRow ? Number(sumRow.total || 0) : expense.amount;
      db.runSync('UPDATE trips SET total_spent = ? WHERE id = ?', [newTotal, expense.tripId]);

      if (queueItem) {
        syncQueueRepo.enqueue(queueItem);
      }
    });
  },

  upsertServerExpense(expense: Expense, splits: ExpenseParticipantSplit[] = []): void {
    const db = getDatabase();
    const local = db.getFirstSync<{ sync_status: string }>(
      'SELECT sync_status FROM expenses WHERE id = ?',
      [expense.id]
    );
    if (local && local.sync_status !== 'SYNCED') return;
    this.addExpense({ ...expense, syncStatus: 'SYNCED' }, splits);
  },

  recalculateTripTotal(tripId: string): void {
    const db = getDatabase();
    const row = db.getFirstSync<{ total: number | null }>(
      'SELECT SUM(amount) as total FROM expenses WHERE trip_id = ?',
      [tripId]
    );
    db.runSync('UPDATE trips SET total_spent = ? WHERE id = ?', [Number(row?.total || 0), tripId]);
  },

  reconcileServerExpenses(tripId: string, serverExpenseIds: string[]): void {
    const db = getDatabase();
    db.withTransactionSync(() => {
      const localRows = db.getAllSync<{ id: string }>(
        "SELECT id FROM expenses WHERE trip_id = ? AND sync_status = 'SYNCED'",
        [tripId]
      );
      const serverIds = new Set(serverExpenseIds);
      for (const row of localRows) {
        if (!serverIds.has(row.id)) {
          db.runSync('DELETE FROM expense_participants WHERE expense_id = ?', [row.id]);
          db.runSync('DELETE FROM expenses WHERE id = ?', [row.id]);
        }
      }
      const total = db.getFirstSync<{ total: number | null }>(
        'SELECT SUM(amount) as total FROM expenses WHERE trip_id = ?',
        [tripId]
      );
      db.runSync('UPDATE trips SET total_spent = ? WHERE id = ?', [Number(total?.total || 0), tripId]);
    });
  },

  deleteExpense(expenseId: string, tripId: string): void {
    const db = getDatabase();
    db.withTransactionSync(() => {
      db.runSync('DELETE FROM expense_participants WHERE expense_id = ?', [expenseId]);
      db.runSync('DELETE FROM expenses WHERE id = ?', [expenseId]);

      // Recalculate trip total spent
      const sumRow = db.getFirstSync<{ total: number }>(
        'SELECT SUM(amount) as total FROM expenses WHERE trip_id = ?',
        [tripId]
      );
      const newTotal = sumRow ? Number(sumRow.total || 0) : 0;
      db.runSync('UPDATE trips SET total_spent = ? WHERE id = ?', [newTotal, tripId]);
    });
  },

  updateExpenseSyncStatus(localId: string, serverId: string, status: 'SYNCED' | 'PENDING' | 'LOCAL_ONLY' | 'FAILED'): void {
    const db = getDatabase();
    if (serverId && serverId !== localId) {
      db.withTransactionSync(() => {
        db.runSync('UPDATE expenses SET id = ?, sync_status = ? WHERE id = ?', [serverId, status, localId]);
        db.runSync('UPDATE expense_participants SET expense_id = ?, sync_status = ? WHERE expense_id = ?', [serverId, status, localId]);
      });
    } else {
      db.runSync('UPDATE expenses SET sync_status = ? WHERE id = ?', [status, localId]);
    }
  }
};
