import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CreateGroupPage, AuthPage, JoinTripPage } from './pages';
import { Compass, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isAuthModeForInvite, setIsAuthModeForInvite] = useState(false);

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

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">
          <div className="brand-icon-box brand-icon-pulse">
            <Compass size={28} strokeWidth={2.4} />
          </div>
          <div className="auth-loading-text">
            <h3>GroupTrip Ledger</h3>
            <p>Initializing secure session...</p>
          </div>
          <Loader2 size={24} className="spin-animation text-emerald" />
        </div>
      </div>
    );
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
  return isAuthenticated ? <CreateGroupPage /> : <AuthPage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

