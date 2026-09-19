/**
 * Sync Queue Repository (SQLite Local Database)
 * Manages pending offline operations to replay against backend API
 */

import { getDatabase } from '../sqlite';
import { SyncQueueItem } from '../../types';

export const syncQueueRepo = {
  enqueue(item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'maxRetries' | 'status' | 'createdAt' | 'updatedAt'>): string {
    const db = getDatabase();
    const id = 'sq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    db.runSync(`
      INSERT INTO sync_queue (id, entity_type, entity_id, operation, endpoint, http_method, payload, idempotency_key, retry_count, max_retries, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      item.entityType,
      item.entityId,
      item.operation,
      item.endpoint,
      item.httpMethod,
      item.payload,
      item.idempotencyKey || id,
      0,
      5,
      'PENDING',
      now,
      now
    ]);

    return id;
  },

  getPendingQueue(): SyncQueueItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      "SELECT * FROM sync_queue WHERE status IN ('PENDING', 'SYNCING') ORDER BY created_at ASC"
    );
    return rows.map((r) => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      operation: r.operation,
      endpoint: r.endpoint,
      httpMethod: r.http_method,
      payload: r.payload,
      idempotencyKey: r.idempotency_key,
      retryCount: Number(r.retry_count || 0),
      maxRetries: Number(r.max_retries || 5),
      status: r.status,
      errorMessage: r.error_message,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  getPendingCount(): number {
    const db = getDatabase();
    const row = db.getFirstSync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING'"
    );
    return row ? Number(row.count || 0) : 0;
  },

  markSyncing(id: string): void {
    const db = getDatabase();
    db.runSync("UPDATE sync_queue SET status = 'SYNCING', updated_at = ? WHERE id = ?", [
      new Date().toISOString(),
      id
    ]);
  },

  markResolved(id: string): void {
    const db = getDatabase();
    // Delete resolved items or mark resolved
    db.runSync('DELETE FROM sync_queue WHERE id = ?', [id]);
  },

  markFailed(id: string, errorMessage: string): void {
    const db = getDatabase();
    const row = db.getFirstSync<any>('SELECT retry_count, max_retries FROM sync_queue WHERE id = ?', [id]);
    if (!row) return;

    const nextRetry = Number(row.retry_count || 0) + 1;
    const isFatal = nextRetry >= Number(row.max_retries || 5);

    db.runSync(`
      UPDATE sync_queue 
      SET retry_count = ?, status = ?, error_message = ?, updated_at = ?
      WHERE id = ?
    `, [
      nextRetry,
      isFatal ? 'FAILED' : 'PENDING',
      errorMessage,
      new Date().toISOString(),
      id
    ]);
  },

  clearQueue(): void {
    const db = getDatabase();
    db.runSync('DELETE FROM sync_queue');
  }
};
