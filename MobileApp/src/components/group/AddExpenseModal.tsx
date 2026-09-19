/**
 * Add Expense Modal / Bottom Sheet
 * Supports all 5 project split models with instant offline SQLite writes
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
import { X, Check, DollarSign, Users, Split } from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { Participant, CostSharingModel } from '../../types';

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
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'Stay' | 'Food' | 'Transport' | 'Activities' | 'Supplies' | 'Other'>('Food');
  const [splitModel, setSplitModel] = useState<CostSharingModel>('EQUAL');
  const [paidById, setPaidById] = useState(members[0]?.id || 'user-1');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(members.map((m) => m.id));
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter an expense title / description.');
      return;
    }
    if (numAmount <= 0) {
      Alert.alert('Required', 'Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payer = members.find((m) => m.id === paidById);
      await onSubmit({
        title: title.trim(),
        amount: numAmount,
        category,
        paidById,
        paidByName: payer?.name || 'Member',
        splitModel,
        paymentMethod,
        paymentReference: paymentMethod === 'UPI' ? 'UPI-' + Date.now().toString().substring(7) : undefined,
      });

      // Reset form
      setTitle('');
      setAmount('');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save expense');
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
              <Text style={styles.sheetTitle}>Add Group Expense</Text>
              <Text style={styles.sheetSubtitle}>Recalculates ledger in SQLite immediately</Text>
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

            {/* Paid By Member Picker */}
            <Text style={styles.inputLabel}>Paid By</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payerChip, paidById === m.id && styles.payerChipActive]}
                  onPress={() => setPaidById(m.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatarMini, { backgroundColor: m.avatarBg }]}>
                    <Text style={styles.avatarMiniText}>{m.name.charAt(0)}</Text>
                  </View>
                  <Text style={[styles.payerChipText, paidById === m.id && styles.payerChipTextActive]}>
                    {m.isUser ? 'You' : m.name.split(' ')[0]}
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
                <Text style={styles.inputLabel}>Split Among ({activeCount} travelers)</Text>
                {members.map((m) => {
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
                      <Text style={styles.memberCheckName}>
                        {m.name} {m.isUser ? '(You)' : ''}
                      </Text>
                      <Text style={styles.memberShareEst}>
                        ₹{splitPerPerson.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
                {isSubmitting ? 'Saving to SQLite...' : `Add Expense • ₹${numAmount.toLocaleString()}`}
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
  payerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.bgApp,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: 8,
    gap: 6,
  },
  payerChipActive: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary500,
  },
  avatarMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
  },
  payerChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.slate700,
  },
  payerChipTextActive: {
    color: colors.primary700,
    fontWeight: '700',
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
});
