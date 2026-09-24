/**
 * Add Expense Modal / Bottom Sheet
 * Supports all 5 project split models with instant offline SQLite writes
 */

import React, { useState, useRef } from 'react';
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
import { X, Check, Users, Split, Clock, AlertCircle, ShieldCheck } from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { Participant, CostSharingModel } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface AddExpenseModalProps {
  visible: boolean;
  tripId: string;
  members: Participant[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    amount: number;
    category: 'Stay' | 'Food' | 'Transport' | 'Activities' | 'Supplies' | 'Other';
    paidById: string;
    paidByName: string;
    splitModel: CostSharingModel;
    paymentMethod: 'CASH' | 'UPI';
    paymentReference?: string;
    verificationStatus?: string;
  }) => Promise<void>;
}

const CATEGORIES = ['Food', 'Stay', 'Transport', 'Activities', 'Supplies', 'Other'] as const;

const SPLIT_MODELS: { id: CostSharingModel; label: string; desc: string }[] = [
  { id: 'EQUAL', label: 'Equal Split', desc: 'Divided evenly among all selected travelers' },
  { id: 'PARTICIPANT_BASED', label: 'Participant-Based', desc: 'Per-person customized share' },
  { id: 'ROOM_SHARE', label: 'Room Share', desc: 'Split based on occupied rooms' },
  { id: 'ACTIVITY_BASED', label: 'Activity-Based', desc: 'Split only among opted-in members' },
  { id: 'ORGANIZER_PAID', label: 'Organizer Sponsored', desc: 'Organizer covers full cost, 0 debt' },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  members,
  onClose,
  onSubmit,
}) => {
  // Unstop-Style Team Ledger: Only confirmed / accepted travelers can participate in splits
  const acceptedMembers = members.filter(
    (m) => m.role === 'Organizer' || m.status === 'ACCEPTED'
  );
  const pendingMembers = members.filter(
    (m) => m.role !== 'Organizer' && (m.status === 'PENDING' || !m.status)
  );
  const declinedMembers = members.filter(
    (m) => m.role !== 'Organizer' && (m.status === 'REJECTED' || m.status === 'DECLINED')
  );

  const isExpenseLocked = members.length > 1 && (pendingMembers.length > 0 || declinedMembers.length > 0 || acceptedMembers.length < members.length);

  const { user } = useAuth();

  // Auto-detect the logged-in user as the payer without prompting
  const autoDetectedPayer = acceptedMembers.find(
    (m) =>
      m.isUser ||
      (user && (String(m.userId) === String(user.id) || (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())))
  ) || acceptedMembers[0] || members[0];

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'Stay' | 'Food' | 'Transport' | 'Activities' | 'Supplies' | 'Other'>('Food');
  const [splitModel, setSplitModel] = useState<CostSharingModel>('EQUAL');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(acceptedMembers.map((m) => m.id));
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const numAmount = parseFloat(amount) || 0;
  const activeCount = selectedMemberIds.length || 1;
  const splitPerPerson = splitModel === 'ORGANIZER_PAID' ? 0 : Math.round((numAmount / activeCount) * 100) / 100;

  const toggleMember = (mId: string) => {
    if (selectedMemberIds.includes(mId)) {
      if (selectedMemberIds.length > 1) {
        setSelectedMemberIds(selectedMemberIds.filter((id) => id !== mId));
      }
    } else {
      setSelectedMemberIds([...selectedMemberIds, mId]);
    }
  };

  const handleSave = async () => {
    if (isSubmitting || isSubmittingRef.current) return;
    if (isExpenseLocked) {
      Alert.alert(
        'Expense Management Locked 🔒',
        'Adding expenses is restricted until all invited group members accept their trip invitations.'
      );
      return;
    }
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter an expense title / description.');
      return;
    }
    if (numAmount <= 0) {
      Alert.alert('Required', 'Please enter a valid amount.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const payer = autoDetectedPayer;
      if (!payer) {
        Alert.alert('Action Required', 'At least one traveler must have accepted the invitation to record expenses.');
        return;
      }
      const otherMembersCount = acceptedMembers.filter((m) => String(m.id) !== String(payer.id)).length;
      await onSubmit({
        title: title.trim(),
        amount: numAmount,
        category,
        paidById: payer.id,
        paidByName: payer.name || 'Member',
        splitModel,
        paymentMethod,
        paymentReference: paymentMethod === 'UPI' ? 'UPI-' + Date.now().toString().substring(7) : undefined,
        verificationStatus: otherMembersCount > 0 ? 'PENDING_APPROVAL' : 'VERIFIED',
      });

      // Reset form
      setTitle('');
      setAmount('');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Add Group Expense</Text>
              <Text style={styles.sheetSubtitle}>Add expense and split costs with group</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.slate600} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <Text style={styles.inputLabel}>Expense Title / Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Seafood Dinner at Jimbaran"
              placeholderTextColor={colors.slate400}
              value={title}
              onChangeText={setTitle}
            />

            {/* Amount Input */}
            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <View style={styles.amountWrap}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.slate400}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Category Selector */}
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Split Model Picker */}
            <Text style={styles.inputLabel}>Cost-Sharing Model</Text>
            {SPLIT_MODELS.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[styles.modelCard, splitModel === model.id && styles.modelCardActive]}
                onPress={() => setSplitModel(model.id)}
                activeOpacity={0.7}
              >
                <View style={styles.modelHeader}>
                  <Text style={[styles.modelTitle, splitModel === model.id && styles.modelTitleActive]}>
                    {model.label}
                  </Text>
                  {splitModel === model.id && <Check size={16} color={colors.primary600} />}
                </View>
                <Text style={styles.modelDesc}>{model.desc}</Text>
              </TouchableOpacity>
            ))}

            {/* Participants Checklist */}
            {splitModel !== 'ORGANIZER_PAID' && (
              <View>
                <View style={styles.splitHeaderRow}>
                  <Text style={styles.inputLabel}>Split Among ({activeCount} confirmed travelers)</Text>
                </View>

                {acceptedMembers.map((m) => {
                  const isChecked = selectedMemberIds.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={styles.memberCheckRow}
                      onPress={() => toggleMember(m.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                        {isChecked && <Check size={13} color="#ffffff" strokeWidth={3} />}
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.memberCheckName}>
                          {m.name} {m.isUser ? '(You)' : ''}
                        </Text>
                        <View style={styles.confirmedPill}>
                          <Text style={styles.confirmedPillText}>Accepted</Text>
                        </View>
                      </View>
                      <Text style={styles.memberShareEst}>
                        ₹{splitPerPerson.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Unstop-Style Pending Travelers Exclusion Notice */}
                {pendingMembers.length > 0 && (
                  <View style={styles.pendingSectionBox}>
                    <View style={styles.pendingSectionHeader}>
                      <Clock size={13} color="#b45309" />
                      <Text style={styles.pendingSectionTitle}>
                        Awaiting Acceptance ({pendingMembers.length})
                      </Text>
                    </View>
                    <Text style={styles.pendingSectionHint}>
                      Travelers must accept their trip invitation before expenses can be split with them.
                    </Text>

                    {pendingMembers.map((m) => (
                      <View key={m.id} style={styles.pendingMemberRow}>
                        <View style={[styles.avatarMiniMuted, { backgroundColor: m.avatarBg || '#94a3b8' }]}>
                          <Text style={styles.avatarMiniText}>{m.name.charAt(0)}</Text>
                        </View>
                        <Text style={styles.pendingMemberName}>{m.name}</Text>
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>Pending Invite • 0 Debt</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Live Financial Preview Card */}
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>Split Preview</Text>
              <Text style={styles.previewDetail}>
                {splitModel === 'ORGANIZER_PAID'
                  ? 'Organizer covers 100% of this expense (0 impact on travelers)'
                  : `Each of the ${activeCount} selected travelers will owe ₹${splitPerPerson.toLocaleString()}`}
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Saving Expense...' : `Add Expense • ₹${numAmount.toLocaleString()}`}
              </Text>
            </TouchableOpacity>
          </View>
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
    maxHeight: '90%',
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
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.slate700,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textInput: {
    backgroundColor: colors.bgApp,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13.5,
    color: colors.slate800,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgApp,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    height: 48,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary600,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate900,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.sm,
    backgroundColor: colors.bgApp,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate700,
  },
  catChipTextActive: {
    color: '#ffffff',
  },
  payerAutoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    marginTop: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  payerAutoLabel: {
    fontSize: 10,
    color: colors.slate500,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  payerAutoName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary700,
  },
  modelCard: {
    backgroundColor: colors.bgApp,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
    marginBottom: 8,
  },
  modelCardActive: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary500,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  modelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate800,
  },
  modelTitleActive: {
    color: colors.primary700,
  },
  modelDesc: {
    fontSize: 11,
    color: colors.slate500,
  },
  memberCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  memberCheckName: {
    flex: 1,
    fontSize: 13,
    color: colors.slate800,
    fontWeight: '600',
  },
  memberShareEst: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.slate700,
  },
  previewBox: {
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary600,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate700,
    textTransform: 'uppercase',
  },
  previewDetail: {
    fontSize: 12,
    color: colors.slate600,
    marginTop: 2,
  },
  sheetFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  submitBtn: {
    backgroundColor: colors.primary600,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadows.md,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  splitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmedPill: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  confirmedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  pendingSectionBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pendingSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  pendingSectionHint: {
    fontSize: 11,
    color: '#78350f',
    lineHeight: 15,
    marginBottom: 10,
  },
  pendingMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#fef3c7',
  },
  avatarMini: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  avatarMiniMuted: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  pendingMemberName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#78350f',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
});
