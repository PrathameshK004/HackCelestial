/**
 * InvitationScreen (Dedicated Full-Page Invitation View)
 * Entire new page view (no popup / no modal dialog)
 * Matches WebApp JoinTripPage.tsx Unstop-style official invitation UI
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Mail,
  MapPin,
  Calendar,
  Users,
  Coins,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Compass,
  AlertCircle,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../theme/colors';
import { groupService } from '../api/group.service';
import { InviteDetails } from '../types';
import { useAuth } from '../context/AuthContext';

interface InvitationScreenProps {
  inviteCode?: string | null;
  initialDetails?: InviteDetails | null;
  onBack: () => void;
  onAccepted?: (tripId?: string, resolvedCode?: string) => void;
  onDeclined?: (resolvedCode?: string) => void;
}

export const InvitationScreen: React.FC<InvitationScreenProps> = ({
  inviteCode,
  initialDetails,
  onBack,
  onAccepted,
  onDeclined,
}) => {
  const { user } = useAuth();
  const [details, setDetails] = useState<InviteDetails | null>(initialDetails || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [decisionState, setDecisionState] = useState<'IDLE' | 'ACCEPTED' | 'REJECTED'>('IDLE');

  useEffect(() => {
    if (initialDetails) {
      setDetails(initialDetails);
      if (initialDetails.status === 'ACCEPTED') setDecisionState('ACCEPTED');
      else if (initialDetails.status === 'REJECTED') setDecisionState('REJECTED');
      return;
    }

    if (inviteCode) {
      loadDetails(inviteCode);
    }
  }, [inviteCode, initialDetails]);

  const loadDetails = async (code: string) => {
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await groupService.getInviteDetails(code);
      if (res && res.data) {
        setDetails(res.data);
        if (res.data.status === 'ACCEPTED') setDecisionState('ACCEPTED');
        else if (res.data.status === 'REJECTED') setDecisionState('REJECTED');
      } else {
        setActionError(res.message || 'Invitation not found');
      }
    } catch (e: any) {
      setActionError(e.message || 'Unable to load invitation details. The link may have expired or is invalid.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    const code = details?.inviteCode || inviteCode;
    if (!code) return;

    const cleanCode = code.trim().toUpperCase();
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await groupService.acceptInvite(cleanCode);
      setDecisionState('ACCEPTED');
      setActionSuccess(res.message || `You have officially joined "${details?.groupName}"!`);
      if (onAccepted) {
        onAccepted(details?.groupId, cleanCode);
      }
    } catch (e: any) {
      setActionError(e.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    const code = details?.inviteCode || inviteCode;
    if (!code) return;

    const cleanCode = code.trim().toUpperCase();
    Alert.alert(
      'Decline Invitation',
      `Are you sure you want to decline the invitation to join "${details?.groupName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            setActionError(null);
            try {
              const res = await groupService.rejectInvite(cleanCode);
              setDecisionState('REJECTED');
              setActionSuccess(res.message || 'Invitation declined.');
              if (onDeclined) {
                onDeclined(cleanCode);
              }
            } catch (e: any) {
              setActionError(e.message || 'Failed to decline invitation.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start) return 'Dates flexible';
    try {
      const s = new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (!end) return s;
      const e = new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
      {/* Top Header */}
      <View style={styles.topNav}>
        <View style={styles.navLeft}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Trip Invitation</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconBox}>
            <Compass size={36} color={colors.primary600} strokeWidth={2.2} />
          </View>
          <Text style={styles.loadingTitle}>Loading Official Invitation…</Text>
          <Text style={styles.loadingSub}>Verifying invitation token {inviteCode}</Text>
          <ActivityIndicator size="small" color={colors.primary600} style={{ marginTop: 16 }} />
        </View>
      ) : actionError && !details ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconBox}>
            <AlertCircle size={40} color="#E11D48" />
          </View>
          <Text style={styles.errorTitle}>Invalid or Expired Invitation</Text>
          <Text style={styles.errorSub}>{actionError}</Text>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={onBack} activeOpacity={0.85}>
            <Text style={styles.primaryActionBtnText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.pageScroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Official Banner */}
          <View style={styles.officialCard}>
            <View style={styles.badgeRow}>
              <View style={styles.statusPill}>
                <Mail size={12} color="#059669" />
                <Text style={styles.statusPillText}>Official Invitation • Approval Required</Text>
              </View>
              {(details?.inviteCode || inviteCode) && (
                <View style={styles.codePill}>
                  <Text style={styles.codePillText}>Code: {details?.inviteCode || inviteCode}</Text>
                </View>
              )}
            </View>

            <Text style={styles.groupName}>{details?.groupName || 'Trip Group'}</Text>

            <View style={styles.destinationRow}>
              <MapPin size={16} color="#059669" />
              <Text style={styles.destinationText}>{details?.destination || 'Destination'}</Text>
              <Text style={styles.dotSeparator}>•</Text>
              <View style={styles.tripTypeBadge}>
                <Text style={styles.tripTypeBadgeText}>{details?.tripType || 'Friends'}</Text>
              </View>
            </View>
          </View>

          {/* Inviter Info Strip */}
          <View style={styles.inviterStrip}>
            <View style={styles.inviterAvatar}>
              <Text style={styles.inviterAvatarText}>{getInitials(details?.organizerName)}</Text>
            </View>
            <View style={styles.inviterMeta}>
              <Text style={styles.inviterLabel}>Invited by Organizer</Text>
              <Text style={styles.inviterName}>{details?.organizerName || 'Trip Organizer'}</Text>
            </View>
            <View style={styles.verifiedShield}>
              <ShieldCheck size={14} color="#059669" />
              <Text style={styles.verifiedShieldText}>Verified Organizer</Text>
            </View>
          </View>

          {/* Overview Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <View style={styles.detailLabelRow}>
                <Calendar size={13} color="#059669" />
                <Text style={styles.detailLabel}>Trip Dates</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={2}>
                {formatDateRange(details?.startDate, details?.endDate)}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailLabelRow}>
                <Coins size={13} color="#D97706" />
                <Text style={styles.detailLabel}>Currency & Split</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>
                {details?.currency || 'INR'} ({details?.expenseSplit || 'equal'} split)
              </Text>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailLabelRow}>
                <Users size={13} color="#0284C7" />
                <Text style={styles.detailLabel}>Confirmed</Text>
              </View>
              <Text style={styles.detailValue}>
                {details?.memberCount || 1} {(details?.memberCount || 1) === 1 ? 'Member' : 'Members'} Joined
              </Text>
            </View>
          </View>

          {/* Description / Notes */}
          {Boolean(details?.description) && (
            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>Trip Notes:</Text>
              <Text style={styles.notesText}>{details?.description}</Text>
            </View>
          )}

          {/* Current Confirmed Members Roster Preview */}
          {Boolean(details?.members && details.members.length > 0) && (
            <View style={styles.rosterSection}>
              <Text style={styles.sectionTitle}>
                Trip Roster ({details?.members?.length || 0})
              </Text>
              <View style={styles.rosterList}>
                {details?.members?.map((m) => {
                  const isAccepted = m.status === 'ACCEPTED';
                  return (
                    <View key={String(m.id)} style={styles.rosterItem}>
                      <View
                        style={[
                          styles.rosterAvatar,
                          { backgroundColor: m.avatarBg || '#059669' },
                        ]}
                      >
                        <Text style={styles.rosterAvatarText}>{getInitials(m.name)}</Text>
                      </View>
                      <View style={styles.rosterInfo}>
                        <Text style={styles.rosterName}>{m.name}</Text>
                        <Text style={styles.rosterSub}>
                          {m.role === 'Organizer' ? 'Organizer' : isAccepted ? 'Joined' : 'Invite Pending'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.roleBadge,
                          m.role === 'Organizer'
                            ? styles.roleOrg
                            : isAccepted
                            ? styles.roleJoined
                            : styles.rolePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            m.role === 'Organizer'
                              ? styles.roleOrgText
                              : isAccepted
                              ? styles.roleJoinedText
                              : styles.rolePendingText,
                          ]}
                        >
                          {m.role === 'Organizer' ? 'Organizer' : isAccepted ? 'Joined' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Security & Ledger Verification Banner */}
          <View style={styles.securityStrip}>
            <ShieldCheck size={16} color="#059669" />
            <Text style={styles.securityStripText}>
              End-to-End Rebalanced Ledger • Min-Cash-Flow Settled • Offline Sync Protected
            </Text>
          </View>

          {/* Action Feedback Alerts */}
          {actionError && (
            <View style={styles.alertError}>
              <AlertCircle size={16} color="#BE123C" />
              <Text style={styles.alertErrorText}>{actionError}</Text>
            </View>
          )}

          {actionSuccess && (
            <View style={styles.alertSuccess}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={styles.alertSuccessText}>{actionSuccess}</Text>
            </View>
          )}

          {/* Interactive Decision / Actions */}
          <View style={styles.actionBox}>
            {decisionState === 'ACCEPTED' ? (
              <View style={styles.decisionBannerAccepted}>
                <CheckCircle2 size={26} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.decisionTitleAccepted}>You are an Active Member!</Text>
                  <Text style={styles.decisionSubAccepted}>
                    You have approved this invitation. You can now access group bookings and shared ledgers.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.workspaceBtn}
                  onPress={() => {
                    const code = (details?.inviteCode || inviteCode)?.trim().toUpperCase();
                    if (onAccepted) {
                      onAccepted(details?.groupId, code);
                    } else {
                      onBack();
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.workspaceBtnText}>Enter Trip Workspace</Text>
                  <ArrowRight size={15} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ) : decisionState === 'REJECTED' ? (
              <View style={styles.decisionBannerRejected}>
                <XCircle size={24} color="#E11D48" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.decisionTitleRejected}>Invitation Declined</Text>
                  <Text style={styles.decisionSubRejected}>
                    You have declined to join this trip group.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeActionBtn}
                  onPress={() => {
                    const code = (details?.inviteCode || inviteCode)?.trim().toUpperCase();
                    if (onDeclined) {
                      onDeclined(code);
                    } else {
                      onBack();
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.closeActionBtnText}>Return to Home</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={handleAccept}
                  disabled={isProcessing}
                  activeOpacity={0.85}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <CheckCircle2 size={17} color="#ffffff" />
                      <Text style={styles.acceptBtnText}>Accept Invitation & Join Trip</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={handleReject}
                  disabled={isProcessing}
                  activeOpacity={0.85}
                >
                  <XCircle size={16} color="#64748B" />
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topNav: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    padding: 4,
    marginRight: 2,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  loadingSub: {
    fontSize: 13,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  errorIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryActionBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  officialCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  codePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  codePillText: {
    fontSize: 11.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#E2E8F0',
  },
  groupName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    lineHeight: 28,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  destinationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34D399',
  },
  dotSeparator: {
    color: '#64748B',
    fontSize: 14,
  },
  tripTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tripTypeBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  securityStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  securityStripText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#047857',
    textAlign: 'center',
  },
  inviterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  inviterAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviterAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  inviterMeta: {
    flex: 1,
  },
  inviterLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  inviterName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifiedShield: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedShieldText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 17,
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  rosterSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  rosterList: {
    gap: 8,
  },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  rosterAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rosterInfo: {
    flex: 1,
  },
  rosterName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  rosterSub: {
    fontSize: 11,
    color: '#64748B',
  },
  roleBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  roleOrg: {
    backgroundColor: '#EFF6FF',
  },
  roleOrgText: {
    color: '#0284C7',
    fontSize: 10.5,
    fontWeight: '700',
  },
  roleJoined: {
    backgroundColor: '#ECFDF5',
  },
  roleJoinedText: {
    color: '#059669',
    fontSize: 10.5,
    fontWeight: '700',
  },
  rolePending: {
    backgroundColor: '#FFFBEB',
  },
  rolePendingText: {
    color: '#D97706',
    fontSize: 10.5,
    fontWeight: '700',
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 8,
    padding: 11,
  },
  alertErrorText: {
    fontSize: 12.5,
    color: '#BE123C',
    flex: 1,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 11,
  },
  alertSuccessText: {
    fontSize: 12.5,
    color: '#047857',
    flex: 1,
  },
  actionBox: {
    marginTop: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 14,
    ...shadows.md,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  declineBtnText: {
    color: '#64748B',
    fontSize: 13.5,
    fontWeight: '600',
  },
  decisionBannerAccepted: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 8,
  },
  decisionTitleAccepted: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 2,
  },
  decisionSubAccepted: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
  },
  workspaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  workspaceBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  decisionBannerRejected: {
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 8,
  },
  decisionTitleRejected: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9F1239',
    marginBottom: 2,
  },
  decisionSubRejected: {
    fontSize: 13,
    color: '#BE123C',
    lineHeight: 18,
  },
  closeActionBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDA4AF',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  closeActionBtnText: {
    color: '#BE123C',
    fontWeight: '600',
    fontSize: 13.5,
  },
});
