/**
 * SQLite Database Connection & Initialization
 * Powered by expo-sqlite (Sync & Async operations)
 */

import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

const DB_NAME = 'grouptrip_ledger.db';

let databaseInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!databaseInstance) {
    databaseInstance = SQLite.openDatabaseSync(DB_NAME);
    // Enable WAL mode & foreign keys for high-performance concurrent writes
    databaseInstance.execSync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);
    // Initialize Schema
    databaseInstance.execSync(SCHEMA_SQL);
  }
  return databaseInstance;
}

/**
 * Ensures tables exist and pre-seeds default seed data if completely empty
 */
export function initializeDatabase(): void {
  const db = getDatabase();

  // Non-destructive migrations for existing SQLite databases
  try {
    db.execSync("ALTER TABLE participants ADD COLUMN status TEXT DEFAULT 'ACCEPTED';");
  } catch (_) {}
  try {
    db.execSync("ALTER TABLE participants ADD COLUMN invite_code TEXT;");
  } catch (_) {}
  
  // Purge legacy dummy offline seed data so SQLite reflects real user/server trips only
  try {
    db.execSync("DELETE FROM trips WHERE id IN ('grp-goa-2026', 'grp-manali-2026');");
    db.execSync("DELETE FROM participants WHERE trip_id IN ('grp-goa-2026', 'grp-manali-2026');");
    db.execSync("DELETE FROM expenses WHERE trip_id IN ('grp-goa-2026', 'grp-manali-2026');");
    db.execSync("DELETE FROM settlements WHERE trip_id IN ('grp-goa-2026', 'grp-manali-2026');");
  } catch (_) {}
}

