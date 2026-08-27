import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CreateGroupPage, AuthPage } from './pages';
import { Compass, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

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
