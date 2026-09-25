/**
 * CreateGroupScreen (3-Step Trip Creation Wizard)
 * Apple iOS Clean Minimalist Design Language
 * Inset grouped cards, SF-style segmented controls, streamlined inputs, auto-calculated trip days
 * Existing user auto-detection + offline SQLite persistence
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  RefreshControl,
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
} from 'lucide-react-native';
import { colors, radii } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripContext';
import { groupService } from '../api/group.service';
import { PaymentModal } from '../components/group/PaymentModal';
import { AddTravelerModal } from '../components/group/AddTravelerModal';
import { DatePickerModal } from '../components/common/DatePickerModal';

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

  // Step 1: Trip Essentials & Configuration
  const [groupName, setGroupName] = useState('');
  const [destination, setDestination] = useState('');
  const [tripType, setTripType] = useState<string>('Friends');
  const [expenseSplit, setExpenseSplit] = useState<string>('equal');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);

  const getTodayIso = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Formats YYYY-MM-DD for clean iOS display (e.g., Oct 10, 2026)
  const formatDisplayDate = (isoStr: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const todayIso = getTodayIso();

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2: Travelers
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
  const isSubmittingRef = useRef(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      refreshTrips();
    } finally {
      setRefreshing(false);
    }
  };

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
      newErrors.groupName = 'Please enter a trip name';
    } else if (groupName.trim().length < 2) {
      newErrors.groupName = 'Trip name must be at least 2 characters';
    }

    if (!destination.trim()) {
      newErrors.destination = 'Please enter a destination';
    } else if (destination.trim().length < 2) {
      newErrors.destination = 'Destination must be at least 2 characters';
    }

    if (!tripType) {
      newErrors.tripType = 'Please select a category';
    }

    if (!expenseSplit) {
      newErrors.expenseSplit = 'Please select a split strategy';
    }

    if (!startDate.trim()) {
      newErrors.startDate = 'Please enter start date';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
      newErrors.startDate = 'Use format YYYY-MM-DD';
    } else if (startDate.trim() < todayIso) {
      newErrors.startDate = 'Start date cannot be in the past';
    }

    if (!endDate.trim()) {
      newErrors.endDate = 'Please enter end date';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate.trim())) {
      newErrors.endDate = 'Use format YYYY-MM-DD';
    } else if (endDate.trim() < todayIso) {
      newErrors.endDate = 'End date cannot be in the past';
    } else if (startDate.trim() && endDate.trim() < startDate.trim()) {
      newErrors.endDate = 'End date must be on or after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation (at least 1 companion traveler)
  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (travelers.length === 0) {
      newErrors.travelers = 'Add at least one companion traveler to create a group.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!validateStep1()) {
        Alert.alert('Incomplete Fields', 'Please fill in all details before continuing.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) {
        Alert.alert('Add Companion', 'Please add at least one companion traveler to continue.');
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

    if (isSubmittingRef.current || isSubmitting) return;
    isSubmittingRef.current = true;
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
        await refreshTrips();
        onSuccess(createdGroupId);
      } else {
        Alert.alert('Error', 'Unable to retrieve group information from server.');
      }
    } catch (e: any) {
      if (e.status === 402 || e.data?.data?.requiresPayment) {
        setIsPaymentModalOpen(true);
      } else {
        Alert.alert('Group Creation Failed', e.message || 'An unexpected error occurred.');
      }
    } finally {
      isSubmittingRef.current = false;
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
              {/* iOS Clean Nav Header */}
        <View style={styles.topNav}>
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.navBackBtn} 
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={22} color="#1C1C1E" strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.navTitleWrap}>
            <Text style={styles.navTitle}>
              {step === 1 ? 'New Trip' : step === 2 ? 'Travelers' : 'Review & Confirm'}
            </Text>
          </View>

          <View style={styles.navRightWrap}>
            <View style={styles.navStepBadge}>
              <Text style={styles.navStepBadgeText}>{step}/3</Text>
            </View>
          </View>
        </View>

        {/* Apple iOS Minimalist Segmented Progress Bar */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View 
              key={s} 
              style={[
                styles.progressBarSegment,
                step >= s ? styles.progressBarActive : styles.progressBarInactive
              ]} 
            />
          ))}
        </View>

        {/* Form Body */}
        <ScrollView 
          style={styles.scrollBody} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
        >
          {/* STEP 1: Trip Essentials */}
          {step === 1 && (
            <View>
              {/* Screen Title */}
              <View style={styles.headerBlock}>
                <Text style={styles.largeTitle}>Trip Essentials</Text>
                <Text style={styles.headerSubtitle}>Set up destination, dates, and split preferences</Text>
              </View>

              {/* Inset Group 1: Trip Details */}
              <Text style={styles.sectionHeaderLabel}>GENERAL INFO</Text>
              <View style={styles.iosCard}>
                {/* Trip Name Row */}
                <View style={styles.inputRow}>
                  <Users size={18} color="#8E8E93" style={styles.inputRowIcon} />
                  <View style={styles.inputRowContent}>
                    <Text style={styles.inputRowLabel}>Trip Name</Text>
                    <TextInput
                      style={styles.inputRowField}
                      placeholder="e.g. Manali Expedition"
                      placeholderTextColor="#C7C7CC"
                      value={groupName}
                      onChangeText={(val) => {
                        setGroupName(val);
                        if (errors.groupName) setErrors((prev) => ({ ...prev, groupName: '' }));
                      }}
                    />
                  </View>
                </View>
                {!!errors.groupName && <Text style={styles.fieldErrorText}>{errors.groupName}</Text>}

                <View style={styles.inputDivider} />

                {/* Destination Row */}
                <View style={styles.inputRow}>
                  <MapPin size={18} color="#8E8E93" style={styles.inputRowIcon} />
                  <View style={styles.inputRowContent}>
                    <Text style={styles.inputRowLabel}>Destination</Text>
                    <TextInput
                      style={styles.inputRowField}
                      placeholder="e.g. Manali, Himachal"
                      placeholderTextColor="#C7C7CC"
                      value={destination}
                      onChangeText={(val) => {
                        setDestination(val);
                        if (errors.destination) setErrors((prev) => ({ ...prev, destination: '' }));
                      }}
                    />
                  </View>
                </View>
                {!!errors.destination && <Text style={styles.fieldErrorText}>{errors.destination}</Text>}
              </View>

              {/* Inset Group 2: Trip Category Segmented Control */}
              <Text style={styles.sectionHeaderLabel}>CATEGORY</Text>
              <View style={styles.segmentedControl}>
                {TRIP_CATEGORIES.map((cat) => {
                  const isActive = tripType === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.segmentedTab, isActive && styles.segmentedTabActive]}
                      onPress={() => setTripType(cat)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.segmentedTabText, isActive && styles.segmentedTabTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Inset Group 3: Trip Dates */}
              <Text style={styles.sectionHeaderLabel}>DATES & DURATION</Text>
              <View style={styles.iosCard}>
                <View style={styles.datesGridRow}>
                  {/* Start Date Selector */}
                  <TouchableOpacity
                    style={styles.dateCol}
                    onPress={() => setDatePickerTarget('start')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dateColHeader}>
                      <Calendar size={15} color={startDate ? '#059669' : '#8E8E93'} />
                      <Text style={styles.dateColLabel}>Start Date</Text>
                    </View>
                    <Text style={[styles.dateSelectedValue, !startDate && styles.datePlaceholder]}>
                      {startDate ? formatDisplayDate(startDate) : 'Select Date'}
                    </Text>
                    {!!errors.startDate && <Text style={styles.dateErrorText}>{errors.startDate}</Text>}
                  </TouchableOpacity>

                  <View style={styles.verticalHairline} />

                  {/* End Date Selector */}
                  <TouchableOpacity
                    style={styles.dateCol}
                    onPress={() => {
                      if (!startDate) {
                        setDatePickerTarget('start');
                      } else {
                        setDatePickerTarget('end');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dateColHeader}>
                      <Calendar size={15} color={endDate ? '#059669' : '#8E8E93'} />
                      <Text style={styles.dateColLabel}>End Date</Text>
                    </View>
                    <Text style={[styles.dateSelectedValue, !endDate && styles.datePlaceholder]}>
                      {endDate ? formatDisplayDate(endDate) : 'Select Date'}
                    </Text>
                    {!!errors.endDate && <Text style={styles.dateErrorText}>{errors.endDate}</Text>}
                  </TouchableOpacity>
                </View>

                {/* Auto-calculated duration pill inside card */}
                {durationDays > 0 && (
                  <View style={styles.durationInlinePill}>
                    <Clock size={13} color="#059669" />
                    <Text style={styles.durationInlineText}>
                      Trip Duration: <Text style={{ fontWeight: '700' }}>{durationDays} {durationDays === 1 ? 'day' : 'days'}</Text>
                    </Text>
                  </View>
                )}
              </View>

              {/* Inset Group 4: Cost Splitting */}
              <Text style={styles.sectionHeaderLabel}>SPLIT METHOD</Text>
              <View style={styles.iosCard}>
                {SPLIT_MODELS.map((model, idx) => {
                  const isSelected = expenseSplit === model.id;
                  return (
                    <React.Fragment key={model.id}>
                      {idx > 0 && <View style={styles.listDivider} />}
                      <TouchableOpacity
                        style={styles.splitListRow}
                        onPress={() => setExpenseSplit(model.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.splitListInfo}>
                          <Text style={[styles.splitListTitle, isSelected && styles.splitListTitleActive]}>
                            {model.label}
                          </Text>
                          <Text style={styles.splitListDesc}>{model.desc}</Text>
                        </View>
                        <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                          {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 2: Travelers */}
          {step === 2 && (
            <View>
              <View style={styles.headerBlockWithAction}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.largeTitle}>Travelers</Text>
                  <Text style={styles.headerSubtitle}>Add companions sharing this journey</Text>
                </View>
                <TouchableOpacity
                  style={styles.iosAddBtn}
                  onPress={() => setIsTravelerModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <UserPlus size={15} color="#FFFFFF" />
                  <Text style={styles.iosAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {/* Plan Tier Badge */}
              <View style={styles.tierStatusPill}>
                {travelers.length + 1 <= 6 ? (
                  <>
                    <Users size={15} color="#059669" />
                    <Text style={styles.tierStatusText}>
                      <Text style={{ fontWeight: '700' }}>Free Tier:</Text> {travelers.length + 1}/6 travelers ({6 - (travelers.length + 1)} spots left)
                    </Text>
                  </>
                ) : (
                  <>
                    <Crown size={15} color="#D97706" />
                    <Text style={styles.tierStatusTextAmber}>
                      <Text style={{ fontWeight: '700' }}>Premium Tier:</Text> ₹19 flat group pass required
                    </Text>
                  </>
                )}
              </View>

              {/* Validation Warning */}
              {!!errors.travelers && (
                <View style={styles.iosErrorBanner}>
                  <AlertCircle size={15} color="#E11D48" style={{ marginRight: 6 }} />
                  <Text style={styles.iosErrorBannerText}>{errors.travelers}</Text>
                </View>
              )}

              {/* Inset Members Card */}
              <Text style={styles.sectionHeaderLabel}>MEMBERS</Text>
              <View style={styles.iosCard}>
                {/* Organizer Row */}
                <View style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { backgroundColor: '#059669' }]}>
                    <Text style={styles.memberAvatarText}>
                      {organizerName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{organizerName}</Text>
                      <View style={styles.organizerTag}>
                        <Text style={styles.organizerTagText}>You • Organizer</Text>
                      </View>
                    </View>
                    <Text style={styles.memberEmail}>{organizerEmail}</Text>
                  </View>
                </View>

                {/* Companions */}
                {travelers.map((t, index) => (
                  <React.Fragment key={index}>
                    <View style={styles.rosterDivider} />
                    <View style={styles.memberRow}>
                      <View style={[styles.memberAvatar, { backgroundColor: t.avatarBg || '#0284C7' }]}>
                        <Text style={styles.memberAvatarText}>
                          {t.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.memberDetails}>
                        <View style={styles.memberNameRow}>
                          <Text style={styles.memberName}>{t.name}</Text>
                          {t.isRegistered ? (
                            <View style={styles.registeredTag}>
                              <Text style={styles.registeredTagText}>Registered</Text>
                            </View>
                          ) : (
                            <View style={styles.pendingTag}>
                              <Text style={styles.pendingTagText}>Invite</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.memberEmail}>{t.email}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.deleteBtn}
                        onPress={() => handleRemoveTraveler(index)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color="#E11D48" />
                      </TouchableOpacity>
                    </View>
                  </React.Fragment>
                ))}
              </View>

              {/* Clean Empty State if no companions yet */}
              {travelers.length === 0 && (
                <TouchableOpacity 
                  style={styles.emptyAddCard}
                  onPress={() => setIsTravelerModalOpen(true)}
                  activeOpacity={0.7}
                >
                  <UserPlus size={20} color="#059669" />
                  <Text style={styles.emptyAddCardText}>Add first companion to proceed</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* STEP 3: Review & Confirm */}
          {step === 3 && (
            <View>
              {/* Screen Title */}
              <View style={styles.headerBlock}>
                <Text style={styles.largeTitle}>Trip Overview</Text>
                <Text style={styles.headerSubtitle}>Review trip details before creating group</Text>
              </View>

              {/* Card 1: Trip Details */}
              <Text style={styles.sectionHeaderLabel}>TRIP DETAILS</Text>
              <View style={styles.iosCard}>
                {/* Hero Header Block inside Card */}
                <View style={styles.reviewHeroHeader}>
                  <View style={styles.reviewBadgeRow}>
                    <View style={styles.reviewCategoryPill}>
                      <Text style={styles.reviewCategoryText}>{tripType}</Text>
                    </View>
                    <View style={styles.reviewDestPill}>
                      <MapPin size={11} color="#059669" />
                      <Text style={styles.reviewDestText} numberOfLines={1}>
                        {destination ? destination.toUpperCase() : 'DESTINATION'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reviewTripTitle} numberOfLines={2}>
                    {groupName}
                  </Text>
                </View>

                <View style={styles.fullDivider} />

                {/* Dates Row */}
                <View style={styles.reviewRow}>
                  <View style={styles.reviewRowLeft}>
                    <Calendar size={16} color="#059669" />
                    <Text style={styles.reviewRowLabel}>Dates</Text>
                  </View>
                  <Text style={styles.reviewRowValue}>
                    {formatDisplayDate(startDate)} – {formatDisplayDate(endDate)}
                  </Text>
                </View>

                <View style={styles.reviewRowDivider} />

                {/* Duration Row */}
                <View style={styles.reviewRow}>
                  <View style={styles.reviewRowLeft}>
                    <Clock size={16} color="#059669" />
                    <Text style={styles.reviewRowLabel}>Duration</Text>
                  </View>
                  <View style={styles.durationPillCompact}>
                    <Text style={styles.durationPillCompactText}>
                      {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
                    </Text>
                  </View>
                </View>

                <View style={styles.reviewRowDivider} />

                {/* Expense Split Row */}
                <View style={styles.reviewRow}>
                  <View style={styles.reviewRowLeft}>
                    <CheckCircle2 size={16} color="#059669" />
                    <Text style={styles.reviewRowLabel}>Split Model</Text>
                  </View>
                  <Text style={styles.reviewRowValue}>
                    {SPLIT_MODELS.find((m) => m.id === expenseSplit)?.label || 'Equal Split'}
                  </Text>
                </View>

                <View style={styles.reviewRowDivider} />

                {/* Group Tier Row */}
                <View style={styles.reviewRow}>
                  <View style={styles.reviewRowLeft}>
                    <Crown size={16} color={travelers.length + 1 <= 6 ? '#059669' : '#D97706'} />
                    <Text style={styles.reviewRowLabel}>Group Plan</Text>
                  </View>
                  <View style={[
                    styles.tierPillCompact, 
                    travelers.length + 1 > 6 && styles.tierPillCompactAmber
                  ]}>
                    <Text style={[
                      styles.tierPillCompactText, 
                      travelers.length + 1 > 6 && styles.tierPillCompactTextAmber
                    ]}>
                      {travelers.length + 1 <= 6 ? 'Free Tier (₹0)' : 'Premium (₹19)'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card 2: Confirmed Travelers */}
              <Text style={styles.sectionHeaderLabel}>TRAVEL ROSTER ({travelers.length + 1})</Text>
              <View style={styles.iosCard}>
                {/* Organizer */}
                <View style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { backgroundColor: '#059669' }]}>
                    <Text style={styles.memberAvatarText}>
                      {organizerName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{organizerName}</Text>
                      <View style={styles.organizerTag}>
                        <Text style={styles.organizerTagText}>You • Organizer</Text>
                      </View>
                    </View>
                    <Text style={styles.memberEmail}>{organizerEmail}</Text>
                  </View>
                </View>

                {/* Companions */}
                {travelers.map((t, index) => (
                  <React.Fragment key={index}>
                    <View style={styles.rosterDivider} />
                    <View style={styles.memberRow}>
                      <View style={[styles.memberAvatar, { backgroundColor: t.avatarBg || '#0284C7' }]}>
                        <Text style={styles.memberAvatarText}>
                          {t.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.memberDetails}>
                        <View style={styles.memberNameRow}>
                          <Text style={styles.memberName}>{t.name}</Text>
                          {t.isRegistered ? (
                            <View style={styles.registeredTag}>
                              <Text style={styles.registeredTagText}>Registered</Text>
                            </View>
                          ) : (
                            <View style={styles.pendingTag}>
                              <Text style={styles.pendingTagText}>Invite</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.memberEmail}>{t.email}</Text>
                      </View>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Sticky Clean Bottom Footer */}
        <View style={styles.stickyFooter}>
          <TouchableOpacity 
            style={styles.footerBackBtn} 
            onPress={handleBack} 
            activeOpacity={0.7}
          >
            <ArrowLeft size={15} color="#1C1C1E" style={{ marginRight: 5 }} />
            <Text style={styles.footerBackBtnText}>Back</Text>
          </TouchableOpacity>

          {step < 3 ? (
            <TouchableOpacity 
              style={styles.footerPrimaryBtn} 
              onPress={handleNextStep} 
              activeOpacity={0.85}
            >
              <Text style={styles.footerPrimaryBtnText}>Continue</Text>
              <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.footerPrimaryBtn, isSubmitting && styles.btnDisabled]} 
              onPress={() => handleFinishCreate()}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.footerPrimaryBtnText}>Create Trip</Text>
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

        {/* Apple iOS Calendar Date Selector Modal */}
        <DatePickerModal
          visible={datePickerTarget !== null}
          onClose={() => setDatePickerTarget(null)}
          title={datePickerTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
          selectedDate={datePickerTarget === 'start' ? startDate : endDate}
          minDate={
            datePickerTarget === 'start'
              ? todayIso
              : startDate && startDate > todayIso
                ? startDate
                : todayIso
          }
          onSelectDate={(isoDate) => {
            if (datePickerTarget === 'start') {
              setStartDate(isoDate);
              if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: '' }));
              // If current end date is earlier than selected start date, clear it
              if (endDate && endDate < isoDate) {
                setEndDate('');
              }
            } else if (datePickerTarget === 'end') {
              setEndDate(isoDate);
              if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: '' }));
            }
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },

  // iOS Top Navigation
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.bgApp,
  },
  navBackBtn: {
    width: 44,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  navTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  navRightWrap: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  navStepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E5E5EA',
  },
  navStepBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#636366',
  },

  // Apple Segmented Progress Line
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  progressBarSegment: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
  },
  progressBarActive: {
    backgroundColor: '#059669',
  },
  progressBarInactive: {
    backgroundColor: '#E5E5EA',
  },

  // Body
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },

  // Headings - Standard Proportional Mobile Scale
  headerBlock: {
    marginBottom: 14,
    marginTop: 2,
  },
  headerBlockWithAction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 2,
  },
  largeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '400',
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 7,
    marginTop: 16,
    marginLeft: 0,
  },

  // Apple Inset Grouped Card
  iosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    overflow: 'hidden',
  },
  fullDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
  },
  inputDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 46,
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
  rosterDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 64,
  },
  reviewRowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 42,
  },
  hairlineDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 46,
  },
  verticalHairline: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
  },

  // Input Row inside Card
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    minHeight: 52,
  },
  inputRowIcon: {
    marginRight: 12,
  },
  inputRowContent: {
    flex: 1,
  },
  inputRowLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  inputRowField: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    padding: 0,
    height: 20,
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#E11D48',
    paddingHorizontal: 16,
    paddingBottom: 7,
    fontWeight: '500',
  },

  // Apple Segmented Control for Category
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    padding: 3,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentedTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#636366',
  },
  segmentedTabTextActive: {
    color: '#1C1C1E',
    fontWeight: '600',
  },

  // Dates Grid inside Card
  datesGridRow: {
    flexDirection: 'row',
  },
  dateCol: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dateColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  dateColLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dateSelectedValue: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#1C1C1E',
    height: 20,
  },
  datePlaceholder: {
    color: '#C7C7CC',
    fontWeight: '400',
  },
  dateErrorText: {
    fontSize: 10.5,
    color: '#E11D48',
    marginTop: 3,
    fontWeight: '500',
  },
  durationInlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#A7F3D0',
    paddingVertical: 7,
    gap: 5,
  },
  durationInlineText: {
    fontSize: 11.5,
    color: '#065F46',
  },

  // Split Method Selection List
  splitListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  splitListInfo: {
    flex: 1,
    paddingRight: 12,
  },
  splitListTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  splitListTitleActive: {
    color: '#059669',
  },
  splitListDesc: {
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    borderColor: '#059669',
    backgroundColor: '#059669',
  },

  // Step 2: Travelers
  iosAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  iosAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tierStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
    gap: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  tierStatusText: {
    fontSize: 11.5,
    color: '#065F46',
  },
  tierStatusTextAmber: {
    fontSize: 11.5,
    color: '#92400E',
  },
  iosErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  iosErrorBannerText: {
    fontSize: 11.5,
    color: '#E11D48',
    fontWeight: '600',
    flex: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  memberEmail: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  organizerTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  organizerTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#047857',
  },
  registeredTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  registeredTagText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#047857',
  },
  pendingTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  pendingTagText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#B45309',
  },
  deleteBtn: {
    padding: 6,
  },
  emptyAddCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C7C7CC',
    paddingVertical: 16,
    marginTop: 12,
    gap: 8,
  },
  emptyAddCardText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#059669',
  },

  // Step 3: Clean Aligned Review Summary Styles
  reviewHeroHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  reviewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  reviewCategoryPill: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  reviewCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#636366',
  },
  reviewDestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  reviewDestText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.3,
  },
  reviewTripTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
  },
  reviewRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  reviewRowLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#636366',
  },
  reviewRowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
  },
  durationPillCompact: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  durationPillCompactText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  tierPillCompact: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  tierPillCompactText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  tierPillCompactAmber: {
    backgroundColor: '#FEF3C7',
  },
  tierPillCompactTextAmber: {
    color: '#B45309',
  },

  // Sticky Bottom Footer
  stickyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    gap: 10,
  },
  footerBackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E5E5EA',
  },
  footerBackBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  footerPrimaryBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  footerPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
