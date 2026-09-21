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
          {/* Trip Header Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.tripCategoryPill}>
                <Compass size={12} color="#059669" strokeWidth={2.2} />
                <Text style={styles.tripCategoryText}>{details?.tripType || 'Friends'} Trip</Text>
              </View>
              <View style={styles.membersCountPill}>
                <Users size={12} color="#0284C7" strokeWidth={2.2} />
                <Text style={styles.membersCountText}>
                  {details?.memberCount || 1} {(details?.memberCount || 1) === 1 ? 'Traveler' : 'Travelers'}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTripTitle}>{details?.groupName || 'Trip Group'}</Text>

            {Boolean(details?.destination) && (
              <View style={styles.heroDestinationRow}>
                <MapPin size={15} color="#059669" strokeWidth={2.2} />
                <Text style={styles.heroDestinationText}>{details?.destination}</Text>
              </View>
            )}
          </View>

          {/* Inviter / Host Strip */}
          <View style={styles.hostStrip}>
            <View style={styles.hostAvatar}>
              <Text style={styles.hostAvatarText}>{getInitials(details?.organizerName)}</Text>
            </View>
            <View style={styles.hostInfo}>
              <Text style={styles.hostRoleLabel}>Trip Host & Organizer</Text>
              <Text style={styles.hostName}>{details?.organizerName || 'Trip Organizer'}</Text>
            </View>
            <View style={styles.verifiedHostBadge}>
              <ShieldCheck size={14} color="#059669" strokeWidth={2.4} />
              <Text style={styles.verifiedHostText}>Verified</Text>
            </View>
          </View>

          {/* Balanced 2x2 Overview Grid */}
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              {/* Trip Dates */}
              <View style={styles.gridCard}>
                <View style={styles.gridCardHeaderRow}>
                  <View style={[styles.gridIconCircle, { backgroundColor: '#ECFDF5' }]}>
                    <Calendar size={14} color="#059669" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.gridCardLabel}>TRIP DATES</Text>
                </View>
                <Text style={styles.gridCardValue} numberOfLines={2}>
                  {formatDateRange(details?.startDate, details?.endDate)}
                </Text>
              </View>

              {/* Expense Split Model */}
              <View style={styles.gridCard}>
                <View style={styles.gridCardHeaderRow}>
                  <View style={[styles.gridIconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <Coins size={14} color="#D97706" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.gridCardLabel}>EXPENSE SPLIT</Text>
                </View>
                <Text style={styles.gridCardValue} numberOfLines={2}>
                  {details?.currency || 'INR'} • {details?.expenseSplit || 'Equal'}
                </Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              {/* Confirmed Group */}
              <View style={styles.gridCard}>
                <View style={styles.gridCardHeaderRow}>
                  <View style={[styles.gridIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Users size={14} color="#0284C7" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.gridCardLabel}>GROUP SIZE</Text>
                </View>
                <Text style={styles.gridCardValue}>
                  {details?.memberCount || 1} Confirmed
                </Text>
              </View>

              {/* Ledger Security */}
              <View style={styles.gridCard}>
                <View style={styles.gridCardHeaderRow}>
                  <View style={[styles.gridIconCircle, { backgroundColor: '#F5F3FF' }]}>
                    <ShieldCheck size={14} color="#7C3AED" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.gridCardLabel}>SETTLEMENT</Text>
                </View>
                <Text style={styles.gridCardValue}>
                  Auto-Rebalanced
                </Text>
              </View>
            </View>
          </View>

          {/* Description / Notes */}
          {Boolean(details?.description) && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesSectionLabel}>TRIP NOTES & ITINERARY</Text>
              <Text style={styles.notesBodyText}>{details?.description}</Text>
            </View>
          )}

          {/* Current Confirmed Members Roster Preview */}
          {Boolean(details?.members && details.members.length > 0) && (
            <View style={styles.rosterCard}>
              <View style={styles.rosterHeader}>
                <Text style={styles.rosterTitle}>Trip Members</Text>
                <View style={styles.rosterCounterBadge}>
                  <Text style={styles.rosterCounterText}>{details?.members?.length || 0}</Text>
                </View>
              </View>
              <View style={styles.rosterDivider} />
              <View style={styles.rosterList}>
                {details?.members?.map((m) => {
                  const isAccepted = m.status === 'ACCEPTED';
                  const isOrg = m.role === 'Organizer';
                  return (
                    <View key={String(m.id)} style={styles.rosterRow}>
                      <View style={[styles.rosterAvatar, { backgroundColor: m.avatarBg || '#059669' }]}>
                        <Text style={styles.rosterAvatarText}>{getInitials(m.name)}</Text>
                      </View>
                      <View style={styles.rosterNameCol}>
                        <Text style={styles.rosterMemberName} numberOfLines={1}>{m.name}</Text>
                        <Text style={styles.rosterMemberRole}>
                          {isOrg ? 'Organizer & Host' : isAccepted ? 'Confirmed Traveler' : 'Invited • Pending'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.rosterStatusPill,
                          isOrg ? styles.pillOrg : isAccepted ? styles.pillJoined : styles.pillPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.rosterStatusPillText,
                            isOrg ? styles.pillOrgText : isAccepted ? styles.pillJoinedText : styles.pillPendingText,
                          ]}
                        >
                          {isOrg ? 'Host' : isAccepted ? 'Joined' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}


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
                      <Text style={styles.acceptBtnText}>Accept Invitation</Text>
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
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  pageScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
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
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tripCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tripCategoryText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  membersCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  membersCountText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  heroTripTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
    marginBottom: 8,
  },
  heroDestinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroDestinationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  hostStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  hostInfo: {
    flex: 1,
  },
  hostRoleLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hostName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  verifiedHostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedHostText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  gridContainer: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  gridCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  gridIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  gridCardValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  notesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  notesSectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  notesBodyText: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
  },
  rosterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rosterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  rosterCounterBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  rosterCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  rosterDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  rosterList: {
    gap: 10,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  rosterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  rosterNameCol: {
    flex: 1,
  },
  rosterMemberName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  rosterMemberRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  rosterStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillOrg: {
    backgroundColor: '#EFF6FF',
  },
  pillJoined: {
    backgroundColor: '#ECFDF5',
  },
  pillPending: {
    backgroundColor: '#FFFBEB',
  },
  rosterStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillOrgText: {
    color: '#0284C7',
  },
  pillJoinedText: {
    color: '#059669',
  },
  pillPendingText: {
    color: '#D97706',
  },
  securityStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  securityStripText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#15803D',
    textAlign: 'center',
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    padding: 12,
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
    borderRadius: 10,
    padding: 12,
  },
  alertSuccessText: {
    fontSize: 12.5,
    color: '#047857',
    flex: 1,
  },
  actionBox: {
    marginTop: 6,
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  acceptBtn: {
    flex: 1.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 15,
    ...shadows.md,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  declineBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  decisionBannerAccepted: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 8,
  },
  decisionTitleAccepted: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  workspaceBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  decisionBannerRejected: {
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 8,
  },
  decisionTitleRejected: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9F1239',
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
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  closeActionBtnText: {
    color: '#BE123C',
    fontWeight: '600',
    fontSize: 13.5,
  },
});
