/**
 * AuthScreen — Mobile Auth (Login | Sign Up with OTP | Forgot Password)
 *
 * Industry-grade 3-mode auth screen with full backend integration:
 *
 * ── Login mode ──────────────────────────────────────────────────────────────
 *   • Email + Password pill inputs
 *   • Remember me + Forgot Password link
 *   • Calls POST /users/login → stores JWT → navigates to HomeScreen
 *
 * ── Signup mode (2-step OTP flow) ──────────────────────────────────────────
 *   Step 1 — Details:
 *     • Full Name, Email, Password (strength meter), Confirm Password
 *     • Calls POST /users/registerTempUser → OTP email sent
 *   Step 2 — OTP Verification:
 *     • 4-digit grid with auto-focus, auto-advance, auto-submit
 *     • 30s resend countdown → Resend button
 *     • Calls POST /users/registerUser → activates account + instant login
 *
 * ── Forgot Password mode ────────────────────────────────────────────────────
 *   Step 1 — Enter email → POST /users/forgot-password → OTP email sent
 *   Step 2 — Enter 4-digit OTP + new password → POST /users/reset-password
 *
 * UI: Exact match to mobile view of WebApp — hero image, overlapping white card,
 *     pill inputs, vibrant blue action button, or-divider, social buttons
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Animated,
  BackHandler,
  ToastAndroid,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  User,
  Eye,
  EyeOff,
  Check,
  Phone,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  KeyRound,
  Mail,
  Lock,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const { width: W } = Dimensions.get('window');

// ── Google Multi-Color SVG Icon ──────────────────────────────────────────────
const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </Svg>
);

// ── Password Strength Meter ───────────────────────────────────────────────────
const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: '', color: '#E2E8F0' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  switch (score) {
    case 1: return { score: 1, label: 'Weak', color: '#EF4444' };
    case 2: return { score: 2, label: 'Fair', color: '#F59E0B' };
    case 3: return { score: 3, label: 'Good', color: '#0284C7' };
    case 4:
    default: return { score: 4, label: 'Strong', color: '#059669' };
  }
};

// ── Spinning loader for buttons ───────────────────────────────────────────────
const SpinningLoader: React.FC = () => {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 800, useNativeDriver: true })
    ).start();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }], marginRight: 8 }}>
      <RotateCw size={16} color="#FFFFFF" />
    </Animated.View>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
type AuthMode = 'login' | 'signup' | 'forgot';
type SignupStep = 1 | 2;
type ForgotStep = 1 | 2;

export const AuthScreen: React.FC = () => {
  const { login, registerTemp, verifyAndRegister, resendOtp, loginWithGoogle } = useAuth();

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<AuthMode>('login');

  // ── Shared Fields ─────────────────────────────────────────────────────────
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleGoogleLogin = async () => {
    clearMessages();
    setIsLoading(true);

    try {
      const clientId = '324729375491-nl1j4657c42169gptkb1tm8ttoqkce8q.apps.googleusercontent.com';
      const redirectUri = 'https://triptual-x.vercel.app';
      const nonce = Math.random().toString(36).substring(2, 15);

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=${encodeURIComponent('token id_token')}` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&nonce=${encodeURIComponent(nonce)}` +
        `&prompt=select_account`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const urlStr = result.url;
        const hash = urlStr.includes('#')
          ? urlStr.split('#')[1]
          : (urlStr.includes('?') ? urlStr.split('?')[1] : '');

        const params: Record<string, string> = {};
        hash.split('&').forEach((part) => {
          const [k, v] = part.split('=');
          if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });

        const accessToken = params['access_token'];
        const idToken = params['id_token'];

        if (!accessToken && !idToken) {
          setErrorMessage('Google sign-in was canceled or credentials were not received.');
          setIsLoading(false);
          return;
        }

        const res = await loginWithGoogle({ accessToken, credential: idToken });
        if (res.success) {
          setSuccessMessage('Welcome! Loading your trip workspace…');
        } else {
          setErrorMessage(res.error || 'Google sign-in failed');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User closed browser
      } else {
        setErrorMessage('Google sign-in could not be completed.');
      }
    } catch (err: any) {
      console.error('Mobile Google SSO Error:', err);
      setErrorMessage(err.message || 'Google sign-in encountered an error.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    clearMessages();
    setMode(next);
    // Reset sub-steps
    setSignupStep(1);
    setForgotStep(1);
    setOtpDigits(['', '', '', '']);
    setForgotOtpDigits(['', '', '', '']);
    setResendTimer(30);
    setCanResend(false);
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  LOGIN
  // ══════════════════════════════════════════════════════════════════════════
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async () => {
    clearMessages();
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail) { setErrorMessage('Please enter your email address'); return; }
    if (!loginPassword) { setErrorMessage('Please enter your password'); return; }

    setIsLoading(true);
    try {
      const res = await login({ emailId: cleanEmail, password: loginPassword });
      if (res.success) {
        setSuccessMessage('Welcome back! Loading your workspace…');
      } else {
        setErrorMessage(res.error || 'Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  SIGNUP — Step 1 (Details) + Step 2 (OTP Verification)
  // ══════════════════════════════════════════════════════════════════════════
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  // OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const otpRefs = useRef<(TextInput | null)[]>([null, null, null, null]);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (mode === 'signup' && signupStep === 2 && resendTimer > 0) {
      const id = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) { setCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
  }, [mode, signupStep, resendTimer]);

  // Step 1 Submit
  const handleSignupStep1 = async () => {
    clearMessages();
    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) { setErrorMessage('Please enter your full name'); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!signupEmail.trim() || !emailRegex.test(signupEmail.trim())) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) { setErrorMessage('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setErrorMessage('Passwords do not match'); return; }

    setIsLoading(true);
    try {
      const res = await registerTemp({
        username: cleanName,
        emailId: signupEmail.trim().toLowerCase(),
        password,
      });
      if (res.success) {
        setSignupStep(2);
        setResendTimer(30);
        setCanResend(false);
        // Show OTP from backend in dev (backend echoes it in response)
        const codeStr = res.otp ? String(res.otp).padStart(4, '0') : '';
        if (codeStr && codeStr.length === 4) {
          setOtpDigits(codeStr.split(''));
          setSuccessMessage(`Code sent to ${signupEmail.trim().toLowerCase()} (Code: ${codeStr})`);
        } else {
          setOtpDigits(['', '', '', '']);
          setSuccessMessage(`A 4-digit code was sent to ${signupEmail.trim().toLowerCase()}`);
        }
        setTimeout(() => otpRefs.current[0]?.focus(), 150);
      } else {
        setErrorMessage(res.message || 'Failed to send verification code. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP digit input handler
  const handleOtpChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean && value !== '') return; // ignore non-numeric

    if (clean.length > 1) {
      // Paste handling
      const chars = clean.slice(0, 4).split('');
      const next = ['', '', '', ''];
      chars.forEach((c, i) => { if (i < 4) next[i] = c; });
      setOtpDigits(next);
      const lastIdx = Math.min(chars.length, 3);
      otpRefs.current[lastIdx]?.focus();
      if (next.every((d) => d.length === 1)) {
        setTimeout(() => submitOtp(next.join('')), 100);
      }
      return;
    }

    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);
    if (clean && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d.length === 1)) {
      setTimeout(() => submitOtp(next.join('')), 150);
    }
  };

  const handleOtpKeyDown = (index: number, key: string) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    clearMessages();
    try {
      const res = await resendOtp(signupEmail.trim().toLowerCase(), 'Sign Up');
      if (res.success) {
        setResendTimer(30);
        setCanResend(false);
        const codeStr = res.otp ? String(res.otp).padStart(4, '0') : '';
        if (codeStr && codeStr.length === 4) {
          setOtpDigits(codeStr.split(''));
          setSuccessMessage(`New code sent (Code: ${codeStr})`);
        } else {
          setOtpDigits(['', '', '', '']);
          setSuccessMessage('A new verification code has been sent.');
        }
        setTimeout(() => otpRefs.current[0]?.focus(), 150);
      } else {
        setErrorMessage(res.message || 'Could not resend code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Submit OTP
  const submitOtp = async (code: string) => {
    if (isLoading || code.length < 4) return;
    clearMessages();
    setIsLoading(true);
    try {
      const res = await verifyAndRegister({
        username: fullName.trim(),
        emailId: signupEmail.trim().toLowerCase(),
        password,
        code: code.trim(),
      });
      if (res.success) {
        setSuccessMessage('✓ Account verified! Signing you in…');
      } else {
        setErrorMessage(res.message || 'Incorrect code. Please try again.');
        // Clear OTP boxes on wrong code
        setOtpDigits(['', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification error. Please try again.');
      setOtpDigits(['', '', '', '']);
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  FORGOT PASSWORD — Step 1 (Email) + Step 2 (OTP + New Password)
  // ══════════════════════════════════════════════════════════════════════════
  const [forgotStep, setForgotStep] = useState<ForgotStep>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(['', '', '', '']);
  const forgotOtpRefs = useRef<(TextInput | null)[]>([null, null, null, null]);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotResendTimer, setForgotResendTimer] = useState(30);
  const [forgotCanResend, setForgotCanResend] = useState(false);
  const { forgotPassword: sendForgotPassword, verifyResetOtp, resetPassword } = useForgotHelpers();

  // Forgot countdown
  useEffect(() => {
    if (mode === 'forgot' && forgotStep === 2 && forgotResendTimer > 0) {
      const id = setInterval(() => {
        setForgotResendTimer((prev) => {
          if (prev <= 1) { setForgotCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
  }, [mode, forgotStep, forgotResendTimer]);

  const handleForgotStep1 = async () => {
    clearMessages();
    const email = forgotEmail.trim().toLowerCase();
    if (!email) { setErrorMessage('Please enter your email address'); return; }
    setIsLoading(true);
    try {
      const res = await sendForgotPassword(email);
      if (res.success) {
        setForgotStep(2);
        setForgotResendTimer(30);
        setForgotCanResend(false);
        setSuccessMessage(`A reset code was sent to ${email}`);
        setTimeout(() => forgotOtpRefs.current[0]?.focus(), 150);
      } else {
        setErrorMessage(res.message || 'No account found with this email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error sending reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotOtpChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean && value !== '') return;
    const next = [...forgotOtpDigits];
    next[index] = clean.slice(-1);
    setForgotOtpDigits(next);
    if (clean && index < 3) {
      forgotOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleForgotStep2 = async () => {
    clearMessages();
    const code = forgotOtpDigits.join('');
    if (code.length < 4) { setErrorMessage('Please enter the 4-digit verification code'); return; }
    if (!newPassword || newPassword.length < 6) { setErrorMessage('New password must be at least 6 characters'); return; }
    setIsLoading(true);
    try {
      const res = await resetPassword({ emailId: forgotEmail.trim().toLowerCase(), code, newPassword });
      if (res.success) {
        setSuccessMessage('Password reset successfully! You can now log in.');
        setTimeout(() => switchMode('login'), 1500);
      } else {
        setErrorMessage(res.message || 'Invalid code. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Reset failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  const getHeaderTitle = () => {
    if (mode === 'forgot') return forgotStep === 1 ? 'Reset Password' : 'Verify & Reset';
    if (mode === 'signup') return signupStep === 1 ? 'Sign Up' : 'Verify Email';
    return 'Log In';
  };

  const getHeaderSubtitle = () => {
    if (mode === 'forgot') {
      return forgotStep === 1
        ? 'Enter your registered email to receive a reset code.'
        : `Enter the 4-digit code sent to ${forgotEmail}`;
    }
    if (mode === 'signup') {
      return signupStep === 1
        ? 'Create your account to get started with TripMate.'
        : `Enter the 4-digit code sent to ${signupEmail}`;
    }
    return 'Welcome back to get started with TripMate.';
  };

  const lastAuthBackPressRef = useRef<number>(0);

  const handleBackPress = () => {
    if (mode === 'signup' && signupStep === 2) {
      setSignupStep(1);
      clearMessages();
      return true;
    }
    if (mode === 'forgot' && forgotStep === 2) {
      setForgotStep(1);
      clearMessages();
      return true;
    }
    if (mode !== 'login') {
      switchMode('login');
      return true;
    }
    // In root login mode: double-tap to exit
    const now = Date.now();
    if (now - lastAuthBackPressRef.current < 2000) {
      BackHandler.exitApp();
      return true;
    }
    lastAuthBackPressRef.current = now;
    if (Platform.OS === 'android') {
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
    }
    return true;
  };

  // ── Hardware Back Press Handler ───────────────────────────────────────────
  useEffect(() => {
    const onHardwareBack = () => {
      return handleBackPress();
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [mode, signupStep, forgotStep]);

  const getRolePillLabel = () => {
    if (mode === 'forgot') return null;
    return mode === 'login' ? 'Sign Up' : 'Log In';
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  JSX
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 1. Hero Header ── */}
        <View style={styles.heroHeader}>
          <Image
            source={require('../../assets/auth-hero.jpg')}
            style={styles.heroBgImg}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />

          {/* Floating Nav */}
          <View style={styles.heroNav}>
            <TouchableOpacity
              style={styles.navBackBtn}
              onPress={handleBackPress}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            {getRolePillLabel() && (
              <TouchableOpacity
                style={styles.rolePill}
                onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                activeOpacity={0.8}
              >
                <User size={15} color="#2563EB" strokeWidth={2.4} />
                <Text style={styles.rolePillText}>{getRolePillLabel()}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── 2. White Card ── */}
        <View style={styles.cardContainer}>
          {/* Title & Subtitle */}
          <Text style={styles.title}>{getHeaderTitle()}</Text>
          <Text style={styles.subtitle}>{getHeaderSubtitle()}</Text>

          {/* Alerts */}
          {errorMessage && (
            <View style={styles.errorAlert}>
              <AlertCircle size={17} color="#DC2626" />
              <Text style={styles.errorAlertText}>{errorMessage}</Text>
            </View>
          )}
          {successMessage && (
            <View style={styles.successAlert}>
              <CheckCircle2 size={17} color="#16A34A" />
              <Text style={styles.successAlertText}>{successMessage}</Text>
            </View>
          )}

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <TextInput
                style={styles.pillInput}
                placeholder="Email Address"
                placeholderTextColor="#94A3B8"
                value={loginEmail}
                onChangeText={(t) => { setLoginEmail(t); if (errorMessage) clearMessages(); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              <View style={styles.inputWrapWithBtn}>
                <TextInput
                  style={styles.pillInputInner}
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  value={loginPassword}
                  onChangeText={(t) => { setLoginPassword(t); if (errorMessage) clearMessages(); }}
                  secureTextEntry={!showLoginPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowLoginPassword(!showLoginPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showLoginPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                </TouchableOpacity>
              </View>

              {/* Remember me + Forgot Password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberMeWrap}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => switchMode('forgot')} activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.bluePillBtn, isLoading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={styles.btnInner}>
                    <SpinningLoader />
                    <Text style={styles.bluePillBtnText}>Signing In…</Text>
                  </View>
                ) : (
                  <Text style={styles.bluePillBtnText}>Log In</Text>
                )}
              </TouchableOpacity>

              <OrDivider />
              <SocialButtons onGooglePress={handleGoogleLogin} disabled={isLoading} />

              <View style={styles.bottomSwitchRow}>
                <Text style={styles.bottomSwitchText}>Don't have an account?</Text>
                <TouchableOpacity onPress={() => switchMode('signup')} activeOpacity={0.7}>
                  <Text style={styles.bottomSwitchLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── SIGNUP STEP 1 ── */}
          {mode === 'signup' && signupStep === 1 && (
            <>
              <TextInput
                style={styles.pillInput}
                placeholder="Full Name"
                placeholderTextColor="#94A3B8"
                value={fullName}
                onChangeText={(t) => { setFullName(t); if (errorMessage) clearMessages(); }}
                autoCapitalize="words"
                editable={!isLoading}
              />

              <TextInput
                style={styles.pillInput}
                placeholder="Email Address"
                placeholderTextColor="#94A3B8"
                value={signupEmail}
                onChangeText={(t) => { setSignupEmail(t); if (errorMessage) clearMessages(); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              {/* Password + Strength Meter */}
              <View style={styles.inputWrapWithBtn}>
                <TextInput
                  style={styles.pillInputInner}
                  placeholder="Password (Min 6 characters)"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(t) => { setPassword(t); if (errorMessage) clearMessages(); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                </TouchableOpacity>
              </View>

              {/* Password Strength Bars */}
              {password.length > 0 && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3, 4].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              level <= passwordStrength.score
                                ? passwordStrength.color
                                : '#E2E8F0',
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.strengthMetaRow}>
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                      Security: <Text style={styles.strengthLabelBold}>{passwordStrength.label}</Text>
                    </Text>
                    <Text style={styles.strengthHint}>
                      {passwordStrength.score < 2
                        ? 'Min 6 characters'
                        : passwordStrength.score < 3
                        ? 'Add numbers / uppercase'
                        : passwordStrength.score < 4
                        ? 'Add special chars'
                        : 'Robust password ✓'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Confirm Password */}
              <View style={styles.inputWrapWithBtn}>
                <TextInput
                  style={styles.pillInputInner}
                  placeholder="Confirm Password"
                  placeholderTextColor="#94A3B8"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); if (errorMessage) clearMessages(); }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showConfirmPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.bluePillBtn, isLoading && styles.btnDisabled]}
                onPress={handleSignupStep1}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={styles.btnInner}>
                    <SpinningLoader />
                    <Text style={styles.bluePillBtnText}>Sending Code…</Text>
                  </View>
                ) : (
                  <Text style={styles.bluePillBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <OrDivider />
              <SocialButtons onGooglePress={handleGoogleLogin} disabled={isLoading} />

              <View style={styles.bottomSwitchRow}>
                <Text style={styles.bottomSwitchText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => switchMode('login')} activeOpacity={0.7}>
                  <Text style={styles.bottomSwitchLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── SIGNUP STEP 2 — OTP Verification ── */}
          {mode === 'signup' && signupStep === 2 && (
            <>
              {/* Email badge */}
              <View style={styles.otpBadge}>
                <KeyRound size={14} color="#2563EB" />
                <Text style={styles.otpBadgeEmail} numberOfLines={1}>{signupEmail}</Text>
                <TouchableOpacity onPress={() => { setSignupStep(1); clearMessages(); }}>
                  <Text style={styles.otpBadgeEdit}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* 4-digit OTP Grid */}
              <View style={styles.otpGrid}>
                {otpDigits.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(el) => { otpRefs.current[idx] = el; }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(idx, v)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyDown(idx, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={4}
                    selectTextOnFocus
                    editable={!isLoading}
                    textAlign="center"
                    autoFocus={idx === 0}
                  />
                ))}
              </View>

              {/* Resend Row */}
              <View style={styles.resendRow}>
                {canResend ? (
                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleResendOtp}
                    disabled={isResending}
                    activeOpacity={0.7}
                  >
                    {isResending ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <RotateCw size={14} color="#2563EB" />
                    )}
                    <Text style={styles.resendBtnText}>
                      {isResending ? 'Resending…' : 'Resend Verification Code'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.timerText}>
                    Resend code in <Text style={styles.timerBold}>{resendTimer}s</Text>
                  </Text>
                )}
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.darkPillBtn,
                  (isLoading || otpDigits.join('').length < 4) && styles.btnDisabled,
                ]}
                onPress={() => submitOtp(otpDigits.join(''))}
                disabled={isLoading || otpDigits.join('').length < 4}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={styles.btnInner}>
                    <SpinningLoader />
                    <Text style={styles.darkPillBtnText}>Verifying…</Text>
                  </View>
                ) : (
                  <Text style={styles.darkPillBtnText}>Verify & Complete Registration</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ── FORGOT PASSWORD STEP 1 — Email ── */}
          {mode === 'forgot' && forgotStep === 1 && (
            <>
              <TextInput
                style={styles.pillInput}
                placeholder="Registered Email Address"
                placeholderTextColor="#94A3B8"
                value={forgotEmail}
                onChangeText={(t) => { setForgotEmail(t); if (errorMessage) clearMessages(); }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />

              <TouchableOpacity
                style={[styles.bluePillBtn, isLoading && styles.btnDisabled]}
                onPress={handleForgotStep1}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={styles.btnInner}>
                    <SpinningLoader />
                    <Text style={styles.bluePillBtnText}>Sending Code…</Text>
                  </View>
                ) : (
                  <Text style={styles.bluePillBtnText}>Send Reset Code</Text>
                )}
              </TouchableOpacity>

              <View style={[styles.bottomSwitchRow, { marginTop: 16 }]}>
                <Text style={styles.bottomSwitchText}>Remembered it?</Text>
                <TouchableOpacity onPress={() => switchMode('login')} activeOpacity={0.7}>
                  <Text style={styles.bottomSwitchLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── FORGOT PASSWORD STEP 2 — OTP + New Password ── */}
          {mode === 'forgot' && forgotStep === 2 && (
            <>
              {/* Email badge */}
              <View style={styles.otpBadge}>
                <Mail size={14} color="#2563EB" />
                <Text style={styles.otpBadgeEmail} numberOfLines={1}>{forgotEmail}</Text>
                <TouchableOpacity onPress={() => { setForgotStep(1); clearMessages(); }}>
                  <Text style={styles.otpBadgeEdit}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* 4-digit OTP Grid */}
              <View style={styles.otpGrid}>
                {forgotOtpDigits.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(el) => { forgotOtpRefs.current[idx] = el; }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={(v) => handleForgotOtpChange(idx, v)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading}
                    textAlign="center"
                    autoFocus={idx === 0}
                  />
                ))}
              </View>

              {/* Resend */}
              <View style={styles.resendRow}>
                {forgotCanResend ? (
                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={async () => {
                      setForgotResendTimer(30);
                      setForgotCanResend(false);
                      await handleForgotStep1();
                    }}
                    activeOpacity={0.7}
                  >
                    <RotateCw size={14} color="#2563EB" />
                    <Text style={styles.resendBtnText}>Resend Reset Code</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.timerText}>
                    Resend in <Text style={styles.timerBold}>{forgotResendTimer}s</Text>
                  </Text>
                )}
              </View>

              {/* New Password */}
              <View style={styles.inputWrapWithBtn}>
                <Lock size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.pillInputInner, { paddingLeft: 0 }]}
                  placeholder="New Password (Min 6 characters)"
                  placeholderTextColor="#94A3B8"
                  value={newPassword}
                  onChangeText={(t) => { setNewPassword(t); if (errorMessage) clearMessages(); }}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showNewPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.darkPillBtn, isLoading && styles.btnDisabled]}
                onPress={handleForgotStep2}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={styles.btnInner}>
                    <SpinningLoader />
                    <Text style={styles.darkPillBtnText}>Resetting…</Text>
                  </View>
                ) : (
                  <Text style={styles.darkPillBtnText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────
const OrDivider: React.FC = () => (
  <View style={styles.dividerRow}>
    <View style={styles.dividerLine} />
    <Text style={styles.dividerText}>or</Text>
    <View style={styles.dividerLine} />
  </View>
);

const SocialButtons: React.FC<{ onGooglePress: () => void; disabled?: boolean }> = ({ onGooglePress, disabled }) => (
  <View style={styles.socialGrid}>
    <TouchableOpacity
      style={[styles.socialPillBtn, disabled && { opacity: 0.6 }]}
      onPress={onGooglePress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <GoogleIcon size={18} />
      <Text style={styles.socialPillBtnText}>Google</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.socialPillBtn}
      onPress={() => {}}
      activeOpacity={0.8}
    >
      <Phone size={16} color="#334155" />
      <Text style={styles.socialPillBtnText}>Phone</Text>
    </TouchableOpacity>
  </View>
);

// ── Forgot password helpers hook ──────────────────────────────────────────────
function useForgotHelpers() {
  const { } = useAuth(); // satisfy context
  const forgotPassword = async (emailId: string): Promise<{ success: boolean; message?: string }> => {
    const { authService } = require('../api/auth.service');
    try {
      const res = await authService.forgotPassword(emailId);
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const verifyResetOtp = async (payload: { emailId: string; code: string }): Promise<{ success: boolean; message?: string }> => {
    const { authService } = require('../api/auth.service');
    try {
      const res = await authService.verifyResetOtp(payload);
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const resetPassword = async (payload: { emailId: string; code: string; newPassword: string }): Promise<{ success: boolean; message?: string }> => {
    const { authService } = require('../api/auth.service');
    try {
      const res = await authService.resetPassword(payload);
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return { forgotPassword, verifyResetOtp, resetPassword };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* ── Hero Header ── */
  heroHeader: {
    width: '100%',
    height: 270,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  heroBgImg: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  heroNav: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : (StatusBar.currentHeight || 24) + 10,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  navBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  rolePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    borderRadius: 9999,
    paddingVertical: 7,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  rolePillText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 12.5,
  },

  /* ── Card Container ── */
  cardContainer: {
    width: '100%',
    marginTop: -26,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 40,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    flex: 1,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 18,
    lineHeight: 17,
  },

  /* Alerts */
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 14,
    gap: 9,
  },
  errorAlertText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '500',
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 14,
    gap: 9,
  },
  successAlertText: {
    flex: 1,
    color: '#15803D',
    fontSize: 12,
    fontWeight: '500',
  },

  /* ── Pill Inputs ── */
  pillInput: {
    width: '100%',
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 12,
  },
  inputWrapWithBtn: {
    width: '100%',
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 14,
    marginBottom: 12,
  },
  pillInputInner: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Password Strength ── */
  strengthWrap: {
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 5,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  strengthLabelBold: {
    fontWeight: '700',
  },
  strengthHint: {
    fontSize: 11,
    color: '#94A3B8',
  },

  /* ── Options Row (Remember me + Forgot Password) ── */
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  rememberMeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  rememberMeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  forgotPasswordLink: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  /* ── Vibrant Blue Pill Button ── */
  bluePillBtn: {
    width: '100%',
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 4,
  },
  bluePillBtnText: {
    color: '#FFFFFF',
    fontSize: 13.8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  /* ── Dark Pill Button (OTP verification) ── */
  darkPillBtn: {
    width: '100%',
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 4,
  },
  darkPillBtnText: {
    color: '#FFFFFF',
    fontSize: 13.8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  btnDisabled: {
    opacity: 0.55,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* ── Divider ── */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#94A3B8',
    fontSize: 11.5,
    paddingHorizontal: 12,
    fontWeight: '500',
  },

  /* ── Social Buttons ── */
  socialGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  socialPillBtn: {
    flex: 1,
    height: 42,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialPillBtnText: {
    color: '#1E293B',
    fontSize: 12.5,
    fontWeight: '600',
  },

  /* ── Bottom Switch Link ── */
  bottomSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  bottomSwitchText: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '500',
  },
  bottomSwitchLink: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 12.5,
    textDecorationLine: 'underline',
  },

  /* ── OTP Grid ── */
  otpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
    gap: 8,
  },
  otpBadgeEmail: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  otpBadgeEdit: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  otpBox: {
    width: (W - 44 - 36) / 4,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },

  /* ── Resend Row ── */
  resendRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  resendBtnText: {
    color: '#2563EB',
    fontSize: 12.5,
    fontWeight: '600',
  },
  timerText: {
    color: '#94A3B8',
    fontSize: 12.5,
  },
  timerBold: {
    fontWeight: '700',
    color: '#64748B',
  },
});
