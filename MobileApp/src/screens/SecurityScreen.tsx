/**
 * SecurityScreen - Security & Password Settings
 * Production-Grade 2FA, OTP Verification, Password Change & Session Management Screen
 * Visual parity with Triptual Mobile Design System (Emerald & Slate Palette)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  BackHandler,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Switch,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  ShieldAlert,
  Sparkles,
  X,
  Clock,
  Laptop,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../theme/colors';
import { backgrounds, borders, cardRadius, fontSize as fs, fontWeight as fw, screenHeader, spacing } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/auth.service';

interface SecurityScreenProps {
  onBack?: () => void;
}

export const SecurityScreen: React.FC<SecurityScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { user, updateUser, refreshProfile, logout } = useAuth();

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Forgot Password / OTP Reset Flow State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'reset'>('email');
  const [resetEmail, setResetEmail] = useState(user?.emailId || user?.email || '');
  const [otpCode, setOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPass, setShowResetNewPass] = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResettingPass, setIsResettingPass] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  // 2FA State
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pending2faValue, setPending2faValue] = useState<boolean | null>(null);
  const [isSubmitting2faToggle, setIsSubmitting2faToggle] = useState(false);
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [twoFactorOtp, setTwoFactorOtp] = useState(['', '', '', '', '', '']);
  const [isToggling2FA, setIsToggling2FA] = useState(false);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  // Session Revoke State
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);

  // Refs for OTP Input Auto-focusing
  const otpInputRefs = useRef<Array<TextInput | null>>([]);
  const tfaInputRefs = useRef<Array<TextInput | null>>([]);

  // Hardware Back Press
  useEffect(() => {
    const onHardwareBack = () => {
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [onBack]);

  // Sync 2FA state from user context profile
  useEffect(() => {
    if (user?.twoFactorEnabled !== undefined) {
      setIsTwoFactorEnabled(Boolean(user.twoFactorEnabled));
    }
  }, [user?.twoFactorEnabled]);

  // Resend Timer Countdown
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0 && (isForgotModalOpen || is2faModalOpen)) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, isForgotModalOpen, is2faModalOpen]);

  const headerTopPadding =
    Platform.OS === 'android'
      ? Math.max(StatusBar.currentHeight || 0, insets.top, 24) + 10
      : insets.top > 0
      ? 12
      : 16;

  // Password Strength Calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: 'Empty', score: 0, color: colors.slate300 };
    if (pass.length < 6) return { label: 'Weak', score: 1, color: colors.accentRose };
    let score = 1;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { label: 'Fair', score: 2, color: colors.accentAmber };
    return { label: 'Strong', score: 3, color: colors.primary600 };
  };

  const passStrength = getPasswordStrength(newPassword);

  // 1. Handle Logged-In Password Change
  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirmation do not match.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await authService.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      if (res.success || (res as any).message?.toLowerCase().includes('success')) {
        Alert.alert('Password Changed', 'Your password has been updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', res.error || res.message || 'Failed to change password.');
      }
    } catch (err: any) {
      Alert.alert('Password Change Failed', err.message || 'Incorrect current password or server error.');
    } finally {
      setIsChangingPass(false);
    }
  };

  // 2. Handle Send Forgot Password OTP
  const handleSendResetOtp = async () => {
    const email = resetEmail.trim().toLowerCase();
    if (!email) {
      Alert.alert('Validation Error', 'Please enter your email address.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await authService.forgotPassword(email);
      if (res.success || (res as any).message?.toLowerCase().includes('sent')) {
        setResetStep('reset');
        setResendTimer(60);
      } else {
        Alert.alert('Request Failed', res.error || res.message || 'No registered account found with this email.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 3. Handle Complete Password Reset (OTP + New Password in single step)
  const handleCompleteReset = async () => {
    const code = otpCode.trim();
    if (code.length < 4) {
      Alert.alert('Validation Error', 'Please enter the complete 4-digit verification code.');
      return;
    }
    if (resetNewPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }

    setIsResettingPass(true);
    try {
      const res = await authService.resetPassword({
        emailId: resetEmail.trim().toLowerCase(),
        code,
        newPassword: resetNewPassword.trim(),
      });

      if (res.success || (res as any).message?.toLowerCase().includes('success')) {
        Alert.alert('Password Reset Successful', 'Your password has been reset. You can now use your new password.');
        setIsForgotModalOpen(false);
        setResetStep('email');
        setOtpCode('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      } else {
        Alert.alert('Reset Failed', res.error || res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      Alert.alert('Reset Error', err.message || 'Failed to reset password.');
    } finally {
      setIsResettingPass(false);
    }
  };

  // 5. Handle Toggle 2FA Switch (Triggers Industry-Grade Confirmation Modal)
  const handleToggle2FASwitch = (value: boolean) => {
    setPending2faValue(value);
    setIsConfirmModalOpen(true);
  };

  // Confirm 2FA Toggle Action
  const handleConfirm2FAToggle = async () => {
    if (pending2faValue === null) return;
    const targetValue = pending2faValue;
    setIsSubmitting2faToggle(true);
    try {
      const res = await authService.toggleTwoFactor(targetValue);
      if (res.success || res.data?.twoFactorEnabled !== undefined) {
        setIsTwoFactorEnabled(targetValue);
        await updateUser({ twoFactorEnabled: targetValue }).catch(() => {});
        refreshProfile?.().catch(() => {});
        setIsConfirmModalOpen(false);
      } else {
        Alert.alert('Update Failed', res.error || res.message || 'Could not update 2FA setting.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update 2FA setting.');
    } finally {
      setIsSubmitting2faToggle(false);
    }
  };

  // 6. Handle Verify 2FA OTP Code
  const handleVerify2FAOtp = async () => {
    const code = twoFactorOtp.join('');
    if (code.length < 6) {
      Alert.alert('Validation Error', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifying2FA(true);
    try {
      const res = await authService.verifyTwoFactorOtp(code);
      if (res.success || (res as any).twoFactorEnabled) {
        setIsTwoFactorEnabled(true);
        setIs2faModalOpen(false);
        refreshProfile?.().catch(() => {});
        Alert.alert('2FA Activated 🎉', 'Two-Factor Authentication is now enabled for your Triptual account!');
      } else {
        Alert.alert('Verification Error', res.error || res.message || 'Invalid verification code.');
      }
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Invalid 2FA code.');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  // 7. Handle Revoke All Active Sessions
  const handleRevokeSessions = () => {
    Alert.alert(
      'Revoke All Other Sessions',
      'This will log you out of all other active web and mobile devices. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke All Sessions',
          style: 'destructive',
          onPress: async () => {
            setIsRevokingSessions(true);
            try {
              const res = await authService.revokeAllSessions();
              if (res.success) {
                Alert.alert('Sessions Revoked', 'All other device sessions have been revoked successfully.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to revoke sessions.');
            } finally {
              setIsRevokingSessions(false);
            }
          },
        },
      ]
    );
  };

  // OTP Digit Change Handler
  const handleOtpDigitChange = (text: string, index: number, isTfa = false) => {
    const val = text.slice(-1);
    const targetArr = isTfa ? [...twoFactorOtp] : [...otpCode];
    const setArr = isTfa ? setTwoFactorOtp : setOtpCode;
    const refs = isTfa ? tfaInputRefs : otpInputRefs;

    targetArr[index] = val;
    (setArr as any)(targetArr);

    if (val && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: headerTopPadding }]}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Security & Password</Text>
        </View>

        {isTwoFactorEnabled && (
          <View style={[styles.securityBadge, styles.securityBadgeActive]}>
            <ShieldCheck size={14} color={'#059669'} />
            <Text style={[styles.securityBadgeText, styles.securityBadgeTextActive]}>
              2FA Protected
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >



        {/* Section 1: Change Password */}
        <View style={styles.cardSection}>
          <View style={styles.sectionTitleRow}>
            <KeyRound size={18} color={colors.primary600} />
            <Text style={styles.sectionTitle}>Change Password</Text>
          </View>

          <Text style={styles.inputLabel}>Current Password</Text>
          <View style={styles.passwordInputRow}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showCurrentPass}
              placeholder="Enter current password"
              placeholderTextColor={colors.slate400}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)} style={styles.eyeBtn}>
              {showCurrentPass ? <EyeOff size={18} color={colors.slate400} /> : <Eye size={18} color={colors.slate400} />}
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>New Password</Text>
          <View style={styles.passwordInputRow}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showNewPass}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.slate400}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={styles.eyeBtn}>
              {showNewPass ? <EyeOff size={18} color={colors.slate400} /> : <Eye size={18} color={colors.slate400} />}
            </TouchableOpacity>
          </View>

          {/* Password Strength Indicator */}
          {newPassword.length > 0 && (
            <View style={styles.strengthRow}>
              <View style={styles.strengthBarBg}>
                <View
                  style={[
                    styles.strengthBarFill,
                    { width: `${(passStrength.score / 3) * 100}%`, backgroundColor: passStrength.color },
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: passStrength.color }]}>{passStrength.label}</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <View style={styles.passwordInputRow}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showConfirmPass}
              placeholder="Re-enter new password"
              placeholderTextColor={colors.slate400}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)} style={styles.eyeBtn}>
              {showConfirmPass ? <EyeOff size={18} color={colors.slate400} /> : <Eye size={18} color={colors.slate400} />}
            </TouchableOpacity>
          </View>

          <View style={styles.passActionsRow}>
            <TouchableOpacity
              style={styles.forgotPassLink}
              onPress={() => {
                setIsForgotModalOpen(true);
                setResetStep('email');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPassText}>Forgot Password? (Reset via OTP)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.savePassBtn, isChangingPass && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={isChangingPass}
              activeOpacity={0.85}
            >
              {isChangingPass ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <CheckCircle2 size={15} color="#FFFFFF" />
              )}
              <Text style={styles.savePassBtnText}>{isChangingPass ? 'Updating...' : 'Update Password'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Two-Factor Authentication (2FA) */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeaderBetween}>
            <View style={styles.sectionTitleRow}>
              <ShieldCheck size={18} color={colors.primary600} />
              <View>
                <Text style={styles.sectionTitle}>Two-Factor Authentication (2FA)</Text>
                <Text style={styles.sectionSubtitle}>Require 6-digit email OTP verification on new logins</Text>
              </View>
            </View>

            <Switch
              value={isTwoFactorEnabled}
              onValueChange={handleToggle2FASwitch}
              disabled={isToggling2FA}
              trackColor={{ false: colors.slate200, true: colors.primary200 }}
              thumbColor={isTwoFactorEnabled ? colors.primary600 : colors.slate400}
            />
          </View>

          <View style={styles.twoFactorInfoBox}>
            <Mail size={16} color={colors.primary600} />
            <Text style={styles.twoFactorInfoText}>
              2FA sends a secure verification code to your registered email address ({user?.emailId || user?.email || 'your email'}) during suspicious access attempts.
            </Text>
          </View>
        </View>

        {/* Section 3: Active Device Sessions */}
        <View style={styles.cardSection}>
          <View style={styles.sectionTitleRow}>
            <Smartphone size={18} color={colors.primary600} />
            <Text style={styles.sectionTitle}>Active Sessions & Devices</Text>
          </View>

          <View style={styles.deviceRow}>
            <View style={styles.deviceIconCircle}>
              <Smartphone size={18} color={colors.primary600} />
            </View>
            <View style={styles.deviceInfoCol}>
              <View style={styles.deviceNameRow}>
                <Text style={styles.deviceName}>{Platform.OS === 'ios' ? 'Apple iPhone' : 'Android Mobile'}</Text>
                <View style={styles.currentDeviceBadge}>
                  <Text style={styles.currentDeviceBadgeText}>This Device</Text>
                </View>
              </View>
              <Text style={styles.deviceMeta}>Active Now • Triptual Mobile App v1.4.2</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.revokeSessionsBtn}
            onPress={handleRevokeSessions}
            disabled={isRevokingSessions}
            activeOpacity={0.8}
          >
            {isRevokingSessions ? (
              <ActivityIndicator size="small" color={colors.accentRose} />
            ) : (
              <LogOut size={16} color={colors.accentRose} />
            )}
            <Text style={styles.revokeSessionsText}>
              {isRevokingSessions ? 'Revoking Sessions...' : 'Revoke All Other Device Sessions'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── MODAL 1: Forgot Password via Email OTP ── */}
      <Modal visible={isForgotModalOpen} transparent animationType="slide" onRequestClose={() => setIsForgotModalOpen(false)}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setIsForgotModalOpen(false)} />
          <View style={styles.bottomSheetCard}>
            {/* STEP 1: Email Request */}
            {resetStep === 'email' && (
              <View>
                <View style={styles.bsHeader}>
                  <View style={styles.bsIconCircle}>
                    <KeyRound size={20} color="#2563EB" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bsTitle}>Password Reset</Text>
                    <Text style={styles.bsSubtitle}>Enter your email to receive a verification code</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsForgotModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={20} color={colors.slate500} />
                  </TouchableOpacity>
                </View>

                <View style={styles.bsDivider} />

                <Text style={styles.bsLabel}>Registered Email Address <Text style={{ color: '#DC2626' }}>*</Text></Text>
                <View style={styles.bsInputRow}>
                  <Mail size={18} color={colors.slate400} />
                  <TextInput
                    style={styles.bsInput}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    placeholder="yourname@gmail.com"
                    placeholderTextColor={colors.slate400}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.bsPrimaryBtn, isSendingOtp && { opacity: 0.7 }]}
                  onPress={handleSendResetOtp}
                  disabled={isSendingOtp}
                  activeOpacity={0.85}
                >
                  {isSendingOtp ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                  <Text style={styles.bsPrimaryBtnText}>{isSendingOtp ? 'Sending OTP...' : 'Send Verification Code'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: OTP + New Password (Combined — Matches Reference UI) */}
            {resetStep === 'reset' && (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Header with icon circle */}
                <View style={styles.bsHeader}>
                  <View style={styles.bsIconCircle}>
                    <KeyRound size={20} color="#2563EB" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bsTitle}>Password Reset</Text>
                    <Text style={styles.bsSubtitle}>Code sent to {resetEmail}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsForgotModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={20} color={colors.slate500} />
                  </TouchableOpacity>
                </View>

                <View style={styles.bsDivider} />

                {/* OTP Field — Blue Border */}
                <Text style={styles.bsLabel}>4-Digit Verification Code <Text style={{ color: '#DC2626' }}>*</Text></Text>
                <View style={styles.bsOtpRow}>
                  <Mail size={18} color={colors.slate400} />
                  <TextInput
                    style={styles.bsOtpInput}
                    value={otpCode}
                    onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="Enter 4-digit OTP"
                    placeholderTextColor={colors.slate400}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>

                <View style={[styles.resendRow, { marginTop: 6, marginBottom: 8 }]}>
                  <Text style={styles.resendTimerText}>
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Didn't receive code?"}
                  </Text>
                  {resendTimer === 0 && (
                    <TouchableOpacity onPress={handleSendResetOtp}>
                      <Text style={styles.resendLinkText}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* New Password — Gray bg */}
                <Text style={styles.bsLabel}>New Password <Text style={{ color: '#DC2626' }}>*</Text></Text>
                <View style={styles.bsPasswordRow}>
                  <Lock size={18} color={colors.slate400} />
                  <TextInput
                    style={styles.bsInput}
                    secureTextEntry={!showResetNewPass}
                    value={resetNewPassword}
                    onChangeText={setResetNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.slate400}
                  />
                  <TouchableOpacity onPress={() => setShowResetNewPass(!showResetNewPass)} style={styles.eyeBtn}>
                    {showResetNewPass ? <EyeOff size={18} color={colors.slate400} /> : <Eye size={18} color={colors.slate400} />}
                  </TouchableOpacity>
                </View>

                {/* Confirm Password — Gray bg */}
                <Text style={styles.bsLabel}>Confirm New Password <Text style={{ color: '#DC2626' }}>*</Text></Text>
                <View style={styles.bsPasswordRow}>
                  <Lock size={18} color={colors.slate400} />
                  <TextInput
                    style={styles.bsInput}
                    secureTextEntry={!showResetConfirmPass}
                    value={resetConfirmPassword}
                    onChangeText={setResetConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.slate400}
                  />
                  <TouchableOpacity onPress={() => setShowResetConfirmPass(!showResetConfirmPass)} style={styles.eyeBtn}>
                    {showResetConfirmPass ? <EyeOff size={18} color={colors.slate400} /> : <Eye size={18} color={colors.slate400} />}
                  </TouchableOpacity>
                </View>

                {/* Reset Button */}
                <TouchableOpacity
                  style={[styles.bsPrimaryBtn, isResettingPass && { opacity: 0.7 }]}
                  onPress={handleCompleteReset}
                  disabled={isResettingPass}
                  activeOpacity={0.85}
                >
                  {isResettingPass ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                  <Text style={styles.bsPrimaryBtnText}>{isResettingPass ? 'Resetting...' : 'Reset Password'}</Text>
                </TouchableOpacity>

                <View style={{ height: 16 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: 2FA Confirmation Modal (Industry-Grade Design) ── */}
      <Modal
        visible={isConfirmModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmitting2faToggle) setIsConfirmModalOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalCard}>
            {/* Header Icon Circle */}
            <View
              style={[
                styles.confirmIconCircle,
                pending2faValue ? styles.confirmIconEnable : styles.confirmIconDisable,
              ]}
            >
              {pending2faValue ? (
                <ShieldCheck size={30} color="#059669" strokeWidth={2.4} />
              ) : (
                <ShieldAlert size={30} color="#DC2626" strokeWidth={2.4} />
              )}
            </View>

            {/* Title */}
            <Text style={styles.confirmModalTitle}>
              {pending2faValue ? 'Enable Two-Factor Security?' : 'Disable Two-Factor Security?'}
            </Text>

            {/* Subtitle / Description */}
            <Text style={styles.confirmModalSubtitle}>
              {pending2faValue
                ? `When enabled, logins will require a 6-digit verification code sent to ${user?.emailId || user?.email || 'your email'} for extra security.`
                : 'Turning off 2FA removes email OTP verification. Your account will rely solely on password protection for sign-in.'}
            </Text>

            {/* Actions Row */}
            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting2faToggle}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  pending2faValue ? styles.confirmBtnEnable : styles.confirmBtnDisable,
                  isSubmitting2faToggle && { opacity: 0.7 },
                ]}
                onPress={handleConfirm2FAToggle}
                disabled={isSubmitting2faToggle}
                activeOpacity={0.85}
              >
                {isSubmitting2faToggle ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {pending2faValue ? 'Enable 2FA' : 'Disable 2FA'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: backgrounds.screen,
  },
  header: {
    minHeight: screenHeader.height,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.headerHorizontal,
    paddingBottom: spacing.headerBottom,
    backgroundColor: backgrounds.header,
    borderBottomWidth: 1,
    borderBottomColor: borders.header,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fs.headerTitle,
    fontWeight: fw.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  securityBadgeActive: {
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  securityBadgeText: {
    fontSize: fs.badgeText,
    fontWeight: fw.semiBold,
    color: colors.slate600,
  },
  securityBadgeTextActive: {
    color: colors.primary700,
  },
  scroll: {
    flex: 1,
    backgroundColor: backgrounds.screen,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.screenTop,
    paddingBottom: spacing.screenBottom,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
    ...shadows.sm,
    marginBottom: 20,
  },
  bannerIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: colors.slate900,
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    fontSize: 12.5,
    color: colors.slate600,
    marginTop: 2,
    lineHeight: 18,
  },
  cardSection: {
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: borders.card,
    marginBottom: spacing.cardGap,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: fs.sectionTitle,
    fontWeight: fw.bold,
    color: colors.slate900,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: fs.sectionSubtitle,
    color: colors.slate500,
    marginTop: 1,
  },
  inputLabel: {
    fontSize: fs.inputLabel,
    fontWeight: fw.semiBold,
    color: colors.slate700,
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.inner,
    borderWidth: 1,
    borderColor: borders.input,
    paddingHorizontal: 8,
    height: spacing.inputHeight,
  },
  passwordInput: {
    flex: 1,
    fontSize: fs.inputText,
    color: colors.slate800,
  },
  eyeBtn: {
    padding: 6,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: colors.slate200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  passActionsRow: {
    marginTop: 16,
    gap: 12,
  },
  forgotPassLink: {
    alignSelf: 'flex-start',
  },
  forgotPassText: {
    fontSize: fs.linkText,
    fontWeight: fw.semiBold,
    color: colors.primary600,
  },
  savePassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    borderRadius: cardRadius.inner,
    paddingVertical: 12,
    gap: 8,
    ...shadows.sm,
  },
  savePassBtnText: {
    color: '#FFFFFF',
    fontSize: fs.buttonText,
    fontWeight: fw.semiBold,
  },
  twoFactorInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: backgrounds.infoBox,
    padding: 12,
    borderRadius: cardRadius.inner,
    borderWidth: 1,
    borderColor: borders.infoBox,
    marginTop: 6,
  },
  twoFactorInfoText: {
    flex: 1,
    fontSize: fs.infoText,
    color: colors.primary900,
    lineHeight: 18,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    marginVertical: 8,
  },
  deviceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfoCol: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    fontSize: fs.deviceName,
    fontWeight: fw.semiBold,
    color: colors.slate900,
  },
  currentDeviceBadge: {
    backgroundColor: colors.primary50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  currentDeviceBadgeText: {
    fontSize: fs.smallBadge,
    fontWeight: fw.semiBold,
    color: colors.primary700,
  },
  deviceMeta: {
    fontSize: fs.deviceMeta,
    color: colors.slate500,
    marginTop: 2,
  },
  revokeSessionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: backgrounds.danger,
    borderRadius: cardRadius.inner,
    paddingVertical: 12,
    marginTop: 8,
  },
  revokeSessionsText: {
    color: colors.accentRose,
    fontSize: fs.dangerButton,
    fontWeight: fw.semiBold,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: backgrounds.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    zIndex: 1000,
  },
  modalCard: {
    width: '100%',
    backgroundColor: backgrounds.modal,
    borderRadius: cardRadius.modal,
    padding: spacing.modalPadding,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: fs.modalTitle,
    fontWeight: fw.bold,
    color: colors.slate900,
  },
  closeModalBtn: {
    padding: 4,
  },
  stepSubtitle: {
    fontSize: fs.modalSubtitle,
    color: colors.slate600,
    marginBottom: 12,
    lineHeight: 18,
  },
  textInput: {
    backgroundColor: backgrounds.input,
    borderRadius: cardRadius.inner,
    borderWidth: 1,
    borderColor: borders.input,
    paddingHorizontal: 8,
    height: spacing.inputHeight,
    fontSize: fs.inputText,
    color: colors.slate800,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary600,
    borderRadius: cardRadius.inner,
    paddingVertical: 13,
    marginTop: 18,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: fs.modalButton,
    fontWeight: fw.semiBold,
  },
  resetOtpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.inner,
    borderWidth: 1.5,
    borderColor: colors.primary600,
    paddingHorizontal: 10,
    height: spacing.inputHeight,
    gap: 8,
  },
  resetOtpInput: {
    flex: 1,
    fontSize: fs.inputText,
    fontWeight: fw.semiBold,
    color: colors.slate800,
    letterSpacing: 2,
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 16,
  },
  otpBox: {
    flex: 1,
    height: spacing.otpHeight,
    backgroundColor: backgrounds.input,
    borderRadius: cardRadius.inner,
    borderWidth: 1.5,
    borderColor: borders.input,
    textAlign: 'center',
    fontSize: fs.otpDigit,
    fontWeight: fw.bold,
    color: colors.slate900,
  },
  otpBoxActive: {
    borderColor: colors.primary600,
    backgroundColor: colors.primary50,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  resendTimerText: {
    fontSize: fs.caption,
    color: colors.slate500,
  },
  resendLinkText: {
    fontSize: fs.caption,
    fontWeight: fw.semiBold,
    color: colors.primary600,
  },

  /* ── 2FA Custom Confirmation Modal Styles ── */
  confirmModalCard: {
    width: '100%',
    backgroundColor: backgrounds.modal,
    borderRadius: cardRadius.modal,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  confirmIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmIconEnable: {
    backgroundColor: backgrounds.enableBg,
  },
  confirmIconDisable: {
    backgroundColor: backgrounds.disableBg,
  },
  confirmModalTitle: {
    fontSize: fs.confirmTitle,
    fontWeight: fw.bold,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmModalSubtitle: {
    fontSize: fs.confirmSubtitle,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: fs.confirmButton,
    fontWeight: fw.medium,
  },
  confirmBtn: {
    flex: 1,
    height: spacing.inputHeight,
    borderRadius: cardRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnEnable: {
    backgroundColor: '#059669',
  },
  confirmBtnDisable: {
    backgroundColor: '#DC2626',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: fs.confirmButton,
    fontWeight: fw.semiBold,
  },

  /* ── Bottom Sheet Forgot Password Styles (Matching Reference UI) ── */
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '85%',
  },
  bsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bsIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  bsSubtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 1,
  },
  bsDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  bsLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 4,
  },
  bsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
    marginBottom: 16,
  },
  bsOtpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2563EB',
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  bsOtpInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: 3,
  },
  bsPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
    marginBottom: 16,
  },
  bsInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  bsPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    height: 48,
    gap: 8,
    marginTop: 8,
  },
  bsPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
