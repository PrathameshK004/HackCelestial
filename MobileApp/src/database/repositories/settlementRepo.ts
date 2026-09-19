/**
 * Settlement Repository (SQLite Local Database)
 */

import { getDatabase } from '../sqlite';
import { SettlementTransfer } from '../../types';

export const settlementRepo = {
  getSettlementsByTrip(tripId: string): SettlementTransfer[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      'SELECT * FROM settlements WHERE trip_id = ? ORDER BY created_at DESC',
      [tripId]
    );
    return rows.map((r) => ({
      id: r.id,
      tripId: r.trip_id,
      fromMemberId: r.from_member_id,
      fromMemberName: r.from_member_name,
      fromAvatarBg: r.from_avatar_bg,
      toMemberId: r.to_member_id,
      toMemberName: r.to_member_name,
      toAvatarBg: r.to_avatar_bg,
      toUpiId: r.to_upi_id,
      amount: Number(r.amount || 0),
      currency: r.currency,
      currencySymbol: r.currency_symbol,
      status: r.status,
      paymentMethod: r.payment_method,
      paymentReference: r.payment_reference,
      remarks: r.remarks,
      dueDate: r.due_date,
      syncStatus: r.sync_status,
      createdAt: r.created_at
    }));
  },

  upsertSettlement(s: SettlementTransfer): void {
    const db = getDatabase();
    db.runSync(`
      INSERT INTO settlements (id, trip_id, from_member_id, from_member_name, from_avatar_bg, to_member_id, to_member_name, to_avatar_bg, to_upi_id, amount, currency, currency_symbol, status, payment_method, payment_reference, remarks, due_date, sync_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status=excluded.status,
        payment_method=excluded.payment_method,
        payment_reference=excluded.payment_reference,
        remarks=excluded.remarks,
        sync_status=excluded.sync_status
    `, [
      s.id,
      s.tripId,
      s.fromMemberId,
      s.fromMemberName,
      s.fromAvatarBg || '#ea580c',
      s.toMemberId,
      s.toMemberName,
      s.toAvatarBg || '#059669',
      s.toUpiId || null,
      s.amount,
      s.currency || 'INR',
      s.currencySymbol || '₹',
      s.status || 'pending',
      s.paymentMethod || 'UPI',
      s.paymentReference || null,
      s.remarks || null,
      s.dueDate || 'Instant UPI',
      s.syncStatus || 'SYNCED',
      s.createdAt || new Date().toISOString()
    ]);
  },

  markCompleted(settlementId: string): void {
    const db = getDatabase();
    db.runSync(
      "UPDATE settlements SET status = 'completed', sync_status = 'PENDING' WHERE id = ?",
      [settlementId]
    );
  }
};
