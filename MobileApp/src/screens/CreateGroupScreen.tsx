/**
 * CreateGroupScreen (3-Step Trip Creation Wizard)
 * Industry-Grade, Professional UI matching WebApp standards
 * Budget removed per specifications, all fields mandatory with strict validation
 * Existing user auto-detection + offline SQLite persistence
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Trash2, 
  Users, 
  MapPin, 
  Calendar, 
  UserPlus, 
  Crown, 
  CheckCircle2, 
  Mail, 
  Clock, 
  AlertCircle,
  Sparkles,
  Sliders
} from 'lucide-react-native';
import { colors, radii, shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripContext';
import { groupService } from '../api/group.service';
import { PaymentModal } from '../components/group/PaymentModal';
import { AddTravelerModal } from '../components/group/AddTravelerModal';
import { tripRepo } from '../database/repositories/tripRepo';
import { memberRepo } from '../database/repositories/memberRepo';

interface CreateGroupScreenProps {
  onBack: () => void;
  onSuccess: (newTripId: string) => void;
}

const TRIP_CATEGORIES = ['Friends', 'Family', 'Corporate', 'Student'] as const;

const SPLIT_MODELS = [
  { id: 'equal', label: 'Equal Split', desc: 'Divide all shared costs equally across members' },
  { id: 'percentage', label: 'Percentage', desc: 'Custom percentage ratio per traveler' },
  { id: 'exact', label: 'Exact Amounts', desc: 'Itemized specific amounts owed per person' },
  { id: 'shares', label: 'Weighted Shares', desc: 'Dynamic shares for couples or families' },
] as const;

export const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ onBack, onSuccess }) => {
  const { user } = useAuth();
  const { refreshTrips } = useTrips();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Trip Essentials & Configuration (ALL MANDATORY)
  const [groupName, setGroupName] = useState('');
  const [destination, setDestination] = useState('');
  const [tripType, setTripType] = useState<string>('Friends');
  const [expenseSplit, setExpenseSplit] = useState<string>('equal');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2: Travelers (MANDATORY: Organizer + At least 1 Companion)
  const [travelers, setTravelers] = useState<Array<{
    name: string;
    email: string;
    role: string;
    avatarBg: string;
    isRegistered: boolean;
    status: string;
  }>>([]);
  const [isTravelerModalOpen, setIsTravelerModalOpen] = useState(false);

  // Step 3 & Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<any>(null);

  // Organizer details from auth state
  const organizerName = user?.username || user?.name || 'Organizer';
  const organizerEmail = user?.email || user?.emailId || 'organizer@triptual.app';

  // Calculate duration in days
  const durationDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  // Date helper presets
  const setQuickDatePreset = (daysFromToday: number, duration: number) => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + daysFromToday);
    const end = new Date(start);
    end.setDate(start.getDate() + duration);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    setStartDate(startStr);
    setEndDate(endStr);

    if (errors.startDate || errors.endDate) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.startDate;
        delete copy.endDate;
        return copy;
      });
    }
  };

  const handleAddTraveler = (traveler: any) => {
    setTravelers((prev) => [...prev, traveler]);
    if (errors.travelers) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.travelers;
        return copy;
      });
    }
  };

  const handleRemoveTraveler = (index: number) => {
    setTravelers((prev) => prev.filter((_, i) => i !== index));
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!groupName.trim()) {
      newErrors.groupName = 'Trip name is mandatory';
    } else if (groupName.trim().length < 2) {
      newErrors.groupName = 'Trip name must be at least 2 characters';
    }

    if (!destination.trim()) {
      newErrors.destination = 'Destination is mandatory';
    } else if (destination.trim().length < 2) {
      newErrors.destination = 'Destination must be at least 2 characters';
    }

    if (!tripType) {
      newErrors.tripType = 'Trip category is mandatory';
    }

    if (!expenseSplit) {
      newErrors.expenseSplit = 'Split strategy is mandatory';
    }

    if (!startDate.trim()) {
      newErrors.startDate = 'Start date is mandatory (YYYY-MM-DD)';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
      newErrors.startDate = 'Invalid date format (use YYYY-MM-DD)';
    }

    if (!endDate.trim()) {
      newErrors.endDate = 'End date is mandatory (YYYY-MM-DD)';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate.trim())) {
      newErrors.endDate = 'Invalid date format (use YYYY-MM-DD)';
    } else if (startDate.trim() && new Date(endDate.trim()) < new Date(startDate.trim())) {
      newErrors.endDate = 'End date cannot be earlier than start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation (at least 1 companion traveler)
  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (travelers.length === 0) {
      newErrors.travelers = 'At least one companion traveler is mandatory for group trips';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!validateStep1()) {
        Alert.alert('Required Fields', 'Please complete all mandatory fields with valid data.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) {
        Alert.alert('Companion Required', 'A group trip requires at least one companion traveler. Please add a companion.');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    } else {
      onBack();
    }
  };

  useEffect(() => {
    const onHardwareBack = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [step]);

  // Final Group Creation Handler
  const handleFinishCreate = async (paymentData?: any) => {
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }

    const currentPayment = paymentData || paymentRecord;
    const totalMembers = travelers.length + 1; // Organizer + companions

    // Check if large group fee is required
    if (totalMembers > 6 && !currentPayment) {
      setIsPaymentModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        groupName: groupName.trim(),
        destination: destination.trim(),
        tripType,
        expenseSplit,
        currency: 'INR',
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        travelers: travelers.map((t) => ({
          name: t.name,
          email: t.email,
          role: t.role || 'Traveler',
          avatarBg: t.avatarBg,
          isRegistered: t.isRegistered,
          status: t.status || 'PENDING'
        })),
        payment: currentPayment || undefined
      };

      // Call backend API
      const response = await groupService.createGroup(payload);
      const newGroup = response.data;
      const createdGroupId = newGroup?.id || newGroup?.groupId;

      if (createdGroupId) {
        // Upsert into local SQLite database for instant offline access
        tripRepo.upsertTrip({
          id: createdGroupId,
          name: newGroup.name || groupName.trim(),
          destination: newGroup.destination || destination.trim(),
          tripType: newGroup.trip_type || newGroup.tripType || tripType,
          status: 'active',
          startDate: newGroup.start_date || newGroup.startDate || startDate.trim(),
          endDate: newGroup.end_date || newGroup.endDate || endDate.trim(),
          currency: newGroup.currency || 'INR',
          currencySymbol: '₹',
          totalBudget: 0,
          totalSpent: 0,
          userBalance: 0,
          inviteCode: newGroup.invite_code || newGroup.inviteCode || '',
          description: newGroup.description || '',
          coverGradient: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
          syncStatus: 'SYNCED',
          createdAt: newGroup.created_at || newGroup.createdAt || new Date().toISOString(),
        });

        // Upsert organizer into SQLite members
        memberRepo.upsertMember({
          id: 'organizer-' + createdGroupId,
          tripId: createdGroupId,
          name: organizerName,
          email: organizerEmail,
          role: 'Organizer',
          avatarBg: '#059669',
          isUser: true,
          balance: 0,
          syncStatus: 'SYNCED',
        });

        // Upsert companion members
        if (newGroup.members && Array.isArray(newGroup.members)) {
          newGroup.members.forEach((m: any) => {
            if (m.email?.toLowerCase() !== organizerEmail.toLowerCase()) {
              memberRepo.upsertMember({
                id: m.id || ('companion-' + Math.random().toString(36).substring(2, 9)),
                tripId: createdGroupId,
                name: m.name,
                email: m.email,
                role: m.role || 'Traveler',
                avatarBg: m.avatarBg || m.avatar_bg || '#0284c7',
                isUser: Boolean(m.isRegistered || m.is_registered),
                balance: 0,
                syncStatus: 'SYNCED',
              });
            }
          });
        }

        // Refresh global trips list & trigger navigation
        refreshTrips();
        onSuccess(createdGroupId);
      } else {
        Alert.alert('Error', 'Unable to retrieve group information from server.');
      }
    } catch (e: any) {
      if (e.status === 402 || e.data?.data?.requiresPayment) {
        setIsPaymentModalOpen(true);
      } else {
        Alert.alert('Group Creation Failed', e.message || 'An unexpected error occurred while creating your group trip.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (paymentDetails: any) => {
    setIsPaymentModalOpen(false);
    setPaymentRecord(paymentDetails);
    handleFinishCreate(paymentDetails);
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backBtn} 
            activeOpacity={0.7} 
            accessibilityLabel="Go Back"
          >
            <ArrowLeft size={20} color={colors.slate800} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.barTitle}>Create Group Trip</Text>
            <Text style={styles.barSubtitle}>Step {step} of 3 • Professional Ledger</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Step Progress Tracker */}
        <View style={styles.stepProgressRow}>
          {/* Step 1 */}
          <TouchableOpacity 
            style={styles.stepItem} 
            onPress={() => setStep(1)} 
            disabled={step === 1}
            activeOpacity={0.8}
          >
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
              {step > 1 ? <Check size={14} color="#ffffff" strokeWidth={3} /> : <Text style={styles.stepNumActive}>1</Text>}
            </View>
            <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>Essentials</Text>
          </TouchableOpacity>

          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />

          {/* Step 2 */}
          <TouchableOpacity 
            style={styles.stepItem} 
            onPress={() => {
              if (validateStep1()) setStep(2);
            }} 
            disabled={step < 2}
            activeOpacity={0.8}
          >
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
              {step > 2 ? <Check size={14} color="#ffffff" strokeWidth={3} /> : <Text style={[styles.stepNum, step >= 2 && styles.stepNumActive]}>2</Text>}
            </View>
            <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>Travelers</Text>
          </TouchableOpacity>

          <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />

          {/* Step 3 */}
          <TouchableOpacity 
            style={styles.stepItem} 
            onPress={() => {
              if (validateStep1() && validateStep2()) setStep(3);
            }} 
            disabled={step < 3}
            activeOpacity={0.8}
          >
            <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
              <Text style={[styles.stepNum, step >= 3 && styles.stepNumActive]}>3</Text>
            </View>
            <Text style={[styles.stepLabel, step >= 3 && styles.stepLabelActive]}>Review</Text>
          </TouchableOpacity>
        </View>

        {/* Form Body */}
        <ScrollView 
          style={styles.body} 
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: Trip Essentials & Preferences */}
          {step === 1 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.stepHeading}>Trip Essentials</Text>
                <Text style={styles.stepSub}>Configure your destination, dates, and cost-splitting model</Text>
              </View>

              {/* Trip Name */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Trip / Group Name</Text>
                  <Text style={styles.mandatoryBadge}>Required *</Text>
                </View>
                <View style={[styles.inputBox, errors.groupName ? styles.inputBoxError : null]}>
                  <Users size={18} color={colors.slate400} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Manali Adventure Expedition"
                    placeholderTextColor={colors.slate400}
                    value={groupName}
                    onChangeText={(val) => {
                      setGroupName(val);
                      if (errors.groupName) setErrors((prev) => ({ ...prev, groupName: '' }));
                    }}
                  />
                </View>
                {!!errors.groupName && <Text style={styles.errorText}>{errors.groupName}</Text>}
              </View>

              {/* Destination */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Destination</Text>
                  <Text style={styles.mandatoryBadge}>Required *</Text>
                </View>
                <View style={[styles.inputBox, errors.destination ? styles.inputBoxError : null]}>
                  <MapPin size={18} color={colors.slate400} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Manali, Himachal Pradesh"
                    placeholderTextColor={colors.slate400}
                    value={destination}
                    onChangeText={(val) => {
                      setDestination(val);
                      if (errors.destination) setErrors((prev) => ({ ...prev, destination: '' }));
                    }}
                  />
                </View>
                {!!errors.destination && <Text style={styles.errorText}>{errors.destination}</Text>}
              </View>

              {/* Trip Category */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Trip Category</Text>
                  <Text style={styles.mandatoryBadge}>Required *</Text>
                </View>
                <View style={styles.categoryRow}>
                  {TRIP_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, tripType === cat && styles.categoryChipActive]}
                      onPress={() => setTripType(cat)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.categoryText, tripType === cat && styles.categoryTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Dates & Presets */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Trip Dates</Text>
                  <Text style={styles.mandatoryBadge}>Required *</Text>
                </View>

                {/* Quick Date Presets */}
                <View style={styles.quickPresetsRow}>
                  <TouchableOpacity 
                    style={styles.presetChip}
                    onPress={() => setQuickDatePreset(0, 3)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetChipText}>Today (4d)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.presetChip}
                    onPress={() => setQuickDatePreset(1, 2)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetChipText}>Tomorrow (3d)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.presetChip}
                    onPress={() => setQuickDatePreset(5, 2)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetChipText}>This Weekend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.presetChip}
                    onPress={() => setQuickDatePreset(7, 6)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetChipText}>Next Week (7d)</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.datesGrid}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subLabel}>Start Date (YYYY-MM-DD)</Text>
                    <View style={[styles.inputBox, errors.startDate ? styles.inputBoxError : null]}>
                      <Calendar size={18} color={colors.slate400} style={styles.fieldIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="2026-10-10"
                        placeholderTextColor={colors.slate400}
                        value={startDate}
                        onChangeText={(val) => {
                          setStartDate(val);
                          if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: '' }));
                        }}
                      />
                    </View>
                    {!!errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.subLabel}>End Date (YYYY-MM-DD)</Text>
                    <View style={[styles.inputBox, errors.endDate ? styles.inputBoxError : null]}>
                      <Calendar size={18} color={colors.slate400} style={styles.fieldIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="2026-10-15"
                        placeholderTextColor={colors.slate400}
                        value={endDate}
                        onChangeText={(val) => {
                          setEndDate(val);
                          if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: '' }));
                        }}
                      />
                    </View>
                    {!!errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
                  </View>
                </View>

                {/* Duration indicator pill */}
                {durationDays > 0 && (
                  <View style={styles.durationPill}>
                    <Clock size={14} color={colors.primary700} style={{ marginRight: 6 }} />
                    <Text style={styles.durationText}>
                      Trip Duration: <Text style={{ fontWeight: '700' }}>{durationDays} {durationDays === 1 ? 'day' : 'days'}</Text>
                    </Text>
                  </View>
                )}
              </View>

              {/* Expense Split Strategy */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Expense Split Strategy</Text>
                  <Text style={styles.mandatoryBadge}>Required *</Text>
                </View>
                <View style={styles.splitCardsContainer}>
                  {SPLIT_MODELS.map((model) => {
                    const isSelected = expenseSplit === model.id;
                    return (
                      <TouchableOpacity
                        key={model.id}
                        style={[styles.splitCard, isSelected && styles.splitCardActive]}
                        onPress={() => setExpenseSplit(model.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.splitCardTop}>
                          <View style={[styles.splitRadio, isSelected && styles.splitRadioActive]}>
                            {isSelected && <View style={styles.splitRadioInner} />}
                          </View>
                          <Text style={[styles.splitCardTitle, isSelected && styles.splitCardTitleActive]}>
                            {model.label}
                          </Text>
                        </View>
                        <Text style={[styles.splitCardDesc, isSelected && styles.splitCardDescActive]}>
                          {model.desc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* STEP 2: Travelers (Organizer + Mandatory Companions) */}
          {step === 2 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepHeading}>Trip Companions</Text>
                  <Text style={styles.stepSub}>
                    At least one companion traveler is required to form a group.
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.addTravelerBtn} 
                  onPress={() => setIsTravelerModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <UserPlus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.addTravelerBtnText}>Add Traveler</Text>
                </TouchableOpacity>
              </View>

              {/* Error banner if 0 companions */}
              {!!errors.travelers && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={colors.accentRose} style={{ marginRight: 8 }} />
                  <Text style={styles.errorBannerText}>{errors.travelers}</Text>
                </View>
              )}

              {/* Tier Progress Bar */}
              {travelers.length + 1 <= 6 ? (
                <View style={[styles.tierBanner, styles.freeTierBanner]}>
                  <CheckCircle2 size={18} color="#059669" style={{ marginTop: 2, marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierBannerTitle}>
                      Free Tier Active ({travelers.length + 1}/6 slots used)
                    </Text>
                    <Text style={styles.tierBannerSub}>
                      Up to 6 travelers included free with instant ledger syncing.
                    </Text>
                    <View style={styles.slotsRow}>
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <View
                          key={num}
                          style={[
                            styles.slotPip,
                            num <= travelers.length + 1 ? styles.slotPipFilled : null
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[styles.tierBanner, styles.premiumTierBanner]}>
                  <Crown size={18} color="#d97706" style={{ marginTop: 2, marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierBannerTitleAmber}>
                      Premium Tier ({travelers.length + 1} travelers)
                    </Text>
                    <Text style={styles.tierBannerSubAmber}>
                      ₹19 one-time group activation fee applies for 7+ members.
                    </Text>
                  </View>
                </View>
              )}

              {/* Organizer Row (Verified from Auth) */}
              <View style={styles.travelerCard}>
                <View style={styles.organizerAvatar}>
                  <Text style={styles.organizerAvatarText}>
                    {organizerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.travelerNameRow}>
                    <Text style={styles.travelerName}>{organizerName}</Text>
                    <View style={styles.organizerPill}>
                      <Text style={styles.organizerPillText}>You (Organizer)</Text>
                    </View>
                  </View>
                  <Text style={styles.travelerEmail}>{organizerEmail}</Text>
                </View>
              </View>

              {/* Companion Travelers List */}
              {travelers.length === 0 ? (
                <View style={styles.emptyTravelersBox}>
                  <Users size={36} color={colors.slate300} style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyTravelersTitle}>No Companions Added Yet</Text>
                  <Text style={styles.emptyTravelersSub}>
                    Tap "+ Add Traveler" to enter companion emails. Registered accounts are verified automatically!
                  </Text>
                  <TouchableOpacity 
                    style={styles.emptyAddBtn}
                    onPress={() => setIsTravelerModalOpen(true)}
                    activeOpacity={0.8}
                  >
                    <UserPlus size={16} color={colors.primary600} style={{ marginRight: 6 }} />
                    <Text style={styles.emptyAddBtnText}>Add First Companion</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                travelers.map((t, index) => (
                  <View key={index} style={styles.travelerCard}>
                    <View style={[styles.companionAvatar, { backgroundColor: t.avatarBg || colors.primary600 }]}>
                      <Text style={styles.companionAvatarText}>
                        {t.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.travelerNameRow}>
                        <Text style={styles.travelerName}>{t.name}</Text>
                        {t.isRegistered ? (
                          <View style={styles.registeredBadge}>
                            <CheckCircle2 size={11} color="#059669" style={{ marginRight: 3 }} />
                            <Text style={styles.registeredBadgeText}>Platform User</Text>
                          </View>
                        ) : (
                          <View style={styles.pendingBadge}>
                            <Mail size={11} color="#d97706" style={{ marginRight: 3 }} />
                            <Text style={styles.pendingBadgeText}>Pending Invite</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.travelerEmail}>{t.email}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.removeTravelerBtn}
                      onPress={() => handleRemoveTraveler(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color={colors.accentRose} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          {/* STEP 3: Review & Confirm */}
          {step === 3 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.stepHeading}>Review & Confirm</Text>
                <Text style={styles.stepSub}>Verify trip details before initializing the official group ledger</Text>
              </View>

              <View style={styles.reviewCard}>
                {/* Trip Title & Destination */}
                <View style={styles.reviewHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewTripName}>{groupName}</Text>
                    <View style={styles.reviewDestRow}>
                      <MapPin size={14} color={colors.slate500} style={{ marginRight: 4 }} />
                      <Text style={styles.reviewDestText}>{destination}</Text>
                    </View>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{tripType}</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                {/* Details Breakdown */}
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Dates & Duration</Text>
                  <Text style={styles.reviewValue}>
                    {startDate} → {endDate} ({durationDays} days)
                  </Text>
                </View>

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Expense Split Model</Text>
                  <Text style={styles.reviewValue}>
                    {SPLIT_MODELS.find(m => m.id === expenseSplit)?.label || 'Equal Split'}
                  </Text>
                </View>

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Total Group Size</Text>
                  <Text style={styles.reviewValue}>
                    {travelers.length + 1} Travelers (Organizer + {travelers.length})
                  </Text>
                </View>

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Account Tier</Text>
                  <Text style={[styles.reviewValue, { color: '#059669', fontWeight: '800' }]}>
                    {travelers.length + 1 <= 6 ? 'Free Tier (₹0 Fee)' : 'Premium Tier (₹19 Fee)'}
                  </Text>
                </View>

                <View style={styles.cardDivider} />

                {/* Travelers Summary */}
                <Text style={styles.membersSummaryHeading}>Confirmed Travelers</Text>
                <View style={styles.membersSummaryList}>
                  {/* Organizer */}
                  <View style={styles.memberSummaryRow}>
                    <View style={styles.memberMiniDot} />
                    <Text style={styles.memberSummaryName}>{organizerName} (Organizer)</Text>
                    <Text style={styles.memberSummaryEmail}>{organizerEmail}</Text>
                  </View>

                  {/* Companions */}
                  {travelers.map((t, idx) => (
                    <View key={idx} style={styles.memberSummaryRow}>
                      <View style={[styles.memberMiniDot, { backgroundColor: t.avatarBg || '#0284c7' }]} />
                      <Text style={styles.memberSummaryName}>{t.name}</Text>
                      <Text style={styles.memberSummaryEmail}>{t.email}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.offlineNoticeBox}>
                  <Sparkles size={16} color={colors.primary700} style={{ marginRight: 8, marginTop: 1 }} />
                  <Text style={styles.offlineNoticeText}>
                    Trip will be initialized into your offline SQLite database instantly and synced to the cloud seamlessly.
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Bottom Navigation Actions */}
        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity 
              style={styles.backFooterBtn} 
              onPress={handleBack} 
              activeOpacity={0.7}
            >
              <ArrowLeft size={16} color={colors.slate700} style={{ marginRight: 6 }} />
              <Text style={styles.backFooterBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          {step < 3 ? (
            <TouchableOpacity 
              style={styles.continueBtn} 
              onPress={handleNextStep} 
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
              <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.createTripBtn, isSubmitting && styles.btnDisabled]} 
              onPress={() => handleFinishCreate()}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" strokeWidth={2.8} style={{ marginRight: 6 }} />
                  <Text style={styles.createTripBtnText}>Initialize Group Trip</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Add Companion Traveler Modal */}
        <AddTravelerModal
          visible={isTravelerModalOpen}
          onClose={() => setIsTravelerModalOpen(false)}
          onAdd={handleAddTraveler}
          existingEmails={[organizerEmail, ...travelers.map((t) => t.email)]}
        />

        {/* Large Group Tier Payment Modal */}
        <PaymentModal
          visible={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
          amount={19}
          groupName={groupName || 'Group Trip'}
          memberCount={travelers.length + 1}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  barTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate900,
  },
  barSubtitle: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
    fontWeight: '500',
  },

  // Step Tracker
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.slate100,
    borderWidth: 1.5,
    borderColor: colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate600,
  },
  stepNumActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate500,
  },
  stepLabelActive: {
    color: colors.primary700,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.slate200,
    marginHorizontal: 10,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: colors.primary600,
  },

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
  },
  sectionContainer: {
    width: '100%',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  stepHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.slate900,
  },
  stepSub: {
    fontSize: 13,
    color: colors.slate600,
    marginTop: 4,
    lineHeight: 18,
  },

  // Form Fields
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate800,
  },
  subLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.slate600,
    marginBottom: 4,
  },
  mandatoryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentRose,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    height: 48,
  },
  inputBoxError: {
    borderColor: colors.accentRose,
    backgroundColor: '#fff1f2',
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: colors.slate900,
  },
  errorText: {
    color: colors.accentRose,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 2,
  },

  // Category Selector
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  categoryText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.slate700,
  },
  categoryTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },

  // Date Presets & Grid
  quickPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.full,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary700,
  },
  datesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    marginTop: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#065f46',
  },

  // Split Strategy Cards
  splitCardsContainer: {
    gap: 8,
  },
  splitCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: 12,
  },
  splitCardActive: {
    borderColor: colors.primary600,
    backgroundColor: '#f0fdf4',
  },
  splitCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  splitRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.slate400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitRadioActive: {
    borderColor: colors.primary600,
  },
  splitRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary600,
  },
  splitCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.slate800,
  },
  splitCardTitleActive: {
    color: '#065f46',
  },
  splitCardDesc: {
    fontSize: 11.5,
    color: colors.slate500,
    marginLeft: 24,
  },
  splitCardDescActive: {
    color: colors.primary700,
  },

  // Step 2: Travelers
  addTravelerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary600,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  addTravelerBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    padding: 10,
    borderRadius: radii.md,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentRose,
    flex: 1,
  },
  tierBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  freeTierBanner: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  premiumTierBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  tierBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },
  tierBannerSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  tierBannerTitleAmber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  tierBannerSubAmber: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  slotPip: {
    width: 20,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#a7f3d0',
  },
  slotPipFilled: {
    backgroundColor: '#059669',
  },

  // Traveler Cards
  travelerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radii.lg,
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  organizerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerAvatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  companionAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionAvatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  travelerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  travelerName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.slate900,
  },
  travelerEmail: {
    fontSize: 11.5,
    color: colors.slate500,
    marginTop: 2,
  },
  organizerPill: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  organizerPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#047857',
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  registeredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  removeTravelerBtn: {
    padding: 8,
    borderRadius: radii.md,
    backgroundColor: '#fff1f2',
  },

  // Empty state
  emptyTravelersBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.slate300,
    marginTop: 8,
  },
  emptyTravelersTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.slate800,
  },
  emptyTravelersSub: {
    fontSize: 12,
    color: colors.slate500,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    marginTop: 14,
  },
  emptyAddBtnText: {
    color: colors.primary700,
    fontSize: 13,
    fontWeight: '700',
  },

  // Review & Confirm (Step 3)
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    ...shadows.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewTripName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate900,
  },
  reviewDestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewDestText: {
    fontSize: 13,
    color: colors.slate600,
    fontWeight: '500',
  },
  categoryBadge: {
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary700,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.slate200,
    marginVertical: 14,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  reviewLabel: {
    fontSize: 12.5,
    color: colors.slate500,
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate900,
  },
  membersSummaryHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate800,
    marginBottom: 8,
  },
  membersSummaryList: {
    backgroundColor: '#f8fafc',
    borderRadius: radii.md,
    padding: 10,
    gap: 8,
  },
  memberSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberMiniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
    marginRight: 8,
  },
  memberSummaryName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate800,
    marginRight: 8,
  },
  memberSummaryEmail: {
    fontSize: 11,
    color: colors.slate500,
    flex: 1,
    textAlign: 'right',
  },
  offlineNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  offlineNoticeText: {
    flex: 1,
    fontSize: 11.5,
    color: '#065f46',
    lineHeight: 16,
    fontWeight: '500',
  },

  // Footer Actions
  footer: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 10,
    ...shadows.md,
  },
  backFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.md,
  },
  backFooterBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.slate700,
  },
  continueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    paddingVertical: 12,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  createTripBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    paddingVertical: 12,
    borderRadius: radii.md,
    ...shadows.md,
  },
  createTripBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
