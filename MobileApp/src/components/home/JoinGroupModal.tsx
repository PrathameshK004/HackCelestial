import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, KeyRound, ArrowRight, Eye } from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { groupService } from '../../api/group.service';
import { useSync } from '../../context/SyncContext';
import { InvitationModal } from './InvitationModal';

interface JoinGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined: () => void;
  onReviewInvite?: (inviteCode: string) => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ visible, onClose, onJoined, onReviewInvite }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { isOnline } = useSync();

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Required', 'Please enter a valid trip invitation code.');
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

  const handleOpenPreview = () => {
    if (!inviteCode.trim()) {
      Alert.alert('Required', 'Please enter a trip invitation code to review.');
      return;
    }
    const cleanCode = inviteCode.trim().toUpperCase();
    if (onReviewInvite) {
      onReviewInvite(cleanCode);
    } else {
      setIsPreviewOpen(true);
    }
  };

  return (
    <>
      <Modal visible={visible && !isPreviewOpen} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.iconWrap}>
                <KeyRound size={20} color={colors.primary600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Join Trip with Code</Text>
                <Text style={styles.subtitle}>Enter the invitation code to join or review</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={colors.slate600} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="e.g. TRIP-A1B2 or GOA784"
              placeholderTextColor={colors.slate400}
              autoCapitalize="characters"
              maxLength={15}
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
            />

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.previewBtn}
                onPress={handleOpenPreview}
                activeOpacity={0.85}
              >
                <Eye size={15} color={colors.primary700} />
                <Text style={styles.previewBtnText}>Review Invitation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.joinBtn}
                onPress={handleJoin}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.joinBtnText}>Join Now</Text>
                    <ArrowRight size={15} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Official Invitation Detail Screen */}
      <InvitationModal
        visible={isPreviewOpen}
        inviteCode={inviteCode.trim().toUpperCase()}
        onClose={() => setIsPreviewOpen(false)}
        onAccepted={() => {
          setIsPreviewOpen(false);
          setInviteCode('');
          onJoined();
          onClose();
        }}
        onDeclined={() => {
          setIsPreviewOpen(false);
          setInviteCode('');
          onClose();
        }}
      />
    </>
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
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radii.md,
    paddingVertical: 12,
  },
  previewBtnText: {
    color: '#047857',
    fontSize: 12.5,
    fontWeight: '700',
  },
  joinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    borderRadius: radii.md,
    paddingVertical: 12,
    gap: 6,
    ...shadows.sm,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
