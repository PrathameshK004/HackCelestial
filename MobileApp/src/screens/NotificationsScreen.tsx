/**
 * NotificationsScreen
 * Clean, modern notification & invitation full page screen
 * Matches standard mobile layout with two-option tabular menu:
 * [Notifications] and [Invitations] with active blue underline and sub-filter pills
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MoreVertical,
  Bell,
  Users,
  Compass,
  Split,
  ShieldCheck,
  Trash2,
  Check,
  X,
  CheckCheck,
  MapPin,
  Calendar,
  ArrowRight,
  Inbox,
  Clock,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { InboxNotification, PendingInvitation } from '../types';

interface NotificationsScreenProps {
  onBack: () => void;
  notifications: InboxNotification[];
  pendingInvitations: PendingInvitation[];
  onMarkAllAsRead: () => void;
  onSelectNotification: (notification: InboxNotification) => void;
  onClearAll: () => void;
  onDeleteNotification?: (id: string) => void;
  onAcceptInvite: (inviteCode: string, groupName: string) => Promise<void>;
  onRejectInvite: (inviteCode: string, groupName: string) => Promise<void>;
  onOpenInvitationDetails: (invite: PendingInvitation) => void;
  onRefresh?: () => Promise<void>;
  isProcessingInviteCode?: string | null;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
  notifications,
  pendingInvitations,
  onMarkAllAsRead,
  onSelectNotification,
  onClearAll,
  onDeleteNotification,
  onAcceptInvite,
  onRejectInvite,
  onOpenInvitationDetails,
  onRefresh,
  isProcessingInviteCode = null,
}) => {
  // Main Tabular Menu: 'notifications' | 'invitations'
  const [activeTab, setActiveTab] = useState<'notifications' | 'invitations'>('notifications');

  // Sub-filter pill selection for notifications
  const [subFilter, setSubFilter] = useState<'all' | 'unread' | 'trip' | 'expense' | 'security' | 'system'>('all');

  // Set of invite codes accepted or declined in current session to remove immediately
  const [resolvedInviteCodes, setResolvedInviteCodes] = useState<Set<string>>(new Set());

  const [refreshing, setRefreshing] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Active pending invitations excluding resolved codes & guaranteed strictly single invitation per trip
  const activePendingInvitations = React.useMemo(() => {
    const seen = new Set<string>();
    const result: PendingInvitation[] = [];
    for (const inv of pendingInvitations) {
      const code = inv.inviteCode?.trim().toUpperCase();
      const groupId = inv.groupId?.trim();
      const isResolved =
        (code && resolvedInviteCodes.has(code)) ||
        (groupId && resolvedInviteCodes.has(groupId));
      if (isResolved) continue;

      const key = groupId || code || inv.id;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(inv);
      }
    }
    return result;
  }, [pendingInvitations, resolvedInviteCodes]);

  // Counts
  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;
  const totalNotifsCount = notifications.length;
  const pendingInvitesCount = activePendingInvitations.length;

  const handleQuickAccept = async (inviteCode: string, groupName: string) => {
    const code = inviteCode?.trim().toUpperCase();
    const matched = pendingInvitations.find((i) => i.inviteCode?.trim().toUpperCase() === code);
    const groupId = matched?.groupId?.trim();
    if (code) {
      setResolvedInviteCodes((prev) => new Set([...prev, code, ...(groupId ? [groupId] : [])]));
    }
    try {
      await onAcceptInvite(inviteCode, groupName);
    } catch (e) {
      // If failed, restore
      if (code) {
        setResolvedInviteCodes((prev) => {
          const next = new Set(prev);
          next.delete(code);
          if (groupId) next.delete(groupId);
          return next;
        });
      }
    }
  };

  const handleQuickDecline = async (inviteCode: string, groupName: string) => {
    const code = inviteCode?.trim().toUpperCase();
    const matched = pendingInvitations.find((i) => i.inviteCode?.trim().toUpperCase() === code);
    const groupId = matched?.groupId?.trim();
    if (code) {
      setResolvedInviteCodes((prev) => new Set([...prev, code, ...(groupId ? [groupId] : [])]));
    }
    try {
      await onRejectInvite(inviteCode, groupName);
    } catch (e) {
      if (code) {
        setResolvedInviteCodes((prev) => {
          const next = new Set(prev);
          next.delete(code);
          if (groupId) next.delete(groupId);
          return next;
        });
      }
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    if (subFilter === 'unread') return !n.isRead;
    if (subFilter === 'trip') return n.category === 'trip';
    if (subFilter === 'expense') return n.category === 'expense';
    if (subFilter === 'security') return n.category === 'security';
    if (subFilter === 'system') return n.category === 'system';
    return true;
  });

  const getCategoryIcon = (category: InboxNotification['category']) => {
    switch (category) {
      case 'trip':
        return <Compass size={20} color="#059669" strokeWidth={2} />;
      case 'expense':
        return <Split size={20} color="#D97706" strokeWidth={2} />;
      case 'security':
        return <ShieldCheck size={20} color="#2563EB" strokeWidth={2} />;
      case 'system':
      default:
        return <Bell size={20} color="#2563EB" strokeWidth={2} />;
    }
  };

  const getCategoryBg = (category: InboxNotification['category']) => {
    switch (category) {
      case 'trip':
        return '#ECFDF5';
      case 'expense':
        return '#FEF3C7';
      case 'security':
        return '#EFF6FF';
      case 'system':
      default:
        return '#EFF6FF';
    }
  };

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start) return 'Flexible Dates';
    try {
      const s = new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (!end) return s;
      const e = new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return `${s} – ${e}`;
    } catch {
      return start;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'TR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* ── Top Header Row ─────────────────────────────────────────── */}
      <View style={styles.topHeader}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
        </TouchableOpacity>

        {/* ── Two-Option Tabular Menu: [Notifications] & [Invitations] ── */}
        <View style={styles.tabMenuContainer}>
          {/* Tab 1: Notifications */}
          <TouchableOpacity
            style={styles.tabMenuItem}
            onPress={() => setActiveTab('notifications')}
            activeOpacity={0.75}
          >
            <View style={styles.tabContentRow}>
              <Text
                style={[
                  styles.tabMenuText,
                  activeTab === 'notifications' && styles.tabMenuTextActive,
                ]}
              >
                Notifications
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  activeTab === 'notifications' && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === 'notifications' && styles.tabBadgeTextActive,
                  ]}
                >
                  {unreadNotifsCount > 0 ? unreadNotifsCount : totalNotifsCount}
                </Text>
              </View>
            </View>
            {activeTab === 'notifications' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          {/* Tab 2: Invitations */}
          <TouchableOpacity
            style={styles.tabMenuItem}
            onPress={() => setActiveTab('invitations')}
            activeOpacity={0.75}
          >
            <View style={styles.tabContentRow}>
              <Text
                style={[
                  styles.tabMenuText,
                  activeTab === 'invitations' && styles.tabMenuTextActive,
                ]}
              >
                Invitations
              </Text>
              {pendingInvitesCount > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    activeTab === 'invitations' && styles.tabBadgeActiveEmerald,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      activeTab === 'invitations' && styles.tabBadgeTextActiveEmerald,
                    ]}
                  >
                    {pendingInvitesCount}
                  </Text>
                </View>
              )}
            </View>
            {activeTab === 'invitations' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>

        {/* 3-Dots More Options Menu */}
        <TouchableOpacity
          onPress={() => setShowOptionsMenu(true)}
          style={styles.moreBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="More options"
        >
          <MoreVertical size={21} color="#64748B" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ── Sub-Filter Capsule Pills Row ─────────────────────────────── */}
      {/* ── Sub-Filter Capsule Pills Row (Only for Notifications) ─────── */}
      {activeTab === 'notifications' && (
        <View style={styles.subFilterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subFilterScrollContent}
          >
            {/* All */}
            <TouchableOpacity
              style={[styles.pill, subFilter === 'all' && styles.pillActive]}
              onPress={() => setSubFilter('all')}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, subFilter === 'all' && styles.pillTextActive]}>
                All
              </Text>
            </TouchableOpacity>

            {/* Unread */}
            <TouchableOpacity
              style={[styles.pill, subFilter === 'unread' && styles.pillActive]}
              onPress={() => setSubFilter('unread')}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, subFilter === 'unread' && styles.pillTextActive]}>
                Unread {unreadNotifsCount > 0 ? `(${unreadNotifsCount})` : ''}
              </Text>
            </TouchableOpacity>

            {/* Trips */}
            <TouchableOpacity
              style={[styles.pill, subFilter === 'trip' && styles.pillActive]}
              onPress={() => setSubFilter('trip')}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, subFilter === 'trip' && styles.pillTextActive]}>
                Trips
              </Text>
            </TouchableOpacity>

            {/* Expenses */}
            <TouchableOpacity
              style={[styles.pill, subFilter === 'expense' && styles.pillActive]}
              onPress={() => setSubFilter('expense')}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, subFilter === 'expense' && styles.pillTextActive]}>
                Expenses
              </Text>
            </TouchableOpacity>

            {/* Security */}
            <TouchableOpacity
              style={[styles.pill, subFilter === 'security' && styles.pillActive]}
              onPress={() => setSubFilter('security')}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, subFilter === 'security' && styles.pillTextActive]}>
                Security
              </Text>
            </TouchableOpacity>

            {/* System */}
            <TouchableOpacity
              style={[styles.pill, subFilter === 'system' && styles.pillActive]}
              onPress={() => setSubFilter('system')}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, subFilter === 'system' && styles.pillTextActive]}>
                System
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ── Main List Content ────────────────────────────────────────── */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        {/* VIEW 1: NOTIFICATIONS LIST */}
        {activeTab === 'notifications' && (
          <>
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Bell size={28} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptyDesc}>
                  {subFilter === 'unread'
                    ? "You're all caught up! No unread messages."
                    : 'Activity, expense splits, and trip notices will appear here.'}
                </Text>
              </View>
            ) : (
              filteredNotifications.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.notificationItem}
                  activeOpacity={0.7}
                  onPress={() => onSelectNotification(item)}
                >
                  {/* Left: Soft Rounded Avatar Icon */}
                  <View
                    style={[
                      styles.itemAvatarCircle,
                      { backgroundColor: getCategoryBg(item.category) },
                    ]}
                  >
                    {getCategoryIcon(item.category)}
                  </View>

                  {/* Center: Title, Description, Timestamp */}
                  <View style={styles.itemCenterContent}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <Text style={styles.itemTimestamp}>{item.timestamp}</Text>
                  </View>

                  {/* Right Column: Unread Dot + Trash Button */}
                  <View style={styles.itemRightColumn}>
                    {!item.isRead ? (
                      <View style={styles.unreadBlueDot} />
                    ) : (
                      <View style={styles.emptyDotPlaceholder} />
                    )}

                    <TouchableOpacity
                      onPress={() => onDeleteNotification?.(item.id)}
                      style={styles.trashBtn}
                      activeOpacity={0.6}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Delete notification"
                    >
                      <Trash2 size={16} color="#94A3B8" strokeWidth={1.8} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* VIEW 2: INVITATIONS LIST (Industry-Grade Executive Cards) */}
        {activeTab === 'invitations' && (
          <View style={{ paddingVertical: 8 }}>
            {activePendingInvitations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Inbox size={28} color="#059669" />
                </View>
                <Text style={styles.emptyTitle}>No pending invitations</Text>
                <Text style={styles.emptyDesc}>
                  When someone invites you to join a trip workspace, you'll receive an official invitation card here.
                </Text>
              </View>
            ) : (
              activePendingInvitations.map((invite) => {
                const isProcessing = isProcessingInviteCode === invite.inviteCode;

                return (
                  <View key={invite.id} style={styles.proInviteCard}>
                    {/* Top Status Header */}
                    <View style={styles.proCardHeader}>
                      <View style={styles.proStatusBadge}>
                        <View style={styles.proLiveDot} />
                        <Text style={styles.proStatusText}>OFFICIAL INVITATION</Text>
                      </View>
                      <View style={styles.proCodeBadge}>
                        <Text style={styles.proCodeText}>{invite.inviteCode}</Text>
                      </View>
                    </View>

                    {/* Trip Title & Destination */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => onOpenInvitationDetails(invite)}
                    >
                      <Text style={styles.proTripTitle} numberOfLines={1}>
                        {invite.groupName}
                      </Text>
                      {Boolean(invite.destination) && (
                        <View style={styles.proDestinationRow}>
                          <MapPin size={13} color="#059669" strokeWidth={2.2} />
                          <Text style={styles.proDestinationText}>{invite.destination}</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Inviter Info Strip */}
                    <View style={styles.proInviterStrip}>
                      <View style={styles.proInviterAvatar}>
                        <Text style={styles.proInviterAvatarText}>
                          {getInitials(invite.organizerName)}
                        </Text>
                      </View>
                      <View style={styles.proInviterInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={styles.proInviterName} numberOfLines={1}>
                            {invite.organizerName || 'Trip Organizer'}
                          </Text>
                          <ShieldCheck size={13} color="#059669" />
                        </View>
                        <Text style={styles.proInviterSub}>Trip Host • Invited you as {invite.role || 'Traveler'}</Text>
                      </View>
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.proActionsRow}>
                      <TouchableOpacity
                        style={styles.proAcceptBtn}
                        onPress={() => handleQuickAccept(invite.inviteCode, invite.groupName)}
                        disabled={isProcessing}
                        activeOpacity={0.85}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Check size={14} color="#FFFFFF" strokeWidth={2.4} />
                            <Text style={styles.proAcceptBtnText}>Accept & Join</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.proDeclineBtn}
                        onPress={() => handleQuickDecline(invite.inviteCode, invite.groupName)}
                        disabled={isProcessing}
                        activeOpacity={0.8}
                      >
                        <X size={14} color="#64748B" strokeWidth={2.2} />
                        <Text style={styles.proDeclineBtnText}>Decline</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Review Details Link */}
                    <TouchableOpacity
                      style={styles.proReviewLink}
                      onPress={() => onOpenInvitationDetails(invite)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.proReviewLinkText}>Review full itinerary & roster</Text>
                      <ArrowRight size={13} color="#2563EB" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── 3-Dots Dropdown Options Modal ─────────────────────────────── */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.menuCard}>
            <Text style={styles.menuHeading}>Inbox Options</Text>

            <TouchableOpacity
              style={styles.menuOption}
              activeOpacity={0.7}
              onPress={() => {
                setShowOptionsMenu(false);
                onMarkAllAsRead();
              }}
            >
              <CheckCheck size={18} color="#2563EB" />
              <Text style={styles.menuOptionText}>Mark all as read</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              activeOpacity={0.7}
              onPress={() => {
                setShowOptionsMenu(false);
                Alert.alert(
                  'Clear Notifications',
                  'Are you sure you want to clear all notification history?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear All',
                      style: 'destructive',
                      onPress: onClearAll,
                    },
                  ]
                );
              }}
            >
              <Trash2 size={18} color="#EF4444" />
              <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>
                Clear all notifications
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
              onPress={() => {
                setShowOptionsMenu(false);
                handleRefresh();
              }}
            >
              <Clock size={18} color="#64748B" />
              <Text style={styles.menuOptionText}>Refresh updates</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* ── Top Header Bar ── */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 8,
    height: 52,
  },
  backBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Tabular Menu ── */
  tabMenuContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    marginLeft: 4,
  },
  tabMenuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: '100%',
  },
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabMenuText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabMenuTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    backgroundColor: '#EFF6FF',
  },
  tabBadgeActiveEmerald: {
    backgroundColor: '#ECFDF5',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBadgeTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  tabBadgeTextActiveEmerald: {
    color: '#059669',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2.8,
    backgroundColor: '#2563EB',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  /* ── Sub-Filter Capsule Pills ── */
  subFilterSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 10,
  },
  subFilterScrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  /* ── Main List Container ── */
  listContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContentContainer: {
    paddingBottom: 32,
  },

  /* ── Notification Row Item (Matches image) ── */
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCenterContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  itemTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 3,
  },
  itemTimestamp: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '400',
  },
  itemRightColumn: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingVertical: 2,
  },
  unreadBlueDot: {
    width: 7.5,
    height: 7.5,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  emptyDotPlaceholder: {
    width: 7.5,
    height: 7.5,
  },
  trashBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Industry-Grade Executive Invitation Card ── */
  proInviteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  proCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  proStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  proStatusText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.3,
  },
  proCodeBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  proCodeText: {
    fontSize: 11.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
    color: '#334155',
  },
  proTripTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 21,
    marginBottom: 2,
  },
  proDestinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  proDestinationText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#059669',
  },
  proInviterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
  },
  proInviterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proInviterAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  proInviterInfo: {
    flex: 1,
  },
  proInviterName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  proInviterSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  proActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proAcceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  proAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  proDeclineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  proDeclineBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  proReviewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 10,
    marginTop: 2,
  },
  proReviewLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },

  /* ── Empty State ── */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* ── Modal Options Sheet ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 60 : 54,
    paddingRight: 16,
  },
  menuCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuOptionText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
});
