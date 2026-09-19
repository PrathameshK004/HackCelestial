/**
 * Offline Sync Engine
 * Replays queued offline operations against live backend with exponential backoff & ID reconciliation
 */

import NetInfo from '@react-native-community/netinfo';
import { syncQueueRepo } from '../database/repositories/syncQueueRepo';
import { expenseRepo } from '../database/repositories/expenseRepo';
import { tripRepo } from '../database/repositories/tripRepo';
import { apiRequest } from '../api/apiClient';

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
      if (isOnline) {
        // Automatic trigger when connectivity returns
        this.processQueue();
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

    isProcessing = true;
    let processed = 0;
    let errors = 0;

    try {
      const queue = syncQueueRepo.getPendingQueue();
      for (const item of queue) {
        syncQueueRepo.markSyncing(item.id);
        try {
          const payloadObj = JSON.parse(item.payload);
          const response = await apiRequest<any>(item.endpoint, {
            method: item.httpMethod,
            body: item.payload,
            headers: item.idempotencyKey ? { 'Idempotency-Key': item.idempotencyKey } : {},
          });

          // Handle server ID reconciliation
          if (item.entityType === 'EXPENSE' && item.operation === 'CREATE') {
            const serverId = response?.data?.id || response?.id;
            if (serverId) {
              expenseRepo.updateExpenseSyncStatus(item.entityId, String(serverId), 'SYNCED');
            }
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
          syncQueueRepo.markFailed(item.id, err.message || 'Network sync error');
        }
      }
    } finally {
      isProcessing = false;
    }

    return { processed, errors };
  }
};
