import React from 'react';

interface SplashScreenProps {
  isExiting?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isExiting = false }) => {
  return (
    <div className={`triptual-splash-screen ${isExiting ? 'splash-exiting' : ''}`}>
      {/* Background ambient lighting */}
      <div className="splash-ambient-glow orb-top" />
      <div className="splash-ambient-glow orb-bottom" />

      <div className="splash-content-container">
        {/* Glowing Logo Container */}
        <div className="splash-logo-wrapper">
          <div className="splash-halo-pulse" />
          <div className="splash-logo-card">
            <img
              src="/triptual-logo.png"
              alt="Triptual"
              className="splash-logo-image"
            />
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <div className="splash-brand-details">
          <h1 className="splash-brand-title">TRIPTUAL</h1>
          <p className="splash-brand-tagline">Smart Group Travel &amp; Expense Ledger</p>
        </div>

        {/* Elegant Animated Progress Bar */}
        <div className="splash-progress-wrapper">
          <div className="splash-progress-track">
            <div className="splash-progress-indicator" />
          </div>
          <span className="splash-loading-label">Loading your journeys...</span>
        </div>
      </div>

      {/* Bottom Footer Watermark */}
      <div className="splash-footer-badge">
        <span className="splash-badge-dot" />
        <span className="splash-footer-text">Seamless Group Travel OS</span>
      </div>
    </div>
  );
};

export default SplashScreen;
