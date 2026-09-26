import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle as SvgCircle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Region } from 'react-native-maps';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Compass,
  Filter,
  Heart,
  MapPin,
  Navigation,
  Phone,
  Search,
  Star,
  Utensils,
  Users,
  X,
} from 'lucide-react-native';
import {
  dineFilterGroups,
  Restaurant,
} from '../data/dineData';
import { dineService, mapServerRestaurantToAppRestaurant } from '../api/dine.service';
import { useTrips } from '../context/TripContext';
import { RestaurantMapView } from '../components/map/RestaurantMapView';
import {
  backgrounds,
  borders,
  cardRadius,
  fontSize as themeFontSize,
  screenHeader,
  spacing as themeSpacing,
} from '../theme/theme';
import { colors as themeColors } from '../theme/colors';

interface DineScreenProps {
  visible?: boolean;
  inline?: boolean;
  onClose: () => void;
}

const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
};

const palette = {
  bg: '#F7F7F4',
  card: '#FFFFFF',
  dark: '#101827',
  darkMuted: '#475569',
  lightText: '#6B7280',
  line: '#E5E7EB',
  primary: '#059669',
  primarySoft: '#DDF8EE',
  amber: '#F59E0B',
  red: '#E11D48',
  tag: '#EEF2FF',
  green: '#10B981',
  shadow: 'rgba(15,23,42,0.12)',
};

const formatCurrency = (amount: number) => `₹${amount}`;

const initialFilters = {
  cuisine: 'All',
  price: 'All',
  rating: 'All',
  distance: 'All',
  openNow: false,
  groupFriendly: false,
};

interface RestaurantTimeSlot {
  startTime: string;
  endTime: string;
}

