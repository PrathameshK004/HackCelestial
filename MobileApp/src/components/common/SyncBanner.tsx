/**
 * Non-Intrusive Offline / Sync Status Banner
 * Matches WebApp status communication
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { useSync } from '../../context/SyncContext';

export const SyncBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, syncNow } = useSync();

  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.bannerInner,
          !isOnline && styles.bannerOffline,
          isSyncing && styles.bannerSyncing,
        ]}
        onPress={() => syncNow()}
        activeOpacity={0.8}
      >
        {isSyncing ? (
          <RefreshCw size={14} color={colors.accentBlue} />
        ) : !isOnline ? (
          <WifiOff size={14} color={colors.accentAmber} />
        ) : (
          <AlertTriangle size={14} color={colors.accentAmber} />
        )}

        <Text
          style={[
            styles.bannerText,
            !isOnline && styles.bannerTextOffline,
            isSyncing && styles.bannerTextSyncing,
          ]}
        >
          {isSyncing
            ? `Syncing ${pendingCount} pending changes...`
            : !isOnline
            ? pendingCount > 0
              ? `Offline • ${pendingCount} changes saved locally (will sync online)`
              : "Offline mode • You can view and edit cached trips"
            : `${pendingCount} changes waiting to sync • Tap to retry`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    ...shadows.sm,
  },
  bannerOffline: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  bannerSyncing: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  bannerText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.slate700,
    flex: 1,
  },
  bannerTextOffline: {
    color: '#92400e',
  },
  bannerTextSyncing: {
    color: '#1e40af',
  },
});
