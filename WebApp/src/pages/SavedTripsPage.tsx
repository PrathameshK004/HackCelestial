import React, { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  MapPin,
  Star,
  Sparkles,
  Share2,
  Check
} from 'lucide-react';

interface SavedTripsPageProps {
  onBack: () => void;
  savedStayIds: string[];
  onToggleSave: (id: string) => void;
}

interface SavedStayItem {
  id: string;
  name: string;
  type: string;
  category: string;
  destination: string;
  rating: number;
  pricePerNight: number;
  matchScore: number;
  image: string;
  highlights: string;
}

const ALL_SAVED_STAYS: SavedStayItem[] = [
  {
    id: 'stay-cozy-den',
    name: 'Cozy Den Villa',
    type: 'Luxury Villa',
    category: 'villa',
    destination: 'Barcelona, Spain',
    rating: 4.96,
    pricePerNight: 280,
    matchScore: 98,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    highlights: 'Private infinity pool · Sunset patio overlooking coast'
  },
  {
    id: 'stay-oasis',
    name: 'Desert Oasis Retreat',
    type: 'Resort & Spa',
    category: 'resort',
    destination: 'Joshua Tree, CA',
    rating: 4.92,
    pricePerNight: 340,
    matchScore: 95,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    highlights: 'Stargazing deck · Natural hot spring plunge bath'
  },
  {
    id: 'stay-nordic-cabin',
    name: 'Nordic Pine Haven',
    type: 'Alpine Chalet',
    category: 'cabin',
    destination: 'Zermatt, Switzerland',
    rating: 4.98,
    pricePerNight: 420,
    matchScore: 99,
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    highlights: 'Ski-in ski-out · Woodburning cedar fireplace'
  },
  {
    id: 'stay-kyoto-ryokan',
    name: 'Bamboo Garden Ryokan',
    type: 'Traditional Ryokan',
    category: 'house',
    destination: 'Kyoto, Japan',
    rating: 4.95,
    pricePerNight: 310,
    matchScore: 94,
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    highlights: 'Private onsen bath · Tatami dining hall for groups'
  }
];

