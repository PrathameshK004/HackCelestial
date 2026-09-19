/**
 * Trips Tab matching WebApp 'trips' dock tab
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Plus, MapPin, Calendar, Users, KeyRound, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { useTrips } from '../../context/TripContext';
import { Trip } from '../../types';

interface TripsTabProps {
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  onJoinTrip: () => void;
  searchQuery?: string;
}

type TripFilter = 'all' | 'active' | 'upcoming' | 'completed';

export const TripsTab: React.FC<TripsTabProps> = ({
  onSelectTrip,
  onCreateTrip,
  onJoinTrip,
  searchQuery = '',
}) => {
  const { trips } = useTrips();
  const [activeFilter, setActiveFilter] = useState<TripFilter>('all');
  const q = searchQuery.trim().toLowerCase();

  const filteredTrips = trips.filter((t) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'active' && t.status === 'active') ||
      (activeFilter === 'completed' && t.status === 'completed');
    const matchesSearch =
      q === '' ||
      t.name?.toLowerCase().includes(q) ||
      (t.destination as string | undefined)?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header & New Trip Button */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.pageTitle}>Your Group Trips</Text>
          <Text style={styles.pageSubtitle}>
            {trips.length} active ledgers saved in SQLite
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={onCreateTrip}
          activeOpacity={0.85}
        >
          <Plus size={16} color="#ffffff" strokeWidth={2.4} />
          <Text style={styles.createBtnText}>New Trip</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'completed'] as TripFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === f && styles.filterChipTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Join with Invite Code Box */}
      <TouchableOpacity
        style={styles.joinBox}
        onPress={onJoinTrip}
        activeOpacity={0.8}
      >
        <View style={styles.joinIconWrap}>
          <KeyRound size={18} color={colors.primary600} />
        </View>
        <View style={styles.joinTextColumn}>
          <Text style={styles.joinTitle}>Have an Invite Code?</Text>
          <Text style={styles.joinSubtitle}>
            Join an existing trip by entering the 6-character code
          </Text>
        </View>
        <ChevronRight size={18} color={colors.slate400} />
      </TouchableOpacity>

      {/* Trips Cards List */}
      {filteredTrips.map((trip) => {
        const spentPercent =
          trip.totalBudget > 0
            ? Math.min(Math.round((trip.totalSpent / trip.totalBudget) * 100), 100)
            : 0;

        const isUserOwed = trip.userBalance > 0.01;
        const doesUserOwe = trip.userBalance < -0.01;

        return (
          <TouchableOpacity
            key={trip.id}
            style={styles.tripCard}
            onPress={() => onSelectTrip(trip.id)}
            activeOpacity={0.9}
          >
            {/* Header Badge */}
            <View style={styles.cardHeader}>
              <View style={styles.badgeRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{trip.tripType || 'Trip'}</Text>
                </View>
                {trip.status === 'completed' ? (
                  <View style={styles.settledBadge}>
                    <CheckCircle2 size={12} color={colors.primary600} />
                    <Text style={styles.settledBadgeText}>Settled</Text>
                  </View>
                ) : (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
              </View>

              <Text style={styles.tripTitle}>{trip.name}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <MapPin size={13} color={colors.slate400} />
                  <Text style={styles.metaText}>{trip.destination}</Text>
                </View>

                {trip.startDate && (
                  <View style={styles.metaItem}>
                    <Calendar size={13} color={colors.slate400} />
                    <Text style={styles.metaText}>
                      {trip.startDate}
                      {trip.endDate ? ` - ${trip.endDate}` : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Financial Status & Progress */}
            <View style={styles.cardFinanceBody}>
              {/* Progress Bar */}
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>Budget Spent</Text>
                <Text style={styles.budgetValue}>
                  {trip.currencySymbol}{trip.totalSpent.toLocaleString()} / {trip.currencySymbol}{trip.totalBudget.toLocaleString()}
                </Text>
              </View>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${spentPercent}%` },
                  ]}
                />
              </View>

              {/* Personal Balance Callout Pill */}
              <View style={styles.balanceCalloutRow}>
                <View style={styles.membersStack}>
                  <Users size={14} color={colors.slate500} />
                  <Text style={styles.membersCountText}>
                    {trip.members?.length || 4} travelers
                  </Text>
                </View>

                <View
                  style={[
                    styles.balancePill,
                    isUserOwed && styles.balancePillOwed,
                    doesUserOwe && styles.balancePillOwes,
                  ]}
                >
                  <Text
                    style={[
                      styles.balancePillText,
                      isUserOwed && styles.balancePillTextOwed,
                      doesUserOwe && styles.balancePillTextOwes,
                    ]}
                  >
                    {isUserOwed
                      ? `+${trip.currencySymbol}${Math.abs(trip.userBalance).toLocaleString()} (You are owed)`
                      : doesUserOwe
                      ? `-${trip.currencySymbol}${Math.abs(trip.userBalance).toLocaleString()} (You owe)`
                      : 'Settled up'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  content: {
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.slate900,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary600,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
    gap: 6,
    ...shadows.sm,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: colors.slate900,
    borderColor: colors.slate900,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate600,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  joinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary200,
    marginBottom: 16,
    gap: 12,
  },
  joinIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  joinTextColumn: {
    flex: 1,
  },
  joinTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate900,
  },
  joinSubtitle: {
    fontSize: 11,
    color: colors.slate600,
    marginTop: 1,
  },
  tripCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 16,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.slate700,
    textTransform: 'uppercase',
  },
  activeBadge: {
    backgroundColor: colors.primary50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  activeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary700,
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    gap: 4,
  },
  settledBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary700,
  },
  tripTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.slate900,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: colors.slate500,
    fontWeight: '500',
  },
  cardFinanceBody: {
    padding: 16,
    backgroundColor: colors.bgCardHover,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budgetLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.slate500,
  },
  budgetValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.slate800,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.slate200,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary500,
  },
  balanceCalloutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membersStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  membersCountText: {
    fontSize: 12,
    color: colors.slate600,
    fontWeight: '500',
  },
  balancePill: {
    backgroundColor: colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  balancePillOwed: {
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  balancePillOwes: {
    backgroundColor: colors.accentAmberLight,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  balancePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate700,
  },
  balancePillTextOwed: {
    color: colors.primary700,
  },
  balancePillTextOwes: {
    color: '#92400e',
  },
});
