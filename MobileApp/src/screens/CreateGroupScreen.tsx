/**
 * CreateGroupScreen (3-Step Trip Creation Wizard)
 * 100% replica of WebApp's CreateGroupPage.tsx
 * Instant SQLite persistence -> queued for background sync
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Users, MapPin, Calendar } from 'lucide-react-native';
import { colors, radii, shadows } from '../theme/colors';
import { useTrips } from '../context/TripContext';

interface CreateGroupScreenProps {
  onBack: () => void;
  onSuccess: (newTripId: string) => void;
}

const TRIP_TYPES = ['Friends', 'Family', 'Corporate', 'Student'] as const;

export const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ onBack, onSuccess }) => {
  const { createTrip } = useTrips();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Trip Essentials
  const [groupName, setGroupName] = useState('');
  const [destination, setDestination] = useState('');
  const [tripType, setTripType] = useState<string>('Friends');
  const [budget, setBudget] = useState('50000');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Step 2: Travelers
  const [travelers, setTravelers] = useState<Array<{ name: string; email: string; role: string }>>([
    { name: 'Rahul Sharma', email: 'rahul@example.com', role: 'Traveler' },
    { name: 'Sneha Patil', email: 'sneha@example.com', role: 'Traveler' },
  ]);
  const [newTravelerName, setNewTravelerName] = useState('');
  const [newTravelerEmail, setNewTravelerEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTraveler = () => {
    if (!newTravelerName.trim()) {
      Alert.alert('Required', 'Please enter a traveler name.');
      return;
    }
    setTravelers([
      ...travelers,
      { name: newTravelerName.trim(), email: newTravelerEmail.trim(), role: 'Traveler' },
    ]);
    setNewTravelerName('');
    setNewTravelerEmail('');
  };

  const handleRemoveTraveler = (index: number) => {
    setTravelers(travelers.filter((_, i) => i !== index));
  };

  const handleFinishCreate = async () => {
    if (!groupName.trim() || !destination.trim()) {
      Alert.alert('Required', 'Please fill in trip title and destination.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tripId = await createTrip({
        name: groupName.trim(),
        destination: destination.trim(),
        tripType: tripType as any,
        totalBudget: parseFloat(budget) || 50000,
        startDate: startDate.trim() || new Date().toISOString().split('T')[0],
        endDate: endDate.trim() || undefined,
        travelers,
      });

      onSuccess(tripId);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create trip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={colors.slate800} />
        </TouchableOpacity>
        <Text style={styles.barTitle}>Create New Group Trip</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepProgressRow}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
          <Text style={[styles.stepNum, step >= 1 && styles.stepNumActive]}>1</Text>
        </View>
        <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
          <Text style={[styles.stepNum, step >= 2 && styles.stepNumActive]}>2</Text>
        </View>
        <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
          <Text style={[styles.stepNum, step >= 3 && styles.stepNumActive]}>3</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* STEP 1: Essentials */}
        {step === 1 && (
          <View>
            <Text style={styles.stepHeading}>Trip Essentials</Text>
            <Text style={styles.stepSub}>Destination, name, and estimated group budget</Text>

            <Text style={styles.label}>Trip / Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Goa Friends Getaway"
              placeholderTextColor={colors.slate400}
              value={groupName}
              onChangeText={setGroupName}
            />

            <Text style={styles.label}>Destination</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. North Goa, India"
              placeholderTextColor={colors.slate400}
              value={destination}
              onChangeText={setDestination}
            />

            <Text style={styles.label}>Trip Category</Text>
            <View style={styles.typeRow}>
              {TRIP_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, tripType === t && styles.typeChipActive]}
                  onPress={() => setTripType(t)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeText, tripType === t && styles.typeTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Estimated Group Budget (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="50000"
              placeholderTextColor={colors.slate400}
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
            />

            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Start Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.slate400}
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>End Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.slate400}
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: Travelers */}
        {step === 2 && (
          <View>
            <Text style={styles.stepHeading}>Travelers & Sharing</Text>
            <Text style={styles.stepSub}>Add members to automatically calculate splits</Text>

            {/* Organizer row */}
            <View style={styles.travelerCard}>
              <View style={styles.travelerAvatar}>
                <Text style={styles.travelerAvatarText}>Y</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.travelerName}>You (Organizer)</Text>
                <Text style={styles.travelerEmail}>yogesh@example.com</Text>
              </View>
              <View style={styles.organizerBadge}>
                <Text style={styles.organizerBadgeText}>Organizer</Text>
              </View>
            </View>

            {/* Other travelers */}
            {travelers.map((t, idx) => (
              <View key={idx} style={styles.travelerCard}>
                <View style={[styles.travelerAvatar, { backgroundColor: colors.accentBlue }]}>
                  <Text style={styles.travelerAvatarText}>{t.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.travelerName}>{t.name}</Text>
                  <Text style={styles.travelerEmail}>{t.email || 'No email'}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveTraveler(idx)} style={styles.delBtn}>
                  <Trash2 size={15} color={colors.accentRose} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Traveler Box */}
            <View style={styles.addTravelerBox}>
              <Text style={styles.addTravelerTitle}>Add Another Traveler</Text>
              <TextInput
                style={styles.input}
                placeholder="Name (e.g. Pooja Dandawalkar)"
                placeholderTextColor={colors.slate400}
                value={newTravelerName}
                onChangeText={setNewTravelerName}
              />
              <TextInput
                style={styles.input}
                placeholder="Email (optional)"
                placeholderTextColor={colors.slate400}
                value={newTravelerEmail}
                onChangeText={setNewTravelerEmail}
              />
              <TouchableOpacity
                style={styles.addMemberBtn}
                onPress={handleAddTraveler}
                activeOpacity={0.8}
              >
                <Plus size={15} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.addMemberBtnText}>Add Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: Review & Confirm */}
        {step === 3 && (
          <View>
            <Text style={styles.stepHeading}>Review & Confirm</Text>
            <Text style={styles.stepSub}>Ready to initialize your group ledger in SQLite</Text>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{groupName || 'Untitled Trip'}</Text>
              <Text style={styles.summarySub}>{destination || 'Destination'} • {tripType}</Text>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Budget</Text>
                <Text style={styles.summaryValue}>₹{parseFloat(budget || '0').toLocaleString()}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Group Size</Text>
                <Text style={styles.summaryValue}>{travelers.length + 1} travelers</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cost per traveler</Text>
                <Text style={styles.summaryValue}>
                  ~₹{Math.round((parseFloat(budget || '0') / (travelers.length + 1))).toLocaleString()}
                </Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.offlineNotice}>
                ⚡ Trip will be created in your offline SQLite database instantly and synced to backend automatically when online.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.stepBackBtn}
            onPress={() => setStep((step - 1) as any)}
            activeOpacity={0.8}
          >
            <ArrowLeft size={16} color={colors.slate700} />
            <Text style={styles.stepBackText}>Back</Text>
          </TouchableOpacity>
        )}

        {step < 3 ? (
          <TouchableOpacity
            style={styles.stepNextBtn}
            onPress={() => {
              if (step === 1 && (!groupName.trim() || !destination.trim())) {
                Alert.alert('Required', 'Please fill in trip name and destination.');
                return;
              }
              setStep((step + 1) as any);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.stepNextText}>Continue</Text>
            <ArrowRight size={16} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.createFinalBtn}
            onPress={handleFinishCreate}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Check size={16} color="#ffffff" strokeWidth={2.6} />
            <Text style={styles.createFinalText}>
              {isSubmitting ? 'Creating in SQLite...' : 'Create Trip & Ledger'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  topBar: {
    height: 56,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    ...shadows.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate900,
  },
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary600,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate600,
  },
  stepNumActive: {
    color: '#ffffff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.slate200,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary600,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 18,
  },
  stepHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate900,
  },
  stepSub: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
    marginBottom: 16,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13.5,
    color: colors.slate800,
    marginBottom: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate700,
  },
  typeTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  travelerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  travelerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelerAvatarText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  travelerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate900,
  },
  travelerEmail: {
    fontSize: 11,
    color: colors.slate500,
  },
  organizerBadge: {
    backgroundColor: colors.primary50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  organizerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary700,
  },
  delBtn: {
    padding: 6,
  },
  addTravelerBox: {
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: 14,
    marginTop: 14,
  },
  addTravelerTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.slate800,
    marginBottom: 8,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    borderRadius: radii.md,
    paddingVertical: 10,
    marginTop: 6,
    gap: 6,
  },
  addMemberBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.md,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate900,
  },
  summarySub: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate100,
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  summaryLabel: {
    fontSize: 12.5,
    color: colors.slate500,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate900,
  },
  offlineNotice: {
    fontSize: 11,
    color: colors.primary700,
    lineHeight: 16,
    fontWeight: '500',
  },
  footer: {
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    ...shadows.md,
  },
  stepBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.md,
    gap: 6,
  },
  stepBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate700,
  },
  stepNextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    paddingVertical: 12,
    borderRadius: radii.md,
    gap: 6,
    ...shadows.sm,
  },
  stepNextText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  createFinalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    paddingVertical: 12,
    borderRadius: radii.md,
    gap: 6,
    ...shadows.md,
  },
  createFinalText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
