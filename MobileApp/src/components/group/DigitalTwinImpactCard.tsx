import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { DigitalTwinMapView } from './DigitalTwinMapView';
import {
  CloudRain,
  Droplets,
  Play,
  RotateCcw,
  Thermometer,
  Wind,
  MapPin,
  Radio,
  Navigation,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Layers,
  Sparkles,
  ChevronRight,
  Info,
  Search,
  X,
} from 'lucide-react-native';
import {
  digitalTwinService,
  DigitalTwinState,
  DigitalTwinEntity,
  DigitalTwinSocialSignal,
} from '../../api/digitalTwin.service';
import { colors } from '../../theme/colors';

interface Props {
  tripId: string;
}

type TabType = 'overview' | 'map' | 'signals' | 'simulation';

export const DigitalTwinImpactCard: React.FC<Props> = ({ tripId }) => {
  const [state, setState] = useState<DigitalTwinState | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Simulation controls
  const [rainfall, setRainfall] = useState(20);
  const [duration, setDuration] = useState(2);
  const [temperature, setTemperature] = useState(28);
  const [windSpeed, setWindSpeed] = useState(15);
  const [simulation, setSimulation] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Map state
  const mapRef = React.useRef<any>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [mapCategory, setMapCategory] = useState<'all' | 'transport' | 'attraction' | 'restaurant'>('all');

  // Dynamic place search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [customSearchedEntities, setCustomSearchedEntities] = useState<DigitalTwinEntity[] | null>(null);

  const executePlaceSearch = async (queryToSearch?: string, categoryToSearch?: string) => {
    const q = queryToSearch !== undefined ? queryToSearch : searchQuery;
    const cat = categoryToSearch !== undefined ? categoryToSearch : (mapCategory === 'all' ? undefined : mapCategory);
    const lat = liveLocation?.latitude || state?.weather?.location?.latitude;
    const lon = liveLocation?.longitude || state?.weather?.location?.longitude;
    if (!lat || !lon) return;

    setIsSearchingPlaces(true);
    try {
      const places = await digitalTwinService.searchNearbyPlaces(lat, lon, q, cat, state?.weather?.location?.name);
      setCustomSearchedEntities(places);
      if (places.length > 0) {
        handleSelectEntity(places[0]);
      }
    } catch (e) {
      console.warn('Place search failed:', e);
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  const resetPlaceSearch = () => {
    setSearchQuery('');
    setCustomSearchedEntities(null);
  };

  // Location
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied' | 'error'>('pending');

  const handleSelectEntity = (ent: DigitalTwinEntity) => {
    setSelectedEntityId(ent.id);
    if (mapRef.current && Number.isFinite(ent.latitude) && Number.isFinite(ent.longitude)) {
      mapRef.current.animateToRegion({
        latitude: ent.latitude,
        longitude: ent.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  const recenterGPS = () => {
    const targetLat = liveLocation?.latitude || location?.latitude;
    const targetLon = liveLocation?.longitude || location?.longitude;
    if (targetLat && targetLon && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: targetLat,
        longitude: targetLon,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      }, 500);
    }
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        let granted = permission.status === 'granted';

        if (!granted) {
          const request = await Location.requestForegroundPermissionsAsync();
          granted = request.status === 'granted';
        }

        if (!granted) {
          if (active) setLocationStatus('denied');
          return;
        }

        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) {
          setLiveLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          setLocationStatus('granted');
        }
      } catch {
        if (active) setLocationStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const fetchState = () => {
    setLoading(true);
    digitalTwinService
      .getState(tripId, liveLocation?.latitude, liveLocation?.longitude)
      .then((val) => {
        setState(val);
        if (val?.impact?.inputs?.temperature) {
          setTemperature(Math.round(val.impact.inputs.temperature));
        }
      })
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchState();
  }, [tripId, liveLocation?.latitude, liveLocation?.longitude]);

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await digitalTwinService.simulate(
        tripId,
        {
          rainfall,
          stormDuration: duration,
          temperature,
          windSpeed,
          weatherSeverity: 1,
        },
        liveLocation?.latitude,
        liveLocation?.longitude
      );
      setSimulation(res);
      setActiveTab('simulation');
    } catch (err) {
      console.warn('Simulation failed', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const resetSimulation = () => {
    setSimulation(null);
    setRainfall(20);
    setDuration(2);
    if (state?.impact?.inputs?.temperature) {
      setTemperature(Math.round(state.impact.inputs.temperature));
    }
  };

  if (loading) {
    return (
      <View style={styles.cardContainer}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary600} size="small" />
          <Text style={styles.loadingText}>Synthesizing Live Weather & Digital Twin...</Text>
        </View>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={[styles.cardContainer, { backgroundColor: '#fefce8', borderColor: '#fef08a' }]}>
        <Text style={{ color: colors.slate700, fontWeight: '700' }}>
          Digital Twin weather is temporarily unavailable.
        </Text>
      </View>
    );
  }

  const impact = simulation?.after || state.impact;
  const current = state.weather?.current || {};
  const location = state.weather?.location;
  const entities: DigitalTwinEntity[] = customSearchedEntities || impact.entities || [];
  const socialSignals: DigitalTwinSocialSignal[] = state.socialSignals || [];

  const levelColor =
    impact.impactLevel === 'SEVERE'
      ? '#dc2626'
      : impact.impactLevel === 'HIGH'
      ? '#ea580c'
      : impact.impactLevel === 'MEDIUM'
      ? '#d97706'
      : '#16a34a';

  const levelBg =
    impact.impactLevel === 'SEVERE'
      ? '#fef2f2'
      : impact.impactLevel === 'HIGH'
      ? '#fff7ed'
      : impact.impactLevel === 'MEDIUM'
      ? '#fffbeb'
      : '#f0fdf4';

  const adjust = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    delta: number,
    min: number,
    max: number
  ) => setter((v) => Math.max(min, Math.min(max, v + delta)));

  // Filter entities
  const filteredEntities = entities.filter((e) => {
    if (mapCategory === 'all') return true;
    return e.type === mapCategory;
  });

  const selectedEntity = entities.find((e) => e.id === selectedEntityId) || entities[0];

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header Banner */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.brandPill}>
              <Radio size={10} color={colors.primary700} />
              <Text style={styles.brandText}>DIGITAL TWIN</Text>
            </View>
            {simulation && (
              <View style={[styles.brandPill, { backgroundColor: '#ede9fe' }]}>
                <Sparkles size={10} color="#7c3aed" />
                <Text style={[styles.brandText, { color: '#7c3aed' }]}>SIMULATED STATE</Text>
              </View>
            )}
          </View>
          <Text style={styles.titleText}>Trip Weather Impact</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <MapPin size={11} color={colors.slate500} />
            <Text style={styles.locationSubtitle} numberOfLines={1}>
              {location?.name || 'Live Location Weather'}
            </Text>
            {locationStatus === 'granted' && (
              <View style={styles.liveGpsBadge}>
                <View style={styles.liveGpsDot} />
                <Text style={styles.liveGpsText}>GPS Live</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.levelBadge, { backgroundColor: levelBg, borderColor: levelColor }]}>
          <Text style={[styles.levelBadgeText, { color: levelColor }]}>{impact.impactLevel}</Text>
          <Text style={styles.levelSubText}>IMPACT</Text>
        </View>
      </View>

      {/* Feature Tabs Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            1. Weather
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'map' && styles.tabItemActive]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>
            2. Map View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'signals' && styles.tabItemActive]}
          onPress={() => setActiveTab('signals')}
        >
          <Text style={[styles.tabText, activeTab === 'signals' && styles.tabTextActive]}>
            3. Social Signals ({socialSignals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'simulation' && styles.tabItemActive]}
          onPress={() => setActiveTab('simulation')}
        >
          <Text style={[styles.tabText, activeTab === 'simulation' && styles.tabTextActive]}>
            4. What-If
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: LIVE WEATHER INTEGRATION */}
      {activeTab === 'overview' && (
        <View style={styles.sectionBody}>
          {/* Weather Status Bar */}
          <View style={styles.weatherBanner}>
            <View>
              <Text style={styles.weatherConditionTitle}>
                {current.weather?.[0]?.main || 'Clear'} • {current.weather?.[0]?.description || 'Clear sky'}
              </Text>
              <Text style={styles.weatherProviderSub}>
                Source: {state.weather?.provider || 'Real-time API Engine'}
              </Text>
            </View>
            <View style={styles.tempHighlight}>
              <Text style={styles.tempHighlightText}>{Math.round(current.temp ?? 25)}°C</Text>
            </View>
          </View>

          {/* 4 Primary Weather Metrics */}
          <View style={styles.metricGrid}>
            <WeatherMetric
              icon={<Thermometer size={14} color="#059669" />}
              label="Temp"
              value={`${Math.round(current.temp ?? 25)}°C`}
              sub={`Feels ${Math.round(current.feels_like ?? current.temp ?? 25)}°C`}
            />
            <WeatherMetric
              icon={<CloudRain size={14} color="#0284c7" />}
              label="Rainfall"
              value={`${Math.round(current.rain?.['1h'] ?? impact.inputs?.rainfall ?? 0)} mm`}
              sub="Intensity"
            />
            <WeatherMetric
              icon={<Wind size={14} color="#6366f1" />}
              label="Wind"
              value={`${Math.round(current.wind_speed ?? 0)} m/s`}
              sub="Velocity"
            />
            <WeatherMetric
              icon={<Droplets size={14} color="#0d9488" />}
              label="Humidity"
              value={`${Math.round(current.humidity ?? 60)}%`}
              sub="Moisture"
            />
          </View>

          {/* AI Predicted Trip Impact KPIs */}
          <Text style={styles.subHeaderTitle}>AI Model Impact Predictions</Text>
          <View style={styles.impactGrid}>
            <ImpactCard
              label="Overall Trip"
              prediction={impact.tripImpact.prediction}
              range={`${impact.tripImpact.lowerBound}-${impact.tripImpact.upperBound}%`}
              confidence={Math.round((impact.tripImpact.confidence || 0) * 100)}
              color={levelColor}
            />
            <ImpactCard
              label="Attractions Demand"
              prediction={impact.attractionDemand.prediction}
              range={`${impact.attractionDemand.lowerBound}-${impact.attractionDemand.upperBound}%`}
              confidence={Math.round((impact.attractionDemand.confidence || 0) * 100)}
              color="#0284c7"
            />
            <ImpactCard
              label="Transport Disruption"
              prediction={impact.transportDisruption.prediction}
              range={`${impact.transportDisruption.lowerBound}-${impact.transportDisruption.upperBound}%`}
              confidence={Math.round((impact.transportDisruption.confidence || 0) * 100)}
              color="#ea580c"
            />
            <ImpactCard
              label="Cancellation Risk"
              prediction={impact.cancellationRisk.prediction}
              range={`${impact.cancellationRisk.lowerBound}-${impact.cancellationRisk.upperBound}%`}
              confidence={Math.round((impact.cancellationRisk.confidence || 0) * 100)}
              color="#dc2626"
            />
          </View>

          {/* Next Forecast Strip */}
          {state.weather?.hourly && state.weather.hourly.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.subHeaderTitle, { fontSize: 11 }]}>5-Interval Forecast Input to AI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                {state.weather.hourly.slice(0, 5).map((hr, idx) => (
                  <View key={idx} style={styles.forecastPill}>
                    <Text style={styles.forecastTime}>+{idx * 3}h</Text>
                    <Text style={styles.forecastTemp}>{Math.round(hr.temp)}°C</Text>
                    <Text style={styles.forecastDesc}>{hr.weather?.[0]?.main || 'Rain'}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* TAB 2: GEOSPATIAL MAP VISUALIZATION */}
      {activeTab === 'map' && (
        <View style={styles.sectionBody}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.subHeaderTitle}>Google Maps Real-Time Impact</Text>
              <Text style={{ fontSize: 9, color: colors.slate500, marginTop: 1 }}>
                📍 {liveLocation ? `Exact Live GPS: ${liveLocation.latitude.toFixed(3)}, ${liveLocation.longitude.toFixed(3)}` : (location?.name || 'Live Trip Location')}
              </Text>
            </View>
            <TouchableOpacity onPress={recenterGPS} style={styles.recenterPill}>
              <Navigation size={10} color="#2563eb" />
              <Text style={styles.recenterPillText}>Recenter GPS</Text>
            </TouchableOpacity>
          </View>

          {/* Map Layer Switcher: Standard GMap / Satellite / Hybrid */}
          <View style={styles.mapLayerRow}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['standard', 'satellite', 'hybrid'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setMapType(t)}
                  style={[styles.mapTypeChip, mapType === t && styles.mapTypeChipActive]}
                >
                  <Text style={[styles.mapTypeChipText, mapType === t && styles.mapTypeChipTextActive]}>
                    {t === 'standard' ? '🗺️ Google Street' : t === 'satellite' ? '🛰️ Satellite' : '🌐 Hybrid'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.radarRadiusPill}>
              <Text style={styles.radarRadiusText}>
                Radius: {impact.propagationRadiusKm || 5} km
              </Text>
            </View>
          </View>

          {/* Dynamic Place Search Bar */}
          <View style={styles.searchBarBox}>
            <Search size={14} color={colors.slate400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search spots (e.g. beach, fort, station, cafe)..."
              placeholderTextColor={colors.slate400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => executePlaceSearch()}
              returnKeyType="search"
            />
            {isSearchingPlaces ? (
              <ActivityIndicator size="small" color={colors.primary700} />
            ) : searchQuery || customSearchedEntities ? (
              <TouchableOpacity onPress={resetPlaceSearch} style={{ padding: 4 }}>
                <X size={14} color={colors.slate500} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => executePlaceSearch()}
              style={styles.searchGoBtn}
              disabled={isSearchingPlaces}
            >
              <Text style={styles.searchGoText}>Search</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Dynamic Search Category Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickSearchScroll}>
            {[
              { label: '🏖️ Beaches', q: 'beach' },
              { label: '🏰 Forts', q: 'fort' },
              { label: '🚆 Stations', q: 'station' },
              { label: '☕ Cafes & Dining', q: 'restaurant' },
              { label: '🌳 Parks & Lakes', q: 'park' },
              { label: '✈️ Airport', q: 'airport' },
            ].map((chip) => (
              <TouchableOpacity
                key={chip.q}
                onPress={() => {
                  setSearchQuery(chip.q);
                  executePlaceSearch(chip.q);
                }}
                style={[styles.quickSearchChip, searchQuery === chip.q && styles.quickSearchChipActive]}
              >
                <Text style={[styles.quickSearchChipText, searchQuery === chip.q && styles.quickSearchChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Active Search Filter Banner */}
          {customSearchedEntities && (
            <View style={styles.searchActiveBanner}>
              <Text style={styles.searchActiveText}>
                🔎 Found {customSearchedEntities.length} live places for "{searchQuery || 'nearby'}"
              </Text>
              <TouchableOpacity onPress={resetPlaceSearch}>
                <Text style={styles.searchResetText}>Reset ✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Filter Categories */}
          <View style={styles.categoryRow}>
            {(['all', 'transport', 'attraction', 'restaurant'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setMapCategory(cat)}
                style={[styles.catBtn, mapCategory === cat && styles.catBtnActive]}
              >
                <Text style={[styles.catBtnText, mapCategory === cat && styles.catBtnTextActive]}>
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Real Google Maps Interactive Surface */}
          <DigitalTwinMapView
            mapRef={mapRef}
            mapType={mapType}
            region={{
              latitude: liveLocation?.latitude || location?.latitude || 19.076,
              longitude: liveLocation?.longitude || location?.longitude || 72.8777,
              latitudeDelta: 0.035,
              longitudeDelta: 0.035,
            }}
            levelColor={levelColor}
            propagationRadiusKm={impact.propagationRadiusKm || 5}
            liveLocation={liveLocation}
            locationStatus={locationStatus}
            filteredEntities={filteredEntities}
            selectedEntityId={selectedEntity?.id || null}
            onSelectEntity={handleSelectEntity}
          />

          {/* Interactive Entity Selector Carousel */}
          <Text style={[styles.subHeaderTitle, { marginTop: 10 }]}>Nearby Travel Spots (Narrow to Live Location)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {filteredEntities.map((ent) => {
              const isSelected = selectedEntity?.id === ent.id;
              const dist = (ent as any).distanceKm;
              return (
                <TouchableOpacity
                  key={ent.id}
                  style={[styles.entityCard, isSelected && styles.entityCardSelected]}
                  onPress={() => handleSelectEntity(ent)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.entityTypeBadge}>{ent.type.toUpperCase()}</Text>
                    {dist !== undefined && (
                      <Text style={{ fontSize: 8, fontWeight: '800', color: '#2563eb' }}>{dist} km</Text>
                    )}
                  </View>
                  <Text style={styles.entityName} numberOfLines={1}>
                    {ent.name}
                  </Text>
                  <Text style={[styles.entityStatus, { color: ent.disruptionScore > 50 ? '#dc2626' : '#16a34a' }]} numberOfLines={1}>
                    {ent.status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected Entity Details Drawer */}
          {selectedEntity && (
            <View style={styles.selectedDetailBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.selectedDetailName}>{selectedEntity.name}</Text>
                  {(selectedEntity as any).distanceKm !== undefined && (
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563eb', marginTop: 2 }}>
                      📍 {(selectedEntity as any).distanceKm} km from your exact live GPS location
                    </Text>
                  )}
                </View>
                <View style={styles.selectedDisruptPill}>
                  <Text style={styles.selectedDisruptText}>
                    Disruption: {selectedEntity.disruptionScore}%
                  </Text>
                </View>
              </View>
              <Text style={styles.selectedDetailDesc}>{selectedEntity.description}</Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={styles.selectedDetailTier}>
                  Tier: {selectedEntity.propagationLevel}
                </Text>

                <TouchableOpacity
                  style={styles.openGMapBtn}
                  onPress={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedEntity.latitude},${selectedEntity.longitude}`;
                    Linking.openURL(url).catch(() => {});
                  }}
                >
                  <Navigation size={12} color="#ffffff" />
                  <Text style={styles.openGMapBtnText}>Open in Google Maps ↗</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* TAB 3: REAL-WORLD SOCIAL SIGNALS */}
      {activeTab === 'signals' && (
        <View style={styles.sectionBody}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.subHeaderTitle}>Traveler & Public Signals Integration</Text>
            <View style={styles.signalCountBadge}>
              <Text style={styles.signalCountText}>{socialSignals.length} Active Feeds</Text>
            </View>
          </View>

          <Text style={styles.socialExplainer}>
            Real-world signals from public feeds, traveler forums, and local transit boards dynamically calibrate AI confidence scores and friction vectors.
          </Text>

          {socialSignals.length === 0 ? (
            <View style={styles.emptySignalBox}>
              <Info size={16} color={colors.slate400} />
              <Text style={styles.emptySignalText}>No active weather distress signals for this location.</Text>
            </View>
          ) : (
            socialSignals.map((sig) => {
              const isAlert = sig.severity === 'HIGH' || sig.severity === 'SEVERE';
              const isPositive = sig.sentiment === 'positive';
              const badgeBg = isAlert ? '#fee2e2' : isPositive ? '#dcfce7' : '#f1f5f9';
              const badgeColor = isAlert ? '#b91c1c' : isPositive ? '#15803d' : '#475569';

              // Relative time calculation
              const sigTime = new Date(sig.timestamp);
              const diffMs = Date.now() - sigTime.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const relativeTime = diffMins < 60 ? `${diffMins}m ago` : diffMins < 1440 ? `${Math.floor(diffMins / 60)}h ago` : `${Math.floor(diffMins / 1440)}d ago`;

              return (
                <View key={sig.id} style={[styles.signalCard, isAlert && { borderColor: '#fecaca' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <View style={[styles.signalSentimentPill, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.signalSentimentText, { color: badgeColor }]}>
                          {sig.severity} • {sig.sentiment.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.signalChannelText}>
                        {sig.payload?.channel || 'Public Travel Chatter'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 8, color: colors.slate400, fontWeight: '600' }}>{relativeTime}</Text>
                      <Text style={styles.signalConfidenceText}>
                        {Math.round(sig.confidence * 100)}% conf
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.signalEventTitle}>{sig.event}</Text>
                  {sig.payload?.text && (
                    <Text style={styles.signalBodyQuote}>"{sig.payload.text}"</Text>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Text style={styles.signalAuthorText}>
                      By {sig.payload?.author || 'Community Traveler'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.signalLocationText}>📍 {sig.location}</Text>
                      {sig.sourceUrl ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(sig.sourceUrl!).catch(() => {})}
                          style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}
                        >
                          <Text style={{ fontSize: 8, fontWeight: '800', color: '#0284c7' }}>Source ↗</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* TAB 4: WHAT-IF SIMULATION */}
      {activeTab === 'simulation' && (
        <View style={styles.sectionBody}>
          <Text style={styles.subHeaderTitle}>Digital Twin What-If Simulator</Text>
          <Text style={styles.simulationNotice}>
            Simulate weather shifts (rainfall, storm duration, temperature, wind) and see how changes cascade across travel entities in real-time.
          </Text>

          {/* Steppers */}
          <Stepper
            label="Rainfall Intensity"
            value={`${rainfall} mm`}
            onMinus={() => adjust(setRainfall, -10, 0, 150)}
            onPlus={() => adjust(setRainfall, 10, 0, 150)}
          />
          <Stepper
            label="Storm Duration"
            value={`${duration} h`}
            onMinus={() => adjust(setDuration, -1, 1, 14)}
            onPlus={() => adjust(setDuration, 1, 1, 14)}
          />
          <Stepper
            label="Temperature"
            value={`${temperature} °C`}
            onMinus={() => adjust(setTemperature, -2, 10, 48)}
            onPlus={() => adjust(setTemperature, 2, 10, 48)}
          />
          <Stepper
            label="Wind Speed"
            value={`${windSpeed} km/h`}
            onMinus={() => adjust(setWindSpeed, -5, 0, 90)}
            onPlus={() => adjust(setWindSpeed, 5, 0, 90)}
          />

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.simButton, { flex: 2 }]}
              onPress={runSimulation}
              disabled={isSimulating}
            >
              {isSimulating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Play size={14} color="#ffffff" />
                  <Text style={styles.simButtonText}>Simulate Virtual State</Text>
                </>
              )}
            </TouchableOpacity>

            {simulation && (
              <TouchableOpacity
                style={[styles.simButton, { flex: 1, backgroundColor: '#f1f5f9' }]}
                onPress={resetSimulation}
              >
                <RotateCcw size={14} color={colors.slate700} />
                <Text style={[styles.simButtonText, { color: colors.slate700 }]}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Side-by-side Simulation Comparison */}
          {simulation && (
            <View style={styles.comparisonBox}>
              <Text style={styles.comparisonTitle}>⚡ Live Baseline vs Simulated State</Text>
              <View style={styles.comparisonRow}>
                <ComparisonMetric
                  label="Trip Impact"
                  before={simulation.before?.tripImpact?.prediction ?? 0}
                  after={simulation.after?.tripImpact?.prediction ?? 0}
                />
                <ComparisonMetric
                  label="Transport Disruption"
                  before={simulation.before?.transportDisruption?.prediction ?? 0}
                  after={simulation.after?.transportDisruption?.prediction ?? 0}
                />
              </View>
              <View style={styles.comparisonRow}>
                <ComparisonMetric
                  label="Attraction Demand"
                  before={simulation.before?.attractionDemand?.prediction ?? 0}
                  after={simulation.after?.attractionDemand?.prediction ?? 0}
                />
                <ComparisonMetric
                  label="Cancellation Risk"
                  before={simulation.before?.cancellationRisk?.prediction ?? 0}
                  after={simulation.after?.cancellationRisk?.prediction ?? 0}
                />
              </View>
            </View>
          )}

          {/* Propagation Cascade Explanation */}
          <Text style={[styles.subHeaderTitle, { marginTop: 14 }]}>Multi-Tier Propagation Cascade</Text>
          {impact.effects?.map((effect: any, idx: number) => (
            <View key={idx} style={styles.effectItem}>
              <View style={styles.effectTierBadge}>
                <Text style={styles.effectTierText}>{effect.propagationLevel}</Text>
              </View>
              <Text style={styles.effectText}>
                <Text style={{ fontWeight: '700' }}>{effect.cause}</Text> →{' '}
                <Text style={{ fontWeight: '700', color: colors.slate900 }}>{effect.affectedEntity}</Text> ({effect.impact || 'stress shift'})
              </Text>
            </View>
          ))}

          <Text style={styles.sandboxNote}>
            🔒 Sandbox mode active: What-if simulations run purely in-memory and will never mutate group expenses, dates, or send push alerts to travelers.
          </Text>
        </View>
      )}
    </View>
  );
};

const WeatherMetric: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string }> = ({
  icon,
  label,
  value,
  sub,
}) => (
  <View style={styles.metricCard}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {icon}
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    {sub && <Text style={styles.metricSub}>{sub}</Text>}
  </View>
);

const ImpactCard: React.FC<{
  label: string;
  prediction: number;
  range: string;
  confidence: number;
  color: string;
}> = ({ label, prediction, range, confidence, color }) => (
  <View style={styles.impactCard}>
    <Text style={styles.impactLabel}>{label}</Text>
    <Text style={[styles.impactValue, { color }]}>{prediction}%</Text>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
      <Text style={styles.impactRange}>Range {range}</Text>
      <Text style={styles.impactConf}>{confidence}% conf</Text>
    </View>
  </View>
);

const Stepper: React.FC<{ label: string; value: string; onMinus: () => void; onPlus: () => void }> = ({
  label,
  value,
  onMinus,
  onPlus,
}) => (
  <View style={styles.stepperRow}>
    <Text style={styles.stepperLabel}>{label}</Text>
    <View style={styles.stepperControls}>
      <TouchableOpacity onPress={onMinus} style={styles.stepperBtn}>
        <Text style={styles.stepperBtnText}>-</Text>
      </TouchableOpacity>
      <Text style={styles.stepperValText}>{value}</Text>
      <TouchableOpacity onPress={onPlus} style={styles.stepperBtn}>
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const ComparisonMetric: React.FC<{ label: string; before: number; after: number }> = ({
  label,
  before,
  after,
}) => {
  const diff = after - before;
  const isUp = diff > 0;
  return (
    <View style={styles.compCard}>
      <Text style={styles.compLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
        <Text style={styles.compBefore}>{before}%</Text>
        <Text style={styles.compArrow}>➔</Text>
        <Text style={[styles.compAfter, { color: isUp ? '#dc2626' : '#16a34a' }]}>{after}%</Text>
        <Text style={[styles.compDiff, { color: isUp ? '#dc2626' : '#16a34a' }]}>
          ({isUp ? `+${diff}` : diff}%)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#f7fbf8',
    borderWidth: 1,
    borderColor: '#d9e7df',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  loadingText: {
    fontSize: 12,
    color: colors.slate600,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  brandText: {
    color: colors.primary700,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  titleText: {
    color: colors.slate900,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  locationSubtitle: {
    color: colors.slate600,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 180,
  },
  liveGpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveGpsDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#0284c7',
  },
  liveGpsText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284c7',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '900',
  },
  levelSubText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.slate500,
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#e9f2ec',
    borderRadius: 10,
    padding: 3,
    marginTop: 14,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate600,
  },
  tabTextActive: {
    color: colors.primary700,
    fontWeight: '900',
  },
  sectionBody: {
    marginTop: 14,
  },
  weatherBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2eee7',
  },
  weatherConditionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate900,
  },
  weatherProviderSub: {
    fontSize: 10,
    color: colors.slate500,
    marginTop: 2,
  },
  tempHighlight: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  tempHighlightText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary700,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2eee7',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.slate500,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.slate900,
    marginTop: 3,
  },
  metricSub: {
    fontSize: 8,
    color: colors.slate400,
    marginTop: 1,
  },
  subHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.slate800,
    marginTop: 12,
    letterSpacing: 0.2,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },
  impactCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2eee7',
  },
  impactLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate500,
  },
  impactValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  impactRange: {
    fontSize: 8,
    color: colors.slate400,
  },
  impactConf: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.primary700,
  },
  forecastPill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2eee7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    alignItems: 'center',
  },
  forecastTime: {
    fontSize: 9,
    color: colors.slate400,
  },
  forecastTemp: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate800,
    marginTop: 1,
  },
  forecastDesc: {
    fontSize: 8,
    color: colors.slate500,
  },
  radarRadiusPill: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  radarRadiusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  recenterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recenterPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563eb',
  },
  mapLayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  mapTypeChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mapTypeChipActive: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  mapTypeChipText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.slate600,
  },
  mapTypeChipTextActive: {
    color: '#ffffff',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 6 : 3,
    marginTop: 8,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    color: colors.slate900,
    padding: 0,
  },
  searchGoBtn: {
    backgroundColor: colors.primary700,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  searchGoText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  quickSearchScroll: {
    marginTop: 6,
  },
  quickSearchChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickSearchChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  quickSearchChipText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.slate600,
  },
  quickSearchChipTextActive: {
    color: '#ffffff',
  },
  searchActiveBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  searchActiveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0369a1',
  },
  searchResetText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dc2626',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  catBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2eee7',
  },
  catBtnActive: {
    backgroundColor: colors.primary700,
    borderColor: colors.primary700,
  },
  catBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.slate600,
  },
  catBtnTextActive: {
    color: '#ffffff',
  },
  mapContainer: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 8,
    color: '#cbd5e1',
  },
  entityCard: {
    width: 140,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2eee7',
    borderRadius: 10,
    padding: 8,
    marginRight: 8,
  },
  entityCardSelected: {
    borderColor: colors.primary700,
    backgroundColor: '#f0fdf4',
  },
  entityTypeBadge: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.slate400,
  },
  entityName: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate900,
    marginTop: 2,
  },
  entityStatus: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  selectedDetailBox: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  selectedDetailName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate900,
  },
  selectedDisruptPill: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedDisruptText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b91c1c',
  },
  selectedDetailDesc: {
    fontSize: 10,
    color: colors.slate600,
    marginTop: 3,
  },
  selectedDetailTier: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary700,
    marginTop: 4,
  },
  openGMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  openGMapBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  socialExplainer: {
    fontSize: 10,
    color: colors.slate500,
    marginTop: 4,
    lineHeight: 14,
  },
  signalCountBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  signalCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4338ca',
  },
  emptySignalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  emptySignalText: {
    fontSize: 11,
    color: colors.slate500,
  },
  signalCard: {
    backgroundColor: '#ffffff',
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2eee7',
    marginTop: 8,
  },
  signalSentimentPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  signalSentimentText: {
    fontSize: 8,
    fontWeight: '800',
  },
  signalChannelText: {
    fontSize: 9,
    color: colors.slate400,
  },
  signalConfidenceText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.slate400,
  },
  signalEventTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate900,
    marginTop: 4,
  },
  signalBodyQuote: {
    fontSize: 10,
    color: colors.slate600,
    fontStyle: 'italic',
    marginTop: 2,
  },
  signalAuthorText: {
    fontSize: 8,
    color: colors.slate400,
  },
  signalLocationText: {
    fontSize: 8,
    color: colors.slate500,
    fontWeight: '600',
  },
  simulationNotice: {
    fontSize: 10,
    color: colors.slate500,
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 9,
  },
  stepperLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate700,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#e2eee7',
  },
  stepperBtnText: {
    fontWeight: '800',
    fontSize: 12,
    color: colors.slate800,
  },
  stepperValText: {
    minWidth: 46,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 11,
    color: colors.slate900,
  },
  simButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.primary700,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  simButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  comparisonBox: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  comparisonTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary700,
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  compCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 8,
  },
  compLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.slate500,
  },
  compBefore: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate500,
  },
  compArrow: {
    fontSize: 9,
    color: colors.slate400,
  },
  compAfter: {
    fontSize: 13,
    fontWeight: '900',
  },
  compDiff: {
    fontSize: 9,
    fontWeight: '700',
  },
  effectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  effectTierBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  effectTierText: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.slate700,
  },
  effectText: {
    fontSize: 10,
    color: colors.slate700,
  },
  sandboxNote: {
    fontSize: 9,
    color: colors.slate400,
    marginTop: 12,
    lineHeight: 12,
  },
});
