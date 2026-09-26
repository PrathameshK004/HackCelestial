import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region, UrlTile } from 'react-native-maps';
import { getMapTileUrlTemplate } from '../../config/map';

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
  region: Region;
  onRegionChangeComplete: (region: Region) => void;
}

export const RestaurantMapView: React.FC<RestaurantMapViewProps> = ({
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  region,
  onRegionChangeComplete,
}) => {
  return (
    <View style={styles.mapSurface}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={region}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        onRegionChangeComplete={onRegionChangeComplete}
        toolbarEnabled={false}
        showsCompass
      >
        <UrlTile
          urlTemplate={getMapTileUrlTemplate()}
          maximumZ={19}
          tileSize={256}
        />
        {restaurants
          .filter((restaurant) => Number.isFinite(restaurant.latitude) && Number.isFinite(restaurant.longitude) && restaurant.latitude !== 0 && restaurant.longitude !== 0)
          .map((restaurant) => (
            <Marker
              key={restaurant.id}
              coordinate={{ latitude: restaurant.latitude, longitude: restaurant.longitude }}
              title={restaurant.name}
              description={`${restaurant.priceRange || '₹₹'} · ${restaurant.rating || 'New'}★`}
              pinColor={selectedRestaurantId === restaurant.id ? '#059669' : '#E58A32'}
              onPress={() => onSelectRestaurant(restaurant)}
            />
          ))}
      </MapView>
      <Text style={styles.mapTitle}>OpenStreetMap</Text>
      <View style={styles.mapStatsPill}>
        <Text style={styles.mapStatsText}>{restaurants.length} results</Text>
      </View>
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
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  mapWater: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: '#B9DFE5',
    opacity: 0.65,
  },
  mapRoad: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
  },
  mapRoadDiagonalOne: {
    left: 25,
    top: 14,
    width: 220,
    height: 8,
    transform: [{ rotate: '18deg' }],
  },
  mapRoadDiagonalTwo: {
    left: 90,
    top: 48,
    width: 200,
    height: 8,
    transform: [{ rotate: '-16deg' }],
  },
  mapRoadHorizontalOne: {
    left: -30,
    top: '35%',
    width: 360,
    height: 10,
  },
  mapRoadHorizontalTwo: {
    left: -30,
    top: '60%',
    width: 360,
    height: 10,
  },
  mapRoadVerticalOne: {
    left: '28%',
    top: 0,
    width: 10,
    height: 420,
  },
  mapRoadVerticalTwo: {
    left: '62%',
    top: 0,
    width: 10,
    height: 420,
  },
  mapDistrictLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#66808A',
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
    backgroundColor: '#ffffff',
    borderColor: '#059669',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  mapMarkerSelected: {
    backgroundColor: '#059669',
    borderColor: '#ffffff',
  },
  mapMarkerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
  },
  mapMarkerTextSelected: {
    color: '#ffffff',
  },
});
