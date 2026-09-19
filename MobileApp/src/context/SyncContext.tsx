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
    // Initial fetch of network status
    NetInfo.fetch().then((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    // Start background network listener
    const unsubscribe = syncEngine.startNetworkListener((online) => {
      setIsOnline(online);
      refreshPendingCount();
    });

    // Poll pending count periodically
    const interval = setInterval(refreshPendingCount, 4000);
    refreshPendingCount();

    return () => {
      unsubscribe();
      clearInterval(interval);
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
