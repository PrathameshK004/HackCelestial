/**
 * ProfileScreen matching WebApp ProfilePage.tsx
 * Features traveler details and UPI ID configuration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  BackHandler,
  ActivityIndicator,
  Platform,
  RefreshControl,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  TreePalm,
  Trees,
  Building,
  Mountain,
  Calendar as CalendarIcon,
  Wifi,
  Image as ImageIcon,
  Trash2,
  X,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../theme/colors';
import { screenHeader } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripContext';
import { Trip } from '../types';
import { authService } from '../api/auth.service';
import { storage } from '../database/storage';
import { DatePickerModal } from '../components/common/DatePickerModal';
import { IllustrationAvatar } from '../components/common/IllustrationAvatar';
import { IllustrationPickerModal } from '../components/common/IllustrationPickerModal';
import * as ImagePicker from 'expo-image-picker';

type TravelStyle = 'Boutique' | 'Coastal' | 'Nature' | 'Urban' | 'Mountain';

const TRAVEL_STYLES: {
  key: TravelStyle;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}[] = [
  { key: 'Boutique', label: 'Boutique', Icon: Sparkles },
  { key: 'Coastal', label: 'Coastal', Icon: TreePalm },
  { key: 'Nature', label: 'Nature', Icon: Trees },
  { key: 'Mountain', label: 'Mountain', Icon: Mountain },
  { key: 'Urban', label: 'Urban', Icon: Building },
];

interface ProfileScreenProps {
  onBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { user, updateUser, refreshProfile } = useAuth();
  const { trips, refreshTrips } = useTrips();

  // ── Hardware Back Press Handler ───────────────────────────────────────────
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

  // Synchronize fresh DB profile on screen mount
  useEffect(() => {
    refreshProfile?.().catch(() => {});
  }, []);

  const [name, setName] = useState(user?.name || user?.username || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.dob || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isAvatarChoiceModalOpen, setIsAvatarChoiceModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>(
    (user?.travelStyle as TravelStyle) || 'Boutique'
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshProfile?.(),
        refreshTrips(),
      ]);
    } catch (err) {
      console.log('Profile refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Synchronize input fields when user profile updates from context / server
  useEffect(() => {
    if (user) {
      if (user.name || user.username) {
        setName(user.name || user.username || '');
      }
      if (user.upiId !== undefined && user.upiId !== null) {
        setUpiId(user.upiId);
      }
      if (user.phone !== undefined && user.phone !== null) {
        setPhone(user.phone);
      }
      if (user.dob !== undefined && user.dob !== null) {
        setDob(user.dob);
      }
      if (user.avatar !== undefined) {
        setAvatar(user.avatar || null);
      }
      if (user.travelStyle) {
        setTravelStyle(user.travelStyle as TravelStyle);
      }
    }
  }, [user]);

  const displayName = user?.name || user?.username || '';
  const displayEmail = user?.emailId || user?.email || '';

  const totalExpensesCount = trips.reduce((sum: number, t: Trip) => sum + (t.expenses?.length || 0), 0);

  const handleAvatarSelect = async (newAvatarId: string | null) => {
    setAvatar(newAvatarId);
    try {
      const res = await updateUser({
        avatar: newAvatarId,
      });
      if (res.success) {
        Alert.alert(
          'Profile Picture Saved',
          newAvatarId
            ? 'Your illustration profile picture has been saved to your account.'
            : 'Switched to your initials avatar.'
        );
      }
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to update profile picture.');
    }
  };

  const handlePickFromGallery = async () => {
    setIsAvatarChoiceModalOpen(false);

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please allow access to your photo library to upload a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      exif: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const uploadFile = {
      uri: asset.uri,
      name: asset.fileName || `profile-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    };

    setIsUploadingAvatar(true);
    try {
      const res = await authService.uploadProfilePicture(uploadFile);
      const responseData = (res as any)?.data ?? {};
      const avatarUrl = responseData.avatar || responseData.user?.avatar || responseData.url;
      if (!avatarUrl) {
        throw new Error(res.message || 'Profile picture upload failed.');
      }

      const persisted = await updateUser({ avatar: avatarUrl });
      const refreshedUser = await refreshProfile?.();
      const finalAvatar = refreshedUser?.avatar || persisted.user?.avatar || avatarUrl;

      const nextAuthUser = {
        ...(user || {}),
        id: user?.id || refreshedUser?.id || persisted.user?.id || (user as any)?.userId || (refreshedUser as any)?.userId || (persisted.user as any)?.userId,
        name: user?.name || user?.username || refreshedUser?.name || refreshedUser?.username,
        username: user?.username || user?.name || refreshedUser?.username || refreshedUser?.name,
        email: user?.email || user?.emailId || refreshedUser?.email || refreshedUser?.emailId,
        emailId: user?.emailId || user?.email || refreshedUser?.emailId || refreshedUser?.email,
        avatar: finalAvatar || null,
      };

      await storage.setAuthUser(nextAuthUser as any);
      setAvatar(finalAvatar || null);

      Alert.alert('Profile Picture Saved', 'Your custom photo has been uploaded successfully.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsAvatarChoiceModalOpen(false);
    setIsUploadingAvatar(true);
    try {
      await authService.removeProfilePicture();
      setAvatar(null);
      await refreshProfile?.();
      Alert.alert('Profile Picture Removed', 'Switched to your initials avatar.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove profile picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full name is required.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateUser({
        name: name.trim(),
        username: name.trim(),
        upiId: upiId.trim(),
        phone: phone.trim(),
        dob: dob ? dob.trim() : null,
        avatar: avatar || null,
        travelStyle,
      });

      if (!res.success || res.error) {
        Alert.alert('Save Failed', res.error || 'Failed to update profile on server.');
      } else {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
        Alert.alert('Profile Saved', 'Your profile information has been saved successfully in database.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Top Header with Arrow, Title, and Wifi Status Indicator */}
      <View
        style={[
          styles.header,
        ]}
      >
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
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => handleRefresh()}
            style={styles.headerWifiBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Refresh Profile"
          >
            <Wifi
              size={20}
              color="#10B981"
              strokeWidth={2.4}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary600]}
            tintColor={colors.primary600}
          />
        }
      >
        {/* Profile User Info Header with Google-Style Illustration Avatar */}
        <View style={styles.profileSection}>
          <View style={{ position: 'relative' }}>
            <IllustrationAvatar
              avatar={avatar}
              name={displayName || 'Traveler'}
              size={84}
              showEditBadge={true}
              onPress={() => setIsAvatarChoiceModalOpen(true)}
              backgroundColor={user?.avatarBg}
            />
            {isUploadingAvatar && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{displayName || 'Traveler'}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
        </View>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Profile Form */}
        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={colors.slate400}
          />

          <Text style={styles.inputLabel}>UPI ID (For Receiving Settlements)</Text>
          <TextInput
            style={styles.input}
            value={upiId}
            onChangeText={setUpiId}
            placeholder="yourname@okaxis"
            placeholderTextColor={colors.slate400}
          />

          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor={colors.slate400}
            keyboardType="phone-pad"
          />

          <Text style={styles.inputLabel}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => setIsDatePickerOpen(true)}
            activeOpacity={0.7}
          >
            <CalendarIcon size={18} color={dob ? colors.primary600 : colors.slate400} />
            <Text style={[styles.datePickerText, !dob && styles.datePickerPlaceholder]}>
              {dob ? dob : 'Select Date of Birth'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Preferred Travel Style</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.travelStyleScroll}
            style={styles.travelStyleScrollView}
          >
            {TRAVEL_STYLES.map((item) => {
              const isSelected = travelStyle === item.key;
              const IconComponent = item.Icon;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.travelStylePill,
                    isSelected && styles.travelStylePillActive,
                  ]}
                  onPress={() => setTravelStyle(item.key)}
                  activeOpacity={0.7}
                >
                  <IconComponent
                    size={14}
                    color={isSelected ? colors.primary600 : colors.slate500}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.travelStyleLabel,
                      isSelected && styles.travelStyleLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Sticky Bottom Action Bar — Elevated with Safe Area Inset Protection */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.75 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <CheckCircle2 size={16} color="#ffffff" />
          )}
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Saving...' : isSaved ? 'Saved!' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={dob || undefined}
        maxDate={new Date().toISOString().split('T')[0]}
        onSelectDate={(selected) => setDob(selected)}
        title="Select Date of Birth"
      />

      {/* Choice Modal: Illustration vs Gallery */}
      <Modal
        visible={isAvatarChoiceModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAvatarChoiceModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsAvatarChoiceModalOpen(false)}>
          <View style={styles.choiceBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.choiceSheet}>
                <View style={styles.choiceHandle} />
                <View style={styles.choiceHeaderRow}>
                  <Text style={styles.choiceTitle}>Change Profile Picture</Text>
                  <TouchableOpacity
                    onPress={() => setIsAvatarChoiceModalOpen(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={20} color={colors.slate400} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.choiceSubtitle}>Select an avatar option for your profile</Text>

                <View style={styles.choiceOptionsList}>
                  {/* Option 1: Choose Illustration (Current approach) */}
                  <TouchableOpacity
                    style={styles.choiceOptionCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      setIsAvatarChoiceModalOpen(false);
                      setIsAvatarPickerOpen(true);
                    }}
                  >
                    <View style={[styles.choiceIconBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                      <Sparkles size={22} color="#059669" />
                    </View>
                    <View style={styles.choiceOptionContent}>
                      <Text style={styles.choiceOptionTitle}>Choose an Illustration</Text>
                      <Text style={styles.choiceOptionDesc}>Pick from 10 curated Google-style traveler characters</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Option 2: Upload from Gallery (S3) */}
                  <TouchableOpacity
                    style={styles.choiceOptionCard}
                    activeOpacity={0.7}
                    onPress={handlePickFromGallery}
                  >
                    <View style={[styles.choiceIconBadge, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                      <ImageIcon size={22} color="#2563eb" />
                    </View>
                    <View style={styles.choiceOptionContent}>
                      <Text style={styles.choiceOptionTitle}>Upload from Gallery</Text>
                      <Text style={styles.choiceOptionDesc}>Select a photo from your device & save to AWS S3</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Option 3: Remove Current Picture (if set) */}
                  {avatar ? (
                    <TouchableOpacity
                      style={[styles.choiceOptionCard, { borderColor: '#fee2e2' }]}
                      activeOpacity={0.7}
                      onPress={handleRemoveAvatar}
                    >
                      <View style={[styles.choiceIconBadge, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                        <Trash2 size={20} color="#dc2626" />
                      </View>
                      <View style={styles.choiceOptionContent}>
                        <Text style={[styles.choiceOptionTitle, { color: '#dc2626' }]}>Remove Current Picture</Text>
                        <Text style={styles.choiceOptionDesc}>Reset your profile picture to default initials</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.choiceCancelBtn}
                  onPress={() => setIsAvatarChoiceModalOpen(false)}
                >
                  <Text style={styles.choiceCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Google-Style Illustration Picker Modal (Original / Current Approach) */}
      <IllustrationPickerModal
        visible={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        selectedIllustrationId={avatar}
        onSelect={handleAvatarSelect}
        userName={displayName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenHeader.horizontalPadding,
    paddingTop: screenHeader.topPadding,
    paddingBottom: screenHeader.bottomPadding,
    minHeight: screenHeader.height,
    backgroundColor: screenHeader.backgroundColor,
    borderBottomWidth: 1,
    borderBottomColor: screenHeader.borderColor,
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
    fontSize: screenHeader.titleFontSize,
    fontWeight: screenHeader.titleFontWeight,
    color: screenHeader.titleColor,
    letterSpacing: screenHeader.titleLetterSpacing,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerWifiBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: colors.slate900,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 3,
  },
  separator: {
    height: 1,
    backgroundColor: colors.slate200,
    marginVertical: 6,
  },
  formSection: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate700,
    marginBottom: 6,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: colors.slate800,
  },
  datePickerBtn: {
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingHorizontal: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  datePickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate800,
  },
  datePickerPlaceholder: {
    color: colors.slate400,
    fontWeight: '400',
  },
  travelStyleScrollView: {
    marginTop: 4,
    marginBottom: 4,
  },
  travelStyleScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 12,
  },
  travelStylePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.slate200,
    gap: 6,
  },
  travelStylePillActive: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary600,
    borderWidth: 1.5,
  },
  travelStyleLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.slate700,
  },
  travelStyleLabelActive: {
    color: colors.primary700,
    fontWeight: '700',
  },
  stickyBottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingHorizontal: 16,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    borderRadius: radii.md,
    paddingVertical: 14,
    gap: 8,
    ...shadows.sm,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  choiceSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    ...shadows.lg,
  },
  choiceHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate300,
    alignSelf: 'center',
    marginBottom: 16,
  },
  choiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate900,
  },
  choiceSubtitle: {
    fontSize: 13,
    color: colors.slate500,
    marginBottom: 16,
  },
  choiceOptionsList: {
    gap: 12,
    marginBottom: 16,
  },
  choiceOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.slate200,
    gap: 14,
  },
  choiceIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceOptionContent: {
    flex: 1,
  },
  choiceOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.slate900,
    marginBottom: 2,
  },
  choiceOptionDesc: {
    fontSize: 12.5,
    color: colors.slate500,
  },
  choiceCancelBtn: {
    paddingVertical: 13,
    borderRadius: radii.md,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate700,
  },
});
