import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Zap,
  Compass,
  CheckCircle2,
  TrendingDown,
  Lock,
  Heart,
  Share2,
  Award,
  Users,
  Wallet,
  Check,
  ChevronRight
} from 'lucide-react';

interface AboutPageProps {
  onBack: () => void;
  onExploreStays?: () => void;
  onCreateTrip?: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onBack,
  onExploreStays,
  onCreateTrip
}) => {
  const [activeTab, setActiveTab] = useState<'mission' | 'algorithm' | 'security' | 'principles'>('mission');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShare = () => {
    navigator.clipboard?.writeText(window.location.origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="about-page-root animate-fade-in" style={{ paddingBottom: '100px' }}>
      <div className="about-page-container" style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 16px 40px' }}>
        
        {/* Top Navigation Bar */}
        <div className="about-header-bar">
          <div className="about-header-left">
            <button
              type="button"
              className="btn-back-transparent"
              onClick={onBack}
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
              style={{ flexShrink: 0 }}
            >
              <ArrowLeft size={22} color="var(--text-primary)" />
            </button>

            <img
              src="/triptual-logo.png"
              alt="Triptual"
              className="about-brand-logo"
            />

            <div className="about-title-col">
              <div className="about-title-row">
                <h1 className="about-title-text">
                  About Triptual
                </h1>
                <span className="about-version-badge">
                  v2.4 Pro
                </span>
              </div>
              <p className="about-subtitle-text">
                Smart Expedition Ledger & Group Concierge
              </p>
            </div>
          </div>

          <button
            type="button"
            className="about-share-btn"
            onClick={handleCopyShare}
            title={copiedLink ? 'Link Copied!' : 'Share App'}
            aria-label="Share App"
            style={{
              background: copiedLink ? 'var(--emerald)' : 'var(--bg-surface)',
              color: copiedLink ? '#FFFFFF' : 'var(--text-primary)'
            }}
          >
            {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
            <span className="about-share-text">{copiedLink ? 'Copied!' : 'Share App'}</span>
          </button>
        </div>

        {/* Hero Section Banner */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '20px',
            background: 'linear-gradient(145deg, #2E331B 0%, #1E2310 100%)',
            color: '#FFFFFF',
            padding: '28px 22px',
            marginBottom: '24px',
            boxShadow: '0 12px 32px rgba(46, 51, 27, 0.18)'
          }}
        >
          {/* Subtle Ambient Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(229, 236, 104, 0.25) 0%, rgba(229, 236, 104, 0) 70%)',
              pointerEvents: 'none'
            }}
          />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', background: 'rgba(229, 236, 104, 0.15)', color: '#E5EC68', fontSize: '0.72rem', fontWeight: 600, marginBottom: '14px' }}>
            <Sparkles size={13} />
            <span>Harmonizing Group Travel & Finances</span>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.4rem',
              lineHeight: 1.25,
              fontWeight: 600,
              margin: '0 0 12px 0',
              color: '#FAF8F5'
            }}
          >
            Architected for Explorers. <br />
            <span style={{ color: '#E5EC68' }}>Refined by Mathematics.</span>
          </h2>

          <p
            style={{
              fontSize: '0.84rem',
              lineHeight: 1.6,
              color: 'rgba(250, 248, 245, 0.82)',
              margin: '0 0 20px 0',
              maxWidth: '580px'
            }}
          >
            Triptual was born from a simple belief: adventures should be remembered for breathtaking sunrises and shared laughter, not ruined by messy spreadsheets, unpaid IOUs, and awkward money conversations.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {onCreateTrip && (
              <button
                type="button"
                onClick={onCreateTrip}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '9999px',
                  background: '#E5EC68',
                  color: '#1E2614',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(229, 236, 104, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <span>Launch an Expedition</span>
                <ChevronRight size={15} />
              </button>
            )}

            {onExploreStays && (
              <button
                type="button"
                onClick={onExploreStays}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#FAF8F5',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  backdropFilter: 'blur(6px)'
                }}
              >
                <Compass size={14} />
                <span>Browse Curated Stays</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Impact Counters */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '28px'
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: '16px',
              padding: '14px 16px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-olive)' }}>
              45,000+
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
              Group Trips Hosted
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: '16px',
              padding: '14px 16px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--emerald)' }}>
              73%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
              Less Debt Friction
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: '16px',
              padding: '14px 16px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-olive)' }}>
              ₹14.2 Cr+
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
              Settled in 1-Tap
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: '16px',
              padding: '14px 16px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-olive)' }}>
              99.98%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
              Ledger Accuracy
            </div>
          </div>
        </div>

        {/* Interactive Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '4px',
            background: 'var(--bg-surface-subtle)',
            borderRadius: '12px',
            marginBottom: '20px',
            overflowX: 'auto'
          }}
        >
          {[
            { id: 'mission', label: 'The Mission', icon: Heart },
            { id: 'algorithm', label: 'Debt Minimization', icon: Zap },
            { id: 'security', label: 'Security & UPI', icon: Lock },
            { id: 'principles', label: 'Our Principles', icon: Award }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? 'var(--bg-surface)' : 'transparent',
                  color: isSelected ? 'var(--brand-olive)' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid var(--border-card)' : '1px solid transparent',
                  boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} color={isSelected ? 'var(--brand-olive)' : 'var(--text-muted)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content 1: The Mission */}
        {activeTab === 'mission' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
                Why We Built Triptual
              </h3>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                Group travel creates lifelong memories, but traditional expense sharing is plagued by friction. People forget receipts, debate currency rates, and end up sending dozens of micro-transactions to each other.
              </p>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
                Triptual combines <strong>modern boutique travel curation</strong> with an <strong>autonomous financial ledger</strong>. We handle split calculations, eliminate circular debts, and deep-link instant UPI payments so you can stay immersed in your journey.
              </p>
            </div>

            {/* Core Feature Pillars with Picture Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {/* Pillar 1 */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ height: '110px', width: '100%', position: 'relative', overflow: 'hidden', background: '#2E331B' }}>
                  <img
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"
                    alt="Boutique Stay Curation"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', bottom: '10px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(229, 236, 104, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                      <Compass size={14} color="#E5EC68" />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FAF8F5', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      Expedition Stays
                    </span>
                  </div>
                </div>
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Boutique Stay Curation
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      Handpicked eco-villas and alpine cabins scoring top marks in tranquility, walkability, and local gastronomy.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pillar 2 */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ height: '110px', width: '100%', position: 'relative', overflow: 'hidden', background: '#064E3B' }}>
                  <img
                    src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80"
                    alt="Debt Loop Elimination"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', bottom: '10px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                      <TrendingDown size={14} color="#34D399" />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FAF8F5', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      Graph Optimization
                    </span>
                  </div>
                </div>
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Debt Loop Elimination
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      Deterministic graph reduction condenses tangled group IOUs into the minimum possible direct transactions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pillar 3 */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ height: '110px', width: '100%', position: 'relative', overflow: 'hidden', background: '#1E2310' }}>
                  <img
                    src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80"
                    alt="1-Tap UPI Settlement"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', bottom: '10px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(229, 236, 104, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                      <Wallet size={14} color="#E5EC68" />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FAF8F5', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      Instant Pay
                    </span>
                  </div>
                </div>
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      1-Tap UPI Settlement
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      Direct intent deep-linking with PhonePe, GPay, Paytm, and BHIM UPI without intermediate cut or custody.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pillar 4 */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ height: '110px', width: '100%', position: 'relative', overflow: 'hidden', background: '#78350F' }}>
                  <img
                    src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=600&q=80"
                    alt="Zero-Install Guest Access"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', bottom: '10px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(251, 191, 36, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                      <Users size={14} color="#FBBF24" />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FAF8F5', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      Collaborative
                    </span>
                  </div>
                </div>
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Zero-Install Guest Access
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      Travel companions join in 1 tap via QR codes or shared links, participating instantly without app downloads.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: Debt Minimization Algorithm */}
        {activeTab === 'algorithm' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: '16px',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Zap size={18} color="var(--emerald)" />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
                  Directed Graph Debt Optimization
                </h3>
              </div>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                In an unmanaged group of 5 travelers, buying coffee, fuel, dinner, and cabin bookings creates up to <strong>10 pairwise debt obligations</strong>.
              </p>

              {/* Before vs After Visualization Box */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                  background: 'var(--bg-surface-warm)',
                  borderRadius: '14px',
                  padding: '16px',
                  border: '1px solid var(--border-light)'
                }}
              >
                {/* Traditional Method */}
                <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--rose)', textTransform: 'uppercase' }}>
                    ✕ Traditional Split
                  </span>
                  <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    • A pays B ₹500<br />
                    • B pays C ₹500<br />
                    • C pays D ₹500<br />
                    • D pays A ₹200<br />
                    <strong>Total: 4 transfers, lots of bank fees</strong>
                  </div>
                </div>

                {/* Triptual Smart Settlement */}
                <div style={{ padding: '12px', background: 'var(--brand-olive-subtle)', borderRadius: '10px', border: '1px solid var(--brand-olive)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brand-olive)', textTransform: 'uppercase' }}>
                    ✓ Triptual Smart Settlement
                  </span>
                  <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    • A pays D ₹300 directly<br />
                    <strong>Total: 1 transfer, zero intermediate delay</strong><br />
                    <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>75% transfer reduction</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={14} color="var(--emerald)" />
                <span>Deterministic Min-Cash-Flow graph algorithm executed in sub-millisecond runtime.</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 3: Security & UPI Architecture */}
        {activeTab === 'security' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: '16px',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={20} color="var(--emerald)" />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
                  Zero-Knowledge & Bank-Grade Security
                </h3>
              </div>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                Financial privacy is non-negotiable. Triptual does not store your bank passwords, CVVs, or card numbers. All settlements execute directly through NPCI-authorized UPI gateways and your own native banking applications.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  {
                    title: 'End-to-End TLS 1.3 Transport',
                    desc: 'All communications between your device and our ledger engine are encrypted using modern cryptographic ciphers.'
                  },
                  {
                    title: 'Zero-Custody Payments',
                    desc: 'Funds travel directly from your bank account to your travel companion’s UPI ID without intermediate escrow lockups.'
                  },
                  {
                    title: 'Cryptographic Audit Trail',
                    desc: 'Every split confirmation generates an immutable timestamp and payment intent reference ID for dispute-free travel.'
                  },
                  {
                    title: 'Isolated Group Permissions',
                    desc: 'Only confirmed travelers with group access tokens can view itemized receipts and member shares.'
                  }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'var(--bg-surface-warm)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <CheckCircle2 size={16} color="var(--emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 4: Our Principles */}
        {activeTab === 'principles' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: '16px',
                padding: '20px'
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
                Our 4 Guiding Commitments
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                {/* 1. Radical Serenity */}
                <div style={{ borderRadius: '14px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-warm)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '110px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                    <img
                      src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
                      alt="Radical Serenity"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
                    <span style={{ position: 'absolute', bottom: '8px', left: '10px', fontSize: '0.68rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      🕊️ Quiet Craft
                    </span>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Radical Serenity</div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      Technology should reduce anxiety, not add noise. Clean UI, quiet notifications, and crystal clear balances.
                    </p>
                  </div>
                </div>

                {/* 2. Authentic Sanctuaries */}
                <div style={{ borderRadius: '14px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-warm)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '110px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                    <img
                      src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80"
                      alt="Authentic Sanctuaries"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
                    <span style={{ position: 'absolute', bottom: '8px', left: '10px', fontSize: '0.68rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      🏔️ Boutique Stays
                    </span>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Authentic Sanctuaries</div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      Championing boutique, eco-conscious stays that honor local cultures and sustainable tourism.
                    </p>
                  </div>
                </div>

                {/* 3. Zero Hidden Fees */}
                <div style={{ borderRadius: '14px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-warm)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '110px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                    <img
                      src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80"
                      alt="Zero Hidden Fees"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
                    <span style={{ position: 'absolute', bottom: '8px', left: '10px', fontSize: '0.68rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      💎 Transparent Ledger
                    </span>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Zero Hidden Fees</div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      No sneaky micro-cut fees on splits. Honest ledger calculation that keeps every rupee and cent accurate.
                    </p>
                  </div>
                </div>

                {/* 4. Offline-First Craft */}
                <div style={{ borderRadius: '14px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-warm)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '110px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                    <img
                      src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80"
                      alt="Offline-First Craft"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
                    <span style={{ position: 'absolute', bottom: '8px', left: '10px', fontSize: '0.68rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      ⚡ Always Ready
                    </span>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Offline-First Craft</div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      Works high up on Himalayan passes or in underground metro stops. Syncs automatically when back online.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Supported Payment & Banking Gateways Card with Real Logos */}
        <div
          style={{
            marginTop: '24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-card)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={18} color="#059669" />
              </div>
              <div style={{ minWidth: 0 }}>
                <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.02rem', margin: 0, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  Supported Payment & Settlement Rails
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  NPCI-Compliant Direct UPI Settlement
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#059669',
                background: 'rgba(5, 150, 105, 0.1)',
                padding: '3px 8px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                flexShrink: 0
              }}
            >
              Verified
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>
            Direct peer-to-peer settlement works natively across India's leading UPI apps and banking networks with instant verification and cryptographic receipts.
          </p>

            {/* Payment Gateway Branded Logos Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '10px' }}>
              {/* PhonePe */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(95, 37, 159, 0.08)', border: '1px solid rgba(95, 37, 159, 0.25)' }}>
                <svg width="28" height="28" viewBox="0 0 48 48" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="24" cy="24" r="23" fill="#5F259F" />
                  <path d="M33.2 16.8c-1.1-.9-2.7-1.4-4.7-1.4h-9.5c-.8 0-1.4.6-1.4 1.4v19.2c0 .8.6 1.4 1.4 1.4.8 0 1.4-.6 1.4-1.4v-7.5h8.1c2.1 0 3.7-.5 4.8-1.5 1.1-1 1.7-2.4 1.7-4.2s-.6-3.8-1.8-4.8zm-1.8 7.3c-.6.6-1.6.9-3 .9h-8v-7.1h8c1.4 0 2.4.3 3 .9.6.6.9 1.4.9 2.6s-.3 2.1-.9 2.7z" fill="#FFFFFF" />
                  <path d="M26.2 29.1l8.5 8.7c.3.3.7.5 1.1.5.4 0 .8-.2 1.1-.5.6-.6.6-1.5 0-2.1l-8.3-8.5-2.4 1.9z" fill="#FFFFFF" />
                  <path d="M27.8 15.6l3.4-5.9c.4-.7.1-1.6-.6-2-.7-.4-1.6-.1-2 .6l-3.4 5.9 2.6 1.4z" fill="#FFFFFF" />
                </svg>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5F259F', lineHeight: 1.2 }}>PhonePe</div>
                  <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Direct Intent</div>
                </div>
              </div>

              {/* Google Pay */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(66, 133, 244, 0.08)', border: '1px solid rgba(66, 133, 244, 0.25)' }}>
                <svg width="28" height="28" viewBox="0 0 48 48" fill="none" style={{ flexShrink: 0 }}>
                  <rect width="48" height="48" rx="12" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
                  <path d="M35.6 24.3c0-.8-.1-1.5-.2-2.3H24v4.6h6.5c-.3 1.5-1.2 2.8-2.5 3.7v3.1h4c2.4-2.2 3.6-5.5 3.6-9.1z" fill="#4285F4" />
                  <path d="M24 36c3.2 0 6-1.1 8-3l-4-3.1c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-5H13.2v3.2C15.2 33.1 19.3 36 24 36z" fill="#34A853" />
                  <path d="M17.4 26.1c-.2-.7-.4-1.4-.4-2.1s.2-1.4.4-2.1V18.7H13.2C12.4 20.3 12 22.1 12 24s.4 3.7 1.2 5.3l4.2-3.2z" fill="#FBBC05" />
                  <path d="M24 16.9c1.8 0 3.3.6 4.6 1.8l3.4-3.4C29.9 13.4 27.2 12 24 12c-4.7 0-8.8 2.9-10.8 6.7l4.2 3.2c.9-2.9 3.5-5 6.6-5z" fill="#EA4335" />
                </svg>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>Google Pay</div>
                  <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>UPI Verified</div>
                </div>
              </div>

              {/* Paytm */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(0, 185, 245, 0.08)', border: '1px solid rgba(0, 185, 245, 0.28)' }}>
                <svg width="34" height="26" viewBox="0 0 60 32" fill="none" style={{ flexShrink: 0 }}>
                  <rect width="60" height="32" rx="8" fill="#002E6E" />
                  <text x="7" y="21" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="14" letterSpacing="-0.5">Pay</text>
                  <text x="33" y="21" fill="#00BAF2" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="14" letterSpacing="-0.5">tm</text>
                </svg>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#002E6E', lineHeight: 1.2 }}>Paytm</div>
                  <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Instant Flow</div>
                </div>
              </div>

              {/* BHIM / UPI */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(36, 62, 54, 0.08)', border: '1px solid rgba(36, 62, 54, 0.25)' }}>
                <svg width="34" height="26" viewBox="0 0 60 32" fill="none" style={{ flexShrink: 0 }}>
                  <rect width="60" height="32" rx="8" fill="#FAF8F5" stroke="#CBD5E1" />
                  <path d="M12 7h9l9 11-4 5.5-14-16.5z" fill="#09793A" />
                  <path d="M22 7h9l7 8.5-4 5.5-12-14z" fill="#F37021" />
                  <text x="37" y="22" fill="#243E36" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="9">UPI</text>
                </svg>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#243E36', lineHeight: 1.2 }}>BHIM UPI</div>
                  <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>NPCI Gateway</div>
                </div>
              </div>
            </div>
          </div>


        {/* Bottom Back Button */}
        <div style={{ marginTop: '28px', textAlign: 'center' }}>
          <button
            type="button"
            className="btn-back-transparent"
            onClick={onBack}
            style={{
              width: 'auto',
              height: 'auto',
              padding: '10px 24px',
              borderRadius: '9999px',
              background: 'transparent !important',
              color: 'var(--brand-olive)',
              fontWeight: 600,
              fontSize: '0.86rem',
              border: '1.5px solid var(--brand-olive)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
