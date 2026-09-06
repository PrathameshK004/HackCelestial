import React, { useState } from 'react';
import { AuthBrandShowcase } from '../components/auth/AuthBrandShowcase';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  onAuthSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ 
  initialMode = 'signup',
  onAuthSuccess 
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  return (
    <div className="auth-fullscreen-navy-canvas">
      {/* Centered Main White Card */}
      <div className="auth-card-modal-container">
        <div className="auth-card-modal-inner">
          {/* Left Column: Visual Hero Banner */}
          <div className="auth-hero-column">
            <AuthBrandShowcase />
          </div>

          {/* Right Column: Form View */}
          <div className="auth-form-column-modern">
            {mode === 'login' ? (
              <LoginForm
                onSwitchToSignup={() => setMode('signup')}
                onSuccessRedirect={onAuthSuccess}
              />
            ) : (
              <SignupForm
                onSwitchToLogin={() => setMode('login')}
                onSuccessRedirect={onAuthSuccess}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
