/**
 * Offline Sync Engine
 * Replays queued offline operations against live backend with exponential backoff & ID reconciliation
 */

import NetInfo from '@react-native-community/netinfo';
import { syncQueueRepo } from '../database/repositories/syncQueueRepo';
import { expenseRepo } from '../database/repositories/expenseRepo';
import { tripRepo } from '../database/repositories/tripRepo';
import { apiRequest } from '../api/apiClient';
import { syncService } from './syncService';
import { storage } from '../database/storage';

let isProcessing = false;

export const syncEngine = {
  /**
   * Initializes network listener for automatic background synchronization
   */
  startNetworkListener(onStatusChange?: (online: boolean) => void): () => void {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (onStatusChange) {
        onStatusChange(isOnline);
      }
    });
    return unsubscribe;
  },

  /**
   * Processes all pending items in the offline queue
   */
  async processQueue(): Promise<{ processed: number; errors: number }> {
    if (isProcessing) return { processed: 0, errors: 0 };
    
    // Check network first
    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    if (!isOnline) return { processed: 0, errors: 0 };
    if (!(await storage.getAuthToken())) return { processed: 0, errors: 0 };

    isProcessing = true;
    let processed = 0;
    let errors = 0;

    try {
      const queue = syncQueueRepo.getPendingQueue();
      for (const item of queue) {
        syncQueueRepo.markSyncing(item.id);
        if (item.entityType === 'EXPENSE' && item.operation === 'CREATE') {
          expenseRepo.updateExpenseSyncStatus(item.entityId, item.entityId, 'PENDING');
        }
        try {
          const response = await apiRequest<any>(item.endpoint, {
            method: item.httpMethod,
            body: item.payload,
            headers: item.idempotencyKey ? { 'Idempotency-Key': item.idempotencyKey } : {},
          });

          // Handle server ID reconciliation
          if (item.entityType === 'EXPENSE' && item.operation === 'CREATE') {
            const serverId = response?.data?.id || response?.id;
            if (!serverId || String(serverId) !== item.entityId) {
              const conflict = new Error('Server did not confirm the local expense ID; local expense was preserved for review.');
              (conflict as any).status = 409;
              throw conflict;
            }
            expenseRepo.updateExpenseSyncStatus(item.entityId, item.entityId, 'SYNCED');
          } else if (item.entityType === 'TRIP' && item.operation === 'CREATE') {
            const serverId = response?.data?.id || response?.id;
            if (serverId) {
              tripRepo.updateTripSyncStatus(item.entityId, String(serverId), 'SYNCED');
            }
          }

          syncQueueRepo.markResolved(item.id);
          processed++;
        } catch (err: any) {
          errors++;
          console.warn(`Sync failed for item ${item.id}:`, err.message);
          const status = Number(err?.status || 0);
          const retryable = !status || status === 408 || status === 425 || status === 429 || status >= 500;
          syncQueueRepo.markFailed(item.id, err.message || 'Network sync error', retryable);
          if (!retryable && item.entityType === 'EXPENSE' && item.operation === 'CREATE') {
            expenseRepo.updateExpenseSyncStatus(item.entityId, item.entityId, 'FAILED');
          }
        }
      }
      if (processed > 0 || errors > 0) syncService.notifyListeners();
    } finally {
      isProcessing = false;
    }

    return { processed, errors };
  }
};
