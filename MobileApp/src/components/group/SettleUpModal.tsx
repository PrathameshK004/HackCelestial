/**
 * Settle Up Modal / Bottom Sheet — Professional Clean UI
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
import { X, Smartphone, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { Participant } from '../../types';

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

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

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
  const isOnline = true;
  const [fromId, setFromId] = useState(initialPayerId || members[1]?.id || members[0]?.id || 'user-2');
  const [toId, setToId] = useState(initialReceiverId || members[0]?.id || 'user-1');
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
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
        remarks: `Trip ledger settlement for ${tripName}`,
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
        <View style={styles.sheet}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Settle Up</Text>
              <Text style={styles.headerSub}>{tripName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.slate500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={styles.bodyContent}>

            {/* Payment Flow Summary Card */}
            <View style={styles.flowCard}>
              <View style={styles.flowMember}>
                <View style={[styles.flowAvatar, { backgroundColor: fromMember?.avatarBg || '#059669' }]}>
                  <Text style={styles.flowAvatarText}>{getInitials(fromMember?.name || 'P')}</Text>
                </View>
                <Text style={styles.flowName} numberOfLines={1}>{fromMember?.name || 'Payer'}</Text>
                <Text style={styles.flowRole}>Paying</Text>
              </View>

              <View style={styles.flowArrowWrap}>
                <View style={styles.flowArrowLine} />
                <View style={styles.flowArrowCircle}>
                  <ArrowRight size={14} color="#059669" strokeWidth={2.5} />
                </View>
                <View style={styles.flowArrowLine} />
              </View>

              <View style={styles.flowMember}>
                <View style={[styles.flowAvatar, { backgroundColor: toMember?.avatarBg || '#0284C7' }]}>
                  <Text style={styles.flowAvatarText}>{getInitials(toMember?.name || 'R')}</Text>
                </View>
                <Text style={styles.flowName} numberOfLines={1}>{toMember?.name || 'Receiver'}</Text>
                <Text style={styles.flowRole}>Receiving</Text>
              </View>
            </View>

            {/* Who Is Paying */}
            <Text style={styles.sectionLabel}>Who Is Paying?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberChip, fromId === m.id && styles.memberChipActive]}
                  onPress={() => setFromId(m.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.chipAvatar, { backgroundColor: m.avatarBg }]}>
                    <Text style={styles.chipAvatarText}>{m.name.charAt(0)}</Text>
                  </View>
                  <Text style={[styles.chipText, fromId === m.id && styles.chipTextActive]}>
                    {m.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Paying To */}
            <Text style={styles.sectionLabel}>Paying To</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberChip, toId === m.id && styles.memberChipActive]}
                  onPress={() => setToId(m.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.chipAvatar, { backgroundColor: m.avatarBg }]}>
                    <Text style={styles.chipAvatarText}>{m.name.charAt(0)}</Text>
                  </View>
                  <Text style={[styles.chipText, toId === m.id && styles.chipTextActive]}>
                    {m.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Amount Input */}
            <Text style={styles.sectionLabel}>Amount</Text>
            <View style={styles.amountCard}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={colors.slate300}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
              {numAmount > 0 && (
                <View style={styles.amountBadge}>
                  <Text style={styles.amountBadgeText}>
                    {numAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
            </View>

            {/* UPI VPA Info */}
            <View style={styles.vpaCard}>
              <View style={styles.vpaIconBox}>
                <Smartphone size={16} color="#059669" strokeWidth={2.2} />
              </View>
              <View style={styles.vpaInfo}>
                <Text style={styles.vpaLabel}>RECEIVER UPI VPA</Text>
                <Text style={styles.vpaAddress}>{targetUpi}</Text>
              </View>
            </View>

            {/* UPI Launch */}
            <TouchableOpacity
              style={styles.upiBtn}
              onPress={handleLaunchUpi}
              activeOpacity={0.85}
            >
              <Smartphone size={16} color="#ffffff" strokeWidth={2.2} />
              <Text style={styles.upiBtnText}>Pay via UPI App</Text>
            </TouchableOpacity>

            {/* Offline Banner */}
            {!isOnline && (
              <View style={styles.offlineBanner}>
                <AlertCircle size={14} color="#D97706" strokeWidth={2.2} />
                <Text style={styles.offlineBannerText}>
                  You're offline — UPI apps need internet. Use "Mark as Settled" below to record locally.
                </Text>
              </View>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.settleBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleRecordSettlement}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <CheckCircle2 size={17} color="#ffffff" strokeWidth={2.2} />
              <Text style={styles.settleBtnText}>
                {isSubmitting
                  ? 'Recording...'
                  : numAmount > 0
                  ? `Mark as Settled  •  ₹${numAmount.toLocaleString('en-IN')}`
                  : 'Mark as Settled'}
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    ...shadows.xl,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '500',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    gap: 14,
  },
  // Flow Summary Card
  flowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },
  flowMember: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  flowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  flowName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  flowRole: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  flowArrowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 64,
    justifyContent: 'center',
  },
  flowArrowLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#A7F3D0',
  },
  flowArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Section Label
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -4,
  },
  // Member Chips
  chipRow: {
    flexDirection: 'row',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    gap: 7,
  },
  memberChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  chipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  // Amount Card
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 58,
    gap: 8,
    ...shadows.sm,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    padding: 0,
  },
  amountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  amountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  // VPA Card
  vpaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  vpaIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vpaInfo: {
    flex: 1,
  },
  vpaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  vpaAddress: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  // UPI Button
  upiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    ...shadows.md,
  },
  upiBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Offline Banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  offlineBannerText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 17,
  },
  // Footer
  footer: {
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    ...shadows.md,
  },
  settleBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
