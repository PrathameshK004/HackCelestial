/**
 * HomeScreen (Central Application Hub)
 * Matches WebApp HomePage.tsx responsive mobile view
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Header } from '../components/common/Header';
import { SyncBanner } from '../components/common/SyncBanner';
import { BottomDock, DockTab } from '../components/common/BottomDock';
import { ExploreTab } from '../components/home/ExploreTab';
import { TripsTab } from '../components/home/TripsTab';
import { ExpensesTab } from '../components/home/ExpensesTab';
import { ProfileScreen } from './ProfileScreen';
import { ProfileDrawer } from '../components/common/ProfileDrawer';
import { JoinGroupModal } from '../components/home/JoinGroupModal';
import { AddExpenseModal } from '../components/group/AddExpenseModal';
import { useTrips } from '../context/TripContext';

interface HomeScreenProps {
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectTrip, onCreateTrip }) => {
  const [activeTab, setActiveTab] = useState<DockTab>('explore');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { trips, addExpense } = useTrips();
  const primaryTrip = trips[0];

  // Clear search when tab changes
  const handleTabChange = (tab: DockTab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Top Header with functional search bar */}
        <Header
          onPressProfile={() => setIsDrawerOpen(true)}
          onPressNotifications={() => {}}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Non-intrusive Sync Status Banner */}
        <SyncBanner />

        {/* Tab Content — receives searchQuery for live filtering */}
        <View style={styles.tabContent}>
          {activeTab === 'explore' && (
            <ExploreTab
              searchQuery={searchQuery}
              onSelectTrip={onSelectTrip}
              onCreateTrip={onCreateTrip}
            />
          )}
          {activeTab === 'trips' && (
            <TripsTab
              onSelectTrip={onSelectTrip}
              onCreateTrip={onCreateTrip}
              onJoinTrip={() => setIsJoinModalOpen(true)}
              searchQuery={searchQuery}
            />
          )}
          {activeTab === 'expenses' && <ExpensesTab searchQuery={searchQuery} />}
          {(activeTab === 'payments' || (activeTab as any) === 'profile') && <ProfileScreen />}
        </View>

        {/* Floating Bottom Navigation Dock */}
        <BottomDock
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onCreatePress={onCreateTrip}
        />

        {/* Modals */}
        <JoinGroupModal
          visible={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          onJoined={() => {}}
        />

        {primaryTrip && (
          <AddExpenseModal
            visible={isQuickExpenseOpen}
            tripId={primaryTrip.id}
            members={primaryTrip.members || []}
            onClose={() => setIsQuickExpenseOpen(false)}
            onSubmit={async (data) => {
              await addExpense(primaryTrip.id, data);
            }}
          />
        )}

        {/* Profile Side Hamburger Drawer */}
        <ProfileDrawer
          visible={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSelectOption={(key) => {
            if (key === 'profile') {
              setActiveTab('profile' as any);
            } else if (key === 'payments') {
              setActiveTab('payments');
            } else if (key === 'saved') {
              setActiveTab('trips');
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  tabContent: {
    flex: 1,
  },
});
