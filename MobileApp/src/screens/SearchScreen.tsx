import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, Compass, MapPin, Mic, MicOff, Plane, Receipt, Search, Users, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../api/apiClient';
import { backgrounds, fontSize, fontWeight, screenHeader, spacing } from '../theme/theme';
import { colors } from '../theme/colors';
import { Expense, Trip } from '../types';

type SearchCategory = 'all' | 'trips' | 'expenses' | 'places';

interface TourPackage {
  id?: string;
  name?: string;
  title?: string;
  destination?: string;
  type?: string;
  category?: string;
}

interface SearchScreenProps {
  trips: Trip[];
  query: string;
  onQueryChange: (query: string) => void;
  onBack: () => void;
  onSelectTrip: (tripId: string) => void;
  onOpenExpenses: (query: string) => void;
  onOpenPlace: (query: string) => void;
}

const CATEGORIES: { id: SearchCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'trips', label: 'Trips' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'places', label: 'Places' },
];

function extractTourPackages(response: any): TourPackage[] {
  let packages = response?.data?.packages ?? response?.packages ?? [];
  if (packages && !Array.isArray(packages) && typeof packages.value === 'string') {
    try {
      packages = JSON.parse(packages.value);
    } catch {
      packages = [];
    }
  } else if (packages && !Array.isArray(packages) && Array.isArray(packages.value)) {
    packages = packages.value;
  }
  return Array.isArray(packages) ? packages : [];
}

const ResultRow = ({
  icon,
  title,
  subtitle,
  accessory,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accessory?: string;
  onPress: () => void;
}) => (
  <Pressable style={styles.resultRow} onPress={onPress} accessibilityRole="button">
    <View style={styles.resultIcon}>{icon}</View>
    <View style={styles.resultCopy}>
      <Text style={styles.resultTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.resultSubtitle} numberOfLines={2}>{subtitle}</Text>
    </View>
    {accessory ? <Text style={styles.resultAccessory} numberOfLines={1}>{accessory}</Text> : null}
  </Pressable>
);

