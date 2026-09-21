/**
 * ProfileScreen matching WebApp ProfilePage.tsx
 * Features traveler details, UPI ID configuration, and SQLite Offline Diagnostics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import {
  ArrowLeft,
  User,
  Smartphone,
  Database,
  RefreshCw,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { useTrips } from '../context/TripContext';
import { Trip } from '../types';

interface ProfileScreenProps {
  onBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const { user, updateUser, logout } = useAuth();
  const { isOnline, isSyncing, pendingCount, syncNow } = useSync();
  const { trips } = useTrips();

  // ── Hardware Back Press Handler ───────────────────────────────────────────
  useEffect(() => {
    const onHardwareBack = () => {
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [onBack]);

  const [name, setName] = useState(user?.name || 'Yogesh Dandawalkar');
  const [upiId, setUpiId] = useState(user?.upiId || 'yogesh@okaxis');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [isSaved, setIsSaved] = useState(false);

  const totalExpensesCount = trips.reduce((sum: number, t: Trip) => sum + (t.expenses?.length || 0), 0);

  const handleSave = async () => {
    await updateUser({ name, upiId, phone });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    Alert.alert('Profile Saved', 'Profile information updated and persisted to local SQLite.');
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header with Back Navigation */}
      <View style={styles.topNav}>
        <View style={styles.topNavLeft}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              activeOpacity={0.7}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={20} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
          <Text style={styles.topNavTitle}>Traveler Profile</Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutTopBtn}
          activeOpacity={0.7}
          accessibilityLabel="Sign Out"
        >
          <LogOut size={18} color="#EF4444" strokeWidth={2} />
        </TouchableOpacity>
      </View>
      {/* Header Profile Card */}
      <View style={styles.profileHeaderCard}>
        <View style={[styles.avatarBig, { backgroundColor: user?.avatarBg || colors.primary600 }]}>
          <Text style={styles.avatarBigText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'Y'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Yogesh Dandawalkar'}</Text>
        <Text style={styles.userEmail}>{user?.emailId || 'yogesh@example.com'}</Text>

        <View style={styles.onlineBadge}>
          {isOnline ? (
            <>
              <Wifi size={12} color={colors.primary600} />
              <Text style={styles.onlineBadgeText}>Online & Connected</Text>
            </>
          ) : (
            <>
              <WifiOff size={12} color={colors.accentAmber} />
              <Text style={[styles.onlineBadgeText, { color: '#92400e' }]}>Offline Mode</Text>
            </>
          )}
        </View>
      </View>

      {/* Profile Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Traveler Profile</Text>

        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          placeholderTextColor={colors.slate400}
        />

        <Text style={styles.inputLabel}>UPI ID (For Receiving Settlements)</Text>
        <TextInput
          style={styles.input}
          value={upiId}
          onChangeText={setUpiId}
          placeholder="yourname@okaxis"
          placeholderTextColor={colors.slate400}
        />

        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 98765 43210"
          placeholderTextColor={colors.slate400}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <CheckCircle2 size={16} color="#ffffff" />
          <Text style={styles.saveBtnText}>{isSaved ? 'Saved!' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>

      {/* SQLite Database & Offline Diagnostics */}
      <View style={styles.card}>
        <View style={styles.diagHeader}>
          <Database size={18} color={colors.primary600} />
          <Text style={styles.cardTitle}>Local SQLite Database Diagnostics</Text>
        </View>

        <View style={styles.diagRow}>
          <Text style={styles.diagLabel}>Primary Database Engine</Text>
          <Text style={styles.diagValue}>expo-sqlite (WAL Mode)</Text>
        </View>

        <View style={styles.diagRow}>
          <Text style={styles.diagLabel}>Total Local Trips</Text>
          <Text style={styles.diagValue}>{trips.length} trips</Text>
        </View>

        <View style={styles.diagRow}>
          <Text style={styles.diagLabel}>Total Cached Expenses</Text>
          <Text style={styles.diagValue}>{totalExpensesCount} expenses</Text>
        </View>

        <View style={styles.diagRow}>
          <Text style={styles.diagLabel}>Pending Sync Queue</Text>
          <Text
            style={[
              styles.diagValue,
              pendingCount > 0 && { color: colors.accentAmber, fontWeight: '800' },
            ]}
          >
            {pendingCount} operations
          </Text>
        </View>

        <View style={styles.diagRow}>
          <Text style={styles.diagLabel}>Backend API Target</Text>
          <Text style={styles.diagValueSmall}>hackcelestial-api.onrender.com</Text>
        </View>

        <TouchableOpacity
          style={styles.syncBtn}
          onPress={() => syncNow()}
          disabled={isSyncing}
          activeOpacity={0.85}
        >
          <RefreshCw size={15} color="#ffffff" />
          <Text style={styles.syncBtnText}>
            {isSyncing ? 'Synchronizing with Render API...' : 'Force Sync Now'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <LogOut size={16} color={colors.accentRose} />
        <Text style={styles.logoutText}>Sign Out of Triptual</Text>
      </TouchableOpacity>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  content: {
    padding: 16,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 12,
  },
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  logoutTopBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeaderCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 16,
    ...shadows.sm,
  },
  avatarBig: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#ffffff',
    ...shadows.md,
  },
  avatarBigText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate900,
  },
  userEmail: {
    fontSize: 12.5,
    color: colors.slate500,
    marginTop: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 6,
    marginTop: 10,
  },
  onlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary700,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 16,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate900,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate600,
    marginBottom: 6,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.bgApp,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13.5,
    color: colors.slate800,
    marginBottom: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    borderRadius: radii.md,
    paddingVertical: 12,
    marginTop: 14,
    gap: 8,
    ...shadows.sm,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  diagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  diagLabel: {
    fontSize: 12,
    color: colors.slate600,
  },
  diagValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.slate900,
  },
  diagValueSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary700,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate900,
    borderRadius: radii.md,
    paddingVertical: 12,
    marginTop: 14,
    gap: 8,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: radii.lg,
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    color: colors.accentRose,
    fontSize: 13.5,
    fontWeight: '800',
  },
});
