/**
 * SQLite Database Schema & DDL
 * Primary local relational database for GroupTrip Ledger
 */

export const SCHEMA_SQL = `
-- 1. Trips
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  trip_type TEXT DEFAULT 'Friends',
  status TEXT DEFAULT 'active',
  start_date TEXT,
  end_date TEXT,
  currency TEXT DEFAULT 'INR',
  currency_symbol TEXT DEFAULT '₹',
  total_budget REAL DEFAULT 0,
  total_spent REAL DEFAULT 0,
  user_balance REAL DEFAULT 0,
  invite_code TEXT,
  description TEXT,
  cover_gradient TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TEXT,
  updated_at TEXT
);

-- 2. Participants / Members
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'Traveler',
  avatar_bg TEXT DEFAULT '#059669',
  is_user INTEGER DEFAULT 0,
  balance REAL DEFAULT 0,
  status TEXT DEFAULT 'ACCEPTED',
  invite_code TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- 3. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  category TEXT DEFAULT 'Food',
  paid_by_id TEXT NOT NULL,
  paid_by_name TEXT NOT NULL,
  split_model TEXT DEFAULT 'EQUAL',
  split_count INTEGER DEFAULT 1,
  payment_method TEXT DEFAULT 'CASH',
  payment_reference TEXT,
  date TEXT,
  time TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- 4. Expense Participant Splits
CREATE TABLE IF NOT EXISTS expense_participants (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  share_amount REAL NOT NULL,
  is_opted_in INTEGER DEFAULT 1,
  share_type TEXT DEFAULT 'EQUAL_UNIT',
  share_value REAL,
  sync_status TEXT DEFAULT 'SYNCED',
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

-- 5. Settlements / Minimized Transfers
CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  from_member_id TEXT NOT NULL,
  from_member_name TEXT NOT NULL,
  from_avatar_bg TEXT,
  to_member_id TEXT NOT NULL,
  to_member_name TEXT NOT NULL,
  to_avatar_bg TEXT,
  to_upi_id TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  currency_symbol TEXT DEFAULT '₹',
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'UPI',
  payment_reference TEXT,
  remarks TEXT,
  due_date TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- 6. Offline Synchronization Queue
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  http_method TEXT NOT NULL,
  payload TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  status TEXT DEFAULT 'PENDING',
  error_message TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 7. Sync Metadata & Timestamps
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  last_synced_at TEXT
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_participants_trip ON participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_settlements_trip ON settlements(trip_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);
`;
