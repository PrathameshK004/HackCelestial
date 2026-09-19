/**
 * Expense Repository (SQLite Local Database)
 */

import { getDatabase } from '../sqlite';
import { Expense, ExpenseParticipantSplit } from '../../types';

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

  addExpense(expense: Expense, splits: ExpenseParticipantSplit[] = []): void {
    const db = getDatabase();
    db.withTransactionSync(() => {
      db.runSync(`
        INSERT INTO expenses (id, trip_id, title, description, amount, currency, category, paid_by_id, paid_by_name, split_model, split_count, payment_method, payment_reference, date, time, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

  updateExpenseSyncStatus(localId: string, serverId: string, status: 'SYNCED' | 'PENDING' | 'LOCAL_ONLY'): void {
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
