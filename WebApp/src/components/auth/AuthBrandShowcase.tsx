import React from 'react';

export const AuthBrandShowcase: React.FC = () => {
  return (
    <div className="auth-hero-banner-card">
      <img
        src="/auth-hero.jpg"
        alt="Group Travel Adventure"
        className="auth-hero-banner-img"
        loading="eager"
      />

      {/* Bottom Floating Caption */}
      <div className="auth-hero-bottom-overlay">
        <h3 className="auth-hero-headline">Travel together. Settle with ease.</h3>
        <p className="auth-hero-subtext">Plan group adventures, track shared costs, and split bills effortlessly.</p>
      </div>
    </div>
  );
};
