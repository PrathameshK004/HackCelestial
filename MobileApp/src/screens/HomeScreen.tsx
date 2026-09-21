/**
 * HomeScreen (Central Application Hub)
 * Matches WebApp HomePage.tsx responsive mobile view
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, BackHandler, ToastAndroid, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Header } from '../components/common/Header';
import { SyncBanner } from '../components/common/SyncBanner';
import { BottomDock, DockTab } from '../components/common/BottomDock';
import { ExploreTab } from '../components/home/ExploreTab';
import { TripsTab } from '../components/home/TripsTab';
import { ExpensesTab } from '../components/home/ExpensesTab';
import { ProfileScreen } from './ProfileScreen';
import { PaymentsScreen } from './PaymentsScreen';
import { ProfileDrawer } from '../components/common/ProfileDrawer';
import { JoinGroupModal } from '../components/home/JoinGroupModal';
import { AddExpenseModal } from '../components/group/AddExpenseModal';
import { NotificationsScreen } from './NotificationsScreen';
import { InvitationScreen } from './InvitationScreen';
import { useTrips } from '../context/TripContext';
import { groupService } from '../api/group.service';
import { syncService } from '../sync/syncService';
import { InboxNotification, PendingInvitation } from '../types';

interface HomeScreenProps {
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectTrip, onCreateTrip }) => {
  const [activeTab, setActiveTab] = useState<DockTab>('explore');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  
  // Full-page screen navigation state (entire new page, no popups)
  const [screenMode, setScreenMode] = useState<'main' | 'notifications' | 'invitation'>('main');
  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(null);
  const [inviteOrigin, setInviteOrigin] = useState<'notifications' | 'main'>('main');

  const [searchQuery, setSearchQuery] = useState('');
  const lastBackPressRef = useRef<number>(0);

  // Notifications & Invitations State matching WebApp
  const [notifications, setNotifications] = useState<InboxNotification[]>([
    {
      id: 'notif-1',
      title: 'Welcome to Triptual Mobile',
      description: 'Your collaborative group travel ledger is initialized and ready.',
      timestamp: 'Just now',
      isRead: false,
      category: 'system',
    },
    {
      id: 'notif-2',
      title: 'Offline Sync Ready',
      description: 'Expenses and settlements sync automatically when back online.',
      timestamp: '5m ago',
      isRead: false,
      category: 'security',
    },
    {
      id: 'notif-3',
      title: 'Ledger Rebalancing Active',
      description: 'Min-cash-flow transfer algorithms simplify all group debts.',
      timestamp: '1h ago',
      isRead: true,
      category: 'expense',
      actionTab: 'expenses',
    },
  ]);

  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isProcessingInviteCode, setIsProcessingInviteCode] = useState<string | null>(null);

  const { trips, addExpense, refreshTrips } = useTrips();
  const primaryTrip = trips[0];

  // Load Pending Invitations from authoritative API & strictly deduplicate
  const loadPendingInvitations = useCallback(async () => {
    try {
      const res = await groupService.getMyPendingInvitations();
      if (res && Array.isArray(res.data)) {
        // Enforce strictly unique invitation per trip (single invitation per user)
        const seen = new Set<string>();
        const uniqueInvites: PendingInvitation[] = [];
        for (const inv of res.data) {
          const key = inv.groupId || inv.inviteCode || inv.id;
          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueInvites.push(inv);
          }
        }
        setPendingInvitations(uniqueInvites);
      } else {
        setPendingInvitations([]);
      }
    } catch (err: any) {
      console.warn('Could not load pending invitations:', err?.message);
    }
  }, []);

  useEffect(() => {
    loadPendingInvitations();
  }, [loadPendingInvitations]);

  const unreadInboxCount = notifications.filter((n) => !n.isRead).length + pendingInvitations.length;

  // Clear search when tab changes
  const handleTabChange = (tab: DockTab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Notification Inbox Actions
  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleSelectNotification = (item: InboxNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    if (item.actionTab) {
      setActiveTab(item.actionTab as DockTab);
      setScreenMode('main');
    }
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAcceptInvite = async (inviteCode: string, groupName: string) => {
    const cleanCode = inviteCode?.trim().toUpperCase();
    setIsProcessingInviteCode(cleanCode);

    const matchedInv = pendingInvitations.find(
      (inv) => inv.inviteCode?.trim().toUpperCase() === cleanCode
    );
    const targetGroupId = matchedInv?.groupId;

    // 1. Instantly remove from local pendingInvitations state by code and groupId
    setPendingInvitations((prev) =>
      prev.filter((inv) => {
        const c = inv.inviteCode?.trim().toUpperCase();
        const g = inv.groupId;
        if (cleanCode && c === cleanCode) return false;
        if (targetGroupId && g === targetGroupId) return false;
        return true;
      })
    );

    try {
      const res = await groupService.acceptInvite(cleanCode);

      // Append success notification
      setNotifications((prev) => [
        {
          id: `notif-accept-${Date.now()}`,
          title: `Joined Trip: "${groupName}"`,
          description: res.message || 'You have successfully joined the trip workspace!',
          timestamp: 'Just now',
          isRead: false,
          category: 'trip',
          actionTab: 'trips',
        },
        ...prev,
      ]);

      // 2. Authoritative server refresh
      await loadPendingInvitations();
      await syncService.downloadServerData().catch(() => {});
      refreshTrips();

      Alert.alert('Joined Trip!', `You are now a member of "${groupName}". The trip has been synced to your workspace.`);
    } catch (err: any) {
      await loadPendingInvitations();
      Alert.alert('Failed to Join', err.message || 'Failed to accept invitation. It may have expired or already been processed.');
    } finally {
      setIsProcessingInviteCode(null);
    }
  };

  const handleRejectInvite = async (inviteCode: string, groupName: string) => {
    const cleanCode = inviteCode?.trim().toUpperCase();
    Alert.alert(
      'Decline Invitation',
      `Decline the invitation to join "${groupName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setIsProcessingInviteCode(cleanCode);

            const matchedInv = pendingInvitations.find(
              (inv) => inv.inviteCode?.trim().toUpperCase() === cleanCode
            );
            const targetGroupId = matchedInv?.groupId;

            // 1. Instantly remove from local pendingInvitations state by code and groupId
            setPendingInvitations((prev) =>
              prev.filter((inv) => {
                const c = inv.inviteCode?.trim().toUpperCase();
                const g = inv.groupId;
                if (cleanCode && c === cleanCode) return false;
                if (targetGroupId && g === targetGroupId) return false;
                return true;
              })
            );

            try {
              await groupService.rejectInvite(cleanCode);
              setNotifications((prev) => [
                {
                  id: `notif-declined-${Date.now()}`,
                  title: `Declined Invitation: "${groupName}"`,
                  description: 'The invitation has been declined.',
                  timestamp: 'Just now',
                  isRead: false,
                  category: 'trip',
                },
                ...prev,
              ]);
              // 2. Authoritative server refresh
              await loadPendingInvitations();
            } catch (err: any) {
              await loadPendingInvitations();
              Alert.alert('Error', err.message || 'Failed to decline invitation.');
            } finally {
              setIsProcessingInviteCode(null);
            }
          },
        },
      ]
    );
  };

  // ── Back Navigation Handler ──────────────────────────────────
  useEffect(() => {
    const onHardwareBackPress = () => {
      // 1. Return from full-page Invitation Screen to previous screen
      if (screenMode === 'invitation') {
        if (inviteOrigin === 'notifications') {
          setScreenMode('notifications');
        } else {
          setScreenMode('main');
        }
        return true;
      }

      // 2. Return from full-page Notifications Screen to Main Hub
      if (screenMode === 'notifications') {
        setScreenMode('main');
        return true;
      }

      // 3. Close Profile Drawer if open
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return true;
      }

      // 4. Dismiss Join Group Modal if open
      if (isJoinModalOpen) {
        setIsJoinModalOpen(false);
        return true;
      }

      // 5. Dismiss Quick Expense Modal if open
      if (isQuickExpenseOpen) {
        setIsQuickExpenseOpen(false);
        return true;
      }

      // 6. Clear active search input
      if (searchQuery.length > 0) {
        setSearchQuery('');
        return true;
      }

      // 7. If on any secondary tab, return to explore
      if (activeTab !== 'explore') {
        setActiveTab('explore');
        return true;
      }

      // 8. On root Explore tab: Double-tap to exit prevention
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPressRef.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      }
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, [screenMode, inviteOrigin, isDrawerOpen, isJoinModalOpen, isQuickExpenseOpen, searchQuery, activeTab]);

  // ── Full-Page View 1: Notifications & Activity Inbox Screen (entire new page, no popups) ──
  if (screenMode === 'notifications') {
    return (
      <NotificationsScreen
        onBack={() => setScreenMode('main')}
        notifications={notifications}
        pendingInvitations={pendingInvitations}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onSelectNotification={handleSelectNotification}
        onClearAll={handleClearAllNotifications}
        onDeleteNotification={handleDeleteNotification}
        onAcceptInvite={handleAcceptInvite}
        onRejectInvite={handleRejectInvite}
        onOpenInvitationDetails={(invite) => {
          setActiveInviteCode(invite.inviteCode);
          setInviteOrigin('notifications');
          setScreenMode('invitation');
        }}
        onRefresh={loadPendingInvitations}
        isProcessingInviteCode={isProcessingInviteCode}
      />
    );
  }

  // ── Full-Page View 2: Trip Invitation Review Screen (entire new page, no popups) ──
  if (screenMode === 'invitation') {
    return (
      <InvitationScreen
        inviteCode={activeInviteCode}
        onBack={async () => {
          await loadPendingInvitations();
          if (inviteOrigin === 'notifications') {
            setScreenMode('notifications');
          } else {
            setScreenMode('main');
          }
        }}
        onAccepted={async (tripId, resolvedCode) => {
          const targetCode = (resolvedCode || activeInviteCode)?.trim().toUpperCase();
          if (targetCode) {
            setPendingInvitations((prev) =>
              prev.filter((inv) => inv.inviteCode?.trim().toUpperCase() !== targetCode)
            );
          }
          await loadPendingInvitations();
          await syncService.downloadServerData().catch(() => {});
          refreshTrips();
          if (tripId) {
            onSelectTrip(tripId);
          } else {
            setScreenMode('main');
            setActiveTab('trips');
          }
        }}
        onDeclined={async (resolvedCode) => {
          const targetCode = (resolvedCode || activeInviteCode)?.trim().toUpperCase();
          if (targetCode) {
            setPendingInvitations((prev) =>
              prev.filter((inv) => inv.inviteCode?.trim().toUpperCase() !== targetCode)
            );
          }
          await loadPendingInvitations();
          if (inviteOrigin === 'notifications') {
            setScreenMode('notifications');
          } else {
            setScreenMode('main');
          }
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Top Header */}
        {activeTab !== 'payments' && activeTab !== 'profile' && (
          <>
            <Header
              onPressProfile={() => setIsDrawerOpen(true)}
              onPressNotifications={() => setScreenMode('notifications')}
              unreadCount={unreadInboxCount}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Sync Status Banner */}
            <SyncBanner />
          </>
        )}

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'explore' && (
            <ExploreTab
              searchQuery={searchQuery}
              onSelectTrip={onSelectTrip}
              onCreateTrip={onCreateTrip}
            />
          )}
          {activeTab === 'trips' && (
            <TripsTab
              onSelectTrip={onSelectTrip}
              onCreateTrip={onCreateTrip}
              onJoinTrip={() => setIsJoinModalOpen(true)}
              searchQuery={searchQuery}
            />
          )}
          {activeTab === 'expenses' && <ExpensesTab searchQuery={searchQuery} />}
          {activeTab === 'payments' && (
            <PaymentsScreen onBack={() => setActiveTab('explore')} />
          )}
          {(activeTab as any) === 'profile' && (
            <ProfileScreen onBack={() => setActiveTab('explore')} />
          )}
        </View>

        {/* Floating Bottom Navigation Dock */}
        <BottomDock
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onCreatePress={onCreateTrip}
        />

        {/* Join Group with Code Modal */}
        <JoinGroupModal
          visible={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          onJoined={async () => {
            await syncService.downloadServerData().catch(() => {});
            refreshTrips();
          }}
          onReviewInvite={(code) => {
            setIsJoinModalOpen(false);
            setActiveInviteCode(code);
            setInviteOrigin('main');
            setScreenMode('invitation');
          }}
        />

        {primaryTrip && (
          <AddExpenseModal
            visible={isQuickExpenseOpen}
            tripId={primaryTrip.id}
            members={primaryTrip.members || []}
            onClose={() => setIsQuickExpenseOpen(false)}
            onSubmit={async (data) => {
              await addExpense(primaryTrip.id, data);
            }}
          />
        )}

        {/* Profile Hamburger Drawer */}
        <ProfileDrawer
          visible={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSelectOption={(key) => {
            if (key === 'profile') {
              setActiveTab('profile' as any);
            } else if (key === 'payments') {
              setActiveTab('payments');
            } else if (key === 'saved') {
              setActiveTab('trips');
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  tabContent: {
    flex: 1,
  },
});
