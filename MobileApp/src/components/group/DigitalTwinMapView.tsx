import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Circle as MapCircle } from 'react-native-maps';
import { DigitalTwinEntity } from '../../api/digitalTwin.service';

export interface DigitalTwinMapViewProps {
  mapRef?: React.RefObject<MapView | null>;
  mapType: 'standard' | 'satellite' | 'hybrid';
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  levelColor: string;
  propagationRadiusKm: number;
  liveLocation: { latitude: number; longitude: number } | null;
  locationStatus: string;
  filteredEntities: DigitalTwinEntity[];
  selectedEntityId: string | null;
  onSelectEntity: (entity: DigitalTwinEntity) => void;
}

export const DigitalTwinMapView: React.FC<DigitalTwinMapViewProps> = ({
  mapRef,
  mapType,
  region,
  levelColor,
  propagationRadiusKm,
  liveLocation,
  locationStatus,
  filteredEntities,
  selectedEntityId,
  onSelectEntity,
}) => {
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        initialRegion={region}
        showsUserLocation={locationStatus === 'granted'}
        showsMyLocationButton={false}
        showsCompass
        toolbarEnabled={false}
      >
        {/* Weather Impact Propagation Radius */}
        {region?.latitude && region?.longitude && (
          <MapCircle
            center={{
              latitude: liveLocation?.latitude || region.latitude,
              longitude: liveLocation?.longitude || region.longitude,
            }}
            radius={(propagationRadiusKm || 3) * 1000}
            fillColor={`${levelColor}22`}
            strokeColor={levelColor}
            strokeWidth={2}
          />
        )}

        {/* Exact Live User Marker */}
        {liveLocation && (
          <Marker
            coordinate={{ latitude: liveLocation.latitude, longitude: liveLocation.longitude }}
            title="📍 You Are Here"
            description="Exact Live GPS Position"
            pinColor="#2563eb"
          />
        )}

        {/* Entity Markers */}
        {filteredEntities.map((entity) => {
          if (!Number.isFinite(entity.latitude) || !Number.isFinite(entity.longitude)) return null;
          const pinColor = entity.type === 'transport' ? '#ea580c' : entity.type === 'attraction' ? '#0284c7' : '#10b981';
          const dist = (entity as any).distanceKm;
          return (
            <Marker
              key={entity.id}
              coordinate={{ latitude: entity.latitude, longitude: entity.longitude }}
              title={entity.name}
              description={`${entity.status} • Disruption: ${entity.disruptionScore}%${dist !== undefined ? ` • ${dist} km away` : ''}`}
              pinColor={pinColor}
              onPress={() => onSelectEntity(entity)}
            />
          );
        })}
      </MapView>

      {/* Map Mode Badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {mapType === 'satellite' ? '🛰️ Google Satellite' : mapType === 'hybrid' ? '🌐 Google Hybrid' : '🗺️ Google Maps'}
        </Text>
      </View>

      {/* Map Legend */}
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
          <Text style={styles.legendText}>You (Live GPS)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ea580c' }]} />
          <Text style={styles.legendText}>Transport</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#0284c7' }]} />
          <Text style={styles.legendText}>Attraction</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendText}>Dining</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e2e8f0',
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  mapLegend: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
});
