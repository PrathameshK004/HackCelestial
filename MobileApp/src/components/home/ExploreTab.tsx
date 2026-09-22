/**
 * ExploreTab — Exact 1:1 Visual & Functional Match to WebApp Explore Page
 * Editorial Alabaster & Cream luxury styling, Stacked Depth Hero Card,
 * 2x2 Grid, Curated List, Segmented View Switcher, Category Pills,
 * Active Flight Ticket Ledgers, and Full Stay Detail Modal with SVG Circular Gauges.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  Building,
  Home,
  Palmtree,
  Tent,
  Star,
  MapPin,
  Users,
  Heart,
  ArrowRight,
  ArrowLeft,
  Footprints,
  Utensils,
  Moon,
  Plane,
  Plus,
  Compass,
  CheckCircle2,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { useTrips } from '../../context/TripContext';

export interface CuratedStay {
  id: string;
  name: string;
  type: string;
  category: 'hotel' | 'villa' | 'resort' | 'camping';
  destination: string;
  dateRange: string;
  guests: number;
  matchScore: number;
  rating: number;
  pricePerNight: number;
  totalNights: number;
  style: string;
  distance: string;
  featured?: boolean;
  image: string;
  altImages: string[];
  metrics: {
    walk: number;
    food: number;
    activity: number;
  };
  whyMatched: {
    icon: 'walk' | 'food' | 'quiet';
    title: string;
    description: string;
  }[];
}

export const CURATED_STAYS: CuratedStay[] = [
  {
    id: 'stay-oasis',
    name: 'Oasis',
    type: 'Villa',
    category: 'villa',
    destination: 'San Francisco',
    dateRange: 'Jun 15-22',
    guests: 5,
    matchScore: 95,
    rating: 4.96,
    pricePerNight: 280,
    totalNights: 7,
    style: 'Modern Minimalist',
    distance: '0.5 km',
    featured: true,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    altImages: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
    ],
    metrics: { walk: 94, food: 96, activity: 88 },
    whyMatched: [
      {
        icon: 'walk',
        title: 'Central location near Golden Gate parks',
        description: 'Direct cycling route and cable car access within 400m',
      },
      {
        icon: 'food',
        title: 'Artisanal bakeries & cafes nearby',
        description: 'Top-rated breakfast spots and organic roasters within 3 minutes',
      },
      {
        icon: 'quiet',
        title: 'Hillside retreat with sunset views',
        description: 'Sound-insulated architecture with private terrace garden',
      },
    ],
  },
  {
    id: 'stay-cozy-den',
    name: 'Cozy Den',
    type: 'Hotel',
    category: 'hotel',
    destination: 'Barcelona',
    dateRange: 'Jun 15-22',
    guests: 2,
    matchScore: 91,
    rating: 4.78,
    pricePerNight: 146,
    totalNights: 7,
    style: 'Boutique',
    distance: '0.3 km',
    featured: true,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    altImages: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80',
    ],
    metrics: { walk: 91, food: 91, activity: 91 },
    whyMatched: [
      {
        icon: 'walk',
        title: 'Walkable to your saved spots',
        description: '4 of your wishlist places and Gothic Quarter within 800m',
      },
      {
        icon: 'food',
        title: 'Food scene fits your trips',
        description: 'Matches tapas & wine bars you rated in Lisbon & Rome',
      },
      {
        icon: 'quiet',
        title: 'Quiet area, like your last 3 stays',
        description: 'Residential pedestrian alleyway with low night noise',
      },
    ],
  },
  {
    id: 'stay-garden-escape',
    name: 'Garden Escape',
    type: 'House',
    category: 'villa',
    destination: 'Provence',
    dateRange: 'Jun 15-22',
    guests: 3,
    matchScore: 87,
    rating: 4.89,
    pricePerNight: 132,
    totalNights: 7,
    style: 'Coastal',
    distance: '1.2 km',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
    altImages: [],
    metrics: { walk: 85, food: 89, activity: 84 },
    whyMatched: [
      {
        icon: 'walk',
        title: 'Lush botanical garden proximity',
        description: 'Surrounded by lavender fields and centuries-old olive groves',
      },
      {
        icon: 'food',
        title: 'Local winery tours and organic markets',
        description: 'Farm-to-table dining and olive oil tasting at your doorstep',
      },
      {
        icon: 'quiet',
        title: 'Private estate with solar heated pool',
        description: 'Zero road noise and crystal clear stargazing night skies',
      },
    ],
  },
  {
    id: 'stay-coastal-villa',
    name: 'Coastal Villa',
    type: 'Resort',
    category: 'resort',
    destination: 'Santorini',
    dateRange: 'Jun 15-22',
    guests: 4,
    matchScore: 83,
    rating: 4.62,
    pricePerNight: 195,
    totalNights: 7,
    style: 'Mediterranean',
    distance: '0.8 km',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    altImages: [],
    metrics: { walk: 82, food: 88, activity: 90 },
    whyMatched: [
      {
        icon: 'walk',
        title: 'Direct cliff path to private bay',
        description: 'Private stone staircase down to crystal blue waters',
      },
      {
        icon: 'food',
        title: 'Fresh seafood taverns on the pier',
        description: 'Matched with your Mediterranean seafood favorites',
      },
      {
        icon: 'quiet',
        title: 'Panoramic Aegean sea horizon',
        description: 'Private infinity plunge pool facing the iconic caldera sunset',
      },
    ],
  },
  {
    id: 'stay-wilderness-escape',
    name: 'Wilderness Escape',
    type: 'Camping',
    category: 'camping',
    destination: 'Banff',
    dateRange: 'Jun 15-22',
    guests: 2,
    matchScore: 79,
    rating: 4.94,
    pricePerNight: 120,
    totalNights: 7,
    style: 'Classic Eco-Yurt',
    distance: '2.0 km',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
    altImages: [],
    metrics: { walk: 90, food: 74, activity: 96 },
    whyMatched: [
      {
        icon: 'walk',
        title: 'Trailhead at your doorstep',
        description: 'Direct access to Alpine ridges and turquoise glacial lakes',
      },
      {
        icon: 'food',
        title: 'Woodfired cooking & campfire grill',
        description: 'Artisanal local provisions delivered daily in timber hampers',
      },
      {
        icon: 'quiet',
        title: 'Pure silence under pine canopy',
        description: 'Off-grid comfort with woodburning stove and heated sheepskins',
      },
    ],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All options', icon: Building },
  { id: 'hotel', label: 'Hotel', icon: Building },
  { id: 'villa', label: 'Villa', icon: Home },
  { id: 'resort', label: 'Resort', icon: Palmtree },
  { id: 'camping', label: 'Camping', icon: Tent },
];

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

// Circular Progress SVG Component (2 * PI * 15.9155 ≈ 100 circumference)
const CircularGauge: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const radius = 15.9155;
  const strokeWidth = 3.5;
  const circumference = 100;
  const strokeDashoffset = circumference - (circumference * score) / 100;

  return (
    <View style={styles.gaugeItem}>
      <View style={styles.gaugeSvgWrap}>
        <Svg width={28} height={28} viewBox="0 0 36 36">
          <Circle
            cx="18"
            cy="18"
            r={radius}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx="18"
            cy="18"
            r={radius}
            stroke="#E5EC68"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform="rotate(-90 18 18)"
          />
        </Svg>
      </View>
      <View style={styles.gaugeTextCol}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <Text style={styles.gaugeVal}>{score}%</Text>
      </View>
    </View>
  );
};

interface ExploreTabProps {
  searchQuery?: string;
  onSelectTrip?: (tripId: string) => void;
  onCreateTrip?: () => void;
  onRefresh?: () => Promise<void> | void;
}

export const ExploreTab: React.FC<ExploreTabProps> = ({
  searchQuery = '',
  onSelectTrip,
  onCreateTrip,
  onRefresh,
}) => {
  const { trips, refreshTrips } = useTrips();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTrips();
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.warn('Refresh error in ExploreTab:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Strictly deduplicate trips by ID to guarantee zero redundant cards in explore tab
  const uniqueTrips = useMemo(() => {
    const seen = new Set<string>();
    const res: typeof trips = [];
    for (const t of trips) {
      if (t && t.id && !seen.has(t.id)) {
        seen.add(t.id);
        res.push(t);
      }
    }
    return res;
  }, [trips]);

  // Navigation & View States
  const [viewMode, setViewMode] = useState<'gallery' | 'list' | 'map'>('gallery');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedStay, setSelectedStay] = useState<CuratedStay | null>(null);
  const [savedStayIds, setSavedStayIds] = useState<string[]>(['stay-cozy-den', 'stay-oasis']);
  const [isReserved, setIsReserved] = useState(false);

  // Toggle Save Stay
  const toggleSaveStay = (id: string) => {
    setSavedStayIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filter Stays
  const filteredStays = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CURATED_STAYS.filter((stay) => {
      const matchCat = activeCategory === 'all' || stay.category === activeCategory;
      const matchQuery =
        q === '' ||
        stay.name.toLowerCase().includes(q) ||
        stay.destination.toLowerCase().includes(q) ||
        stay.type.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  const featuredStay = filteredStays[0] || CURATED_STAYS[0];
  const gridMatches = filteredStays.slice(1, 5);

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#464B29', '#059669']}
            tintColor="#464B29"
          />
        }
      >
        {/* Curated Header Info */}
        <View style={styles.curatedHeader}>
          <Text style={styles.curatedTitle}>
            {filteredStays.length} curated picks
          </Text>
          <View style={styles.curatedMetaRow}>
            <Text style={styles.curatedMetaText}>San Francisco</Text>
            <Text style={styles.curatedMetaDot}>·</Text>
            <Text style={styles.curatedMetaText}>Jun 15-22</Text>
            <Text style={styles.curatedMetaDot}>·</Text>
            <Text style={styles.curatedMetaText}>2 guests</Text>
          </View>
        </View>

        {/* View Segmented Switcher: Map | Gallery | List */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'map' && styles.segmentBtnActive]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentBtnText,
                viewMode === 'map' && styles.segmentBtnTextActive,
              ]}
            >
              Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'gallery' && styles.segmentBtnActive]}
            onPress={() => setViewMode('gallery')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentBtnText,
                viewMode === 'gallery' && styles.segmentBtnTextActive,
              ]}
            >
              Gallery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'list' && styles.segmentBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentBtnText,
                viewMode === 'list' && styles.segmentBtnTextActive,
              ]}
            >
              List
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter Pills Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsBar}
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.75}
              >
                <Icon size={14} color={isActive ? '#FFFFFF' : '#585952'} />
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ---------------- VIEW MODE: GALLERY ---------------- */}
        {viewMode === 'gallery' && (
          <View style={styles.galleryViewWrapper}>
            {/* Stacked Featured Hero Card with Depth Layer */}
            <View style={styles.heroStackWrapper}>
              {/* Back depth layer */}
              <View style={styles.heroStackBackCard}>
                <Image
                  source={{ uri: CURATED_STAYS[1]?.image || featuredStay.image }}
                  style={styles.heroBackImg}
                />
                <View style={styles.heroBackOverlay} />
              </View>

              {/* Main Featured Hero Card */}
              <TouchableOpacity
                style={styles.heroFeaturedCard}
                onPress={() => setSelectedStay(featuredStay)}
                activeOpacity={0.92}
              >
                <Image source={{ uri: featuredStay.image }} style={styles.heroCardImg} />
                <View style={styles.heroCardOverlay}>
                  {/* Top Badges */}
                  <View style={styles.heroCardTopBadges}>
                    <View style={styles.badgesGroupLeft}>
                      <View style={styles.featuredBadge}>
                        <Text style={styles.badgeTextDark}>Featured</Text>
                      </View>
                      <View style={styles.matchBadge}>
                        <Text style={styles.badgeTextDark}>
                          {featuredStay.matchScore}% Match
                        </Text>
                      </View>
                    </View>

                    <View style={styles.starRatingBadge}>
                      <Star size={14} color="#FFFFFF" fill="#FFFFFF" />
                      <Text style={styles.starRatingText}>{featuredStay.rating}</Text>
                    </View>
                  </View>

                  {/* Bottom Info */}
                  <View style={styles.heroCardBottomInfo}>
                    <Text style={styles.heroCardTitle}>{featuredStay.name}</Text>
                    <Text style={styles.heroCardSub}>
                      {featuredStay.destination} · {featuredStay.type} · $
                      {featuredStay.pricePerNight}/night
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Section Header: More matches for you */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionSerifTitle}>More matches for you</Text>
              <Text style={styles.sectionCounterBadge}>
                {gridMatches.length} of {CURATED_STAYS.length}
              </Text>
            </View>

            {/* 2x2 Matches Grid */}
            <View style={styles.matchesGrid}>
              {gridMatches.map((stay) => (
                <TouchableOpacity
                  key={stay.id}
                  style={styles.matchGridCard}
                  onPress={() => setSelectedStay(stay)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: stay.image }} style={styles.matchGridImg} />
                  <View style={styles.matchGridOverlay}>
                    <View style={styles.matchGridTopBadges}>
                      <View style={styles.matchBadgeMini}>
                        <Text style={styles.badgeTextDarkMini}>
                          {stay.matchScore}%
                        </Text>
                      </View>
                      <View style={styles.starRatingBadgeMini}>
                        <Star size={11} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.starRatingTextMini}>{stay.rating}</Text>
                      </View>
                    </View>

                    <View style={styles.matchGridBottom}>
                      <Text style={styles.matchGridTitle} numberOfLines={1}>
                        {stay.name}
                      </Text>
                      <Text style={styles.matchGridPrice}>
                        ${stay.pricePerNight}/night
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* View More Pill Button */}
            <TouchableOpacity
              style={styles.btnViewMorePill}
              onPress={() => setViewMode('list')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnViewMoreText}>
                View More · {CURATED_STAYS.length} Total Picks
              </Text>
              <ArrowRight size={16} color="#181916" />
            </TouchableOpacity>
          </View>
        )}

        {/* ---------------- VIEW MODE: LIST ---------------- */}
        {viewMode === 'list' && (
          <View style={styles.listViewWrapper}>
            {/* Curated User Banner */}
            <View style={styles.curatedUserBanner}>
              <View style={styles.curatedAvatarCircle}>
                <Text style={styles.curatedAvatarText}>P</Text>
              </View>
              <View style={styles.curatedUserText}>
                <Text style={styles.curatedUserTitle}>
                  Your <Text style={styles.curatedUserTitleItalic}>twelve</Text> curated picks
                </Text>
                <Text style={styles.curatedUserSubtitle}>
                  Based on your trip preferences
                </Text>
              </View>
            </View>

            {/* Curated List Container */}
            <View style={styles.curatedListContainer}>
              {filteredStays.map((stay) => (
                <TouchableOpacity
                  key={stay.id}
                  style={styles.curatedListItem}
                  onPress={() => setSelectedStay(stay)}
                  activeOpacity={0.88}
                >
                  <View style={styles.curatedItemLeft}>
                    <Image source={{ uri: stay.image }} style={styles.curatedItemThumb} />
                    <View style={styles.curatedItemDetails}>
                      <Text style={styles.curatedItemTitle} numberOfLines={1}>
                        {stay.name}
                      </Text>
                      <View style={styles.curatedItemMeta}>
                        <View style={styles.metaChipRow}>
                          <Home size={12} color="#585952" />
                          <Text style={styles.metaChipText}>{stay.type}</Text>
                        </View>
                        <Text style={styles.metaChipDot}>·</Text>
                        <View style={styles.metaChipRow}>
                          <Users size={12} color="#585952" />
                          <Text style={styles.metaChipText}>{stay.guests} PAX</Text>
                        </View>
                        <Text style={styles.metaChipDot}>·</Text>
                        <Text style={styles.metaChipText}>
                          {stay.pricePerNight > 150 ? '$$$' : '$$'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.curatedItemRight}>
                    <View style={styles.matchBadge}>
                      <Text style={styles.badgeTextDark}>{stay.matchScore}% Match</Text>
                    </View>
                    <View style={styles.listRatingRow}>
                      <Star size={12} color="#181916" fill="#181916" />
                      <Text style={styles.listRatingText}>{stay.rating}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ---------------- VIEW MODE: MAP ---------------- */}
        {viewMode === 'map' && (
          <View style={styles.mapCardPlaceholder}>
            <View style={styles.mapIconCircle}>
              <MapPin size={34} color="#464B29" />
            </View>
            <Text style={styles.mapTitle}>Interactive Destination Map</Text>
            <Text style={styles.mapSub}>
              Showing curated stays with match ratings across San Francisco, Barcelona, Provence & Santorini.
            </Text>

            {/* Destination summary pills */}
            <View style={styles.mapPillsRow}>
              <View style={styles.mapCityPill}>
                <Text style={styles.mapCityText}>San Francisco (5)</Text>
              </View>
              <View style={styles.mapCityPill}>
                <Text style={styles.mapCityText}>Barcelona (3)</Text>
              </View>
              <View style={styles.mapCityPill}>
                <Text style={styles.mapCityText}>Provence (2)</Text>
              </View>
              <View style={styles.mapCityPill}>
                <Text style={styles.mapCityText}>Santorini (2)</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.btnReturnGallery}
              onPress={() => setViewMode('gallery')}
              activeOpacity={0.85}
            >
              <Compass size={16} color="#FFFFFF" />
              <Text style={styles.btnReturnGalleryText}>Return to Curated Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ---------------- ACTIVE GROUP LEDGERS SECTION ---------------- */}
        <View style={styles.activeLedgersSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionSerifTitle}>Active Group Ledgers</Text>
              <Text style={styles.sectionSubMuted}>
                Instant debt minimization and UPI expense splitting
              </Text>
            </View>
            {onCreateTrip && (
              <TouchableOpacity
                style={styles.btnNewGroup}
                onPress={onCreateTrip}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#181916" />
                <Text style={styles.btnNewGroupText}>New Group</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Ticket Flight Cards */}
          {uniqueTrips.length === 0 ? (
            <View style={styles.emptyLedgersCard}>
              <Text style={styles.emptyLedgersText}>
                No active travel groups yet. Create a trip or join with an invite code.
              </Text>
            </View>
          ) : (
            uniqueTrips.map((group) => {
              const isSettled = group.status === 'completed';
              const originCode = (group.destination || 'SFO')
                .slice(0, 3)
                .toUpperCase();
              const travelersCount = group.members?.length || 2;

              return (
                <TouchableOpacity
                  key={group.id}
                  style={styles.ticketRouteCard}
                  onPress={() => onSelectTrip && onSelectTrip(group.id)}
                  activeOpacity={0.88}
                >
                  {/* Route Nodes Row */}
                  <View style={styles.routeNodesRow}>
                    <View style={styles.routeNode}>
                      <Text style={styles.routeNodeCode}>{originCode}</Text>
                      <Text style={styles.routeNodeSub}>{group.destination}</Text>
                    </View>

                    <View style={styles.routeConnector}>
                      <View style={styles.routeDottedLine} />
                      <View style={styles.routePlaneBadge}>
                        <Plane size={13} color="#464B29" />
                      </View>
                    </View>

                    <View style={[styles.routeNode, { alignItems: 'flex-end' }]}>
                      <Text style={styles.routeNodeCode}>{travelersCount} PAX</Text>
                      <Text style={styles.routeNodeSub}>Travelers</Text>
                    </View>
                  </View>

                  {/* Route Meta Row */}
                  <View style={styles.routeMetaRow}>
                    <View>
                      <Text style={styles.metaTimeBold}>{group.name}</Text>
                      <Text style={styles.metaDateSub}>
                        {group.createdAt
                          ? new Date(group.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Jun 15'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.metaTimeBold,
                          isSettled ? styles.textEmerald : styles.textAmber,
                        ]}
                      >
                        {isSettled ? 'Settled' : 'Active Split'}
                      </Text>
                      <Text style={styles.metaDateSub}>{group.currency} Ledger</Text>
                    </View>
                  </View>

                  {/* Ticket Bottom Pill */}
                  <View style={styles.ticketBottomPill}>
                    <View style={styles.ticketProviderInfo}>
                      <View style={styles.providerIconBadge}>
                        <Text style={styles.providerBadgeText}>
                          {(group.destination || 'G').slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.providerName}>{group.name}</Text>
                        <Text style={styles.providerTag}>
                          {isSettled ? 'Completed Trip' : 'Balanced Split'}
                        </Text>
                      </View>
                    </View>
                    <ArrowRight size={15} color="#8E8F87" />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Extra spacing for floating bottom dock */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* =========================================================================
          STAY DETAIL MODAL VIEW (Exact WebApp Detail Experience)
          ========================================================================= */}
      <Modal
        visible={!!selectedStay}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedStay(null)}
      >
        {selectedStay && (
          <View style={styles.detailScreenContainer}>
            <ScrollView
              style={styles.detailScrollView}
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Stay Hero Detail Card */}
              <View style={styles.stayHeroDetailWrapper}>
                <Image
                  source={{ uri: selectedStay.image }}
                  style={styles.stayHeroBgImg}
                />
                <View style={styles.stayHeroGradient} />

                {/* Top Nav on Hero */}
                <View style={styles.stayHeroNav}>
                  <TouchableOpacity
                    style={styles.btnHeroNavBack}
                    onPress={() => setSelectedStay(null)}
                    activeOpacity={0.8}
                  >
                    <ArrowLeft size={22} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.heroBrandRow}>
                    <View style={styles.heroBrandDot} />
                    <Text style={styles.stayHeroNavTitle}>Triptual</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.btnHeroNavHeart}
                    onPress={() => toggleSaveStay(selectedStay.id)}
                    activeOpacity={0.85}
                  >
                    <Heart
                      size={18}
                      fill={savedStayIds.includes(selectedStay.id) ? '#E11D48' : 'none'}
                      color={savedStayIds.includes(selectedStay.id) ? '#E11D48' : '#181916'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Center Content on Hero */}
                <View style={styles.stayHeroCenterContent}>
                  <View style={styles.stayHeroAvatarBadge}>
                    <Text style={styles.stayHeroAvatarText}>
                      {selectedStay.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.stayHeroKicker}>Your perfect place</Text>
                  <Text style={styles.stayHeroMeta}>
                    {selectedStay.destination} · {selectedStay.dateRange} ·{' '}
                    {selectedStay.guests} guests
                  </Text>
                  <View style={styles.stayHeroNameWrap}>
                    <MapPin size={22} color="#E5EC68" fill="#E5EC68" />
                    <Text style={styles.stayHeroName}>{selectedStay.name}</Text>
                  </View>
                </View>

                {/* Circular Match Progress Rings (SVG) */}
                <View style={styles.circularGaugesRow}>
                  <CircularGauge label="Walk" score={selectedStay.metrics.walk} />
                  <View style={styles.gaugeDivider} />
                  <CircularGauge label="Food" score={selectedStay.metrics.food} />
                  <View style={styles.gaugeDivider} />
                  <CircularGauge label="Activity" score={selectedStay.metrics.activity} />
                </View>
              </View>

              {/* Bottom Sheet Card Details */}
              <View style={styles.detailSheetCard}>
                {/* Compare Alternatives Matrix */}
                <View style={styles.compareMatrixWrapper}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionSerifTitle}>Compare Alternatives</Text>
                    <Text style={styles.sectionCounterBadge}>3/12</Text>
                  </View>

                  <View style={styles.compareTable}>
                    {/* Header with Thumbnails */}
                    <View style={styles.compareRowHeader}>
                      <View style={{ flex: 1 }} />
                      <View style={[styles.compareCol, styles.compareColActive]}>
                        <Image
                          source={{ uri: selectedStay.image }}
                          style={[styles.compareThumb, styles.compareThumbActive]}
                        />
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Selected</Text>
                        </View>
                      </View>
                      <View style={styles.compareCol}>
                        <Image
                          source={{ uri: CURATED_STAYS[1]?.image }}
                          style={styles.compareThumb}
                        />
                        <View style={styles.altBadge}>
                          <Text style={styles.altBadgeText}>Alt 1</Text>
                        </View>
                      </View>
                      <View style={styles.compareCol}>
                        <Image
                          source={{ uri: CURATED_STAYS[2]?.image }}
                          style={styles.compareThumb}
                        />
                        <View style={styles.altBadge}>
                          <Text style={styles.altBadgeText}>Alt 2</Text>
                        </View>
                      </View>
                    </View>

                    {/* Row 1: Match */}
                    <View style={styles.compareDataRow}>
                      <Text style={styles.compareLabel}>Match</Text>
                      <View style={[styles.compareValCol, styles.compareColActive]}>
                        <View style={styles.matchBadgeMicro}>
                          <Text style={styles.matchBadgeMicroText}>
                            {selectedStay.matchScore}%
                          </Text>
                        </View>
                      </View>
                      <View style={styles.compareValCol}>
                        <Text style={styles.compareValText}>85%</Text>
                      </View>
                      <View style={styles.compareValCol}>
                        <Text style={styles.compareValText}>81%</Text>
                      </View>
                    </View>

                    {/* Row 2: Price */}
                    <View style={styles.compareDataRow}>
                      <Text style={styles.compareLabel}>Price</Text>
                      <View style={[styles.compareValCol, styles.compareColActive]}>
                        <Text style={styles.compareValBold}>
                          ${selectedStay.pricePerNight}
                        </Text>
                      </View>
                      <View style={styles.compareValCol}>
                        <Text style={styles.compareValText}>$132</Text>
                      </View>
                      <View style={styles.compareValCol}>
                        <Text style={styles.compareValText}>$120</Text>
                      </View>
                    </View>

                    {/* Row 3: Style */}
                    <View style={styles.compareDataRow}>
                      <Text style={styles.compareLabel}>Style</Text>
                      <View style={[styles.compareValCol, styles.compareColActive]}>
                        <Text style={styles.compareValText} numberOfLines={1}>
                          {selectedStay.style}
                        </Text>
                      </View>
                      <View style={styles.compareValCol}>
                        <Text style={styles.compareValText}>Coastal</Text>
                      </View>
                      <View style={styles.compareValCol}>
                        <Text style={styles.compareValText}>Classic</Text>
                      </View>
                    </View>

                    {/* Row 4: Location */}
                    <View style={styles.compareDataRow}>
                      <Text style={styles.compareLabel}>Location</Text>
                      <View style={[styles.compareValCol, styles.compareColActive]}>
                        <Text style={styles.compareValText}>{selectedStay.distance}</Text>
                      </View>
                      <View style={styles.compareValCol}>
                        <Text style={styles.compareValText}>1.2 km</Text>
                      </View>
                      <View style={styles.compareValCol}>
                        <Text style={styles.compareValText}>2.0 km</Text>
                      </View>
                    </View>

                    {/* Row 5: Reviews */}
                    <View style={styles.compareDataRowLast}>
                      <Text style={styles.compareLabel}>Reviews</Text>
                      <View style={[styles.compareValCol, styles.compareColActive]}>
                        <Text style={styles.compareValBold}>★ {selectedStay.rating}</Text>
                      </View>
                      <View style={styles.compareValCol}>
                        <Text style={styles.compareValText}>★ 4.89</Text>
                      </View>
                      <View style={styles.compareValCol}>
                        <Text style={styles.compareValText}>★ 4.94</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Why We Matched You Section */}
                <View style={styles.whyMatchedSection}>
                  <Text style={styles.sectionSerifTitle}>Why we matched you</Text>
                  <View style={styles.whyMatchedList}>
                    {selectedStay.whyMatched.map((item, idx) => (
                      <View key={idx} style={styles.whyMatchedItem}>
                        <View style={styles.whyMatchedIconBox}>
                          {item.icon === 'walk' && (
                            <Footprints size={17} color="#464B29" />
                          )}
                          {item.icon === 'food' && (
                            <Utensils size={17} color="#464B29" />
                          )}
                          {item.icon === 'quiet' && <Moon size={17} color="#464B29" />}
                        </View>
                        <View style={styles.whyMatchedTextCol}>
                          <Text style={styles.whyMatchedTitle}>{item.title}</Text>
                          <Text style={styles.whyMatchedDesc}>{item.description}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Sticky Action Bar */}
                <View style={styles.stickyActionBar}>
                  <View style={styles.stickyActionHeaderRow}>
                    <View>
                      <Text style={styles.priceMain}>
                        ${selectedStay.pricePerNight}
                        <Text style={styles.pricePeriod}>/night</Text>
                      </Text>
                      <Text style={styles.priceSub}>
                        ${selectedStay.pricePerNight * selectedStay.totalNights} total ·{' '}
                        {selectedStay.totalNights} nights
                      </Text>
                    </View>

                    <View style={styles.stickyRatingPill}>
                      <Star size={13} color="#464B29" fill="#E5EC68" />
                      <Text style={styles.stickyRatingText}>{selectedStay.rating}</Text>
                      <Text style={styles.stickyRatingDot}>·</Text>
                      <Text style={styles.stickyMatchText}>
                        {selectedStay.matchScore}% Match
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stickyActionBtnsGroup}>
                    {onCreateTrip && (
                      <TouchableOpacity
                        style={styles.btnActionLedger}
                        onPress={() => {
                          setSelectedStay(null);
                          onCreateTrip();
                        }}
                        activeOpacity={0.8}
                      >
                        <Users size={15} color="#464B29" />
                        <Text style={styles.btnActionLedgerText}>
                          Create Trip Ledger
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.btnActionReserve}
                      onPress={() => {
                        setIsReserved(true);
                        Alert.alert(
                          'Booking Confirmed!',
                          `Reservation secured for ${selectedStay.name} in ${selectedStay.destination} (${selectedStay.dateRange}).`,
                          [{ text: 'Great!', onPress: () => setSelectedStay(null) }]
                        );
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.btnActionReserveText}>Reserve</Text>
                      <ArrowRight size={15} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Curated Header */
  curatedHeader: {
    marginBottom: 14,
  },
  curatedTitle: {
    fontFamily: serifFont,
    fontSize: 22,
    fontWeight: '600',
    color: '#181916',
    letterSpacing: -0.3,
  },
  curatedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  curatedMetaText: {
    fontSize: 13,
    color: '#585952',
    fontWeight: '400',
  },
  curatedMetaDot: {
    fontSize: 13,
    color: '#8E8F87',
  },

  /* Segmented Control Switcher */
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F0EDE5',
    borderRadius: radii.full,
    padding: 3.5,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  segmentBtnActive: {
    backgroundColor: '#D9C9A5',
    ...shadows.sm,
  },
  segmentBtnText: {
    fontSize: 13,
    color: '#585952',
    fontWeight: '500',
  },
  segmentBtnTextActive: {
    color: '#181916',
    fontWeight: '700',
  },

  /* Category Pills */
  categoryPillsBar: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#EFECE6',
    gap: 6,
    ...shadows.sm,
  },
  categoryPillActive: {
    backgroundColor: '#464B29',
    borderColor: '#464B29',
  },
  categoryPillText: {
    fontSize: 12.5,
    color: '#585952',
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* GALLERY VIEW */
  galleryViewWrapper: {},

  /* Stacked Hero Card */
  heroStackWrapper: {
    position: 'relative',
    marginBottom: 24,
    paddingTop: 10,
  },
  heroStackBackCard: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#3B382F',
    overflow: 'hidden',
    opacity: 0.9,
    transform: [{ scale: 0.95 }, { translateY: -4 }],
    zIndex: 1,
  },
  heroBackImg: {
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  heroBackOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(46, 51, 27, 0.45)',
  },
  heroFeaturedCard: {
    position: 'relative',
    zIndex: 2,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    height: 310,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...shadows.lg,
  },
  heroCardImg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  heroCardOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'space-between',
    padding: 16,
  },
  heroCardTopBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgesGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  featuredBadge: {
    backgroundColor: '#E8EE72',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: radii.full,
    ...shadows.sm,
  },
  matchBadge: {
    backgroundColor: '#E5EC68',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: radii.full,
    ...shadows.sm,
  },
  badgeTextDark: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1C12',
  },
  starRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  starRatingText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  heroCardBottomInfo: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    marginHorizontal: -16,
    marginBottom: -16,
    padding: 16,
    paddingTop: 12,
  },
  heroCardTitle: {
    fontFamily: serifFont,
    fontSize: 23,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroCardSub: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 2,
    fontWeight: '500',
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionSerifTitle: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '600',
    color: '#181916',
  },
  sectionCounterBadge: {
    fontSize: 12.5,
    color: '#8E8F87',
  },
  sectionSubMuted: {
    fontSize: 12,
    color: '#585952',
    marginTop: 2,
  },

  /* 2x2 Matches Grid */
  matchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  matchGridCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    ...shadows.sm,
  },
  matchGridImg: {
    width: '100%',
    height: '100%',
  },
  matchGridOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    justifyContent: 'space-between',
    padding: 10,
  },
  matchGridTopBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchBadgeMini: {
    backgroundColor: '#E5EC68',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radii.full,
  },
  badgeTextDarkMini: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A1C12',
  },
  starRatingBadgeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starRatingTextMini: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  matchGridBottom: {},
  matchGridTitle: {
    fontFamily: serifFont,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  matchGridPrice: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 1,
  },

  /* View More Pill */
  btnViewMorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E8E4DA',
    gap: 8,
    marginBottom: 26,
    ...shadows.sm,
  },
  btnViewMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#181916',
  },

  /* LIST VIEW */
  listViewWrapper: {
    marginBottom: 24,
  },
  curatedUserBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  curatedAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  curatedAvatarText: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '700',
    color: '#181916',
  },
  curatedUserText: {
    flex: 1,
  },
  curatedUserTitle: {
    fontFamily: serifFont,
    fontSize: 17,
    fontWeight: '600',
    color: '#181916',
  },
  curatedUserTitleItalic: {
    color: '#8E8F87',
    fontStyle: 'italic',
  },
  curatedUserSubtitle: {
    fontSize: 12,
    color: '#585952',
    marginTop: 2,
  },
  curatedListContainer: {
    gap: 12,
  },
  curatedListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
    ...shadows.sm,
  },
  curatedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  curatedItemThumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  curatedItemDetails: {
    flex: 1,
    gap: 4,
  },
  curatedItemTitle: {
    fontFamily: serifFont,
    fontSize: 15,
    fontWeight: '700',
    color: '#181916',
  },
  curatedItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaChipText: {
    fontSize: 11.5,
    color: '#585952',
    fontWeight: '500',
  },
  metaChipDot: {
    fontSize: 11,
    color: '#8E8F87',
  },
  curatedItemRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 8,
  },
  listRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  listRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#181916',
  },

  /* MAP VIEW */
  mapCardPlaceholder: {
    backgroundColor: '#F6F3EC',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginBottom: 24,
  },
  mapIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(70, 75, 41, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  mapTitle: {
    fontFamily: serifFont,
    fontSize: 19,
    fontWeight: '600',
    color: '#181916',
    marginBottom: 6,
  },
  mapSub: {
    fontSize: 12.5,
    color: '#585952',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
    marginBottom: 16,
  },
  mapPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  mapCityPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E8E4DA',
  },
  mapCityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#464B29',
  },
  btnReturnGallery: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#464B29',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.full,
    gap: 7,
    ...shadows.sm,
  },
  btnReturnGalleryText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* ACTIVE GROUP LEDGERS */
  activeLedgersSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  btnNewGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E8E4DA',
    gap: 4,
  },
  btnNewGroupText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#181916',
  },
  emptyLedgersCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
    alignItems: 'center',
  },
  emptyLedgersText: {
    fontSize: 12.5,
    color: '#585952',
    textAlign: 'center',
  },
  ticketRouteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFECE6',
    padding: 16,
    marginBottom: 14,
    ...shadows.sm,
  },
  routeNodesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  routeNode: {},
  routeNodeCode: {
    fontFamily: serifFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#181916',
  },
  routeNodeSub: {
    fontSize: 11,
    color: '#8E8F87',
    marginTop: 1,
  },
  routeConnector: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  routeDottedLine: {
    width: '100%',
    height: 1,
    borderWidth: 1,
    borderColor: '#E8E4DA',
    borderStyle: 'dashed',
  },
  routePlaneBadge: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF1E4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  routeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FAF8F5',
  },
  metaTimeBold: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#181916',
  },
  metaDateSub: {
    fontSize: 11,
    color: '#585952',
    marginTop: 1,
  },
  textEmerald: {
    color: '#059669',
  },
  textAmber: {
    color: '#D97706',
  },
  ticketBottomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F6F3EC',
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  ticketProviderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  providerIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#464B29',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  providerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#181916',
  },
  providerTag: {
    fontSize: 10,
    color: '#585952',
  },

  /* =========================================================================
     DETAIL MODAL STYLING
     ========================================================================= */
  detailScreenContainer: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  detailScrollView: {
    flex: 1,
  },
  detailScrollContent: {
    paddingBottom: 40,
  },
  stayHeroDetailWrapper: {
    position: 'relative',
    minHeight: 460,
    justifyContent: 'space-between',
    backgroundColor: '#181916',
  },
  stayHeroBgImg: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  stayHeroGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  stayHeroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  btnHeroNavBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBrandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5EC68',
  },
  stayHeroNavTitle: {
    fontFamily: serifFont,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  btnHeroNavHeart: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayHeroCenterContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
    marginVertical: 24,
  },
  stayHeroAvatarBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stayHeroAvatarText: {
    fontFamily: serifFont,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stayHeroKicker: {
    fontFamily: serifFont,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 3,
  },
  stayHeroMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
    marginBottom: 10,
  },
  stayHeroNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stayHeroName: {
    fontFamily: serifFont,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  /* Circular Gauges Row */
  circularGaugesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(24, 32, 26, 0.65)',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 10,
  },
  gaugeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  gaugeSvgWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeTextCol: {},
  gaugeLabel: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  gaugeVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gaugeDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  /* Detail Sheet Card */
  detailSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -16,
    padding: 20,
    ...shadows.md,
  },
  compareMatrixWrapper: {
    marginBottom: 24,
  },
  compareTable: {
    borderWidth: 1,
    borderColor: '#EFECE6',
    borderRadius: 16,
    overflow: 'hidden',
  },
  compareRowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
    backgroundColor: '#FAF8F5',
  },
  compareCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  compareColActive: {
    backgroundColor: 'rgba(70, 75, 41, 0.04)',
  },
  compareThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  compareThumbActive: {
    borderWidth: 2,
    borderColor: '#464B29',
  },
  currentBadge: {
    backgroundColor: '#EFF1E4',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.full,
  },
  currentBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#464B29',
  },
  altBadge: {
    backgroundColor: '#F6F3EC',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.full,
  },
  altBadgeText: {
    fontSize: 9.5,
    color: '#8E8F87',
  },
  compareDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
    paddingVertical: 8,
  },
  compareDataRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  compareLabel: {
    flex: 1,
    fontSize: 11.5,
    color: '#585952',
    fontWeight: '500',
    paddingLeft: 10,
  },
  compareValCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  compareValText: {
    fontSize: 11.5,
    color: '#585952',
  },
  compareValBold: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#181916',
  },
  matchBadgeMicro: {
    backgroundColor: '#E5EC68',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  matchBadgeMicroText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A1C12',
  },

  /* Why Matched Section */
  whyMatchedSection: {
    marginBottom: 24,
  },
  whyMatchedList: {
    marginTop: 10,
    gap: 12,
  },
  whyMatchedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
  },
  whyMatchedIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F6F3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyMatchedTextCol: {
    flex: 1,
  },
  whyMatchedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#181916',
    marginBottom: 2,
  },
  whyMatchedDesc: {
    fontSize: 11.5,
    color: '#585952',
    lineHeight: 16,
  },

  /* Sticky Action Bar */
  stickyActionBar: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#EFECE6',
    gap: 14,
  },
  stickyActionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceMain: {
    fontFamily: serifFont,
    fontSize: 20,
    fontWeight: '700',
    color: '#181916',
  },
  pricePeriod: {
    fontSize: 12.5,
    fontWeight: '400',
    color: '#585952',
  },
  priceSub: {
    fontSize: 11,
    color: '#8E8F87',
    marginTop: 1,
  },
  stickyRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F3EC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    gap: 4,
  },
  stickyRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#181916',
  },
  stickyRatingDot: {
    fontSize: 12,
    color: '#8E8F87',
  },
  stickyMatchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#464B29',
  },
  stickyActionBtnsGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  btnActionLedger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F3EC',
    paddingVertical: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E8E4DA',
    gap: 6,
  },
  btnActionLedgerText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#464B29',
  },
  btnActionReserve: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#464B29',
    paddingVertical: 12,
    borderRadius: radii.full,
    gap: 6,
    ...shadows.sm,
  },
  btnActionReserveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
