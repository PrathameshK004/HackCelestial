import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, User } from 'lucide-react';
import { AuthBrandShowcase } from '../components/auth/AuthBrandShowcase';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';

interface AuthPageProps {
  initialMode?: 'login' | 'signup' | 'forgot';
  onAuthSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ 
  initialMode = 'login',
  onAuthSuccess 
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  return (
    <div className="auth-fullscreen-navy-canvas">
      {/* Ambient background glow elements (desktop) */}
      <div className="auth-bg-ambient-orb orb-1" />
      <div className="auth-bg-ambient-orb orb-2" />

      {/* Mobile Top Hero Header with Image & Floating Navigation (Matching provided layout) */}
      <div className="auth-mobile-hero-header">
        <img
          src="/auth-hero.jpg"
          alt="Triptual Travel"
          className="auth-mobile-hero-bg-img"
        />
        <div className="auth-mobile-hero-overlay" />

        {/* Floating Top Navigation: Back Button & Mode Pill */}
        <div className="auth-mobile-hero-nav">
          <button
            type="button"
            className="auth-mobile-nav-back-btn"
            onClick={() => {
              if (mode === 'forgot') setMode('login');
              else if (mode === 'signup') setMode('login');
              else if (window.history.length > 1) window.history.back();
            }}
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          {mode !== 'forgot' && (
            <button
              type="button"
              className="auth-mobile-hero-role-pill"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              title={`Switch to ${mode === 'login' ? 'Sign Up' : 'Log In'}`}
            >
              <User size={15} />
              <span>{mode === 'login' ? 'Sign Up' : 'Log In'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="auth-card-modal-container">
        <div className="auth-card-modal-inner">
          {/* Left Column: Visual Hero Banner (Desktop only) */}
          <div className="auth-hero-column">
            <AuthBrandShowcase />
          </div>

          {/* Right Column: Form View */}
          <div className="auth-form-column-modern">
            {/* Desktop Segmented Mode Switcher */}
            {mode !== 'forgot' && (
              <div className="auth-segmented-pill-switcher desktop-only-switcher" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  className={`auth-segment-tab ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => setMode('login')}
                >
                  Log In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  className={`auth-segment-tab ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => setMode('signup')}
                >
                  Create Account
                </button>
              </div>
            )}

            {mode === 'login' ? (
              <LoginForm
                onSwitchToSignup={() => setMode('signup')}
                onForgotPassword={() => setMode('forgot')}
                onSuccessRedirect={onAuthSuccess}
              />
            ) : mode === 'signup' ? (
              <SignupForm
                onSwitchToLogin={() => setMode('login')}
                onSuccessRedirect={onAuthSuccess}
              />
            ) : (
              <ForgotPasswordForm
                onSwitchToLogin={() => setMode('login')}
                onSuccess={() => setMode('login')}
              />
            )}

            {/* Bank-Grade Security & Trust Indicator */}
            <div className="auth-trust-badge-row">
              <ShieldCheck size={13} className="auth-trust-icon" />
              <span>256-Bit Bank Encryption · Zero Plaintext Storage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
