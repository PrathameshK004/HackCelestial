/**
 * GroupTrip Ledger Mobile Application
 * React Native / Expo with Direct Live PostgreSQL Backend Architecture
 */

import React, { useState, useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TripProvider, useTrips } from './src/context/TripContext';
import { SplashScreen } from './src/components/common/SplashScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { GroupMenuScreen } from './src/screens/GroupMenuScreen';
import { CreateGroupScreen } from './src/screens/CreateGroupScreen';
import { notificationService } from './src/services/notificationService';

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { selectTrip, selectedTrip, clearSelectedTrip, refreshTrips } = useTrips();

  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'create-group'>('dashboard');

  useEffect(() => {
    // Elegant splash hold for luxury travel motion experience
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Listen for push notifications and user tap interactions
  useEffect(() => {
    if (!isAuthenticated) return;

    const cleanup = notificationService.addNotificationListeners(
      () => {
        // Reload live server trips when push notification arrives
        refreshTrips().catch(() => {});
      },
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.groupId) {
          selectTrip(data.groupId as string);
        }
      }
    );

    return cleanup;
  }, [isAuthenticated, selectTrip, refreshTrips]);

  if (showSplash || isAuthLoading) {
    return <SplashScreen onSkip={() => setShowSplash(false)} />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // 1. Full Trip Ledger View (GroupMenuScreen)
  if (selectedTrip) {
    return (
      <GroupMenuScreen
        tripId={selectedTrip.id}
        onBack={clearSelectedTrip}
      />
    );
  }

  // 2. Create Group Wizard
  if (currentView === 'create-group') {
    return (
      <CreateGroupScreen
        onBack={() => setCurrentView('dashboard')}
        onSuccess={(newTripId) => {
          setCurrentView('dashboard');
          selectTrip(newTripId);
        }}
      />
    );
  }

  // 3. Main Dashboard with Floating Dock
  return (
    <HomeScreen
      onSelectTrip={(tripId) => selectTrip(tripId)}
      onCreateTrip={() => setCurrentView('create-group')}
    />
  );
};

export default function App() {
  useEffect(() => {
    // Explicitly set Android status bar to white with dark icons
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#FFFFFF', true);
      StatusBar.setBarStyle('dark-content', true);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <AuthProvider>
        <TripProvider>
          <RootNavigator />
        </TripProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
