/**
 * Trip Repository (SQLite Local Database)
 */

import { getDatabase } from '../sqlite';
import { Trip, Participant, Expense, SettlementTransfer } from '../../types';

export const tripRepo = {
  getAllTrips(): Trip[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM trips ORDER BY start_date DESC, created_at DESC');
    return rows.map((r) => mapTripRow(r));
  },

  getTripById(id: string): Trip | null {
    const db = getDatabase();
    const row = db.getFirstSync<any>('SELECT * FROM trips WHERE id = ?', [id]);
    if (!row) return null;

    const trip = mapTripRow(row);
    // Load relational members, expenses, and settlements
    trip.members = db.getAllSync<any>('SELECT * FROM participants WHERE trip_id = ?', [id]).map(mapParticipantRow);
    trip.expenses = db.getAllSync<any>('SELECT * FROM expenses WHERE trip_id = ? ORDER BY date DESC, time DESC', [id]).map(mapExpenseRow);
    trip.settlements = db.getAllSync<any>('SELECT * FROM settlements WHERE trip_id = ?', [id]).map(mapSettlementRow);

    return trip;
  },

  upsertTrip(trip: Trip): void {
    const db = getDatabase();
    db.runSync(`
      INSERT INTO trips (id, name, destination, trip_type, status, start_date, end_date, currency, currency_symbol, total_budget, total_spent, user_balance, invite_code, description, cover_gradient, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        destination=excluded.destination,
        trip_type=excluded.trip_type,
        status=excluded.status,
        start_date=excluded.start_date,
        end_date=excluded.end_date,
        currency=excluded.currency,
        currency_symbol=excluded.currency_symbol,
        total_budget=excluded.total_budget,
        total_spent=excluded.total_spent,
        user_balance=excluded.user_balance,
        invite_code=excluded.invite_code,
        description=excluded.description,
        cover_gradient=excluded.cover_gradient,
        sync_status=excluded.sync_status,
        updated_at=excluded.updated_at
    `, [
      trip.id,
      trip.name,
      trip.destination,
      trip.tripType || 'Friends',
      trip.status || 'active',
      trip.startDate || null,
      trip.endDate || null,
      trip.currency || 'INR',
      trip.currencySymbol || '₹',
      trip.totalBudget || 0,
      trip.totalSpent || 0,
      trip.userBalance || 0,
      trip.inviteCode || null,
      trip.description || '',
      trip.coverGradient || 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
      trip.syncStatus || 'SYNCED',
      trip.createdAt || new Date().toISOString(),
      new Date().toISOString()
    ]);
  },

  deleteTrip(id: string): void {
    const db = getDatabase();
    db.runSync('DELETE FROM trips WHERE id = ?', [id]);
  },

  updateTripSyncStatus(id: string, serverId: string, status: 'SYNCED' | 'PENDING' | 'LOCAL_ONLY'): void {
    const db = getDatabase();
    if (serverId && serverId !== id) {
      db.withTransactionSync(() => {
        db.runSync('UPDATE trips SET id = ?, sync_status = ? WHERE id = ?', [serverId, status, id]);
        db.runSync('UPDATE participants SET trip_id = ? WHERE trip_id = ?', [serverId, id]);
        db.runSync('UPDATE expenses SET trip_id = ? WHERE trip_id = ?', [serverId, id]);
        db.runSync('UPDATE settlements SET trip_id = ? WHERE trip_id = ?', [serverId, id]);
      });
    } else {
      db.runSync('UPDATE trips SET sync_status = ? WHERE id = ?', [status, id]);
    }
  }
};

function mapTripRow(r: any): Trip {
  return {
    id: r.id,
    name: r.name,
    destination: r.destination,
    tripType: r.trip_type,
    status: r.status,
    startDate: r.start_date,
    endDate: r.end_date,
    currency: r.currency,
    currencySymbol: r.currency_symbol,
    totalBudget: Number(r.total_budget || 0),
    totalSpent: Number(r.total_spent || 0),
    userBalance: Number(r.user_balance || 0),
    inviteCode: r.invite_code,
    description: r.description,
    coverGradient: r.cover_gradient,
    syncStatus: r.sync_status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function mapParticipantRow(r: any): Participant {
  return {
    id: r.id,
    tripId: r.trip_id,
    userId: r.user_id,
    name: r.name,
    email: r.email,
    role: r.role,
    avatarBg: r.avatar_bg,
    isUser: Boolean(r.is_user),
    balance: Number(r.balance || 0),
    syncStatus: r.sync_status
  };
}

function mapExpenseRow(r: any): Expense {
  return {
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
    syncStatus: r.sync_status
  };
}

function mapSettlementRow(r: any): SettlementTransfer {
  return {
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
  };
}
