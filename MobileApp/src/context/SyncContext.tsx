/**
 * Synchronization Context
 * Tracks connectivity status and offline sync queue
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncEngine } from '../sync/syncEngine';
import { syncQueueRepo } from '../database/repositories/syncQueueRepo';
import { syncService } from '../sync/syncService';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const refreshPendingCount = () => {
    try {
      const count = syncQueueRepo.getPendingCount();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    // Initial fetch of network status & initial sync
    NetInfo.fetch().then((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online) {
        syncService.downloadServerData().catch(() => {});
      }
    });

    // Start background network listener
    const unsubscribe = syncEngine.startNetworkListener((online) => {
      setIsOnline(online);
      refreshPendingCount();
      if (online) {
        syncService.downloadServerData().catch(() => {});
      }
    });

    // ── Live Background Synchronization Heartbeat Loop ─────────────────────
    // Runs every 5 seconds to process queued actions and sync live server updates automatically
    const syncInterval = setInterval(async () => {
      refreshPendingCount();
      const net = await NetInfo.fetch();
      const online = Boolean(net.isConnected && net.isInternetReachable !== false);
      if (online) {
        try {
          await syncEngine.processQueue();
          await syncService.downloadServerData();
        } catch (_) {}
      }
    }, 5000);

    refreshPendingCount();

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, []);

  const syncNow = async (): Promise<void> => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      // 1. Process pending offline queue
      await syncEngine.processQueue();
      // 2. Refresh server data
      await syncService.downloadServerData();
    } finally {
      setIsSyncing(false);
      refreshPendingCount();
    }
  };

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        syncNow,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
