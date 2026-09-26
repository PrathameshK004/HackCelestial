/**
 * Non-Intrusive Offline / Sync Status Banner
 * Matches WebApp status communication
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { WifiOff, AlertTriangle } from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { useSync } from '../../context/SyncContext';

export const SyncBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, failedCount, syncNow, retryFailed } = useSync();

  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  const handlePress = () => {
    if (failedCount > 0) {
      Alert.alert(
        'Sync needs attention',
        `${failedCount} change${failedCount === 1 ? '' : 's'} could not be synced. Retry them now?`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Retry', onPress: () => retryFailed() }
        ]
      );
      return;
    }
    void syncNow();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.bannerInner,
          !isOnline && styles.bannerOffline,
          isSyncing && styles.bannerSyncing,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={colors.accentBlue} />
        ) : !isOnline ? (
          <WifiOff size={14} color={colors.accentAmber} />
        ) : (
          <AlertTriangle size={14} color={colors.accentAmber} />
        )}

        {!isSyncing && (
          <Text
            style={[
              styles.bannerText,
              !isOnline && styles.bannerTextOffline,
            ]}
          >
            {!isOnline
              ? failedCount > 0
                ? `Offline • ${failedCount} changes need attention`
                : pendingCount > 0
                  ? `Offline • ${pendingCount} changes saved locally (will sync online)`
                  : 'Offline mode • You can view and edit cached trips'
              : failedCount > 0
                ? `${failedCount} changes need attention • Tap to retry`
                : `${pendingCount} changes waiting to sync • Tap to retry`}
          </Text>
        )}
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
