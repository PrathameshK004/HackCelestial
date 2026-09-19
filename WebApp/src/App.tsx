import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CreateGroupPage, AuthPage, JoinTripPage, HomePage } from './pages';
import { SplashScreen } from './components/common/SplashScreen';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isAuthModeForInvite, setIsAuthModeForInvite] = useState(false);
  const [activeView, setActiveView] = useState<'create-group' | 'dashboard'>('dashboard');
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashExiting, setIsSplashExiting] = useState(false);

  // Natural splash screen hold on startup for native app feel
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashExiting(true);
      setTimeout(() => {
        setShowSplash(false);
      }, 450);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  // Helper to extract invite code from pathname, query or hash
  const extractInviteCode = (): string | null => {
    // 1. Pathname: /join/CODE
    const pathMatch = window.location.pathname.match(/\/join\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) return pathMatch[1].trim();

    // 2. Query param: ?invite=CODE or ?join=CODE
    const searchParams = new URLSearchParams(window.location.search);
    const queryCode = searchParams.get('invite') || searchParams.get('join');
    if (queryCode) return queryCode.trim();

    // 3. Hash: #join/CODE or #invite=CODE
    const hashMatch = window.location.hash.match(/(?:join\/|invite=)([^/?&#]+)/i);
    if (hashMatch && hashMatch[1]) return hashMatch[1].trim();

    return null;
  };

  useEffect(() => {
    const code = extractInviteCode();
    if (code) {
      setInviteCode(code);
    }

    const handlePopState = () => {
      const poppedCode = extractInviteCode();
      setInviteCode(poppedCode);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (showSplash || isLoading) {
    return <SplashScreen isExiting={isSplashExiting && !isLoading} />;
  }

  // 1. User clicked an invite link and needs to log in first
  if (inviteCode && isAuthModeForInvite && !isAuthenticated) {
    return (
      <AuthPage 
        initialMode="login" 
        onAuthSuccess={() => setIsAuthModeForInvite(false)} 
      />
    );
  }

  // 2. User is on an official invitation link (/join/:code)
  if (inviteCode) {
    return (
      <JoinTripPage 
        inviteCode={inviteCode} 
        onNavigateHome={() => {
          setInviteCode(null);
          window.history.pushState({}, '', '/');
        }}
        onRequireAuth={() => setIsAuthModeForInvite(true)}
      />
    );
  }

  // 3. Standard Platform Flow
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (activeView === 'dashboard') {
    return (
      <HomePage 
        onCreateGroup={() => setActiveView('create-group')} 
        initialSelectedGroupId={selectedGroupId}
      />
    );
  }

  return (
    <CreateGroupPage 
      onNavigateDashboard={(newGroupId) => {
        if (newGroupId) setSelectedGroupId(newGroupId);
        setActiveView('dashboard');
      }} 
    />
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

