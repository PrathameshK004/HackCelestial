/**
 * HomeScreen (Central Application Hub)
 * Matches WebApp HomePage.tsx responsive mobile view
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, BackHandler, ToastAndroid, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Header } from '../components/common/Header';
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
import { AboutScreen } from './AboutScreen';
import { HelpSupportScreen } from './HelpSupportScreen';
import { SecurityScreen } from './SecurityScreen';
import { useTrips } from '../context/TripContext';
import { groupService } from '../api/group.service';
import { notificationService as apiNotificationService } from '../api/notification.service';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socketService';
import { storage } from '../database/storage';
import { InboxNotification, PendingInvitation } from '../types';

interface HomeScreenProps {
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectTrip, onCreateTrip }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DockTab>('explore');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  
  // Full-page screen navigation state (entire new page, no popups)
  const [screenMode, setScreenMode] = useState<'main' | 'notifications' | 'invitation' | 'about' | 'help' | 'security'>('main');
  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(null);
  const [inviteOrigin, setInviteOrigin] = useState<'notifications' | 'main'>('main');

  const [searchQuery, setSearchQuery] = useState('');
  const lastBackPressRef = useRef<number>(0);

  // Notifications & Invitations State matching WebApp
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);

  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isProcessingInviteCode, setIsProcessingInviteCode] = useState<string | null>(null);

  const { trips, addExpense, refreshTrips } = useTrips();
  const primaryTrip = trips[0];

  const mapCategory = (type?: string): InboxNotification['category'] => {
    if (!type) return 'system';
    const lower = type.toLowerCase();
    if (lower.includes('invite') || lower.includes('member') || lower.includes('group')) return 'trip';
    if (lower.includes('expense') || lower.includes('settlement') || lower.includes('payment')) return 'expense';
    if (lower.includes('security') || lower.includes('auth')) return 'security';
    return 'system';
  };

  // Load Pending Invitations from authoritative API & strictly deduplicate
  const loadPendingInvitations = useCallback(async () => {
    try {
      const res = await groupService.getMyPendingInvitations();
      if (res && Array.isArray(res.data)) {
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

  // Load Live In-App Notifications from API and merge persistent local read state
  const loadNotifications = useCallback(async () => {
    try {
      const [res, storedReadIds] = await Promise.all([
        notificationService.getUserNotifications(),
        storage.getReadNotificationIds(),
      ]);
      const readSet = new Set(storedReadIds || []);

      if (res && Array.isArray(res.data)) {
        const mapped: InboxNotification[] = res.data.map(item => ({
          id: item.id,
          title: item.title,
          description: item.body,
          timestamp: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          isRead: Boolean(item.isRead || (item.id && readSet.has(item.id))),
          category: mapCategory(item.type),
          actionTab: item.type?.toLowerCase().includes('invite') ? 'trips' : 'expenses'
        }));
        setNotifications(mapped);
      }
    } catch (err: any) {
      console.warn('Could not load in-app notifications:', err?.message);
    }
  }, []);

  useEffect(() => {
    loadPendingInvitations();
    loadNotifications();

    // 1. Connect Socket.io for Real-Time Instant Notifications
    socketService.connect().catch(() => {});

    // 2. Listen for Real-Time Notification Events via WebSockets
    const unsubscribeNotif = socketService.onNotification(async (rawNotif) => {
      if (!rawNotif) return;

      const storedReadIds = await storage.getReadNotificationIds();
      const readSet = new Set(storedReadIds || []);
      const notifId = rawNotif.id || `notif-${Date.now()}`;

      const newNotifItem: InboxNotification = {
        id: notifId,
        title: rawNotif.title || 'New Activity',
        description: rawNotif.body || rawNotif.description || rawNotif.message || '',
        timestamp: 'Just now',
        isRead: Boolean(rawNotif.isRead || readSet.has(notifId)),
        category: mapCategory(rawNotif.type),
        actionTab: rawNotif.type?.toLowerCase().includes('invite') ? 'trips' : 'expenses'
      };

      setNotifications((prev) => [newNotifItem, ...prev.filter((n) => n.id !== newNotifItem.id)]);

      // Display Native Foreground Notification Banner
      notificationService.sendLocalNotification(
        newNotifItem.title,
        newNotifItem.description,
        'invites',
        rawNotif.data
      ).catch(() => {});

      // Instant refresh of invitations & trip state & notification inbox
      loadPendingInvitations();
      loadNotifications();
      refreshTrips().catch(() => {});
    });

    // 3. Low-frequency safety background sync
    const intervalId = setInterval(() => {
      loadPendingInvitations();
      loadNotifications();
    }, 15000);

    return () => {
      unsubscribeNotif();
      clearInterval(intervalId);
    };
  }, [loadPendingInvitations, loadNotifications, refreshTrips]);

  const unreadInboxCount = notifications.filter((n) => !n.isRead).length + pendingInvitations.length;

  // Clear search when tab changes
  const handleTabChange = (tab: DockTab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Notification Inbox Actions
  const handleMarkAllNotificationsRead = async () => {
    const allIds = notifications.map((n) => n.id).filter(Boolean);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await storage.markAllNotificationsRead(allIds);
    notificationService.markAsRead(undefined, true).catch(() => {});
  };

  const handleSelectNotification = async (item: InboxNotification) => {
    // 1. Immediately update in-memory state
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    // 2. Persist locally to device storage so it never reverts on re-fetch
    if (item.id) {
      await storage.markNotificationRead(item.id);
    }
    // 3. Notify backend API
    notificationService.markAsRead(item.id).catch(() => {});
  };

  const handleClearAllNotifications = async () => {
    setNotifications([]);
    await storage.clearReadNotificationIds();
    notificationService.clearAllNotifications().catch(() => {});
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    notificationService.deleteNotification(id).catch(() => {});
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

      // 1. Trigger push notification
      await notificationService.sendLocalNotification(
        'Invitation Accepted 🎉',
        `You have officially joined "${groupName}". Expenses are now enabled.`,
        'invites'
      );

      // 3. Append success in-app notification
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

      // 4. Authoritative server refresh & local trips reload
      await loadPendingInvitations();
      await refreshTrips();

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

              // 1. Trigger push notification
              await notificationService.sendLocalNotification(
                'Invitation Declined',
                `You have declined the invitation to join "${groupName}".`,
                'invites'
              );

              // 3. Append in-app notification
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

              // 4. Refresh
              await loadPendingInvitations();
              await refreshTrips();
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

  const handleFullRefresh = useCallback(async () => {
    await loadPendingInvitations();
    await loadNotifications();
    await refreshTrips();
  }, [loadPendingInvitations, loadNotifications, refreshTrips]);

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

      // 2. Return from full-page Notifications / About / Help / Security Screen to Main Hub
      if (screenMode === 'notifications' || screenMode === 'about' || screenMode === 'help' || screenMode === 'security') {
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
        onRefresh={handleFullRefresh}
        isProcessingInviteCode={isProcessingInviteCode}
        onNavigateTab={(tab) => {
          setActiveTab(tab as DockTab);
          setScreenMode('main');
        }}
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
          await refreshTrips();
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

  // ── Full-Page View 3: About Triptual Screen ──
  if (screenMode === 'about') {
    return (
      <AboutScreen
        onBack={() => setScreenMode('main')}
      />
    );
  }

  // ── Full-Page View 4: Help & Support Screen ──
  if (screenMode === 'help') {
    return (
      <HelpSupportScreen
        onBack={() => setScreenMode('main')}
      />
    );
  }

  // ── Full-Page View 5: Security & Password Settings Screen ──
  if (screenMode === 'security') {
    return (
      <SecurityScreen
        onBack={() => setScreenMode('main')}
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
          </>
        )}

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'explore' && (
            <ExploreTab
              searchQuery={searchQuery}
              onSelectTrip={onSelectTrip}
              onCreateTrip={onCreateTrip}
              onRefresh={handleFullRefresh}
            />
          )}
          {activeTab === 'trips' && (
            <TripsTab
              onSelectTrip={onSelectTrip}
              onCreateTrip={onCreateTrip}
              onJoinTrip={() => setIsJoinModalOpen(true)}
              searchQuery={searchQuery}
              onRefresh={handleFullRefresh}
            />
          )}
          {activeTab === 'expenses' && (
            <ExpensesTab
              searchQuery={searchQuery}
              onRefresh={handleFullRefresh}
            />
          )}
          {activeTab === 'payments' && (
            <PaymentsScreen onBack={() => setActiveTab('explore')} />
          )}
          {(activeTab as any) === 'profile' && (
            <ProfileScreen onBack={() => setActiveTab('explore')} />
          )}
        </View>

        {/* Floating Bottom Navigation Dock — hidden on Profile */}
        {activeTab !== 'profile' && (
          <BottomDock
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onCreatePress={onCreateTrip}
          />
        )}

        {/* Join Group with Code Modal */}
        <JoinGroupModal
          visible={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          onJoined={async () => {
            await refreshTrips();
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
            } else if (key === 'about') {
              setScreenMode('about');
            } else if (key === 'help') {
              setScreenMode('help');
            } else if (key === 'security') {
              setScreenMode('security');
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
