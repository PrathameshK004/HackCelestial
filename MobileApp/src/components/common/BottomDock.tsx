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
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const activeColor = '#059669'; // Green active color
  const inactiveColor = '#8E8E93'; // Muted tab text and icon

  return (
    <View style={[styles.dockContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.dockInner}>
        {/* Tab 1: Explore */}
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => onTabChange('explore')}
          activeOpacity={0.7}
        >
          {activeTab === 'explore' && <View style={styles.topIndicator} />}
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
          {activeTab === 'trips' && <View style={styles.topIndicator} />}
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

        {/* Tab 3: Create */}
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={onCreatePress}
          activeOpacity={0.7}
        >
          <Plus
            size={24}
            color={inactiveColor}
            strokeWidth={1.8}
          />
          <Text style={styles.tabLabel}>
            Create
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Split */}
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => onTabChange('expenses')}
          activeOpacity={0.7}
        >
          {activeTab === 'expenses' && <View style={styles.topIndicator} />}
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
          {activeTab === 'payments' && <View style={styles.topIndicator} />}
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
    position: 'relative',
  },
  topIndicator: {
    position: 'absolute',
    top: -8,
    width: 40,
    height: 3.5,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: '#059669', // Emerald green active indicator bar
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#059669',
    fontWeight: '700',
  },
});
