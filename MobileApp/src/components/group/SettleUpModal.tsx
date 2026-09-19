/**
 * Settle Up Modal / Bottom Sheet
 * Features UPI deep linking, VPA payment details, and offline debt settlement recording
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
  Linking,
} from 'react-native';
import { X, Smartphone, CheckCircle2, QrCode, AlertCircle } from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { Participant } from '../../types';
import { useSync } from '../../context/SyncContext';

interface SettleUpModalProps {
  visible: boolean;
  tripId: string;
  tripName: string;
  members: Participant[];
  initialPayerId?: string;
  initialReceiverId?: string;
  initialAmount?: number;
  onClose: () => void;
  onConfirmSettlement: (data: {
    fromMemberId: string;
    fromMemberName: string;
    toMemberId: string;
    toMemberName: string;
    toUpiId?: string;
    amount: number;
    remarks?: string;
  }) => Promise<void>;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  visible,
  tripId,
  tripName,
  members,
  initialPayerId,
  initialReceiverId,
  initialAmount,
  onClose,
  onConfirmSettlement,
}) => {
  const { isOnline } = useSync();
  const [fromId, setFromId] = useState(initialPayerId || members[1]?.id || members[0]?.id || 'user-2');
  const [toId, setToId] = useState(initialReceiverId || members[0]?.id || 'user-1');
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '1000');
  const [remarks, setRemarks] = useState('Trip ledger settlement');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromMember = members.find((m) => m.id === fromId) || members[0];
  const toMember = members.find((m) => m.id === toId) || members[1] || members[0];
  const numAmount = parseFloat(amount) || 0;
  const targetUpi = (toMember as any)?.upiId || `${toMember?.name.toLowerCase().replace(/\s+/g, '')}@okaxis`;

  const handleLaunchUpi = () => {
    if (!isOnline) {
      Alert.alert(
        'Offline',
        'Live UPI payment apps require active internet connection. You can still record manual settlement locally.'
      );
      return;
    }

    const upiUrl = `upi://pay?pa=${targetUpi}&pn=${encodeURIComponent(
      toMember?.name || 'Receiver'
    )}&am=${numAmount}&cu=INR&tn=${encodeURIComponent(`Settlement for ${tripName}`)}`;

    Linking.canOpenURL(upiUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(upiUrl);
        } else {
          Alert.alert(
            'UPI App Not Found',
            `No compatible UPI app detected. You can pay manually to VPA:\n${targetUpi}\nAmount: ₹${numAmount}`
          );
        }
      })
      .catch(() => {
        Alert.alert('Payment Error', 'Could not open UPI app.');
      });
  };

  const handleRecordSettlement = async () => {
    if (numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a settlement amount greater than 0.');
      return;
    }
    if (fromId === toId) {
      Alert.alert('Invalid Selection', 'Payer and receiver cannot be the same member.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmSettlement({
        fromMemberId: fromId,
        fromMemberName: fromMember?.name || 'Payer',
        toMemberId: toId,
        toMemberName: toMember?.name || 'Receiver',
        toUpiId: targetUpi,
        amount: numAmount,
        remarks,
      });
      onClose();
      Alert.alert('Recorded', `Settlement of ₹${numAmount.toLocaleString()} recorded in local ledger.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record settlement');
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
              <Text style={styles.sheetTitle}>Settle Up Debt</Text>
              <Text style={styles.sheetSubtitle}>Clear pairwise balances for {tripName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.slate600} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Who is paying? */}
            <Text style={styles.inputLabel}>Who Is Paying?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberChip, fromId === m.id && styles.memberChipActive]}
                  onPress={() => setFromId(m.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatarMini, { backgroundColor: m.avatarBg }]}>
                    <Text style={styles.avatarMiniText}>{m.name.charAt(0)}</Text>
                  </View>
                  <Text style={[styles.memberChipText, fromId === m.id && styles.memberChipTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Who is receiving? */}
            <Text style={styles.inputLabel}>Paying To</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberChip, toId === m.id && styles.memberChipActive]}
                  onPress={() => setToId(m.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatarMini, { backgroundColor: m.avatarBg }]}>
                    <Text style={styles.avatarMiniText}>{m.name.charAt(0)}</Text>
                  </View>
                  <Text style={[styles.memberChipText, toId === m.id && styles.memberChipTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Amount */}
            <Text style={styles.inputLabel}>Settlement Amount (₹)</Text>
            <View style={styles.amountWrap}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={colors.slate400}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* VPA Display Box */}
            <View style={styles.vpaBox}>
              <View style={styles.vpaIconWrap}>
                <Smartphone size={18} color={colors.primary600} />
              </View>
              <View style={styles.vpaInfo}>
                <Text style={styles.vpaLabel}>Receiver UPI VPA</Text>
                <Text style={styles.vpaAddress}>{targetUpi}</Text>
              </View>
            </View>

            {/* UPI Deep Link Button */}
            <TouchableOpacity
              style={styles.upiActionBtn}
              onPress={handleLaunchUpi}
              activeOpacity={0.85}
            >
              <Smartphone size={16} color="#ffffff" />
              <Text style={styles.upiActionText}>Launch UPI App (GPay / PhonePe / Paytm)</Text>
            </TouchableOpacity>

            {!isOnline && (
              <View style={styles.offlineNotice}>
                <AlertCircle size={13} color={colors.accentAmber} />
                <Text style={styles.offlineNoticeText}>
                  UPI apps require internet. Offline: tap "Mark as Settled" to balance local ledger.
                </Text>
              </View>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>

          {/* Footer Submit */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={styles.settleConfirmBtn}
              onPress={handleRecordSettlement}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <CheckCircle2 size={16} color="#ffffff" />
              <Text style={styles.settleConfirmText}>
                {isSubmitting ? 'Recording...' : `Mark as Settled • ₹${numAmount.toLocaleString()}`}
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
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.slate700,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.bgApp,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: 8,
    gap: 6,
  },
  memberChipActive: {
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
  memberChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.slate700,
  },
  memberChipTextActive: {
    color: colors.primary700,
    fontWeight: '700',
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
  vpaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 14,
    gap: 12,
  },
  vpaIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vpaInfo: {
    flex: 1,
  },
  vpaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate500,
    textTransform: 'uppercase',
  },
  vpaAddress: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate800,
    marginTop: 1,
  },
  upiActionBtn: {
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
  upiActionText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentAmberLight,
    padding: 8,
    borderRadius: radii.sm,
    gap: 6,
    marginTop: 10,
  },
  offlineNoticeText: {
    fontSize: 10.5,
    color: '#92400e',
    flex: 1,
  },
  sheetFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  settleConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate900,
    borderRadius: radii.md,
    paddingVertical: 14,
    gap: 8,
    ...shadows.md,
  },
  settleConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
