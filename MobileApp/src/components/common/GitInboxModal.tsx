/**
 * Git-Style Inbox Notifications & Invitations Drawer Modal
 * Exact mobile replica of WebApp GitInboxDrawer.tsx
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import {
  Inbox,
  CheckCheck,
  X,
  Clock,
  Compass,
  Split,
  ShieldCheck,
  Bell,
  Check,
  Trash2,
  Users,
  MapPin,
  Calendar,
  MailCheck,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { InboxNotification, PendingInvitation } from '../../types';

interface GitInboxModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: InboxNotification[];
  pendingInvitations: PendingInvitation[];
  onMarkAllAsRead: () => void;
  onSelectNotification: (notification: InboxNotification) => void;
  onClearAll: () => void;
  onAcceptInvite: (inviteCode: string, groupName: string) => Promise<void>;
  onRejectInvite: (inviteCode: string, groupName: string) => Promise<void>;
  onOpenInvitationDetails?: (invite: PendingInvitation) => void;
  isProcessingInviteCode?: string | null;
}

export const GitInboxModal: React.FC<GitInboxModalProps> = ({
  visible,
  onClose,
  notifications,
  pendingInvitations,
  onMarkAllAsRead,
  onSelectNotification,
  onClearAll,
  onAcceptInvite,
  onRejectInvite,
  onOpenInvitationDetails,
  isProcessingInviteCode = null,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'invitations'>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length + pendingInvitations.length;
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getCategoryIcon = (category: InboxNotification['category']) => {
    switch (category) {
      case 'trip':
        return <Compass size={12} color="#059669" />;
      case 'expense':
        return <Split size={12} color="#D97706" />;
      case 'security':
        return <ShieldCheck size={12} color="#0969DA" />;
      case 'system':
      default:
        return <Bell size={12} color="#64748B" />;
    }
  };

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start) return 'Flexible Dates';
    try {
      const s = new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (!end) return s;
      const e = new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return `${s} - ${e}`;
    } catch {
      return start;
    }
  };

  const renderInvitationCard = (invite: PendingInvitation) => {
    const isProcessing = isProcessingInviteCode === invite.inviteCode;

    return (
      <TouchableOpacity
        key={invite.id}
        style={styles.inviteCard}
        activeOpacity={0.9}
        onPress={() => onOpenInvitationDetails && onOpenInvitationDetails(invite)}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardCategoryBox}>
            <Users size={12} color="#059669" />
            <Text style={styles.cardCategoryLabel}>Group Invitation</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{invite.role || 'Traveler'}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <View style={styles.unreadBulletEmerald} />
            <Text style={styles.cardTitle} numberOfLines={1}>
              {invite.groupName}
            </Text>
          </View>
          <Text style={styles.inviterSubText}>
            Invited by <Text style={{ fontWeight: '700', color: '#0F172A' }}>{invite.organizerName || 'Trip Organizer'}</Text>
          </Text>
        </View>

        {/* Destination & Meta Strip */}
        <View style={styles.metaStrip}>
          {Boolean(invite.destination) && (
            <View style={styles.metaCell}>
              <MapPin size={11} color="#64748B" />
              <Text style={styles.metaCellText}>{invite.destination}</Text>
            </View>
          )}
          <View style={styles.metaCell}>
            <Calendar size={11} color="#64748B" />
            <Text style={styles.metaCellText}>{formatDateRange(invite.startDate, invite.endDate)}</Text>
          </View>
        </View>

        {/* Accept & Deny Actions */}
        <View style={styles.inviteActionsRow}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => onAcceptInvite(invite.inviteCode, invite.groupName)}
            disabled={isProcessing}
            activeOpacity={0.85}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={13} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.denyButton}
            onPress={() => onRejectInvite(invite.inviteCode, invite.groupName)}
            disabled={isProcessing}
            activeOpacity={0.85}
          >
            <X size={13} color="#64748B" strokeWidth={2.4} />
            <Text style={styles.denyButtonText}>Deny</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.drawerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.inboxTitleWrap}>
                <Inbox size={18} color="#0969DA" strokeWidth={2.2} />
                <Text style={styles.inboxTitleText}>Inbox</Text>
                {unreadCount > 0 && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{unreadCount} new</Text>
                  </View>
                )}
              </View>

              <View style={styles.headerActions}>
                {notifications.some((n) => !n.isRead) && (
                  <TouchableOpacity
                    style={styles.markReadBtn}
                    onPress={onMarkAllAsRead}
                    activeOpacity={0.7}
                  >
                    <CheckCheck size={12} color="#475569" />
                    <Text style={styles.markReadBtnText}>Mark read</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                  <X size={15} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterBar}>
              <TouchableOpacity
                style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
                onPress={() => setFilter('all')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>
                  All ({notifications.length + pendingInvitations.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, filter === 'unread' && styles.filterPillActive]}
                onPress={() => setFilter('unread')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, filter === 'unread' && styles.filterPillTextActive]}>
                  Unread ({unreadCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, filter === 'invitations' && styles.filterPillActive]}
                onPress={() => setFilter('invitations')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, filter === 'invitations' && styles.filterPillTextActive]}>
                  Invitations
                </Text>
                {pendingInvitations.length > 0 && (
                  <View style={[styles.pillBadge, filter === 'invitations' && styles.pillBadgeActive]}>
                    <Text style={styles.pillBadgeText}>{pendingInvitations.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Body Feed */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── INVITATIONS TAB ── */}
            {filter === 'invitations' && (
              <View style={styles.listWrap}>
                {pendingInvitations.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyCircle}>
                      <MailCheck size={22} color="#0969DA" strokeWidth={2.2} />
                    </View>
                    <Text style={styles.emptyTitle}>No pending invitations</Text>
                    <Text style={styles.emptyDesc}>
                      When you are invited to a group trip, it will arrive here in real-time as well as via email.
                    </Text>
                  </View>
                ) : (
                  pendingInvitations.map(renderInvitationCard)
                )}
              </View>
            )}

            {/* ── ALL TAB ── */}
            {filter === 'all' && (
              <View style={styles.listWrap}>
                {/* Show pending invitations first */}
                {pendingInvitations.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionHeaderText}>Trip Invitations ({pendingInvitations.length})</Text>
                    </View>
                    {pendingInvitations.map(renderInvitationCard)}
                  </View>
                )}

                {/* Activity Notifications */}
                {filteredNotifications.length === 0 && pendingInvitations.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyCircle}>
                      <Check size={22} color="#0969DA" strokeWidth={2.4} />
                    </View>
                    <Text style={styles.emptyTitle}>All caught up!</Text>
                    <Text style={styles.emptyDesc}>
                      You have no notifications or invitations right now. Activity and updates will appear here.
                    </Text>
                  </View>
                ) : (
                  filteredNotifications.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
                      onPress={() => onSelectNotification(item)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cardTopRow}>
                        <View style={styles.cardCategoryBox}>
                          {getCategoryIcon(item.category)}
                          <Text style={styles.cardCategoryLabel}>{item.category}</Text>
                        </View>
                        <View style={styles.timeBox}>
                          <Clock size={10} color="#94A3B8" />
                          <Text style={styles.timeText}>{item.timestamp}</Text>
                        </View>
                      </View>

                      <View style={styles.cardContent}>
                        <View style={styles.titleRow}>
                          {!item.isRead && <View style={styles.unreadBulletBlue} />}
                          <Text style={styles.cardTitle}>{item.title}</Text>
                        </View>
                        <Text style={styles.cardDesc}>{item.description}</Text>
                      </View>

                      {Boolean(item.actionTab) && (
                        <View style={styles.cardFooter}>
                          <Text style={styles.actionTabPill}>Open in {item.actionTab} →</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* ── UNREAD TAB ── */}
            {filter === 'unread' && (
              <View style={styles.listWrap}>
                {pendingInvitations.map(renderInvitationCard)}

                {filteredNotifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.notifCard, styles.notifCardUnread]}
                    onPress={() => onSelectNotification(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardCategoryBox}>
                        {getCategoryIcon(item.category)}
                        <Text style={styles.cardCategoryLabel}>{item.category}</Text>
                      </View>
                      <View style={styles.timeBox}>
                        <Clock size={10} color="#94A3B8" />
                        <Text style={styles.timeText}>{item.timestamp}</Text>
                      </View>
                    </View>

                    <View style={styles.cardContent}>
                      <View style={styles.titleRow}>
                        <View style={styles.unreadBulletBlue} />
                        <Text style={styles.cardTitle}>{item.title}</Text>
                      </View>
                      <Text style={styles.cardDesc}>{item.description}</Text>
                    </View>

                    {Boolean(item.actionTab) && (
                      <View style={styles.cardFooter}>
                        <Text style={styles.actionTabPill}>Open in {item.actionTab} →</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

                {filteredNotifications.length === 0 && pendingInvitations.length === 0 && (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyCircle}>
                      <Check size={22} color="#0969DA" strokeWidth={2.4} />
                    </View>
                    <Text style={styles.emptyTitle}>All caught up!</Text>
                    <Text style={styles.emptyDesc}>No unread notifications or invitations right now.</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {notifications.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.clearAllBtn} onPress={onClearAll} activeOpacity={0.7}>
                <Trash2 size={12} color="#94A3B8" />
                <Text style={styles.clearAllBtnText}>Clear activity history</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  drawerContainer: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    ...shadows.lg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inboxTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  inboxTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  newBadge: {
    backgroundColor: 'rgba(9, 105, 218, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0969DA',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markReadBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  pillBadge: {
    marginLeft: 4,
    backgroundColor: '#0969DA',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pillBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  pillBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bodyScroll: {
    backgroundColor: '#F8FAFC',
    maxHeight: 520,
  },
  bodyContent: {
    padding: 14,
    paddingBottom: 24,
  },
  listWrap: {
    gap: 10,
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  inviteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3.5,
    borderLeftColor: '#059669',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    ...shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  cardCategoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardCategoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  roleBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  roleBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  cardContent: {
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  unreadBulletEmerald: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 6,
  },
  unreadBulletBlue: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0969DA',
    marginRight: 6,
  },
  inviterSubText: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
  },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 8,
  },
  metaCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaCellText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  inviteActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingVertical: 7,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  denyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  denyButtonText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  notifCardUnread: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#0969DA',
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  cardDesc: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
    marginTop: 2,
  },
  cardFooter: {
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionTabPill: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#0969DA',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 20,
  },
  emptyCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(9, 105, 218, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 240,
  },
  footer: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  clearAllBtnText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#94A3B8',
  },
});