export const SavedTripsPage: React.FC<SavedTripsPageProps> = ({
  onBack,
  savedStayIds,
  onToggleSave
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isCopied, setIsCopied] = useState(false);

  const activeStays = ALL_SAVED_STAYS.filter(
    (s) => savedStayIds.includes(s.id) || savedStayIds.length === 0
  ).filter((s) => (activeCategory === 'all' ? true : s.category === activeCategory));

  const handleShareWishlist = () => {
    const text = `*🌟 Triptual Shared Wishlist (${activeStays.length} stays)*\n\n` +
      activeStays.map((s, i) => `${i + 1}. ${s.name} (${s.destination}) — $${s.pricePerNight}/night [${s.matchScore}% Match]`).join('\n') +
      `\n\n_Curated via Triptual Luxury Travel Platform_`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="profile-page-root animate-fade-in" style={{ paddingBottom: '90px' }}>
      <div className="profile-page-container" style={{ maxWidth: '680px', padding: '12px 14px 40px' }}>
        {/* Clean Header: Back Button + Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '18px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-light)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn-back-transparent"
              onClick={onBack}
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft size={22} color="var(--text-primary)" />
            </button>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.35rem',
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.2
              }}
            >
              Saved Wishlist
            </h1>
          </div>

          <button
            type="button"
            className="profile-header-icon-btn"
            onClick={handleShareWishlist}
            title="Share Wishlist"
            style={{ padding: '6px 12px', fontSize: '0.74rem' }}
          >
            {isCopied ? <Check size={13} color="var(--accent-emerald)" /> : <Share2 size={13} />}
            <span>{isCopied ? 'Copied' : 'Share'}</span>
          </button>
        </div>

        {/* Hero Summary Metrics Strip */}
        <div className="expense-split-hero-strip" style={{ marginBottom: '16px' }}>
          <div className="expense-metric-card" style={{ padding: '14px 14px' }}>
            <div className="expense-metric-header">
              <span className="expense-metric-title" style={{ fontSize: '0.7rem' }}>Saved Accommodations</span>
              <Heart size={14} color="var(--accent-rose)" fill="var(--accent-rose)" />
            </div>
            <div className="expense-metric-val" style={{ color: 'var(--accent-olive)', fontSize: '1.3rem' }}>
              {activeStays.length} Stays
            </div>
            <div className="expense-metric-sub" style={{ fontSize: '0.7rem' }}>Curated across {new Set(activeStays.map(s => s.destination.split(',')[1]?.trim())).size} countries</div>
          </div>

          <div className="expense-metric-card" style={{ padding: '14px 14px' }}>
            <div className="expense-metric-header">
              <span className="expense-metric-title" style={{ fontSize: '0.7rem' }}>Average Match Rate</span>
              <Sparkles size={14} color="var(--accent-amber)" />
            </div>
            <div className="expense-metric-val" style={{ fontSize: '1.3rem' }}>
              {Math.round(activeStays.reduce((a, b) => a + b.matchScore, 0) / (activeStays.length || 1))}%
            </div>
            <div className="expense-metric-sub" style={{ fontSize: '0.7rem' }}>Based on travel vibe</div>
          </div>

          <div className="expense-metric-card" style={{ padding: '14px 14px' }}>
            <div className="expense-metric-header">
              <span className="expense-metric-title" style={{ fontSize: '0.7rem' }}>Price Range</span>
              <Star size={14} color="var(--accent-olive)" />
            </div>
            <div className="expense-metric-val" style={{ fontSize: '1.15rem' }}>
              ${Math.min(...activeStays.map(s => s.pricePerNight), 280)}–${Math.max(...activeStays.map(s => s.pricePerNight), 420)}
            </div>
            <div className="expense-metric-sub" style={{ fontSize: '0.7rem' }}>Per night group stay</div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="clean-section-card" style={{ padding: '10px 14px', marginBottom: '16px' }}>
          <div className="category-pills-bar" style={{ padding: 0, margin: 0 }}>
            {['all', 'villa', 'resort', 'cabin', 'house'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                style={{ padding: '4px 12px', fontSize: '0.74rem' }}
              >
                <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stays Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {activeStays.map((stay) => (
            <div
              key={stay.id}
              className="clean-section-card"
              style={{
                padding: '0',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-light)'
              }}
            >
              <div style={{ position: 'relative', height: '170px', width: '100%' }}>
                <img
                  src={stay.image}
                  alt={stay.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <button
                    type="button"
                    className="btn-icon-circle"
                    style={{ background: 'rgba(255, 255, 255, 0.92)', width: '32px', height: '32px' }}
                    onClick={() => onToggleSave(stay.id)}
                    title="Remove from saved"
                  >
                    <Heart size={15} fill="#E11D48" color="#E11D48" />
                  </button>
                </div>
                <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
                  <span className="match-badge" style={{ background: 'var(--accent-olive)', color: '#FFFFFF', fontWeight: 700, fontSize: '0.68rem', padding: '2px 8px' }}>
                    {stay.matchScore}% Match
                  </span>
                </div>
              </div>

              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
                    {stay.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.78rem', fontWeight: 600 }}>
                    <Star size={13} fill="#E5EC68" color="#A39014" />
                    <span>{stay.rating}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <MapPin size={12} />
                  <span>{stay.destination}</span>
                  <span>·</span>
                  <span>{stay.type}</span>
                </div>

                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0 8px', lineHeight: 1.3 }}>
                  {stay.highlights}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '8px', marginTop: '2px' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ${stay.pricePerNight}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> / night</span>
                  </div>

                  <button
                    type="button"
                    className="btn-primary-luxury"
                    style={{ padding: '5px 12px', fontSize: '0.74rem' }}
                    onClick={onBack}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {activeStays.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
            <Heart size={36} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginBottom: '4px', fontSize: '1.1rem' }}>
              No Saved Stays in this Category
            </h3>
            <p style={{ fontSize: '0.78rem' }}>Explore our curated matches and tap the heart icon to save favorites.</p>
          </div>
        )}
      </div>
    </div>
  );
};
