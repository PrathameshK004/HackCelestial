import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';
import { DigitalTwinEntity } from '../../api/digitalTwin.service';

export interface DigitalTwinMapViewProps {
  mapRef?: any;
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
  mapType,
  region,
  levelColor,
  propagationRadiusKm,
  liveLocation,
  filteredEntities,
  selectedEntityId,
  onSelectEntity,
}) => {
  const currentLat = liveLocation?.latitude || region.latitude || 19.076;
  const currentLon = liveLocation?.longitude || region.longitude || 72.8777;

  // Google Maps embed URL for web browser
  const embedType = mapType === 'satellite' ? 'k' : mapType === 'hybrid' ? 'h' : 'm';
  const gmapEmbedUrl = `https://maps.google.com/maps?q=${currentLat},${currentLon}&t=${embedType}&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <View style={styles.container}>
      {/* Web Google Maps Interactive iframe */}
      <iframe
        title="Google Maps Web"
        src={gmapEmbedUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: 14,
        }}
        loading="lazy"
        allowFullScreen
      />

      {/* Floating Overlay: Live Location Beacon */}
      <View style={styles.liveOverlayBadge}>
        <View style={styles.livePulseDot} />
        <Text style={styles.liveOverlayText}>
          📍 Live GPS: {currentLat.toFixed(4)}, {currentLon.toFixed(4)}
        </Text>
      </View>

      {/* Map Mode Badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {mapType === 'satellite' ? '🛰️ Google Satellite Web' : mapType === 'hybrid' ? '🌐 Google Hybrid Web' : '🗺️ Google Maps Web'}
        </Text>
      </View>

      {/* Overlay Nearby Entity Quick Pins */}
      <View style={styles.quickEntityRow}>
        {filteredEntities.slice(0, 3).map((ent) => {
          const isSelected = selectedEntityId === ent.id;
          const pinColor = ent.type === 'transport' ? '#ea580c' : ent.type === 'attraction' ? '#0284c7' : '#10b981';
          return (
            <TouchableOpacity
              key={ent.id}
              onPress={() => onSelectEntity(ent)}
              style={[styles.quickPinChip, isSelected && { borderColor: pinColor, backgroundColor: '#ffffff' }]}
            >
              <View style={[styles.legendDot, { backgroundColor: pinColor }]} />
              <Text style={styles.quickPinText} numberOfLines={1}>
                {ent.name.split(' ')[0]} ({(ent as any).distanceKm ? `${(ent as any).distanceKm}km` : 'near'})
              </Text>
            </TouchableOpacity>
          );
        })}
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
    backgroundColor: '#0f172a',
  },
  liveOverlayBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },
  liveOverlayText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
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
  quickEntityRow: {
    position: 'absolute',
    bottom: 34,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  quickPinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickPinText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#1e293b',
  },
  mapLegend: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
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