export const DineScreen: React.FC<DineScreenProps> = ({ visible = true, inline = false, onClose }) => {
  const insets = useSafeAreaInsets();
  const { trips, refreshTrips } = useTrips();
  const [isLoading, setIsLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantLoadError, setRestaurantLoadError] = useState<string | null>(null);
  const [restaurantRefreshKey, setRestaurantRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [bookingMode, setBookingMode] = useState<'activity' | 'book'>('activity');
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTime, setSelectedTime] = useState('20:00');
  const [availableSlots, setAvailableSlots] = useState<RestaurantTimeSlot[]>([]);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [budget, setBudget] = useState('2500');
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 15.495,
    longitude: 73.827,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const tripOptions = useMemo(
    () =>
      trips.map((trip) => ({
        id: trip.id,
        name: trip.name,
        dateRange: trip.startDate ? `${trip.startDate} to ${trip.endDate || 'Flexible'}` : 'Flexible dates',
        members: trip.members?.length ?? 0,
      })),
    [trips],
  );

  useEffect(() => {
    if (tripOptions.length && !selectedTripId) {
      setSelectedTripId(tripOptions[0].id);
    }
  }, [tripOptions, selectedTripId]);

  useEffect(() => {
    const trip = trips.find((item) => item.id === selectedTripId) ?? trips[0];
    if (!selectedTripId && trip) setSelectedTripId(trip.id);
    setSelectedParticipants((trip?.members ?? []).slice(0, 4).map((member) => String(member.id)));
  }, [selectedTripId, trips]);

  useEffect(() => {
    let isMounted = true;

    const loadFavorites = async () => {
      try {
        const favoriteRestaurants = await dineService.getFavoriteRestaurants();
        if (!isMounted) return;
        setFavorites(favoriteRestaurants.map((restaurant: any) => String(restaurant.id)));
      } catch {
        if (isMounted) setFavorites([]);
      }
    };

    const loadRestaurants = async () => {
      setIsLoading(true);
      try {
        const query = searchQuery.trim();
        const commonFilters = {
          priceLevel: filters.price !== 'All' ? filters.price : undefined,
          openNow: filters.openNow || undefined,
          groupFriendly: filters.groupFriendly || undefined,
          limit: 50,
        };
        const payload = viewMode === 'map' && !query
          ? await dineService.getNearbyRestaurants({
              latitude: mapRegion.latitude,
              longitude: mapRegion.longitude,
              radius: Math.min(25000, Math.max(1000, mapRegion.latitudeDelta * 55500)),
              ...commonFilters,
            })
          : await dineService.searchRestaurants({
              q: query || undefined,
              latitude: viewMode === 'map' ? mapRegion.latitude : undefined,
              longitude: viewMode === 'map' ? mapRegion.longitude : undefined,
              radius: viewMode === 'map' ? Math.min(25000, Math.max(1000, mapRegion.latitudeDelta * 55500)) : undefined,
              ...commonFilters,
            });

        const mapped = (payload || [])
          .map((restaurant: any) => mapServerRestaurantToAppRestaurant(restaurant))
          .filter(Boolean);

        const deduped = mapped.reduce<Restaurant[]>((acc, restaurant) => {
          if (!restaurant?.id || acc.some((item) => item.id === restaurant.id)) {
            return acc;
          }
          acc.push(restaurant);
          return acc;
        }, []);

        if (isMounted) {
          setRestaurants(deduped);
          setRestaurantLoadError(null);
        }
      } catch (error) {
        if (isMounted) {
          setRestaurantLoadError((error as Error)?.message || 'Could not load restaurants. Check your connection and retry.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFavorites();
    const searchTimeout = setTimeout(() => { void loadRestaurants(); }, 350);

    return () => {
      isMounted = false;
      clearTimeout(searchTimeout);
    };
  }, [searchQuery, filters.groupFriendly, filters.openNow, filters.price, mapRegion.latitude, mapRegion.longitude, viewMode, restaurantRefreshKey]);

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const matchesSearch =
        !q ||
        restaurant.name.toLowerCase().includes(q) ||
        restaurant.cuisine.some((item) => item.toLowerCase().includes(q)) ||
        restaurant.tags.some((item) => item.toLowerCase().includes(q));

      const matchesCuisine =
        filters.cuisine === 'All' || restaurant.cuisine.some((item) => item === filters.cuisine);
      const matchesPrice = filters.price === 'All' || restaurant.priceRange === filters.price;
      const matchesRating =
        filters.rating === 'All' ||
        (filters.rating === '4+' && restaurant.rating >= 4) ||
        (filters.rating === '4.5+' && restaurant.rating >= 4.5);

      const matchesDistance =
        filters.distance === 'All' ||
        (filters.distance === '<1 km' && Number.parseFloat(String(restaurant.distance).replace(/[^0-9.]/g, '')) < 1) ||
        (filters.distance === '<3 km' && Number.parseFloat(String(restaurant.distance).replace(/[^0-9.]/g, '')) < 3) ||
        (filters.distance === '<5 km' && Number.parseFloat(String(restaurant.distance).replace(/[^0-9.]/g, '')) < 5);

      const matchesOpen = !filters.openNow || restaurant.status === 'OPEN';
      const matchesGroup = !filters.groupFriendly || restaurant.groupFriendly;

      return matchesSearch && matchesCuisine && matchesPrice && matchesRating && matchesDistance && matchesOpen && matchesGroup;
    });
  }, [restaurants, searchQuery, filters]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? trips[0] ?? null,
    [selectedTripId, trips],
  );

  useEffect(() => {
    if (!showAddSheet || bookingMode !== 'book' || !selectedRestaurant) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      setAvailableSlots([]);
      setAvailabilityError(null);
      setIsAvailabilityLoading(false);
      return;
    }

    let isMounted = true;
    setIsAvailabilityLoading(true);
    setAvailabilityError(null);
    dineService.getRestaurantAvailability(selectedRestaurant.id, selectedDate)
      .then((availability) => {
        if (!isMounted) return;
        const slots = Array.isArray(availability?.slots) ? availability.slots : [];
        setAvailableSlots(slots);
        setSelectedTime((current) => slots.some((slot: RestaurantTimeSlot) => slot.startTime === current)
          ? current
          : slots[0]?.startTime || '');
      })
      .catch((error: any) => {
        if (!isMounted) return;
        setAvailableSlots([]);
        setAvailabilityError(error?.message || 'Could not load booking times. Please retry.');
      })
      .finally(() => {
        if (isMounted) setIsAvailabilityLoading(false);
      });

    return () => { isMounted = false; };
  }, [showAddSheet, bookingMode, selectedRestaurant?.id, selectedDate]);

  const toggleFavorite = async (restaurantId: string) => {
    const isFavorite = favorites.includes(restaurantId);

    try {
      if (isFavorite) {
        await dineService.removeFavorite(restaurantId);
      } else {
        await dineService.toggleFavorite(restaurantId);
      }

      setFavorites((prev) =>
        isFavorite ? prev.filter((id) => id !== restaurantId) : [...prev, restaurantId],
      );
    } catch (error) {
      Alert.alert('Unable to update favorites', 'Please check your connection and try again.');
    }
  };

  const handleAddToTrip = async () => {
    if (!selectedRestaurant || !selectedTrip) {
      Alert.alert('No trip selected', 'Choose a trip before adding a dining activity.');
      return;
    }

    const tripMembers = selectedTrip.members ?? [];
    const participantIds = tripMembers
      .filter((member) => selectedParticipants.includes(String(member.id)))
      .map((member) => String(member.id));
    const parsedDate = new Date(`${selectedDate}T00:00:00`);
    const estimatedBudget = Number(budget);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) || Number.isNaN(parsedDate.getTime())) {
      Alert.alert('Choose a valid date', 'Use the YYYY-MM-DD date format.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(selectedTime)) {
      Alert.alert('Choose a valid time', 'Use the 24-hour HH:MM time format.');
      return;
    }
    if (bookingMode === 'book' && !availableSlots.some((slot) => slot.startTime === selectedTime)) {
      Alert.alert('Choose an available slot', 'Select one of the restaurant’s open booking times.');
      return;
    }
    if (!participantIds.length) {
      Alert.alert('Select participants', 'Choose at least one trip member for this dining activity.');
      return;
    }
    if (!Number.isFinite(estimatedBudget) || estimatedBudget <= 0) {
      Alert.alert('Enter a valid budget', 'Estimated budget must be greater than zero.');
      return;
    }

    try {
      if (bookingMode === 'book') {
        await dineService.createRestaurantReservation(selectedRestaurant.id, selectedTrip.id, {
          date: selectedDate,
          startTime: selectedTime,
          participants: participantIds,
          guestCount: participantIds.length,
          estimatedBudget,
          currency: selectedTrip.currency || 'INR',
          notes: `${selectedRestaurant.name} table booking`,
        });
      } else {
        await dineService.createDiningActivity(selectedTrip.id, {
          restaurantId: selectedRestaurant.id,
          date: selectedDate,
          startTime: selectedTime,
          participants: participantIds,
          estimatedBudget,
          currency: selectedTrip.currency || 'INR',
          notes: `${selectedRestaurant.name} dinner plan`,
        });
      }
      await refreshTrips();

      Alert.alert(
        bookingMode === 'book' ? 'Booking request saved' : 'Dining activity added',
        bookingMode === 'book'
          ? `${selectedRestaurant.name} booking for ${participantIds.length} guests has been saved to ${selectedTrip.name}.`
          : `${selectedRestaurant.name} has been added to ${selectedTrip.name}.`,
        [{ text: 'Great', onPress: () => setShowAddSheet(false) }],
      );
    } catch (error: any) {
      Alert.alert('Could not add dining activity', error?.message || 'Please try again.');
    }
  };

  const clearSearch = () => setSearchQuery('');
  const resetFilters = () => setFilters(initialFilters);
  const openRestaurantMenu = async () => {
    if (!selectedRestaurant) return;
    setShowMenu(true);
    setIsMenuLoading(true);
    try {
      const menu = await dineService.getRestaurantMenu(selectedRestaurant.id);
      setSelectedRestaurant((current) => current?.id === selectedRestaurant.id ? { ...current, menu } : current);
    } catch {
      Alert.alert('Menu unavailable', 'This restaurant menu could not be loaded. Please try again.');
    } finally {
      setIsMenuLoading(false);
    }
  };
  const navigateToRestaurant = async () => {
    if (!selectedRestaurant) return;
    const destination = Number.isFinite(selectedRestaurant.latitude) && Number.isFinite(selectedRestaurant.longitude)
      ? `${selectedRestaurant.latitude},${selectedRestaurant.longitude}`
      : selectedRestaurant.address;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Navigation unavailable', 'Could not open a map app for this restaurant.');
    }
  };
  const headerTopPadding = (inline ? 0 : Math.max(insets.top, 0)) + screenHeader.topPadding;

  const screenContent = (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: headerTopPadding, paddingBottom: screenHeader.bottomPadding }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerBack} onPress={onClose} activeOpacity={0.8} accessibilityLabel="Back">
              <ArrowLeft size={20} color={palette.dark} />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.title}>Restaurants</Text>
            </View>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
                onPress={() => setViewMode('map')}
                activeOpacity={0.9}
              >
                <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>MAP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
                onPress={() => setViewMode('list')}
                activeOpacity={0.9}
              >
                <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>LIST</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerSearchWrap}>
            <View style={styles.searchBar}>
              <Search size={18} color={palette.lightText} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search restaurants, cuisines or dishes"
                placeholderTextColor={palette.lightText}
                style={styles.searchInput}
                accessibilityLabel="Search restaurants"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={clearSearch} activeOpacity={0.8}>
                  <X size={16} color={palette.darkMuted} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.searchFilterButton, showFilters && styles.searchFilterButtonActive]}
                onPress={() => setShowFilters((prev) => !prev)}
                activeOpacity={0.8}
                accessibilityLabel="Filter restaurants"
              >
                <Filter size={15} color={showFilters ? palette.primary : palette.dark} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showFilters && (
          <View style={styles.filterSheet}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipScroller}>
              {[
                { key: 'cuisine', values: ['All', ...dineFilterGroups.cuisines] },
                { key: 'price', values: ['All', ...dineFilterGroups.prices] },
                { key: 'rating', values: ['All', ...dineFilterGroups.ratings] },
                { key: 'distance', values: ['All', ...dineFilterGroups.distances] },
              ].map((group) => (
                <View key={group.key} style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>{group.key === 'cuisine' ? 'Cuisine' : group.key === 'price' ? 'Price' : group.key === 'rating' ? 'Rating' : 'Distance'}</Text>
                  <View style={styles.filterChipRow}>
                    {group.values.map((value) => {
                      const selected = filters[group.key as keyof typeof filters] === value;
                      return (
                        <TouchableOpacity
                          key={value}
                          style={[styles.filterChip, selected && styles.filterChipActive]}
                          onPress={() => setFilters((prev) => ({ ...prev, [group.key]: value }))}
                        >
                          <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{value}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Quick toggles</Text>
                <View style={styles.filterChipRow}>
                  <TouchableOpacity
                    style={[styles.filterChip, filters.openNow && styles.filterChipActive]}
                    onPress={() => setFilters((prev) => ({ ...prev, openNow: !prev.openNow }))}
                  >
                    <Text style={[styles.filterChipText, filters.openNow && styles.filterChipTextActive]}>Open Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, filters.groupFriendly && styles.filterChipActive]}
                    onPress={() => setFilters((prev) => ({ ...prev, groupFriendly: !prev.groupFriendly }))}
                  >
                    <Text style={[styles.filterChipText, filters.groupFriendly && styles.filterChipTextActive]}>Group Friendly</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.clearFiltersButton} onPress={resetFilters} activeOpacity={0.85}>
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {restaurantLoadError ? (
          <View style={styles.restaurantErrorBanner} accessibilityRole="alert">
            <Text style={styles.restaurantErrorText}>
              {restaurants.length ? 'Showing previously loaded restaurants. ' : ''}{restaurantLoadError}
            </Text>
            <TouchableOpacity onPress={() => setRestaurantRefreshKey((key) => key + 1)} activeOpacity={0.8}>
              <Text style={styles.restaurantRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isLoading && restaurants.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={styles.loadingText}>Finding restaurants for your trip</Text>
          </View>
        ) : restaurantLoadError && restaurants.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}><Compass size={28} color={palette.primary} /></View>
            <Text style={styles.emptyTitle}>Restaurants couldn’t load</Text>
            <Text style={styles.emptyText}>{restaurantLoadError}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setRestaurantRefreshKey((key) => key + 1)} activeOpacity={0.9}>
              <Text style={styles.primaryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredRestaurants.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}><Compass size={28} color={palette.primary} /></View>
            <Text style={styles.emptyTitle}>No restaurants found</Text>
            <Text style={styles.emptyText}>We couldn’t find restaurants matching your filters.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={resetFilters} activeOpacity={0.9}>
              <Text style={styles.primaryButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === 'map' ? (
          <View style={styles.mapWrap}>
            <View style={styles.mapSurface}>
              <RestaurantMapView
                restaurants={filteredRestaurants.map((restaurant) => ({
                  id: restaurant.id,
                  name: restaurant.name,
                  latitude: restaurant.latitude,
                  longitude: restaurant.longitude,
                  priceRange: restaurant.priceRange,
                  rating: restaurant.rating,
                  status: restaurant.status,
                }))}
                selectedRestaurantId={selectedRestaurant?.id}
                onSelectRestaurant={(restaurant) => setSelectedRestaurant(restaurants.find((item) => item.id === restaurant.id) || null)}
                region={mapRegion}
                onRegionChangeComplete={setMapRegion}
              />

              <TouchableOpacity
                style={styles.recenterButton}
                activeOpacity={0.9}
                onPress={() => {
                  const firstRestaurant = filteredRestaurants[0];
                  if (firstRestaurant) {
                    setMapRegion((region) => ({ ...region, latitude: firstRestaurant.latitude, longitude: firstRestaurant.longitude }));
                  }
                }}
              >
                <Compass size={16} color={palette.dark} />
                <Text style={styles.recenterText}>Recenter</Text>
              </TouchableOpacity>
            </View>

            {selectedRestaurant ? (
              <View style={styles.mapPreviewCard}>
                <Image source={{ uri: selectedRestaurant.image }} style={styles.previewImage} />
                <View style={styles.previewBody}>
                  <Text style={styles.previewTitle}>{selectedRestaurant.name}</Text>
                  <View style={styles.ratingRow}>
                    <Star size={12} color={palette.amber} fill={palette.amber} />
                    <Text style={styles.ratingText}>{selectedRestaurant.rating}</Text>
                    <Text style={styles.previewMeta}> • {selectedRestaurant.cuisine.join(' • ')}</Text>
                  </View>
                  <Text style={styles.previewMeta}>{selectedRestaurant.distance} away • {selectedRestaurant.status}</Text>
                  <TouchableOpacity style={styles.primaryButton} onPress={() => setSelectedRestaurant(selectedRestaurant)} activeOpacity={0.9}>
                    <Text style={styles.primaryButtonText}>View Restaurant</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={filteredRestaurants}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.restaurantCard}
                activeOpacity={0.9}
                onPress={() => setSelectedRestaurant(item)}
              >
                <Image source={{ uri: item.image }} style={styles.cardImage} />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <TouchableOpacity onPress={() => toggleFavorite(item.id)} activeOpacity={0.8}>
                      <Heart size={18} color={favorites.includes(item.id) ? palette.red : palette.darkMuted} fill={favorites.includes(item.id) ? palette.red : 'none'} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.ratingRow}>
                    <Star size={12} color={palette.amber} fill={palette.amber} />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                    <Text style={styles.metaText}> • {item.reviewCount} reviews</Text>
                  </View>

                  <Text style={styles.metaText}>{item.cuisine.join(' • ')} • {item.priceRange}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{item.distance}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={[styles.metaText, item.status === 'OPEN' ? styles.openText : styles.closedText]}>{item.status === 'OPEN' ? 'Open now' : 'Closed'}</Text>
                  </View>

                  <View style={styles.cardFootRow}>
                    {item.groupFriendly ? <View style={styles.tag}><Text style={styles.tagText}>Group Friendly</Text></View> : null}
                    {item.offer ? <View style={[styles.tag, styles.offerTag]}><Text style={styles.tagText}>{item.offer}</Text></View> : null}
                    <ArrowRight size={16} color={palette.dark} />
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {selectedRestaurant ? (
          <Modal visible={!!selectedRestaurant} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelectedRestaurant(null)}>
            <View style={styles.detailsSheetWrap}>
              <View style={styles.detailsSheet}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsContent}>
                  <Image source={{ uri: selectedRestaurant.heroImage }} style={styles.detailsHeroImage} />
                  <View style={styles.detailsHeaderRow}>
                    <TouchableOpacity style={styles.roundIcon} onPress={() => setSelectedRestaurant(null)}>
                      <ArrowLeft size={18} color={palette.dark} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.roundIcon} onPress={() => toggleFavorite(selectedRestaurant.id)}>
                      <Heart size={18} color={favorites.includes(selectedRestaurant.id) ? palette.red : palette.darkMuted} fill={favorites.includes(selectedRestaurant.id) ? palette.red : 'none'} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.detailsTitle}>{selectedRestaurant.name}</Text>
                  <View style={styles.ratingRow}>
                    <Star size={13} color={palette.amber} fill={palette.amber} />
                    <Text style={styles.ratingText}>{selectedRestaurant.rating}</Text>
                    <Text style={styles.metaText}> • {selectedRestaurant.reviewCount} reviews</Text>
                  </View>

                  <Text style={styles.detailsMeta}>{selectedRestaurant.cuisine.join(' • ')} • {selectedRestaurant.priceRange}</Text>
                  <View style={styles.metaRowExtended}>
                    <MapPin size={14} color={palette.darkMuted} />
                    <Text style={styles.metaText}>{selectedRestaurant.address}</Text>
                  </View>
                  <View style={styles.metaRowExtended}>
                    <Clock3 size={14} color={palette.darkMuted} />
                    <Text style={styles.metaText}>{selectedRestaurant.distance} away • {selectedRestaurant.status === 'OPEN' ? 'Open now' : 'Closed'}</Text>
                  </View>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoPill}><Text style={styles.infoPillText}>{selectedRestaurant.groupFriendly ? 'Group Friendly' : 'Private Dining'}</Text></View>
                  </View>

                  <Text style={styles.sectionTitle}>Opening hours · {selectedRestaurant.timezone || 'Asia/Kolkata'}</Text>
                  <View style={styles.hoursList}>
                    {(selectedRestaurant.hours || []).map((entry) => (
                      <View key={`${selectedRestaurant.id}-${entry.day}`} style={styles.hoursRow}>
                        <Text style={styles.hoursDay}>{entry.day}</Text>
                        <Text style={styles.hoursValue}>
                          {entry.isClosed || !entry.intervals?.length
                            ? 'Closed'
                            : entry.intervals.map((interval) => `${String(interval.open).slice(0, 5)}–${String(interval.close).slice(0, 5)}`).join(', ')}
                        </Text>
                      </View>
                    ))}
                    {!selectedRestaurant.hours?.length ? <Text style={styles.metaText}>Opening hours unavailable</Text> : null}
                  </View>

                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.descriptionText}>{selectedRestaurant.description}</Text>

                  <View style={styles.contactRow}>
                    <Phone size={16} color={palette.primary} />
                    <Text style={styles.contactText}>{selectedRestaurant.phone}</Text>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => void openRestaurantMenu()} activeOpacity={0.9}>
                      <Utensils size={16} color={palette.dark} />
                      <Text style={styles.secondaryButtonText}>View Menu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => void navigateToRestaurant()} activeOpacity={0.9}>
                      <Navigation size={16} color={palette.dark} />
                      <Text style={styles.secondaryButtonText}>Navigate</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.primaryButtonLarge} onPress={() => { setBookingMode('activity'); setShowAddSheet(true); }} activeOpacity={0.9}>
                      <Text style={styles.primaryButtonText}>Add to Trip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButtonLarge, styles.bookTableButton]} onPress={() => { setBookingMode('book'); setShowAddSheet(true); }} activeOpacity={0.9}>
                      <Text style={styles.primaryButtonText}>Book a Table</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        ) : null}

        <Modal visible={showMenu && !!selectedRestaurant} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMenu(false)}>
          <View style={styles.menuWrap}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>{selectedRestaurant?.name}</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)} activeOpacity={0.8}>
                <X size={20} color={palette.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuContent}>
              {isMenuLoading ? <ActivityIndicator size="large" color={palette.primary} /> : null}
              {!isMenuLoading && !selectedRestaurant?.menu.length ? <Text style={styles.menuEmpty}>No menu is currently available.</Text> : null}
              {!isMenuLoading && selectedRestaurant?.menu.map((category, categoryIndex) => {
                const categoryName = String(category.category || (category as any).name || `Category ${categoryIndex + 1}`);
                const items = Array.isArray(category.items) ? category.items : [];
                return (
                  <View key={`${categoryName}-${categoryIndex}`} style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>{categoryName.toUpperCase()}</Text>
                    {items.map((item, itemIndex) => (
                      <View key={item.id || `${categoryName}-${itemIndex}`} style={styles.menuItemRow}>
                        <Image source={{ uri: item.image ?? selectedRestaurant.image }} style={styles.menuItemImage} />
                        <View style={styles.menuItemBody}>
                          <Text style={styles.menuItemName}>{item.name || 'Menu item'}</Text>
                          <Text style={styles.menuItemDescription}>{item.description || ''}</Text>
                          <Text style={styles.menuItemPrice}>{formatCurrency(Number(item.price || 0))}</Text>
                          <Text style={[styles.menuItemAvailability, item.available ? styles.openText : styles.closedText]}>{item.available ? 'Available' : 'Unavailable'}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        <Modal visible={showAddSheet} animationType="slide" transparent onRequestClose={() => setShowAddSheet(false)}>
          <View style={styles.addSheetWrap}>
            <Pressable style={styles.sheetBackdrop} onPress={() => setShowAddSheet(false)} />
            <View style={styles.addSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.addTitle}>{bookingMode === 'book' ? 'BOOK A TABLE' : 'ADD TO TRIP'}</Text>
              <Text style={styles.addSubTitle}>{bookingMode === 'book' ? 'Choose a trip and booking details.' : 'Where do you want to add this?'}</Text>

              {(tripOptions.length ? tripOptions : [{ id: 'no-trip', name: 'No trips available', dateRange: 'Create a trip first', members: 0 }]).map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={[styles.tripOption, selectedTripId === trip.id && styles.tripOptionActive]}
                  onPress={() => trip.id !== 'no-trip' && setSelectedTripId(trip.id)}
                  activeOpacity={0.9}
                  disabled={trip.id === 'no-trip'}
                >
                  <View>
                    <Text style={styles.tripOptionTitle}>{trip.name}</Text>
                    <Text style={styles.tripOptionMeta}>{trip.dateRange}</Text>
                  </View>
                  <Text style={styles.tripOptionMeta}>{trip.members} members</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.formLabel}>Select date</Text>
              <TextInput
                value={selectedDate}
                onChangeText={setSelectedDate}
                keyboardType="numbers-and-punctuation"
                style={styles.formInput}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.formLabel}>{bookingMode === 'book' ? 'Available 60-minute start times' : 'Select time'}</Text>
              {bookingMode === 'book' ? (
                isAvailabilityLoading ? (
                  <ActivityIndicator size="small" color={palette.primary} />
                ) : availabilityError ? (
                  <Text style={styles.availabilityMessage}>{availabilityError}</Text>
                ) : availableSlots.length ? (
                  <View style={styles.slotGrid}>
                    {availableSlots.map((slot) => (
                      <TouchableOpacity
                        key={`${slot.startTime}-${slot.endTime}`}
                        style={[styles.slotChip, selectedTime === slot.startTime && styles.slotChipActive]}
                        onPress={() => setSelectedTime(slot.startTime)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.slotChipText, selectedTime === slot.startTime && styles.slotChipTextActive]}>{slot.startTime}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.availabilityMessage}>No slots are available for this date. Check the opening hours above.</Text>
                )
              ) : (
                <TextInput
                  value={selectedTime}
                  onChangeText={setSelectedTime}
                  keyboardType="numbers-and-punctuation"
                  style={styles.formInput}
                  placeholder="20:00"
                />
              )}

              <Text style={styles.formLabel}>Participants</Text>
              <View style={styles.pillRow}>
                {(selectedTrip?.members ?? []).map((member) => {
                  const memberId = String(member.id);
                  const active = selectedParticipants.includes(memberId);
                  return (
                    <TouchableOpacity
                      key={memberId}
                      style={[styles.participantChip, active && styles.participantChipActive]}
                      onPress={() => {
                        setSelectedParticipants((prev) =>
                          prev.includes(memberId)
                            ? prev.filter((id) => id !== memberId)
                            : [...prev, memberId]
                        );
                      }}
                    >
                      <Text style={[styles.participantChipText, active && styles.participantChipTextActive]}>{member.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.formLabel}>Estimated budget</Text>
              <TextInput
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
                style={styles.formInput}
                placeholder="2500"
              />

              <View style={styles.expenseSummary}>
                <Text style={styles.expenseLabel}>Dining Expense</Text>
                <Text style={styles.expenseAmount}>₹{budget}</Text>
                <Text style={styles.expenseMeta}>{selectedParticipants.length} people • ₹{Math.round(Number(budget || 0) / Math.max(selectedParticipants.length, 1))} per person</Text>
              </View>

              <TouchableOpacity style={styles.primaryButtonLarge} onPress={handleAddToTrip} disabled={bookingMode === 'book' && (isAvailabilityLoading || availableSlots.length === 0)} activeOpacity={0.9}>
                <Text style={styles.primaryButtonText}>{bookingMode === 'book' ? 'Save Restaurant Booking' : 'Add Dining Activity'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
  );

  if (inline) return screenContent;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {screenContent}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    backgroundColor: screenHeader.backgroundColor,
    borderBottomWidth: 1,
    borderBottomColor: screenHeader.borderColor,
    paddingHorizontal: screenHeader.horizontalPadding,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: screenHeader.height - screenHeader.bottomPadding,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSearchWrap: {
    width: '100%',
    marginTop: 0,
  },
  title: {
    fontSize: screenHeader.titleFontSize + 2,
    fontWeight: screenHeader.titleFontWeight,
    letterSpacing: screenHeader.titleLetterSpacing,
    color: screenHeader.titleColor,
  },
  headerSpacer: {
    width: 36,
  },
  headerBack: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  locationSelectorWrap: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: 8,
  },
  locationSelector: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: palette.line,
  },
  locationSelectorActive: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  locationSelectorText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.dark,
  },
  locationSelectorTextActive: {
    color: palette.primary,
  },
  locationSubText: {
    fontSize: 11,
    color: palette.lightText,
    marginTop: 2,
  },
  locationSubTextActive: {
    color: palette.primary,
  },
  searchBar: {
    height: 44,
    borderWidth: 1,
    borderColor: borders.input,
    borderRadius: cardRadius.pill,
    backgroundColor: backgrounds.input,
    paddingHorizontal: themeSpacing.cardPadding - 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
  },
  searchInput: {
    flex: 1,
    color: themeColors.slate900,
    fontSize: themeFontSize.modalSubtitle,
    paddingVertical: 0,
  },
  searchFilterButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: cardRadius.pill,
  },
  searchFilterButtonActive: {
    backgroundColor: palette.primarySoft,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.dark,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleButtonActive: {
    backgroundColor: palette.primary,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.darkMuted,
    letterSpacing: 0.8,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  filterSheet: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 12,
  },
  filterChipScroller: {
    paddingRight: 6,
  },
  filterGroup: {
    marginRight: 16,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: palette.lightText,
    marginBottom: 8,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: palette.dark,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  clearFiltersButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearFiltersText: {
    color: palette.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: spacing.md,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  cardImage: {
    width: 110,
    height: 140,
  },
  cardBody: {
    flex: 1,
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.dark,
    flex: 1,
    marginRight: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 4,
    color: palette.dark,
    fontWeight: '700',
    fontSize: 13,
  },
  metaText: {
    fontSize: 12,
    color: palette.darkMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  metaDot: {
    fontSize: 12,
    color: palette.darkMuted,
  },
  openText: {
    color: palette.green,
    fontWeight: '700',
  },
  closedText: {
    color: palette.red,
    fontWeight: '700',
  },
  cardFootRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EEF8F5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  offerTag: {
    backgroundColor: '#FFF7ED',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.dark,
  },
  mapWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  mapSurface: {
    position: 'relative',
    width: '100%',
    height: 420,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#D9EAF5',
    borderWidth: 1,
    borderColor: palette.line,
  },
  mapGrid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.45,
    backgroundColor: '#DCE8D7',
    borderWidth: 18,
    borderColor: '#C9DCC5',
  },
  mapWater: {
    position: 'absolute',
    right: -36,
    top: -20,
    width: 160,
    height: 500,
    backgroundColor: '#CDEBF0',
    transform: [{ rotate: '12deg' }],
  },
  mapRoad: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  mapRoadDiagonalOne: {
    width: 620,
    height: 14,
    left: -100,
    top: 150,
    transform: [{ rotate: '28deg' }],
  },
  mapRoadDiagonalTwo: {
    width: 620,
    height: 10,
    left: -90,
    top: 290,
    transform: [{ rotate: '-24deg' }],
  },
  mapRoadHorizontalOne: {
    width: '100%',
    height: 12,
    top: 96,
  },
  mapRoadHorizontalTwo: {
    width: '100%',
    height: 8,
    top: 330,
  },
  mapRoadVerticalOne: {
    width: 10,
    height: '100%',
    left: '32%',
  },
  mapRoadVerticalTwo: {
    width: 8,
    height: '100%',
    left: '72%',
  },
  mapDistrictLabel: {
    position: 'absolute',
    color: '#66808A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  mapTitle: {
    position: 'absolute',
    left: 16,
    top: 16,
    color: '#46625B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapMarkerWrap: {
    ...StyleSheet.absoluteFill,
  },
  mapMarker: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: palette.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  mapMarkerSelected: {
    backgroundColor: palette.primary,
    borderColor: '#FFFFFF',
  },
  mapMarkerText: {
    fontSize: 10,
    fontWeight: '800',
    color: palette.dark,
  },
  mapMarkerTextSelected: {
    color: '#FFFFFF',
  },
  recenterButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    gap: 6,
  },
  recenterText: {
    color: palette.dark,
    fontWeight: '700',
    fontSize: 12,
  },
  mapPreviewCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 18,
    borderWidth: 1,
    borderColor: palette.line,
  },
  previewImage: {
    width: 96,
    height: 118,
  },
  previewBody: {
    flex: 1,
    padding: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.dark,
  },
  previewMeta: {
    fontSize: 12,
    color: palette.darkMuted,
    marginTop: 3,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 120,
  },
  loadingText: {
    marginTop: 12,
    color: palette.darkMuted,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.dark,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: palette.darkMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  restaurantErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1C9C5',
    backgroundColor: '#FFF7F5',
  },
  restaurantErrorText: {
    flex: 1,
    color: '#8F2D24',
    fontSize: 12,
    lineHeight: 17,
  },
  restaurantRetryText: {
    color: '#464B29',
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLarge: {
    backgroundColor: palette.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  bookTableButton: {
    backgroundColor: palette.dark,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: palette.line,
  },
  secondaryButtonText: {
    fontWeight: '700',
    color: palette.dark,
  },
  detailsSheetWrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  detailsSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  detailsContent: {
    paddingBottom: 28,
  },
  detailsHeroImage: {
    height: 260,
    width: '100%',
  },
  detailsHeaderRow: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.line,
  },
  detailsTitle: {
    marginTop: 18,
    marginHorizontal: spacing.lg,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: palette.dark,
  },
  detailsMeta: {
    marginTop: 6,
    marginHorizontal: spacing.lg,
    fontSize: 14,
    color: palette.darkMuted,
  },
  metaRowExtended: {
    marginTop: 10,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoGrid: {
    marginTop: 18,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hoursList: {
    marginHorizontal: spacing.lg,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  hoursRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F0',
  },
  hoursDay: {
    color: palette.dark,
    fontSize: 12,
    fontWeight: '700',
  },
  hoursValue: {
    color: palette.darkMuted,
    fontSize: 12,
  },
  infoPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  infoPillText: {
    color: palette.dark,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 20,
    marginHorizontal: spacing.lg,
    fontSize: 16,
    fontWeight: '700',
    color: palette.dark,
  },
  descriptionText: {
    marginHorizontal: spacing.lg,
    marginTop: 8,
    fontSize: 14,
    color: palette.darkMuted,
    lineHeight: 22,
  },
  contactRow: {
    marginHorizontal: spacing.lg,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    color: palette.primary,
    fontWeight: '700',
  },
  actionRow: {
    marginHorizontal: spacing.lg,
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  menuWrap: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  menuHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    backgroundColor: '#FFFFFF',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.dark,
  },
  menuContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  menuEmpty: {
    paddingVertical: 24,
    color: palette.darkMuted,
    textAlign: 'center',
  },
  menuSection: {
    marginBottom: 18,
  },
  menuSectionTitle: {
    fontSize: 12,
    letterSpacing: 1.1,
    fontWeight: '800',
    color: palette.darkMuted,
    marginBottom: 12,
  },
  menuItemRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 10,
    marginBottom: 10,
  },
  menuItemImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  menuItemBody: {
    flex: 1,
    marginLeft: 10,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.dark,
  },
  menuItemDescription: {
    fontSize: 12,
    color: palette.darkMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  menuItemPrice: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: palette.dark,
  },
  menuItemAvailability: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  menuAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  menuAddText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
  },
  addSheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  addSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: 36,
  },
  addTitle: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: palette.dark,
    letterSpacing: 1,
  },
  addSubTitle: {
    color: palette.darkMuted,
    marginTop: 8,
    fontSize: 14,
    marginBottom: 16,
  },
  tripOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  tripOptionActive: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  tripOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.dark,
  },
  tripOptionMeta: {
    fontSize: 12,
    color: palette.darkMuted,
    marginTop: 3,
  },
  formLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontWeight: '700',
    color: palette.dark,
    fontSize: 13,
  },
  formInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    minWidth: 68,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#FFFFFF',
  },
  slotChipActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  slotChipText: {
    color: palette.dark,
    fontSize: 12,
    fontWeight: '700',
  },
  slotChipTextActive: {
    color: palette.primary,
  },
  availabilityMessage: {
    paddingVertical: 8,
    color: palette.darkMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  formText: {
    color: palette.dark,
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: palette.line,
  },
  participantChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  participantChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.dark,
  },
  participantChipTextActive: {
    color: '#FFFFFF',
  },
  expenseSummary: {
    backgroundColor: '#F7F7F4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    marginTop: 20,
  },
  expenseLabel: {
    fontWeight: '700',
    color: palette.dark,
    fontSize: 13,
  },
  expenseAmount: {
    fontSize: 28,
    color: palette.dark,
    fontWeight: '800',
    marginTop: 6,
  },
  expenseMeta: {
    marginTop: 6,
    fontSize: 12,
    color: palette.darkMuted,
  },
});
