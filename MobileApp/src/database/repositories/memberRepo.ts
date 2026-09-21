/**
 * Member / Participant Repository (SQLite Local Database)
 */

import { getDatabase } from '../sqlite';
import { Participant } from '../../types';

export const memberRepo = {
  getMembersByTrip(tripId: string): Participant[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      'SELECT * FROM participants WHERE trip_id = ? ORDER BY is_user DESC, role DESC, name ASC',
      [tripId]
    );
    return rows.map((r) => ({
      id: r.id,
      tripId: r.trip_id,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      role: r.role,
      avatarBg: r.avatar_bg,
      isUser: Boolean(r.is_user),
      balance: Number(r.balance || 0),
      status: (r.status || (r.role === 'Organizer' ? 'ACCEPTED' : 'PENDING')) as any,
      inviteCode: r.invite_code,
      syncStatus: r.sync_status
    }));
  },

  upsertMember(member: Participant): void {
    const db = getDatabase();
    db.runSync(`
      INSERT INTO participants (id, trip_id, user_id, name, email, role, avatar_bg, is_user, balance, status, invite_code, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        email=excluded.email,
        role=excluded.role,
        avatar_bg=excluded.avatar_bg,
        is_user=excluded.is_user,
        balance=excluded.balance,
        status=excluded.status,
        invite_code=excluded.invite_code,
        sync_status=excluded.sync_status
    `, [
      member.id,
      member.tripId,
      member.userId || member.id,
      member.name,
      member.email || '',
      member.role || 'Traveler',
      member.avatarBg || '#059669',
      member.isUser ? 1 : 0,
      member.balance || 0,
      member.status || (member.role === 'Organizer' ? 'ACCEPTED' : 'PENDING'),
      member.inviteCode || null,
      member.syncStatus || 'SYNCED'
    ]);
  },

  deleteMember(memberId: string, tripId: string): void {
    const db = getDatabase();
    db.runSync('DELETE FROM participants WHERE id = ? AND trip_id = ?', [memberId, tripId]);
  },

  updateBalances(tripId: string, balances: Record<string, number>): void {
    const db = getDatabase();
    db.withTransactionSync(() => {
      for (const [memberId, balance] of Object.entries(balances)) {
        db.runSync('UPDATE participants SET balance = ? WHERE id = ? AND trip_id = ?', [balance, memberId, tripId]);
      }
      // Update trip's user_balance if current user participates
      const userRow = db.getFirstSync<any>(
        'SELECT balance FROM participants WHERE trip_id = ? AND is_user = 1',
        [tripId]
      );
      if (userRow) {
        db.runSync('UPDATE trips SET user_balance = ? WHERE id = ?', [Number(userRow.balance || 0), tripId]);
      }
    });
  }
};
