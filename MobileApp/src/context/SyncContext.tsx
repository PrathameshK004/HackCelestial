/**
 * Synchronization Context
 * Tracks connectivity status and offline sync queue
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { syncEngine } from '../sync/syncEngine';
import { syncQueueRepo } from '../database/repositories/syncQueueRepo';
import { syncService } from '../sync/syncService';
import { useAuth } from './AuthContext';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  syncNow: () => Promise<void>;
  retryFailed: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const syncInFlight = useRef<Promise<void> | null>(null);

  const refreshPendingCount = () => {
    if (!isAuthenticated || isAuthLoading) {
      setPendingCount(0);
      setFailedCount(0);
      return;
    }
    try {
      const count = syncQueueRepo.getPendingCount();
      setPendingCount(count);
      setFailedCount(syncQueueRepo.getFailedCount());
    } catch {
      setPendingCount(0);
      setFailedCount(0);
    }
  };

  const syncNow = useCallback((): Promise<void> => {
    if (syncInFlight.current) return syncInFlight.current;
    const operation = (async () => {
      setIsSyncing(true);
      try {
        const network = await NetInfo.fetch();
        const online = Boolean(network.isConnected && network.isInternetReachable !== false);
        setIsOnline(online);
        if (!online || !isAuthenticated) return;
        await syncEngine.processQueue();
        await syncService.downloadServerData();
      } catch (error) {
        console.warn('Sync attempt did not complete:', error);
      } finally {
        setIsSyncing(false);
        refreshPendingCount();
      }
    })();
    syncInFlight.current = operation;
    void operation.finally(() => {
      if (syncInFlight.current === operation) syncInFlight.current = null;
    });
    return operation;
  }, [isAuthenticated, isAuthLoading]);

  const retryFailed = useCallback(async (): Promise<void> => {
    syncQueueRepo.retryAllFailed();
    await syncNow();
  }, [syncNow]);

  useEffect(() => {
    if (isAuthLoading) return;
    let active = true;
    const refreshNetwork = async () => {
      const state = await NetInfo.fetch();
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (!active) return;
      setIsOnline(online);
      if (online && isAuthenticated) void syncNow();
    };

    const unsubscribe = syncEngine.startNetworkListener((online) => {
      setIsOnline(online);
      refreshPendingCount();
      if (online && isAuthenticated) void syncNow();
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshNetwork();
    });
    const refreshInterval = setInterval(() => {
      if (AppState.currentState === 'active') void syncNow();
    }, 60000);
    const unsubscribeSync = syncService.subscribe(refreshPendingCount);

    refreshPendingCount();
    void refreshNetwork();
    return () => {
      active = false;
      unsubscribe();
      appStateSubscription.remove();
      unsubscribeSync();
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, isAuthLoading, syncNow]);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        failedCount,
        syncNow,
        retryFailed,
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
