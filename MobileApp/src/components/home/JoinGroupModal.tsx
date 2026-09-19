/**
 * Join Group Modal matching WebApp JoinGroupModal.tsx
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { X, KeyRound, ArrowRight } from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { groupService } from '../../api/group.service';
import { useSync } from '../../context/SyncContext';

interface JoinGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined: () => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ visible, onClose, onJoined }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOnline } = useSync();

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Required', 'Please enter a 6-character invite code.');
      return;
    }

    if (!isOnline) {
      Alert.alert(
        'Offline',
        'Validating an invitation link requires internet connectivity to authenticate the trip code.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await groupService.acceptInvite(inviteCode.trim().toUpperCase());
      Alert.alert('Joined!', res.message || 'You have successfully joined the trip!');
      setInviteCode('');
      onJoined();
      onClose();
    } catch (e: any) {
      Alert.alert('Invalid Code', e.message || 'Could not join with this code. Please verify and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <KeyRound size={20} color={colors.primary600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Join Trip with Code</Text>
              <Text style={styles.subtitle}>Enter the 6-character invitation code</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.slate600} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="e.g. GOA784"
            placeholderTextColor={colors.slate400}
            autoCapitalize="characters"
            maxLength={10}
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
          />

          <TouchableOpacity
            style={styles.joinBtn}
            onPress={handleJoin}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.joinBtnText}>
              {isSubmitting ? 'Joining Trip...' : 'Join Group Trip'}
            </Text>
            <ArrowRight size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    padding: 20,
    ...shadows.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate900,
  },
  subtitle: {
    fontSize: 11.5,
    color: colors.slate500,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.bgApp,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    color: colors.slate900,
    marginBottom: 16,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    borderRadius: radii.md,
    paddingVertical: 13,
    gap: 8,
    ...shadows.sm,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
