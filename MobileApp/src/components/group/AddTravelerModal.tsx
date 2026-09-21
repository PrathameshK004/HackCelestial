import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { 
  X, 
  UserPlus, 
  Mail, 
  User, 
  CheckCircle2, 
  UserX,
  Sparkles
} from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { groupService } from '../../api/group.service';

interface AddTravelerModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (traveler: {
    name: string;
    email: string;
    role: string;
    avatarBg: string;
    isRegistered: boolean;
    status: string;
  }) => void;
  existingEmails: string[];
}

const AVATAR_COLORS = ['#059669', '#0284c7', '#7c3aed', '#ea580c', '#db2777', '#d97706', '#0891b2'];

export const AddTravelerModal: React.FC<AddTravelerModalProps> = ({
  visible,
  onClose,
  onAdd,
  existingEmails
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Live registration check state
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<{
    checked: boolean;
    isRegistered: boolean;
    registeredUsername?: string;
  } | null>(null);

  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNameManuallySetRef = useRef(false);

  // Reset state whenever modal opens or closes
  useEffect(() => {
    if (visible) {
      setName('');
      setEmail('');
      setNameError('');
      setEmailError('');
      setRegistrationStatus(null);
      setIsCheckingUser(false);
      isNameManuallySetRef.current = false;
    }
  }, [visible]);

  // Debounced check whenever email changes (matching WebApp exactly: 350ms)
  useEffect(() => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setRegistrationStatus(null);
      setIsCheckingUser(false);
      return;
    }

    setIsCheckingUser(true);
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await groupService.checkRegisteredUser(cleanEmail);
        if (res.data?.isRegistered && res.data.user) {
          const fetchedUsername = res.data.user.username || '';
          setRegistrationStatus({
            checked: true,
            isRegistered: true,
            registeredUsername: fetchedUsername,
          });

          // Auto-populate name if user hasn't manually entered a custom name
          if (!isNameManuallySetRef.current || !name.trim()) {
            setName(fetchedUsername);
            setNameError('');
          }
        } else {
          setRegistrationStatus({
            checked: true,
            isRegistered: false,
          });
        }
      } catch (err) {
        console.warn('Check user error:', err);
        setRegistrationStatus(null);
      } finally {
        setIsCheckingUser(false);
      }
    }, 350);

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [email]);

  const handleNameChange = (text: string) => {
    setName(text);
    isNameManuallySetRef.current = true;
    if (nameError) setNameError('');
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  const handleSubmit = () => {
    let valid = true;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Validate email
    if (!cleanEmail) {
      setEmailError('Email address is mandatory');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else if (existingEmails.map(e => e.toLowerCase()).includes(cleanEmail)) {
      setEmailError('This companion is already added to the trip');
      valid = false;
    } else {
      setEmailError('');
    }

    // Validate name
    if (!cleanName) {
      setNameError('Traveler full name is mandatory');
      valid = false;
    } else if (cleanName.length < 2) {
      setNameError('Name must be at least 2 characters');
      valid = false;
    } else {
      setNameError('');
    }

    if (valid) {
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      onAdd({
        name: cleanName,
        email: cleanEmail,
        role: 'Traveler',
        avatarBg: randomColor,
        isRegistered: registrationStatus?.isRegistered || false,
        status: 'PENDING'
      });
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.overlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.dialog}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.iconBadge}>
                  <UserPlus size={20} color={colors.primary600} />
                </View>
                <View>
                  <Text style={styles.title}>Add Companion Traveler</Text>
                  <Text style={styles.subtitle}>Auto-fetches existing accounts or sends invite</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.slate500} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={styles.body}>
              {/* Email Address with live verification */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Email Address</Text>
                  <Text style={styles.mandatoryBadge}>Required *</Text>
                </View>
                <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
                  <Mail size={18} color={colors.slate400} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. companion@example.com"
                    placeholderTextColor={colors.slate400}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={handleEmailChange}
                  />
                  {isCheckingUser && (
                    <ActivityIndicator size="small" color={colors.primary600} style={styles.spinner} />
                  )}
                </View>
                {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

                {/* Dynamic Platform Status Indicator (matching WebApp exactly) */}
                {registrationStatus && !isCheckingUser && (
                  <View style={[styles.statusBanner, registrationStatus.isRegistered ? styles.statusRegistered : styles.statusUnregistered]}>
                    {registrationStatus.isRegistered ? (
                      <CheckCircle2 size={18} color="#059669" style={styles.statusIcon} />
                    ) : (
                      <UserX size={18} color="#d97706" style={styles.statusIcon} />
                    )}
                    <View style={styles.statusTextContainer}>
                      {registrationStatus.isRegistered ? (
                        <>
                          <View style={styles.statusTitleRow}>
                            <Text style={styles.statusMainText}>
                              Platform User: <Text style={styles.boldText}>{registrationStatus.registeredUsername}</Text>
                            </Text>
                            <View style={styles.autoFilledTag}>
                              <Sparkles size={10} color="#059669" style={{ marginRight: 3 }} />
                              <Text style={styles.autoFilledTagText}>Name auto-fetched</Text>
                            </View>
                          </View>
                          <Text style={styles.statusSubText}>
                            📩 Official invite will be sent. Member joins group upon approval.
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.statusMainTextBold}>New to Triptual</Text>
                          <Text style={styles.statusSubTextAmber}>
                            📧 An invitation link will be sent to their email to join and create an account.
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* Full Name */}
              <View style={[styles.fieldGroup, { marginTop: 14 }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Traveler Full Name</Text>
                  <Text style={styles.mandatoryBadge}>Required *</Text>
                </View>
                <View style={[styles.inputContainer, nameError ? styles.inputError : null]}>
                  <User size={18} color={colors.slate400} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Alex Henderson"
                    placeholderTextColor={colors.slate400}
                    value={name}
                    onChangeText={handleNameChange}
                  />
                </View>
                {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
              </View>
            </View>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
                <UserPlus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Add to Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: radii.xl,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.slate900,
  },
  subtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.sm,
  },
  body: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  fieldGroup: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate800,
  },
  mandatoryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentRose,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    backgroundColor: '#f8fafc',
    height: 48,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: colors.accentRose,
    backgroundColor: '#fff1f2',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: colors.slate900,
  },
  spinner: {
    marginLeft: 8,
  },
  errorText: {
    color: colors.accentRose,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 5,
    marginLeft: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: radii.md,
    marginTop: 10,
    borderWidth: 1,
  },
  statusRegistered: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  statusUnregistered: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statusIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  statusMainText: {
    fontSize: 13,
    color: '#065f46',
  },
  statusMainTextBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  boldText: {
    fontWeight: '700',
    color: '#047857',
  },
  autoFilledTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  autoFilledTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
  },
  statusSubText: {
    fontSize: 11,
    color: '#047857',
    marginTop: 4,
    lineHeight: 16,
  },
  statusSubTextAmber: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 4,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.md,
  },
  cancelBtnText: {
    color: colors.slate600,
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary600,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
