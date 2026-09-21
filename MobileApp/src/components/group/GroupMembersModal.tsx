/**
 * Group Members Modal matching WebApp
 * Shows travelers, roles, invite code & link sharing, add traveler form
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { 
  X, 
  UserPlus, 
  Copy, 
  Check, 
  Crown, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Share2 
} from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { Participant } from '../../types';

interface GroupMembersModalProps {
  visible: boolean;
  tripName: string;
  inviteCode?: string;
  members: Participant[];
  onClose: () => void;
  onAddMember: (name: string, email?: string) => Promise<void>;
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  visible,
  tripName,
  inviteCode = 'TRIP99',
  members,
  onClose,
  onAddMember,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group acceptance statistics (Unstop team model)
  const confirmedMembers = members.filter(
    (m) => (m.status || 'ACCEPTED') === 'ACCEPTED' || m.role === 'Organizer'
  );
  const pendingMembers = members.filter(
    (m) => m.status === 'PENDING' && m.role !== 'Organizer'
  );

  const handleCopyCode = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Invite Code Copied!', `Group invite code "${inviteCode}" copied to clipboard.`);
  };

  const handleCopyMemberInvite = (m: Participant) => {
    const code = m.inviteCode || inviteCode;
    setCopiedMemberId(m.id);
    setTimeout(() => setCopiedMemberId(null), 2000);
    Alert.alert(
      'Invitation Link Ready',
      `Invite code for ${m.name}: ${code}\nShare this with ${m.name} so they can accept on Triptual.`
    );
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a traveler name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddMember(name.trim(), email.trim() || undefined);
      setName('');
      setEmail('');
      Alert.alert(
        'Traveler Invited!',
        `${name} has been added. They will be in "Pending Invite" status until they accept the invitation on their device.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Trip Travelers & Roster</Text>
              <Text style={styles.sheetSubtitle}>
                {confirmedMembers.length} confirmed • {pendingMembers.length} pending in {tripName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.slate600} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Unstop Acceptance Summary Dashboard Card */}
            <View style={styles.acceptanceDashboard}>
              <View style={styles.dashHeaderRow}>
                <Text style={styles.dashTitle}>Team Acceptance Status</Text>
                <View style={styles.dashPillsRow}>
                  <View style={styles.dashConfirmedPill}>
                    <CheckCircle2 size={11} color="#059669" />
                    <Text style={styles.dashConfirmedText}>{confirmedMembers.length} Confirmed</Text>
                  </View>
                  {pendingMembers.length > 0 && (
                    <View style={styles.dashPendingPill}>
                      <Clock size={11} color="#b45309" />
                      <Text style={styles.dashPendingText}>{pendingMembers.length} Awaiting</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.dashRuleText}>
                Unstop Policy: Expenses and splits are exclusively allocated to confirmed members. Unconfirmed members carry ₹0 liability.
              </Text>
            </View>

            {/* General Trip Invite Box */}
            <View style={styles.inviteBox}>
              <View>
                <Text style={styles.inviteLabel}>General Trip Invite Code</Text>
                <Text style={styles.inviteCodeText}>{inviteCode}</Text>
              </View>

              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode} activeOpacity={0.8}>
                {copied ? <Check size={14} color="#ffffff" /> : <Copy size={14} color="#ffffff" />}
                <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy Code'}</Text>
              </TouchableOpacity>
            </View>

            {/* Members List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Traveler Roster ({members.length})</Text>
              <Text style={styles.sectionSubCount}>{confirmedMembers.length}/{members.length} Active in Ledger</Text>
            </View>

            {members.map((m) => {
              const isConfirmed = (m.status || 'ACCEPTED') === 'ACCEPTED' || m.role === 'Organizer';
              const isPending = m.status === 'PENDING' && m.role !== 'Organizer';
              const isCopied = copiedMemberId === m.id;

              return (
                <View key={m.id} style={[styles.memberCard, isPending && styles.memberCardPending]}>
                  <View style={styles.memberTopRow}>
                    {/* Avatar */}
                    <View style={[styles.avatar, { backgroundColor: m.avatarBg || colors.primary600 }]}>
                      <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                    </View>

                    {/* Info */}
                    <View style={styles.memberInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        {m.isUser && <Text style={styles.youBadge}>(You)</Text>}
                        {m.role === 'Organizer' && (
                          <View style={styles.crownBadge}>
                            <Crown size={11} color="#d97706" />
                            <Text style={styles.crownBadgeText}>Organizer</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberEmail}>{m.email || 'No email associated'}</Text>
                    </View>

                    {/* Net Balance / Status */}
                    <View style={styles.rightCol}>
                      {isConfirmed ? (
                        <View style={styles.balanceBadge}>
                          <Text
                            style={[
                              styles.balanceText,
                              m.balance > 0 && { color: colors.primary700 },
                              m.balance < 0 && { color: '#92400e' },
                            ]}
                          >
                            {m.balance > 0
                              ? `+₹${m.balance.toLocaleString()}`
                              : m.balance < 0
                              ? `-₹${Math.abs(m.balance).toLocaleString()}`
                              : '₹0'}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.pendingBalBadge}>
                          <Text style={styles.pendingBalText}>₹0 (Pending)</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Status Indicator Bar */}
                  <View style={styles.memberStatusRow}>
                    {isConfirmed ? (
                      <View style={styles.statusAcceptedTag}>
                        <Check size={11} color="#059669" strokeWidth={2.6} />
                        <Text style={styles.statusAcceptedText}>Accepted & Confirmed • Active in Split Ledger</Text>
                      </View>
                    ) : (
                      <View style={styles.statusPendingWrap}>
                        <View style={styles.statusPendingTag}>
                          <Clock size={11} color="#b45309" strokeWidth={2.4} />
                          <Text style={styles.statusPendingText}>Awaiting Acceptance • Excluded from Splits</Text>
                        </View>

                        <TouchableOpacity
                          style={styles.resendBtn}
                          onPress={() => handleCopyMemberInvite(m)}
                          activeOpacity={0.8}
                        >
                          {isCopied ? (
                            <Check size={11} color="#ffffff" strokeWidth={2.5} />
                          ) : (
                            <Share2 size={11} color="#ffffff" strokeWidth={2} />
                          )}
                          <Text style={styles.resendBtnText}>{isCopied ? 'Copied' : 'Share Invite'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Add Traveler Form */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Invite New Traveler</Text>

            <TextInput
              style={styles.input}
              placeholder="Traveler Name (e.g. Sara Khan)"
              placeholderTextColor={colors.slate400}
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Email address (e.g. sara@example.com)"
              placeholderTextColor={colors.slate400}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleAdd}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <UserPlus size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>
                {isSubmitting ? 'Sending Invitation...' : 'Send Trip Invitation'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '85%',
    ...shadows.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.slate900,
  },
  sheetSubtitle: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    padding: 18,
  },
  inviteBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 18,
  },
  inviteLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.slate500,
    textTransform: 'uppercase',
  },
  inviteCodeText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.slate900,
    letterSpacing: 2,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary600,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    gap: 6,
  },
  copyBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionSubCount: {
    fontSize: 11,
    color: colors.slate500,
    fontWeight: '600',
  },
  acceptanceDashboard: {
    backgroundColor: '#f8fafc',
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  dashHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dashTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.slate800,
    letterSpacing: 0.2,
  },
  dashPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dashConfirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  dashConfirmedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  dashPendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  dashPendingText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#b45309',
  },
  dashRuleText: {
    fontSize: 11,
    color: colors.slate600,
    lineHeight: 15,
  },
  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate200,
    ...shadows.sm,
  },
  memberCardPending: {
    backgroundColor: '#fafaf9',
    borderColor: '#e7e5e4',
  },
  memberTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.slate900,
  },
  youBadge: {
    fontSize: 11,
    color: colors.primary600,
    fontWeight: '700',
  },
  crownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  crownBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  memberEmail: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  balanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.bgApp,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate600,
  },
  pendingBalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: '#f1f5f9',
  },
  pendingBalText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate500,
  },
  memberStatusRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.slate100,
  },
  statusAcceptedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusAcceptedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  statusPendingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  statusPendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary600,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  resendBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  input: {
    backgroundColor: colors.bgApp,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
    color: colors.slate800,
    marginBottom: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    borderRadius: radii.md,
    paddingVertical: 12,
    marginTop: 4,
    gap: 8,
    ...shadows.sm,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
