import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CreateGroupPage, AuthPage, HomePage } from './pages';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showCreateGroup, setShowCreateGroup] = React.useState(false);

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">
          <img
            src="/triptual-logo.png"
            alt="Triptual Logo"
            style={{ width: '54px', height: '54px', borderRadius: '9999px', objectFit: 'cover' }}
          />
          <div className="auth-loading-text">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem' }}>Triptual</h3>
            <p>Initializing your smart expedition ledger...</p>
          </div>
          <Loader2 size={24} className="spin-animation text-emerald" />
        </div>
      </div>
    );
  }

  return isAuthenticated ? (showCreateGroup ? <CreateGroupPage onBack={() => setShowCreateGroup(false)} /> : <HomePage onCreateGroup={() => setShowCreateGroup(true)} />) : <AuthPage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