export const SearchScreen: React.FC<SearchScreenProps> = ({
  trips,
  query,
  onQueryChange,
  onBack,
  onSelectTrip,
  onOpenExpenses,
  onOpenPlace,
}) => {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<SearchCategory>('all');
  const [tourPackages, setTourPackages] = useState<TourPackage[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [tourLoadFailed, setTourLoadFailed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const speechModuleRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const speechListenersRef = useRef<Array<{ remove: () => void }>>([]);

  useEffect(() => {
    let active = true;
    apiRequest<any>('/packages/explore')
      .then((response) => {
        if (active) setTourPackages(extractTourPackages(response));
      })
      .catch((error) => {
        console.warn('Could not load tour search results:', error);
        if (active) setTourLoadFailed(true);
      })
      .finally(() => {
        if (active) setIsLoadingTours(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      speechListenersRef.current.forEach((listener) => listener.remove());
      speechModuleRef.current?.abort();
    };
  }, []);

  const toggleVoiceSearch = async () => {
    if (isListening) {
      speechModuleRef.current?.stop();
      return;
    }

    try {
      const { ExpoSpeechRecognitionModule } = await import('expo-speech-recognition');
      speechModuleRef.current = ExpoSpeechRecognitionModule;

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission required', 'Allow microphone access to search by voice.');
        return;
      }

      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        Alert.alert('Speech recognition unavailable', 'Enable a speech recognition service on your device and try again.');
        return;
      }

      speechListenersRef.current.forEach((listener) => listener.remove());
      speechListenersRef.current = [
        ExpoSpeechRecognitionModule.addListener('start', () => setIsListening(true)),
        ExpoSpeechRecognitionModule.addListener('end', () => setIsListening(false)),
        ExpoSpeechRecognitionModule.addListener('result', (event) => {
          const transcript = event.results?.[0]?.transcript?.trim();
          if (transcript) onQueryChange(transcript);
        }),
        ExpoSpeechRecognitionModule.addListener('error', (event) => {
          setIsListening(false);
          if (event.error !== 'aborted') {
            Alert.alert('Voice search failed', event.message || 'Please try again.');
          }
        }),
      ];

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch (error) {
      setIsListening(false);
      Alert.alert(
        'Voice search unavailable',
        error instanceof Error ? error.message : 'Please rebuild the app with speech recognition enabled.',
      );
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const matchesText = (...values: Array<string | undefined>) => {
    if (!normalizedQuery) return true;
    return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
  };

  const matchedTrips = trips.filter((trip) =>
    matchesText(trip.name, trip.destination, trip.description, trip.tripType),
  );
  const matchedExpenses = trips.flatMap((trip) =>
    (trip.expenses || [])
      .filter((expense) => matchesText(
        expense.title,
        expense.description,
        expense.category,
        expense.paidByName,
        trip.name,
        trip.destination,
      ))
      .map((expense) => ({ expense, trip })),
  );
  const matchedPlaces = tourPackages.filter((tour) =>
    matchesText(tour.name, tour.title, tour.destination, tour.type, tour.category),
  );

  const visibleTrips = category === 'all' || category === 'trips' ? matchedTrips : [];
  const visibleExpenses = category === 'all' || category === 'expenses' ? matchedExpenses : [];
  const visiblePlaces = category === 'all' || category === 'places' ? matchedPlaces : [];
  const totalResults = visibleTrips.length + visibleExpenses.length + visiblePlaces.length;
  const isFiltered = normalizedQuery.length > 0 || category !== 'all';
  const destinationSuggestions = [...new Set(
    tourPackages.map((tour) => tour.destination?.trim()).filter((destination): destination is string => Boolean(destination)),
  )].slice(0, 6);

  const renderTrip = (trip: Trip) => (
    <ResultRow
      key={`trip-${trip.id}`}
      icon={<Users size={18} color={colors.primary700} />}
      title={trip.name}
      subtitle={`${trip.destination || 'Destination'} · ${trip.status === 'completed' ? 'Completed' : 'Active trip'}`}
      accessory={`${trip.members?.length || 0} members`}
      onPress={() => onSelectTrip(trip.id)}
    />
  );

  const renderExpense = ({ expense, trip }: { expense: Expense; trip: Trip }) => (
    <ResultRow
      key={`expense-${trip.id}-${expense.id}`}
      icon={<Receipt size={18} color="#B45309" />}
      title={expense.title}
      subtitle={`${trip.name} · ${expense.category} · ${expense.date}`}
      accessory={`${trip.currencySymbol || ''}${Number(expense.amount || 0).toLocaleString()}`}
      onPress={() => onOpenExpenses(expense.title)}
    />
  );

  const renderPlace = (tour: TourPackage, index: number) => {
    const title = tour.name || tour.title || 'Tour package';
    return (
      <ResultRow
        key={`place-${tour.id || `${title}-${index}`}`}
        icon={<MapPin size={18} color="#0369A1" />}
        title={title}
        subtitle={[tour.destination, tour.type || tour.category].filter(Boolean).join(' · ') || 'Tour package'}
        onPress={() => onOpenPlace(title)}
      />
    );
  };

  const showStarterContent = !isFiltered;
  const displayedTrips = showStarterContent ? visibleTrips.slice(0, 4) : visibleTrips;
  const displayedExpenses = showStarterContent ? visibleExpenses.slice(0, 4) : visibleExpenses;
  const displayedPlaces = showStarterContent ? visiblePlaces.slice(0, 4) : visiblePlaces;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={backgrounds.card} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 0) + screenHeader.topPadding }]}>
        <Pressable onPress={onBack} style={styles.backButton} accessibilityLabel="Back">
          <ArrowLeft size={21} color={colors.slate900} />
        </Pressable>
        <View style={styles.searchField}>
          <Search size={18} color={colors.slate500} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={onQueryChange}
            placeholder={category === 'places' ? 'Search destinations and tours' : 'Search trips, expenses, places'}
            placeholderTextColor={colors.slate400}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search trips, expenses, and places"
          />
          {query.length > 0 && (
            <Pressable onPress={() => onQueryChange('')} style={styles.clearButton} accessibilityLabel="Clear search">
              <X size={17} color={colors.slate500} />
            </Pressable>
          )}
          <Pressable
            onPress={toggleVoiceSearch}
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Stop voice search' : 'Search by voice'}
            accessibilityState={{ selected: isListening }}
          >
            {isListening
              ? <MicOff size={17} color="#FFFFFF" />
              : <Mic size={17} color={colors.primary700} />}
          </Pressable>
        </View>
      </View>

      <View style={styles.categoryWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {CATEGORIES.map((item) => {
            const active = category === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setCategory(item.id)}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 24 }]}
      >
        {showStarterContent ? (
          <>
            {destinationSuggestions.length > 0 && (
              <View style={styles.section}>
                <SectionHeading title="Popular destinations" count={destinationSuggestions.length} />
                <View style={styles.destinationSuggestions}>
                  {destinationSuggestions.map((destination) => (
                    <Pressable
                      key={destination}
                      style={styles.destinationSuggestion}
                      onPress={() => {
                        setCategory('places');
                        onQueryChange(destination);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Search tour packages in ${destination}`}
                    >
                      <MapPin size={14} color={colors.primary700} />
                      <Text style={styles.destinationSuggestionText}>{destination}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {displayedPlaces.length > 0 && (
              <View style={styles.section}>
                <SectionHeading title="Suggested tour packages" count={displayedPlaces.length} />
                {displayedPlaces.map(renderPlace)}
              </View>
            )}
            {isLoadingTours && displayedPlaces.length === 0 && (
              <View style={styles.statusState}>
                <ActivityIndicator color={colors.primary600} />
                <Text style={styles.statusText}>Loading tour suggestions...</Text>
              </View>
            )}
            {displayedPlaces.length === 0 && !isLoadingTours && !tourLoadFailed && (
              <View style={styles.starterBlock}>
                <View style={styles.starterIcon}><Compass size={23} color={colors.primary700} /></View>
                <Text style={styles.starterTitle}>Explore tour packages</Text>
                <Text style={styles.starterSubtitle}>Search a destination or browse published stays and curated trips.</Text>
              </View>
            )}
            {displayedPlaces.length === 0 && !isLoadingTours && tourLoadFailed && (
              <View style={styles.infoState}>
                <Plane size={19} color={colors.primary700} />
                <Text style={styles.infoText}>Tour suggestions could not be loaded. Try again when you are online.</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.resultsSummary}>
              <Text style={styles.resultsTitle}>{totalResults} {totalResults === 1 ? 'result' : 'results'}</Text>
              {normalizedQuery ? <Text style={styles.resultsQuery}>for “{query.trim()}”</Text> : null}
            </View>
            {displayedTrips.length > 0 && (
              <View style={styles.section}>
                <SectionHeading title="Trips" count={displayedTrips.length} />
                {displayedTrips.map(renderTrip)}
              </View>
            )}
            {displayedExpenses.length > 0 && (
              <View style={styles.section}>
                <SectionHeading title="Expenses" count={displayedExpenses.length} />
                {displayedExpenses.map(renderExpense)}
              </View>
            )}
            {displayedPlaces.length > 0 && (
              <View style={styles.section}>
                <SectionHeading title="Places & packages" count={displayedPlaces.length} />
                {displayedPlaces.map(renderPlace)}
              </View>
            )}
            {category === 'places' && isLoadingTours && (
              <View style={styles.statusState}><ActivityIndicator color={colors.primary600} /><Text style={styles.statusText}>Loading tour packages...</Text></View>
            )}
            {category === 'places' && tourLoadFailed && !isLoadingTours && (
              <View style={styles.infoState}><Plane size={19} color={colors.primary700} /><Text style={styles.infoText}>Tour packages could not be loaded. Trips and expenses remain searchable.</Text></View>
            )}
            {totalResults === 0 && !isLoadingTours && !tourLoadFailed && (
              <View style={styles.emptyState}>
                <Search size={24} color={colors.slate400} />
                <Text style={styles.emptyTitle}>No matches found</Text>
                <Text style={styles.emptySubtitle}>Try a trip name, destination, expense title, or category.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const SectionHeading = ({ title, count }: { title: string; count: number }) => (
  <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionCount}>{count}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: backgrounds.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: 12,
    backgroundColor: backgrounds.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  backButton: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  searchField: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.slate300,
    backgroundColor: backgrounds.card,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  input: { flex: 1, minHeight: 44, paddingVertical: 0, color: colors.slate900, fontSize: 14 },
  clearButton: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
  voiceButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary50 },
  voiceButtonActive: { backgroundColor: colors.primary600 },
  categoryWrap: { backgroundColor: backgrounds.card, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  categoryList: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: 12, gap: 8 },
  categoryChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.slate300, backgroundColor: backgrounds.card },
  categoryChipActive: { backgroundColor: colors.primary600, borderColor: colors.primary600 },
  categoryText: { color: colors.slate600, fontSize: 12, fontWeight: fontWeight.semiBold },
  categoryTextActive: { color: '#FFFFFF' },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingTop: 18, gap: 24 },
  section: { gap: 4 },
  sectionHeading: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  sectionTitle: { color: colors.slate900, fontSize: fontSize.sectionTitle, fontWeight: fontWeight.bold },
  sectionCount: { color: colors.slate500, fontSize: 11 },
  resultRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  resultIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate100 },
  resultCopy: { flex: 1, gap: 4 },
  resultTitle: { color: colors.slate900, fontSize: 13, fontWeight: fontWeight.semiBold },
  resultSubtitle: { color: colors.slate500, fontSize: 11, lineHeight: 16 },
  resultAccessory: { maxWidth: 82, color: colors.slate600, fontSize: 10.5, textAlign: 'right' },
  starterBlock: { alignItems: 'center', paddingHorizontal: 18, paddingTop: 44 },
  starterIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary50 },
  starterTitle: { marginTop: 16, color: colors.slate900, fontSize: 17, fontWeight: fontWeight.bold },
  starterSubtitle: { marginTop: 7, maxWidth: 300, color: colors.slate500, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  destinationSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 5 },
  destinationSuggestion: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary200, borderRadius: 18, paddingHorizontal: 12, backgroundColor: colors.primary50 },
  destinationSuggestionText: { color: colors.primary900, fontSize: 11, fontWeight: fontWeight.medium },
  resultsSummary: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: -12 },
  resultsTitle: { color: colors.slate900, fontSize: 14, fontWeight: fontWeight.bold },
  resultsQuery: { flex: 1, color: colors.slate500, fontSize: 12 },
  statusState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 28 },
  statusText: { color: colors.slate500, fontSize: 12 },
  infoState: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: colors.primary50 },
  infoText: { flex: 1, color: colors.slate700, fontSize: 12, lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingTop: 58, gap: 9 },
  emptyTitle: { marginTop: 4, color: colors.slate900, fontSize: 15, fontWeight: fontWeight.bold },
  emptySubtitle: { maxWidth: 280, color: colors.slate500, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});