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
  Code2,
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--border-light)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn-icon-circle"
              onClick={onBack}
              title="Back to Dashboard"
              style={{
                width: '40px',
                height: '40px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowLeft size={18} color="var(--text-primary)" />
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.4rem',
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.2
                  }}
                >
                  About Triptual
                </h1>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'var(--brand-olive)',
                    color: 'var(--accent-chartreuse)'
                  }}
                >
                  v2.4 Pro
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Smart Expedition Ledger & Group Concierge
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyShare}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '0.74rem',
              fontWeight: 600,
              borderRadius: '9999px',
              background: copiedLink ? 'var(--emerald)' : 'var(--bg-surface)',
              color: copiedLink ? '#FFFFFF' : 'var(--text-primary)',
              border: '1px solid var(--border-card)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
            <span>{copiedLink ? 'Link Copied!' : 'Share App'}</span>
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
              fontSize: '1.65rem',
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
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 700, color: 'var(--brand-olive)' }}>
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
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 700, color: 'var(--emerald)' }}>
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
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 700, color: 'var(--brand-olive)' }}>
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
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 700, color: 'var(--brand-olive)' }}>
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
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
                Why We Built Triptual
              </h3>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                Group travel creates lifelong memories, but traditional expense sharing is plagued by friction. People forget receipts, debate currency rates, and end up sending dozens of micro-transactions to each other.
              </p>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
                Triptual combines <strong>modern boutique travel curation</strong> with an <strong>autonomous financial ledger</strong>. We handle split calculations, eliminate circular debts, and deep-link instant UPI payments so you can stay immersed in your journey.
              </p>
            </div>

            {/* Core Feature Pillars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  gap: '14px'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--brand-olive-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Compass size={20} color="var(--brand-olive)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Boutique Stay Curation
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                    AI-matched accommodations scoring walkability, local food scenes, and noise level tranquility.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  gap: '14px'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <TrendingDown size={20} color="var(--emerald)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Debt Loop Elimination
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                    Mathematical graph engine automatically reduces 20+ member debts down to 3–4 streamlined payments.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  gap: '14px'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--accent-chartreuse-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Wallet size={20} color="var(--brand-olive)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    1-Tap UPI Settlement
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                    Zero transaction commission, auto-filled payment intents, and instant cryptographic settlement receipts.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  gap: '14px'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(212, 175, 55, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Users size={20} color="var(--accent-gold)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Zero-Install Guest Access
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                    Travel companions join with magic links, scan QR codes, and view live splits on any mobile device.
                  </p>
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
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0 }}>
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
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0 }}>
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
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
                Our 4 Guiding Commitments
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-warm)' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>🕊️</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>Radical Serenity</div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Technology should reduce anxiety, not add noise. Clean UI, quiet notifications, and crystal clear balances.
                  </p>
                </div>

                <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-warm)' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>🏔️</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>Authentic Sanctuaries</div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Championing boutique, eco-conscious stays that honor local cultures and sustainable tourism.
                  </p>
                </div>

                <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-warm)' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>💎</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>Zero Hidden Fees</div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    No sneaky micro-cut fees on splits. Honest ledger calculation that keeps every rupee and cent accurate.
                  </p>
                </div>

                <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-warm)' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>⚡</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>Offline-First Craft</div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Works high up on Himalayan passes or in underground metro stops. Syncs automatically when back online.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Technology & HackCelestial Genesis Card */}
        <div
          style={{
            marginTop: '24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-card)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code2 size={18} color="var(--brand-olive)" />
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '0.98rem', margin: 0, color: 'var(--text-primary)' }}>
                Engineered for HackCelestial 2026
              </h4>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: 'var(--brand-olive)',
                background: 'var(--brand-olive-subtle)',
                padding: '3px 8px',
                borderRadius: '6px'
              }}
            >
              Full-Stack Edition
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>
            Crafted with modern TypeScript, React, PostgreSQL with neon connection pools, and tailored design systems. Built to establish a new golden standard for expedition finances and group travel bliss.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
            {['React 18', 'TypeScript', 'Vite', 'PostgreSQL', 'Tailwind & Theme Tokens', 'Directed Graph Optimization', 'Deep UPI Intent Engine'].map((tech) => (
              <span
                key={tech}
                style={{
                  fontSize: '0.68rem',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  background: 'var(--bg-surface-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-light)'
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Back Button */}
        <div style={{ marginTop: '28px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '10px 24px',
              borderRadius: '9999px',
              background: 'var(--brand-olive)',
              color: 'var(--accent-chartreuse)',
              fontWeight: 600,
              fontSize: '0.82rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(46, 51, 27, 0.2)'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
