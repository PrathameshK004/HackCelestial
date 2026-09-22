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

    // Strict deduplication by email or name to prevent duplicate rows for same person
    const seenEmails = new Set<string>();
    const seenNames = new Set<string>();
    const result: Participant[] = [];

    for (const r of rows) {
      const email = (r.email || '').trim().toLowerCase();
      const name = (r.name || '').trim().toLowerCase();

      if (email && seenEmails.has(email)) continue;
      if (name && seenNames.has(name)) continue;

      if (email) seenEmails.add(email);
      if (name) seenNames.add(name);

      result.push({
        id: r.id,
        tripId: r.trip_id,
        userId: r.user_id,
        name: r.name,
        email: r.email,
        role: r.role,
        avatarBg: r.avatar_bg,
        isUser: Boolean(r.is_user),
        balance: Number(r.balance || 0),
        status: r.status ? (r.status as any) : (r.role === 'Organizer' ? 'ACCEPTED' : 'PENDING'),
        inviteCode: r.invite_code,
        syncStatus: r.sync_status
      });
    }

    return result;
  },

  upsertMember(member: Participant): void {
    const db = getDatabase();
    const resolvedStatus = member.status || (member.role === 'Organizer' ? 'ACCEPTED' : 'PENDING');
    
    // Check if an existing placeholder row matches email or name for this trip
    const cleanEmail = (member.email || '').trim().toLowerCase();
    const cleanName = (member.name || '').trim().toLowerCase();

    let existing: any = null;
    if (cleanEmail) {
      existing = db.getFirstSync<any>(
        'SELECT id FROM participants WHERE trip_id = ? AND LOWER(email) = ?',
        [member.tripId, cleanEmail]
      );
    }
    if (!existing && cleanName) {
      existing = db.getFirstSync<any>(
        'SELECT id FROM participants WHERE trip_id = ? AND LOWER(name) = ?',
        [member.tripId, cleanName]
      );
    }

    if (existing && existing.id !== member.id) {
      // Remove old placeholder row (e.g. companion-12345) to prevent duplicate entries
      db.runSync('DELETE FROM participants WHERE id = ? AND trip_id = ?', [existing.id, member.tripId]);
    }

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
      resolvedStatus,
      member.inviteCode || null,
      member.syncStatus || 'SYNCED'
    ]);
  },

  updateMemberStatus(tripId: string, memberIdOrEmail: string, status: 'ACCEPTED' | 'PENDING' | 'REJECTED' | 'DECLINED'): void {
    const db = getDatabase();
    const cleanTarget = memberIdOrEmail.trim().toLowerCase();
    db.runSync(
      `UPDATE participants SET status = ? WHERE trip_id = ? AND (id = ? OR LOWER(email) = ? OR user_id = ?)`,
      [status, tripId, memberIdOrEmail, cleanTarget, memberIdOrEmail]
    );
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
