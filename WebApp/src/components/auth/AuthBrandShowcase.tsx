import React from 'react';
import { CheckCircle2, Users, Sparkles, Shield } from 'lucide-react';

export const AuthBrandShowcase: React.FC = () => {
  return (
    <div className="auth-hero-banner-card">
      <img
        src="/auth-hero.jpg"
        alt="Group Travel Adventure"
        className="auth-hero-banner-img"
        loading="eager"
      />

      {/* Atmospheric ambient lighting & gradient overlays */}
      <div className="auth-hero-gradient-overlay" />

      {/* Top Floating Brand Badge */}
      <div className="auth-hero-top-badge">
        <img
          src="/triptual-logo.png"
          alt="Triptual Logo"
          className="auth-hero-brand-logo"
        />
        <div className="auth-hero-brand-info">
          <span className="auth-hero-brand-name">Triptual</span>
          <span className="auth-hero-brand-tag">Travel & Shared Ledger OS</span>
        </div>
      </div>

      {/* Interactive Floating Glass Badge 1: Group Activity */}
      <div className="auth-floating-glass-card auth-float-card-1">
        <div className="auth-float-card-icon emerald">
          <Users size={16} />
        </div>
        <div className="auth-float-card-content">
          <div className="auth-float-card-title">Barcelona Summer Trip</div>
          <div className="auth-float-card-meta">
            <div className="auth-avatar-stack">
              <span className="auth-mini-avatar" style={{ backgroundColor: '#059669' }}>A</span>
              <span className="auth-mini-avatar" style={{ backgroundColor: '#0284c7' }}>P</span>
              <span className="auth-mini-avatar" style={{ backgroundColor: '#d97706' }}>Y</span>
            </div>
            <span className="auth-float-subtext">4 travelers joined</span>
          </div>
        </div>
      </div>

      {/* Interactive Floating Glass Badge 2: Settlement Succeeded */}
      <div className="auth-floating-glass-card auth-float-card-2">
        <div className="auth-float-card-icon teal">
          <CheckCircle2 size={16} />
        </div>
        <div className="auth-float-card-content">
          <div className="auth-float-card-title">Split Settled · ₹4,250</div>
          <div className="auth-float-card-sub">Instant zero-debt UPI clearance</div>
        </div>
      </div>

      {/* Bottom Floating Caption & Trust Strip */}
      <div className="auth-hero-bottom-overlay">
        <div className="auth-hero-micro-pills">
          <span className="auth-hero-micro-pill">
            <Sparkles size={11} /> 100% Free Ledger
          </span>
          <span className="auth-hero-micro-pill">
            <Shield size={11} /> Bank-Grade Security
          </span>
        </div>
        <h3 className="auth-hero-headline">Travel together. Settle with ease.</h3>
        <p className="auth-hero-subtext">
          Plan group adventures, track shared costs in real-time, and eliminate awkward money talks.
        </p>
      </div>
    </div>
  );
};
