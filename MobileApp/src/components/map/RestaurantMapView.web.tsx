import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RestaurantMapViewProps {
  restaurants: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    priceRange?: string;
    rating?: number;
    status?: string;
  }>;
  selectedRestaurantId?: string;
  onSelectRestaurant: (restaurant: any) => void;
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  onRegionChangeComplete: (region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => void;
}

export const RestaurantMapView: React.FC<RestaurantMapViewProps> = ({
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  region,
  onRegionChangeComplete,
}) => {
  const validRestaurants = restaurants.filter((restaurant) => Number.isFinite(restaurant.latitude) && Number.isFinite(restaurant.longitude));
  const latitudeSpan = Math.max(region.latitudeDelta, 0.01);
  const longitudeSpan = Math.max(region.longitudeDelta, 0.01);

  return (
    <View style={styles.mapSurface}>
      <View style={styles.mapGrid} />
      <View style={styles.mapWater} />
      <View style={[styles.mapRoad, styles.mapRoadDiagonalOne]} />
      <View style={[styles.mapRoad, styles.mapRoadDiagonalTwo]} />
      {validRestaurants.map((restaurant) => {
        const left = `${Math.max(4, Math.min(94, 50 + ((restaurant.longitude - region.longitude) / longitudeSpan) * 100))}%` as `${number}%`;
        const top = `${Math.max(8, Math.min(88, 50 - ((restaurant.latitude - region.latitude) / latitudeSpan) * 100))}%` as `${number}%`;
        const selected = restaurant.id === selectedRestaurantId;
        return (
          <TouchableOpacity
            key={restaurant.id}
            accessibilityLabel={`Show ${restaurant.name}`}
            onPress={() => {
              onSelectRestaurant(restaurant);
              onRegionChangeComplete({ ...region, latitude: restaurant.latitude, longitude: restaurant.longitude });
            }}
            style={[styles.mapMarker, { left, top }, selected && styles.mapMarkerSelected]}
          >
            <Text style={[styles.mapMarkerText, selected && styles.mapMarkerTextSelected]} numberOfLines={1}>
              {restaurant.name}
            </Text>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.mapTitle}>OpenStreetMap</Text>
      <View style={styles.mapStatsPill}><Text style={styles.mapStatsText}>{restaurants.length} results</Text></View>
      <Text style={styles.mapAttribution}>© OpenStreetMap contributors</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  mapSurface: {
    flex: 1,
    width: '100%',
    minHeight: 320,
    backgroundColor: '#E7E8E2',
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  mapGrid: {
    ...StyleSheet.absoluteFill,
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
  mapTitle: {
    position: 'absolute',
    left: 18,
    top: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
  },
  mapStatsPill: {
    position: 'absolute',
    right: 16,
    top: 12,
    backgroundColor: 'rgba(6, 95, 70, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapStatsText: {
    color: '#064E3B',
    fontSize: 10,
    fontWeight: '700',
  },
  mapAttribution: {
    position: 'absolute',
    left: 8,
    bottom: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.88)',
    color: '#34423C',
    fontSize: 9,
  },
  mapMarker: {
    position: 'absolute',
    maxWidth: '42%',
    backgroundColor: '#FFFFFF',
    borderColor: '#059669',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mapMarkerSelected: {
    backgroundColor: '#059669',
    borderColor: '#FFFFFF',
  },
  mapMarkerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
  },
  mapMarkerTextSelected: {
    color: '#FFFFFF',
  },
});
