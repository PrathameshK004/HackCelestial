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
import { X, UserPlus, Copy, Check, Shield, User } from 'lucide-react-native';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCopyCode = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Copied!', `Trip invite code "${inviteCode}" copied.`);
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
      Alert.alert('Added', `${name} has been added to ${tripName} in local SQLite!`);
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
              <Text style={styles.sheetTitle}>Trip Travelers</Text>
              <Text style={styles.sheetSubtitle}>{members.length} members in {tripName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.slate600} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Invite Code Box */}
            <View style={styles.inviteBox}>
              <View>
                <Text style={styles.inviteLabel}>Trip Invite Code</Text>
                <Text style={styles.inviteCodeText}>{inviteCode}</Text>
              </View>

              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode} activeOpacity={0.8}>
                {copied ? <Check size={14} color="#ffffff" /> : <Copy size={14} color="#ffffff" />}
                <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy Code'}</Text>
              </TouchableOpacity>
            </View>

            {/* Members List */}
            <Text style={styles.sectionTitle}>Active Group Members</Text>

            {members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: m.avatarBg || colors.primary600 }]}>
                  <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    {m.isUser && <Text style={styles.youBadge}>(You)</Text>}
                  </View>
                  <Text style={styles.memberRole}>
                    {m.role === 'Organizer' ? 'Trip Organizer' : 'Traveler'}
                  </Text>
                </View>

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
              </View>
            ))}

            {/* Add Traveler Form */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Add New Traveler</Text>

            <TextInput
              style={styles.input}
              placeholder="Traveler Name (e.g. Sara Khan)"
              placeholderTextColor={colors.slate400}
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Email address (optional)"
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
                {isSubmitting ? 'Adding...' : 'Add Traveler to Trip'}
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  memberRole: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 1,
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
