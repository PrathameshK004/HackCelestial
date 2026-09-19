/**
 * Floating Bottom Navigation Dock
 * 10000000% exact visual match to the WebApp / APK bottom navigation bar:
 * - Tab 1: Explore (Compass)
 * - Tab 2: Groups (RoundtableGroupsIcon)
 * - Center: Create (+ FAB in #464B29 Olive Green with white border)
 * - Tab 4: Split (Split arrow branching icon)
 * - Tab 5: Payments (CreditCard outline icon)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Compass, Split, CreditCard, Plus } from 'lucide-react-native';
import { RoundtableGroupsIcon } from './RoundtableGroupsIcon';
import { colors, radii, shadows } from '../../theme/colors';

export type DockTab = 'explore' | 'trips' | 'expenses' | 'payments' | 'profile';

interface BottomDockProps {
  activeTab: DockTab;
  onTabChange: (tab: DockTab) => void;
  onCreatePress: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  activeTab,
  onTabChange,
  onCreatePress,
}) => {
  const activeColor = '#18181B'; // Active dark text and icon
  const inactiveColor = '#8E8E93'; // Muted tab text and icon

  return (
    <View style={styles.dockContainer}>
      <View style={styles.dockInner}>
        {/* Tab 1: Explore */}
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => onTabChange('explore')}
          activeOpacity={0.7}
        >
          <Compass
            size={24}
            color={activeTab === 'explore' ? activeColor : inactiveColor}
            strokeWidth={activeTab === 'explore' ? 2.4 : 1.8}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'explore' && styles.tabLabelActive,
            ]}
          >
            Explore
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Groups */}
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => onTabChange('trips')}
          activeOpacity={0.7}
        >
          <RoundtableGroupsIcon
            size={24}
            color={activeTab === 'trips' ? activeColor : inactiveColor}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'trips' && styles.tabLabelActive,
            ]}
          >
            Groups
          </Text>
        </TouchableOpacity>

        {/* Center Elevated Floating Action Button (+): Create */}
        <View style={styles.fabWrapper}>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={onCreatePress}
            activeOpacity={0.85}
          >
            <Plus size={26} color="#FFFFFF" strokeWidth={2.8} />
          </TouchableOpacity>
          <Text style={styles.fabLabel}>Create</Text>
        </View>

        {/* Tab 4: Split */}
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => onTabChange('expenses')}
          activeOpacity={0.7}
        >
          <Split
            size={24}
            color={activeTab === 'expenses' ? activeColor : inactiveColor}
            strokeWidth={activeTab === 'expenses' ? 2.4 : 1.8}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'expenses' && styles.tabLabelActive,
            ]}
          >
            Split
          </Text>
        </TouchableOpacity>

        {/* Tab 5: Payments */}
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => onTabChange('payments')}
          activeOpacity={0.7}
        >
          <CreditCard
            size={24}
            color={activeTab === 'payments' ? activeColor : inactiveColor}
            strokeWidth={activeTab === 'payments' ? 2.4 : 1.8}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'payments' && styles.tabLabelActive,
            ]}
          >
            Payments
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF8F5', // Exact warm linen from theme.css line 1664
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
    zIndex: 100,
    ...shadows.lg,
  },
  dockInner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#18181B',
    fontWeight: '800',
  },
  fabWrapper: {
    alignItems: 'center',
    marginTop: -28, // Elevated above dock edge
    paddingHorizontal: 6,
  },
  fabBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#464B29', // Exact --accent-olive from theme.css line 25
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#FFFFFF', // Clean white ring around the olive button
    shadowColor: '#2E331B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#18181B',
    marginTop: 3,
  },
});