function seedInitialOfflineData(db: SQLite.SQLiteDatabase): void {
  db.withTransactionSync(() => {
    // Seed Trip 1: Goa Friends Getaway
    db.runSync(`
      INSERT INTO trips (id, name, destination, trip_type, status, start_date, end_date, currency, currency_symbol, total_budget, total_spent, user_balance, invite_code, description, cover_gradient, sync_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'grp-goa-2026',
      'Goa Friends Getaway',
      'Goa, India',
      'Friends',
      'active',
      '2026-08-25',
      '2026-08-30',
      'INR',
      '₹',
      60000,
      42800,
      3200,
      'GOA784',
      'Beach resort stay, sunset cruise, water sports, and cafe hopping in North Goa.',
      'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
      'SYNCED',
      new Date().toISOString()
    ]);

    // Seed Participants for Goa
    const members = [
      { id: 'user-1', name: 'Yogesh Dandawalkar', email: 'yogesh@example.com', role: 'Organizer', avatarBg: '#059669', isUser: 1, balance: 3200 },
      { id: 'user-2', name: 'Rahul Sharma', email: 'rahul.s@example.com', role: 'Traveler', avatarBg: '#0284c7', isUser: 0, balance: -1500 },
      { id: 'user-3', name: 'Sneha Patil', email: 'sneha.p@example.com', role: 'Traveler', avatarBg: '#7c3aed', isUser: 0, balance: 800 },
      { id: 'user-4', name: 'Aditya Kulkarni', email: 'aditya.k@example.com', role: 'Traveler', avatarBg: '#ea580c', isUser: 0, balance: -2500 }
    ];

    for (const m of members) {
      db.runSync(`
        INSERT INTO participants (id, trip_id, user_id, name, email, role, avatar_bg, is_user, balance, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [m.id, 'grp-goa-2026', m.id, m.name, m.email, m.role, m.avatarBg, m.isUser, m.balance, 'SYNCED']);
    }

    // Seed Expenses for Goa
    const expenses = [
      { id: 'exp-1', title: 'Taj Fort Aguada Villa Stay', amount: 24000, category: 'Stay', paidById: 'user-1', paidByName: 'Yogesh Dandawalkar', splitModel: 'ROOM_SHARE', splitCount: 4, method: 'UPI', ref: 'UPI-TAG-8912', date: '2026-08-25', time: '14:00' },
      { id: 'exp-2', title: 'Sunset Catamaran Cruise', amount: 9600, category: 'Activities', paidById: 'user-3', paidByName: 'Sneha Patil', splitModel: 'ACTIVITY_BASED', splitCount: 4, method: 'UPI', ref: 'UPI-CRZ-1049', date: '2026-08-26', time: '17:30' },
      { id: 'exp-3', title: 'Thalassa Greek Restaurant Dinner', amount: 6400, category: 'Food', paidById: 'user-1', paidByName: 'Yogesh Dandawalkar', splitModel: 'EQUAL', splitCount: 4, method: 'CASH', ref: 'CASH-THAL', date: '2026-08-26', time: '21:00' },
      { id: 'exp-4', title: 'Self-Drive Thar Rentals', amount: 2800, category: 'Transport', paidById: 'user-2', paidByName: 'Rahul Sharma', splitModel: 'EQUAL', splitCount: 4, method: 'UPI', ref: 'UPI-THAR-449', date: '2026-08-27', time: '10:00' }
    ];

    for (const e of expenses) {
      db.runSync(`
        INSERT INTO expenses (id, trip_id, title, description, amount, currency, category, paid_by_id, paid_by_name, split_model, split_count, payment_method, payment_reference, date, time, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [e.id, 'grp-goa-2026', e.title, e.title, e.amount, 'INR', e.category, e.paidById, e.paidByName, e.splitModel, e.splitCount, e.method, e.ref, e.date, e.time, 'SYNCED']);
    }

    // Seed Settlements for Goa
    db.runSync(`
      INSERT INTO settlements (id, trip_id, from_member_id, from_member_name, from_avatar_bg, to_member_id, to_member_name, to_avatar_bg, to_upi_id, amount, currency, currency_symbol, status, payment_method, remarks, due_date, sync_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'settle-1',
      'grp-goa-2026',
      'user-4',
      'Aditya Kulkarni',
      '#ea580c',
      'user-1',
      'Yogesh Dandawalkar',
      '#059669',
      'yogesh@okaxis',
      2500,
      'INR',
      '₹',
      'pending',
      'UPI',
      'Villa & Thalassa split settlement',
      'Instant UPI',
      'SYNCED',
      new Date().toISOString()
    ]);

    db.runSync(`
      INSERT INTO settlements (id, trip_id, from_member_id, from_member_name, from_avatar_bg, to_member_id, to_member_name, to_avatar_bg, to_upi_id, amount, currency, currency_symbol, status, payment_method, remarks, due_date, sync_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'settle-2',
      'grp-goa-2026',
      'user-2',
      'Rahul Sharma',
      '#0284c7',
      'user-1',
      'Yogesh Dandawalkar',
      '#059669',
      'yogesh@okaxis',
      700,
      'INR',
      '₹',
      'pending',
      'UPI',
      'Net balance settlement',
      'Instant UPI',
      'SYNCED',
      new Date().toISOString()
    ]);

    // Seed Trip 2: Manali Winter Trek
    db.runSync(`
      INSERT INTO trips (id, name, destination, trip_type, status, start_date, end_date, currency, currency_symbol, total_budget, total_spent, user_balance, invite_code, description, cover_gradient, sync_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'grp-manali-2026',
      'Manali Snow Trek & Cabins',
      'Manali, Himachal Pradesh',
      'Friends',
      'active',
      '2026-12-10',
      '2026-12-16',
      'INR',
      '₹',
      45000,
      28400,
      -1200,
      'MAN892',
      'Solang valley snow treks, traditional wooden cedar cabins, river rafting and cafes.',
      'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
      'SYNCED',
      new Date().toISOString()
    ]);

    // Seed Participants for Manali
    const manaliMembers = [
      { id: 'm-1', name: 'Yogesh Dandawalkar', email: 'yogesh@example.com', role: 'Traveler', avatarBg: '#059669', isUser: 1, balance: -1200 },
      { id: 'm-2', name: 'Vikram Sethi', email: 'vikram@example.com', role: 'Organizer', avatarBg: '#2563eb', isUser: 0, balance: 3400 },
      { id: 'm-3', name: 'Pooja Patil', email: 'pooja@example.com', role: 'Traveler', avatarBg: '#db2777', isUser: 0, balance: -2200 }
    ];

    for (const m of manaliMembers) {
      db.runSync(`
        INSERT INTO participants (id, trip_id, user_id, name, email, role, avatar_bg, is_user, balance, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [m.id, 'grp-manali-2026', m.id, m.name, m.email, m.role, m.avatarBg, m.isUser, m.balance, 'SYNCED']);
    }
  });
}
