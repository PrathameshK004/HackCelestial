import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Plus, Share2, Compass, ArrowRight } from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { useTrips } from '../../context/TripContext';

interface TripsTabProps {
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  onJoinTrip: () => void;
  searchQuery?: string;
}

export const TripsTab: React.FC<TripsTabProps> = ({
  onSelectTrip,
  onCreateTrip,
  onJoinTrip,
  searchQuery = '',
}) => {
  const { trips } = useTrips();
  const q = searchQuery.trim().toLowerCase();

  const filteredTrips = trips.filter((t) => {
    const matchesSearch =
      q === '' ||
      t.name?.toLowerCase().includes(q) ||
      (t.destination as string | undefined)?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q);
    return matchesSearch;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.headerInfo}>
        <Text style={styles.pageTitle}>All Expeditions & Trips</Text>
        <Text style={styles.pageSubtitle}>
          Manage member ratios, record bills, and settle balances
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={onCreateTrip}
          activeOpacity={0.85}
        >
          <Plus size={16} color="#ffffff" strokeWidth={2.4} />
          <Text style={styles.createBtnText}>Create New Trip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinBtn}
          onPress={onJoinTrip}
          activeOpacity={0.85}
        >
          <Share2 size={16} color={colors.slate900} strokeWidth={2.4} />
          <Text style={styles.joinBtnText}>Join with Code</Text>
        </TouchableOpacity>
      </View>

      {/* Trips Cards List */}
      <View style={styles.cardGrid}>
        {filteredTrips.map((trip) => {
          return (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripCard}
              onPress={() => onSelectTrip(trip.id)}
              activeOpacity={0.9}
            >
              {/* Route Nodes Row */}
              <View style={styles.routeNodesRow}>
                <View style={styles.routeNode}>
                  <Text style={styles.routeNodeCode}>{trip.name}</Text>
                  <Text style={styles.routeNodeSub}>{trip.destination}</Text>
                </View>
                
                <View style={styles.routeConnector}>
                  <View style={styles.routeDottedLine} />
                  <View style={styles.routePlaneBadge}>
                    <Compass size={14} color={colors.accentOlive} />
                  </View>
                </View>
                
                <View style={[styles.routeNode, { alignItems: 'flex-end' }]}>
                  <Text style={styles.routeNodeCode}>{trip.members?.length || 3}</Text>
                  <Text style={styles.routeNodeSub}>Members</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Route Meta Row */}
              <View style={styles.routeMetaRow}>
                <View>
                  <Text style={styles.metaTimeBold}>Status</Text>
                  <Text style={[styles.metaTimeValue, trip.status === 'completed' ? styles.textEmerald : styles.textAmber]}>
                    {trip.status === 'completed' ? 'Fully Settled' : 'Active Split'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.metaTimeBold}>Currency</Text>
                  <Text style={styles.metaTimeValue}>{trip.currency || 'INR'}</Text>
                </View>
              </View>

              {/* Bottom Pill */}
              <View style={styles.ticketBottomPill}>
                <Text style={styles.ticketBottomPillText}>
                  Open Group Ledger & Splits
                </Text>
                <ArrowRight size={16} color={colors.slate900} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    padding: 16,
  },
  headerInfo: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#181916',
    letterSpacing: -0.5,
    marginBottom: 6,
    fontFamily: 'serif',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#8E8F87',
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#464B29',
    borderRadius: radii.full,
    paddingVertical: 14,
    gap: 8,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  joinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2EFE8',
    borderRadius: radii.full,
    paddingVertical: 14,
    gap: 8,
  },
  joinBtnText: {
    color: '#181916',
    fontSize: 12,
    fontWeight: '600',
  },
  cardGrid: {
    gap: 16,
  },
  tripCard: {
    backgroundColor: '#ffffff',
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
    ...shadows.sm,
  },
  routeNodesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  routeNode: {
    flex: 1,
  },
  routeNodeCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#181916',
    marginBottom: 4,
    fontFamily: 'serif',
  },
  routeNodeSub: {
    fontSize: 11,
    color: '#8E8F87',
  },
  routeConnector: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 10,
  },
  routeDottedLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderWidth: 1,
    borderColor: '#EFECE6',
    borderStyle: 'dashed',
    top: '50%',
  },
  routePlaneBadge: {
    backgroundColor: '#F6F3EC',
    padding: 6,
    borderRadius: 20,
    zIndex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#EFECE6',
    marginBottom: 12,
  },
  routeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaTimeBold: {
    fontSize: 11,
    fontWeight: '700',
    color: '#181916',
    marginBottom: 4,
  },
  metaTimeValue: {
    fontSize: 12,
    color: '#585952',
  },
  textEmerald: {
    color: '#059669',
  },
  textAmber: {
    color: '#d97706',
  },
  ticketBottomPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  ticketBottomPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#181916',
  },
});
