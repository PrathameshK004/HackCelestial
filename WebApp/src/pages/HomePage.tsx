import React, { useEffect, useState, useMemo } from 'react';
import {
  Compass,
  Plus,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Star,
  Users,
  Heart,
  Building,
  Home,
  Tent,
  Palmtree,
  Moon,
  Footprints,
  Utensils,
  Share2,
  User,
  Plane,
  CreditCard,
  ShieldCheck,
  HelpCircle,
  LogOut,
  Zap,
  Check,
  Wallet,
  Split,
  Info,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { groupService } from '../services/group.service';
import { GroupSummary, SettlementData } from '../types/group';
import { GroupMenuPage } from './GroupMenuPage';
import { ProfilePage } from './ProfilePage';
import { PaymentsPage } from './PaymentsPage';
import { SavedTripsPage } from './SavedTripsPage';
import { SecuritySettingsPage } from './SecuritySettingsPage';
import { HelpSupportPage } from './HelpSupportPage';
import { AboutPage } from './AboutPage';
import { QuickExpenseModal } from '../components/home/QuickExpenseModal';
import { JoinGroupModal } from '../components/home/JoinGroupModal';
import { SettleUpModal } from '../components/settlement/SettleUpModal';
import {
  MOCK_DASHBOARD_GROUPS,
  SimplifiedTransfer,
  calculateOptimalSettlements
} from '../mock/dashboardMockData';
import { RoundtableGroupsIcon } from '../components/common/RoundtableGroupsIcon';

interface HomePageProps {
  onCreateGroup: () => void;
  initialSelectedGroupId?: string;
}

type DockTab = 'explore' | 'trips' | 'expenses' | 'profile' | 'saved';
type ViewMode = 'gallery' | 'list' | 'map';
type StayCategory = 'all' | 'hotel' | 'villa' | 'resort' | 'camping' | 'house';

interface CuratedStay {
  id: string;
  name: string;
  type: string;
  category: StayCategory;
  destination: string;
  dateRange: string;
  guests: number;
  matchScore: number;
  rating: number;
  pricePerNight: number;
  totalNights: number;
  style: string;
  distance: string;
  featured?: boolean;
  image: string;
  altImages: string[];
  metrics: {
    walk: number;
    food: number;
    activity: number;
  };
  whyMatched: {
    icon: 'walk' | 'food' | 'quiet';
    title: string;
    description: string;
  }[];
}

const CURATED_STAYS: CuratedStay[] = [
  {
    id: 'stay-cozy-den',
    name: 'Cozy Den',
    type: 'Hotel',
    category: 'hotel',
    destination: 'Barcelona',
    dateRange: 'Jun 15-22',
    guests: 2,
    matchScore: 91,
    rating: 4.78,
    pricePerNight: 146,
    totalNights: 7,
    style: 'Boutique',
    distance: '0.3 km',
    featured: true,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    altImages: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80'
    ],
    metrics: { walk: 91, food: 91, activity: 91 },
    whyMatched: [
      {
        icon: 'walk',
        title: 'Walkable to your saved spots',
        description: '4 of your wishlist places within 800m'
      },
      {
        icon: 'food',
        title: 'Food scene fits your trips',
        description: 'Matches where you ate in Lisbon & Rome'
      },
      {
        icon: 'quiet',
        title: 'Quiet area, like your last 3 stays',
        description: 'Residential street, low night noise'
      }
    ]
  },
  {
    id: 'stay-oasis',
    name: 'Oasis',
    type: 'Villa',
    category: 'villa',
    destination: 'San Francisco',
    dateRange: 'Jun 15-22',
    guests: 5,
    matchScore: 95,
    rating: 4.96,
    pricePerNight: 280,
    totalNights: 7,
    style: 'Modern Minimalist',
    distance: '0.5 km',
    featured: true,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    altImages: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80'
    ],
    metrics: { walk: 94, food: 96, activity: 88 },
    whyMatched: [
      {
        icon: 'walk',
        title: 'Central location near Golden Gate parks',
        description: 'Direct cycling route and cable car access'
      },
      {
        icon: 'food',
        title: 'Artisanal bakeries & cafes nearby',
        description: 'Top-rated breakfast spots within 3 minutes'
      },
      {
        icon: 'quiet',
        title: 'Hillside retreat with sunset views',
        description: 'Sound-insulated architecture with private terrace'
      }
    ]
  },
  {
    id: 'stay-garden-escape',
    name: 'Garden Escape',
    type: 'House',
    category: 'villa',
    destination: 'Provence',
    dateRange: 'Jun 15-22',
    guests: 3,
    matchScore: 87,
    rating: 4.89,
    pricePerNight: 132,
    totalNights: 7,
    style: 'Coastal',
    distance: '1.2 km',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
    altImages: [],
    metrics: { walk: 85, food: 89, activity: 84 },
    whyMatched: [
      {
        icon: 'walk',
        title: 'Lush botanical garden proximity',
        description: 'Surrounded by lavender fields and olive groves'
      },
      {
        icon: 'food',
        title: 'Local winery tours and organic markets',
        description: 'Farm-to-table dining matches your profile'
      },
      {
        icon: 'quiet',
        title: 'Private estate with solar heated pool',
        description: 'Zero road noise and clear stargazing skies'
      }
    ]
  },
  {
    id: 'stay-coastal-villa',
    name: 'Coastal Villa',
    type: 'Resort',
    category: 'resort',
    destination: 'Santorini',
    dateRange: 'Jun 15-22',
    guests: 4,
    matchScore: 83,
    rating: 4.62,
    pricePerNight: 195,
    totalNights: 7,
    style: 'Mediterranean',
    distance: '0.8 km',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    altImages: [],
    metrics: { walk: 82, food: 88, activity: 90 },
    whyMatched: [
      {
        icon: 'walk',
        title: 'Direct cliff path to private bay',
        description: 'Private access to crystal blue waters'
      },
      {
        icon: 'food',
        title: 'Fresh seafood taverns on the pier',
        description: 'Matched with your Greek cuisine favorites'
      },
      {
        icon: 'quiet',
        title: 'Panoramic Aegean sea horizon',
        description: 'Private infinity pool facing the sunset'
      }
    ]
  },
  {
    id: 'stay-wilderness-escape',
    name: 'Wilderness Escape',
    type: 'Camping',
    category: 'camping',
    destination: 'Banff',
    dateRange: 'Jun 15-22',
    guests: 2,
    matchScore: 79,
    rating: 4.94,
    pricePerNight: 120,
    totalNights: 7,
    style: 'Classic Eco-Yurt',
    distance: '2.0 km',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
    altImages: [],
    metrics: { walk: 90, food: 74, activity: 96 },
    whyMatched: [
      {
        icon: 'walk',
        title: 'Trailhead at your doorstep',
        description: 'Direct access to Alpine ridges and glacial lakes'
      },
      {
        icon: 'food',
        title: 'Woodfired cooking & campfire grill',
        description: 'Artisanal local provisions delivered daily'
      },
      {
        icon: 'quiet',
        title: 'Pure silence under the pine canopy',
        description: 'Off-grid comfort with woodburning stove'
      }
    ]
  }
];

export const HomePage: React.FC<HomePageProps> = ({ onCreateGroup, initialSelectedGroupId }) => {
  const { user, logout } = useAuth();

  // Navigation States
  const [dockTab, setDockTab] = useState<DockTab>('explore');
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [activeCategory, setActiveCategory] = useState<StayCategory>('all');
  const [selectedStay, setSelectedStay] = useState<CuratedStay | null>(null);
  const [savedStayIds, setSavedStayIds] = useState<string[]>(['stay-cozy-den', 'stay-oasis']);

  // Backend & Mock Data States
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupSummary | null>(null);
  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  // Modals & Menus
  const [selectedExpenseGroupId, setSelectedExpenseGroupId] = useState<string>(MOCK_DASHBOARD_GROUPS[0]?.id || 'custom-sandbox');
  const [isCopiedShare, setIsCopiedShare] = useState(false);
  const [completedTransferIds, setCompletedTransferIds] = useState<string[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [isSavedTripsOpen, setIsSavedTripsOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [settleTransferData, setSettleTransferData] = useState<SimplifiedTransfer | null>(null);

  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Load Groups from API (real-time from PostgreSQL database)
  const loadGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const response = await groupService.getMyGroups();
      if (response.data && Array.isArray(response.data)) {
        setGroups(response.data);
        if (initialSelectedGroupId) {
          const matched = response.data.find((g: any) => g.id === initialSelectedGroupId);
          if (matched) setSelectedGroup(matched);
        }
      } else {
        setGroups([]);
      }
    } catch (err: any) {
      console.warn('Could not load user groups:', err.message);
      setGroups([]);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // Fetch group settlement when group is selected
  useEffect(() => {
    if (!selectedGroup) return;
    groupService
      .getSettlement(selectedGroup.id)
      .then((res) => {
        setSettlement(res.data);
      })
      .catch((err) => {
        console.warn('Settlement calculation error:', err);
      });
  }, [selectedGroup]);

  // Toggle Saved Stays
  const toggleSaveStay = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedStayIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filtered Stays
  const filteredStays = useMemo(() => {
    return CURATED_STAYS.filter((stay) => {
      const matchCategory =
        activeCategory === 'all' || stay.category === activeCategory;
      return matchCategory;
    });
  }, [activeCategory]);

  const featuredStay = filteredStays[0] || CURATED_STAYS[0];
  const gridMatches = filteredStays.slice(1);

  const displayName = user?.username || 'Guest';
  const displayInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // ---------------- VIEW: DEDICATED PROFILE PAGE ----------------
  if (isProfileOpen || dockTab === 'profile') {
    return (
      <ProfilePage
        onBack={() => {
          setIsProfileOpen(false);
          setDockTab('explore');
        }}
      />
    );
  }

  // ---------------- VIEW: DEDICATED PAYMENTS FULL PAGE ----------------
  if (isPaymentHistoryOpen) {
    return (
      <PaymentsPage
        onBack={() => {
          setIsPaymentHistoryOpen(false);
          setDockTab('explore');
        }}
      />
    );
  }

  // ---------------- VIEW: DEDICATED SAVED TRIPS & WISHLIST FULL PAGE ----------------
  if (isSavedTripsOpen) {
    return (
      <SavedTripsPage
        savedStayIds={savedStayIds}
        onToggleSave={(id) => toggleSaveStay({ stopPropagation: () => {} } as any, id)}
        onBack={() => {
          setIsSavedTripsOpen(false);
          setDockTab('explore');
        }}
      />
    );
  }

  // ---------------- VIEW: DEDICATED SECURITY & SETTINGS FULL PAGE ----------------
  if (isSecurityOpen) {
    return (
      <SecuritySettingsPage
        onBack={() => {
          setIsSecurityOpen(false);
          setDockTab('explore');
        }}
      />
    );
  }

  // ---------------- VIEW: DEDICATED HELP & SUPPORT FULL PAGE ----------------
  if (isHelpOpen) {
    return (
      <HelpSupportPage
        onBack={() => {
          setIsHelpOpen(false);
          setDockTab('explore');
        }}
      />
    );
  }

  // ---------------- VIEW: DEDICATED ABOUT TRIPTUAL FULL PAGE ----------------
  if (isAboutOpen) {
    return (
      <AboutPage
        onBack={() => {
          setIsAboutOpen(false);
          setDockTab('explore');
        }}
        onExploreStays={() => {
          setIsAboutOpen(false);
          setDockTab('explore');
        }}
        onCreateTrip={() => {
          setIsAboutOpen(false);
          onCreateGroup();
        }}
      />
    );
  }

  // If a group is selected and settlement is loaded, render GroupMenuPage
  if (selectedGroup && settlement) {
    return (
      <GroupMenuPage
        group={selectedGroup}
        settlement={settlement}
        onBack={() => {
          setSelectedGroup(null);
          setSettlement(null);
        }}
        onRefresh={async () => {
          const res = await groupService.getSettlement(selectedGroup.id);
          setSettlement(res.data);
        }}
        onSettled={async () => {
          await groupService.settleGroup(selectedGroup.id);
          setSelectedGroup(null);
          setSettlement(null);
          await loadGroups();
        }}
      />
    );
  }

  // ---------------- VIEW: STAY DETAIL VIEW (Screenshots 4 & 5) ----------------
  if (selectedStay) {
    return (
      <div className="app-wrapper">
        <div className="app-content-container">
          {/* Stay Hero Detail Card */}
          <div className="stay-hero-detail-wrapper">
            <img
              src={selectedStay.image}
              alt={selectedStay.name}
              className="stay-hero-bg-img"
            />
            <div className="stay-hero-gradient" />

            {/* Top Navigation Bar on Hero */}
            <div className="stay-hero-nav">
              <button
                type="button"
                className="btn-icon-circle"
                onClick={() => setSelectedStay(null)}
                style={{ background: 'rgba(255,255,255,0.85)' }}
                title="Back to matches"
              >
                <ArrowLeft size={18} />
              </button>

              <div
                className="triptual-brand-wrap"
                style={{ color: '#FFFFFF' }}
                onClick={() => setSelectedStay(null)}
              >
                <img
                  src="/triptual-logo.png"
                  alt="Triptual Logo"
                  className="triptual-header-logo-icon"
                />
                <span className="stay-hero-nav-title">Triptual</span>
              </div>

              <button
                type="button"
                className="btn-icon-circle"
                onClick={(e) => toggleSaveStay(e, selectedStay.id)}
                style={{ background: 'rgba(255,255,255,0.85)' }}
                title="Save stay"
              >
                <Heart
                  size={18}
                  fill={savedStayIds.includes(selectedStay.id) ? '#E11D48' : 'none'}
                  color={savedStayIds.includes(selectedStay.id) ? '#E11D48' : '#181916'}
                />
              </button>
            </div>

            {/* Center Content & Title */}
            <div className="stay-hero-center-content">
              <div className="stay-hero-avatar-badge">
                <span>{selectedStay.name.charAt(0)}</span>
              </div>
              <div className="stay-hero-kicker">Your perfect place</div>
              <div className="stay-hero-meta">
                {selectedStay.destination} · {selectedStay.dateRange} · {selectedStay.guests} guests
              </div>
              <h1 className="stay-hero-name">
                <MapPin size={22} color="#E5EC68" fill="#E5EC68" />
                <span>{selectedStay.name}</span>
              </h1>
            </div>

            {/* Circular Match Progress Rings (Walk 91%, Food 91%, Activity 91%) */}
            <div className="circular-gauges-row">
              {/* Gauge 1: Walk */}
              <div className="gauge-item">
                <svg className="gauge-ring-svg" viewBox="0 0 36 36">
                  <path
                    className="gauge-ring-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="3.5"
                  />
                  <path
                    className="gauge-ring-progress"
                    strokeDasharray={`${selectedStay.metrics.walk}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="3.5"
                  />
                </svg>
                <div className="gauge-text">
                  <div className="gauge-label">Walk</div>
                  <div className="gauge-val">{selectedStay.metrics.walk}%</div>
                </div>
              </div>

              {/* Gauge 2: Food */}
              <div className="gauge-item">
                <svg className="gauge-ring-svg" viewBox="0 0 36 36">
                  <path
                    className="gauge-ring-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="3.5"
                  />
                  <path
                    className="gauge-ring-progress"
                    strokeDasharray={`${selectedStay.metrics.food}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="3.5"
                  />
                </svg>
                <div className="gauge-text">
                  <div className="gauge-label">Food</div>
                  <div className="gauge-val">{selectedStay.metrics.food}%</div>
                </div>
              </div>

              {/* Gauge 3: Activity */}
              <div className="gauge-item">
                <svg className="gauge-ring-svg" viewBox="0 0 36 36">
                  <path
                    className="gauge-ring-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="3.5"
                  />
                  <path
                    className="gauge-ring-progress"
                    strokeDasharray={`${selectedStay.metrics.activity}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="3.5"
                  />
                </svg>
                <div className="gauge-text">
                  <div className="gauge-label">Activity</div>
                  <div className="gauge-val">{selectedStay.metrics.activity}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Sheet Card Details */}
          <div className="detail-sheet-card">
            {/* Compare Alternatives Matrix */}
            <div className="compare-matrix-wrapper">
              <div className="section-header-row">
                <h3 className="section-serif-title">Compare Alternatives</h3>
                <span className="section-counter-badge">3/12</span>
              </div>

              <table className="compare-matrix-table">
                <thead>
                  <tr>
                    <th style={{ width: '22%' }} />
                    <th style={{ width: '26%' }}>
                      <img
                        src={selectedStay.image}
                        alt="stay 1"
                        className="compare-thumb-img"
                      />
                    </th>
                    <th style={{ width: '26%' }}>
                      <img
                        src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=300&q=80"
                        alt="stay 2"
                        className="compare-thumb-img"
                      />
                    </th>
                    <th style={{ width: '26%' }}>
                      <img
                        src="https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=300&q=80"
                        alt="stay 3"
                        className="compare-thumb-img"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Match</td>
                    <td>
                      <span className="match-badge" style={{ padding: '2px 8px' }}>
                        {selectedStay.matchScore}%
                      </span>
                    </td>
                    <td>85%</td>
                    <td>81%</td>
                  </tr>
                  <tr>
                    <td>Price</td>
                    <td style={{ fontWeight: 600 }}>${selectedStay.pricePerNight}</td>
                    <td>$132</td>
                    <td>$120</td>
                  </tr>
                  <tr>
                    <td>Style</td>
                    <td>{selectedStay.style}</td>
                    <td>Coastal</td>
                    <td>Classic</td>
                  </tr>
                  <tr>
                    <td>Location</td>
                    <td>{selectedStay.distance}</td>
                    <td>1.2 km</td>
                    <td>2 km</td>
                  </tr>
                  <tr>
                    <td>Reviews</td>
                    <td>★ {selectedStay.rating}</td>
                    <td>★ 4.91</td>
                    <td>★ 4.91</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Why We Matched You */}
            <div className="why-matched-section">
              <h3 className="section-serif-title" style={{ marginBottom: '16px' }}>
                Why we matched you
              </h3>
              <div className="why-matched-list">
                {selectedStay.whyMatched.map((item, idx) => (
                  <div key={idx} className="why-matched-item">
                    <div className="why-matched-icon-box">
                      {item.icon === 'walk' && <Footprints size={17} />}
                      {item.icon === 'food' && <Utensils size={17} />}
                      {item.icon === 'quiet' && <Moon size={17} />}
                    </div>
                    <div>
                      <div className="why-matched-title">{item.title}</div>
                      <div className="why-matched-desc">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticky Action Bar */}
            <div className="sticky-action-bar">
              <div className="sticky-price-col">
                <div className="price-main">
                  ${selectedStay.pricePerNight}{' '}
                  <span style={{ fontSize: '0.88rem', fontWeight: 400, color: 'var(--text-secondary)' }}>
                    /night
                  </span>
                </div>
                <div className="price-sub">
                  ${selectedStay.pricePerNight * selectedStay.totalNights} · {selectedStay.totalNights} nights
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-pill-reserve"
                  onClick={() => onCreateGroup()}
                >
                  Create Trip Ledger
                </button>
                <button
                  type="button"
                  className="btn-pill-reserve"
                  style={{ background: 'var(--accent-olive)', color: '#fff', borderColor: 'var(--accent-olive)' }}
                  onClick={() => {
                    alert(`Booking reservation confirmed for ${selectedStay.name}!`);
                  }}
                >
                  Reserve
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Floating Navigation Dock */}
        <nav className={`yondr-bottom-dock ${isProfileMenuOpen ? 'dock-behind-drawer' : ''}`}>
          <div className="yondr-bottom-dock-inner">
            <button
              type="button"
              className="dock-tab-btn active"
              onClick={() => setSelectedStay(null)}
            >
              <Compass size={20} />
              <span>Explore</span>
            </button>
            <button
              type="button"
              className="dock-tab-btn"
              onClick={() => {
                setSelectedStay(null);
                setDockTab('saved');
              }}
            >
              <Heart size={20} />
              <span>Saved</span>
            </button>
            <button
              type="button"
              className="dock-tab-btn"
              onClick={() => {
                setSelectedStay(null);
                setDockTab('trips');
              }}
            >
              <Plane size={20} />
              <span>Trips</span>
            </button>
            <button
              type="button"
              className="dock-tab-btn"
              onClick={() => setIsProfileOpen(true)}
            >
              <User size={20} />
              <span>Profile</span>
            </button>
          </div>
        </nav>
      </div>
    );
  }

  // ---------------- MAIN APP WRAPPER ----------------
  return (
    <div className="app-wrapper">
      <div className="app-content-container">
        {/* Top Header */}
        <header className={`yondr-top-header ${isProfileMenuOpen ? 'drawer-open' : ''}`}>
          <div className="yondr-top-header-inner">
            {/* Left: Brand Logo */}
            <div className="yondr-header-left">
              <div className="triptual-brand-wrap" onClick={() => setDockTab('explore')}>
                <img
                  src="/triptual-logo.png"
                  alt="Triptual"
                  className="triptual-header-logo-icon"
                />
                <span className="triptual-logo-text">Triptual</span>
              </div>
            </div>

            {/* Center: Desktop Navigation Links */}
            <div className="desktop-nav-links">
              <button
                type="button"
                className={`desktop-nav-link ${dockTab === 'explore' ? 'active' : ''}`}
                onClick={() => setDockTab('explore')}
              >
                <Compass size={15} />
                <span>Explore</span>
              </button>
              <button
                type="button"
                className={`desktop-nav-link ${dockTab === 'trips' ? 'active' : ''}`}
                onClick={() => setDockTab('trips')}
              >
                <RoundtableGroupsIcon size={19} />
                <span>Groups</span>
                {groups.length > 0 && (
                  <span className="match-badge" style={{ padding: '1px 6px', fontSize: '0.7rem' }}>
                    {groups.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={`desktop-nav-link ${dockTab === 'expenses' ? 'active' : ''}`}
                onClick={() => setDockTab('expenses')}
              >
                <Split size={15} />
                <span>Expense Split</span>
              </button>
            </div>

            {/* Right: Action Icons & Profile Dropdown */}
            <div className="yondr-header-right">
              <div className="profile-menu-anchor" ref={profileMenuRef}>
                {/* Mobile Hamburger Menu Button */}
                <button
                  type="button"
                  className={`btn-icon-circle mobile-hamburger-btn ${isProfileMenuOpen ? 'active' : ''}`}
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  title="Toggle Navigation Menu"
                  aria-label="Toggle navigation menu"
                >
                  <Menu size={18} />
                </button>

                {/* Desktop Profile Button */}
                <button
                  type="button"
                  className={`btn-icon-circle desktop-profile-btn ${isProfileMenuOpen ? 'active' : ''}`}
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  title="Account Menu"
                  aria-label="Toggle account menu"
                >
                  <User size={18} />
                </button>

                {isProfileMenuOpen && (
                  <>
                    <div
                      className="mobile-drawer-backdrop"
                      onClick={() => setIsProfileMenuOpen(false)}
                    />

                    <div className="luxury-profile-dropdown-menu">
                      {/* Mobile Drawer Header with Close Button */}
                      <div className="mobile-drawer-header">
                        <div
                          className="mobile-drawer-title"
                          onClick={() => {
                            setDockTab('explore');
                            setIsProfileMenuOpen(false);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <img
                            src="/triptual-logo.png"
                            alt="Triptual"
                            className="triptual-header-logo-icon"
                            style={{ width: '28px', height: '28px' }}
                          />
                          <span className="triptual-logo-text" style={{ fontSize: '1.3rem' }}>Triptual</span>
                        </div>
                        <button
                          type="button"
                          className="mobile-drawer-close"
                          onClick={() => setIsProfileMenuOpen(false)}
                          aria-label="Close menu"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {/* User Mini Card */}
                    <div className="profile-menu-user-header">
                      <div className="profile-menu-avatar">
                        {displayInitials}
                      </div>
                      <div className="profile-menu-user-info">
                        <div className="profile-menu-name">{displayName}</div>
                        <div className="profile-menu-email">{user?.emailId || 'organizer@triptual.com'}</div>
                      </div>
                    </div>

                    <div className="profile-menu-divider" />

                    {/* 6 Requested Menu Options */}
                    <div className="profile-menu-items-list">
                      {/* 1. My Profile */}
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsProfileOpen(true);
                        }}
                      >
                        <div className="profile-menu-item-icon">
                          <User size={15} />
                        </div>
                        <div className="profile-menu-item-text">
                          <span>My Profile</span>
                          <small>Personal & travel identity</small>
                        </div>
                      </button>

                      {/* 2. Payments */}
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsPaymentHistoryOpen(true);
                        }}
                      >
                        <div className="profile-menu-item-icon">
                          <CreditCard size={15} />
                        </div>
                        <div className="profile-menu-item-text">
                          <span>Payments</span>
                          <small>UPI VPAs & settlement history</small>
                        </div>
                      </button>

                      {/* 3. Saved trips */}
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsSavedTripsOpen(true);
                        }}
                      >
                        <div className="profile-menu-item-icon">
                          <Heart size={15} />
                        </div>
                        <div className="profile-menu-item-text">
                          <span>Saved trips</span>
                          <small>{savedStayIds.length} saved destinations</small>
                        </div>
                      </button>

                      {/* 4. Security and setting */}
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsSecurityOpen(true);
                        }}
                      >
                        <div className="profile-menu-item-icon">
                          <ShieldCheck size={15} />
                        </div>
                        <div className="profile-menu-item-text">
                          <span>Security & Setting</span>
                          <small>Password, 2FA & devices</small>
                        </div>
                      </button>

                      {/* 5. Help and support */}
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsHelpOpen(true);
                        }}
                      >
                        <div className="profile-menu-item-icon">
                          <HelpCircle size={15} />
                        </div>
                        <div className="profile-menu-item-text">
                          <span>Help & Support</span>
                          <small>FAQs & support guides</small>
                        </div>
                      </button>

                      {/* 6. About Triptual */}
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsAboutOpen(true);
                        }}
                      >
                        <div className="profile-menu-item-icon">
                          <Info size={15} />
                        </div>
                        <div className="profile-menu-item-text">
                          <span>About Triptual</span>
                          <small>Algorithm, security & mission</small>
                        </div>
                      </button>
                    </div>

                    <div className="profile-menu-divider" />

                    {/* 7. Logout */}
                    <button
                      type="button"
                      className="profile-menu-item profile-menu-logout"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                    >
                      <div className="profile-menu-item-icon logout-icon">
                        <LogOut size={15} />
                      </div>
                      <div className="profile-menu-item-text">
                        <span>Logout</span>
                        <small>End active session securely</small>
                      </div>
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </header>

        {/* ---------------- TAB: EXPLORE ---------------- */}
        {dockTab === 'explore' && (
          <main>
            {/* Header Subtitle: 12 curated picks · San Francisco */}
            <div className="curated-header-info">
              <h2 className="curated-title">12 curated picks</h2>
              <div className="curated-meta">
                <span>San Francisco</span>
                <span>·</span>
                <span>Jun 15-22</span>
                <span>·</span>
                <span>2 guests</span>
              </div>
            </div>

            {/* Segmented View Switcher: Map | Gallery | List */}
            <div className="view-segmented-control">
              <button
                type="button"
                className={`view-segment-btn ${viewMode === 'map' ? 'active' : ''}`}
                onClick={() => setViewMode('map')}
              >
                Map
              </button>
              <button
                type="button"
                className={`view-segment-btn ${viewMode === 'gallery' ? 'active' : ''}`}
                onClick={() => setViewMode('gallery')}
              >
                Gallery
              </button>
              <button
                type="button"
                className={`view-segment-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                List
              </button>
            </div>

            {/* Category Filter Pills (All options, Hotel, Villa, Resort, Camping...) */}
            <div className="category-pills-bar">
              <button
                type="button"
                className={`category-pill ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                <Building size={14} />
                <span>All options</span>
              </button>
              <button
                type="button"
                className={`category-pill ${activeCategory === 'hotel' ? 'active' : ''}`}
                onClick={() => setActiveCategory('hotel')}
              >
                <Building size={14} />
                <span>Hotel</span>
              </button>
              <button
                type="button"
                className={`category-pill ${activeCategory === 'villa' ? 'active' : ''}`}
                onClick={() => setActiveCategory('villa')}
              >
                <Home size={14} />
                <span>Villa</span>
              </button>
              <button
                type="button"
                className={`category-pill ${activeCategory === 'resort' ? 'active' : ''}`}
                onClick={() => setActiveCategory('resort')}
              >
                <Palmtree size={14} />
                <span>Resort</span>
              </button>
              <button
                type="button"
                className={`category-pill ${activeCategory === 'camping' ? 'active' : ''}`}
                onClick={() => setActiveCategory('camping')}
              >
                <Tent size={14} />
                <span>Camping</span>
              </button>
            </div>

            {/* VIEW MODE: GALLERY (Screenshots 1 & 2) */}
            {viewMode === 'gallery' && (
              <div>
                {/* Stacked Featured Hero Card */}
                <div className="hero-stack-wrapper">
                  {/* Visual Back Card Layer */}
                  <div
                    className="hero-stack-back-card"
                    style={{
                      backgroundImage: `url(${CURATED_STAYS[1]?.image || featuredStay.image})`
                    }}
                  />

                  {/* Main Featured Hero Card */}
                  <div
                    className="hero-featured-card"
                    onClick={() => setSelectedStay(featuredStay)}
                  >
                    <img
                      src={featuredStay.image}
                      alt={featuredStay.name}
                      className="hero-card-img"
                    />
                    <div className="hero-card-overlay">
                      {/* Top Badges: [Featured] [91% Match]  ★ 4.96 */}
                      <div className="hero-card-top-badges">
                        <div className="badges-group-left">
                          <span className="match-badge featured">Featured</span>
                          <span className="match-badge">
                            {featuredStay.matchScore}% Match
                          </span>
                        </div>
                        <div className="star-rating-badge">
                          <Star size={14} fill="#FFFFFF" />
                          <span>{featuredStay.rating}</span>
                        </div>
                      </div>

                      {/* Bottom Info on Card */}
                      <div className="hero-card-bottom-info">
                        <div className="hero-card-destination">
                          {featuredStay.name}
                        </div>
                        <div className="hero-card-sub">
                          {featuredStay.destination} · {featuredStay.type} · ${featuredStay.pricePerNight}/night
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* More matches for you 2x2 Grid */}
                <div className="section-header-row">
                  <h3 className="section-serif-title">More matches for you</h3>
                  <span className="section-counter-badge">
                    {gridMatches.length} of {CURATED_STAYS.length}
                  </span>
                </div>

                <div className="matches-2x2-grid">
                  {gridMatches.map((stay) => (
                    <div
                      key={stay.id}
                      className="match-grid-card"
                      onClick={() => setSelectedStay(stay)}
                    >
                      <img
                        src={stay.image}
                        alt={stay.name}
                        className="match-grid-img"
                      />
                      <div className="match-grid-overlay">
                        <div className="match-grid-top-badges">
                          <span className="match-badge">
                            {stay.matchScore}% Match
                          </span>
                          <div className="star-rating-badge">
                            <Star size={13} fill="#FFFFFF" />
                            <span>{stay.rating}</span>
                          </div>
                        </div>

                        <div style={{ color: '#FFFFFF' }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              textShadow: '0 1px 3px rgba(0,0,0,0.6)'
                            }}
                          >
                            {stay.name}
                          </div>
                          <div
                            style={{
                              fontSize: '0.74rem',
                              opacity: 0.9,
                              textShadow: '0 1px 3px rgba(0,0,0,0.6)'
                            }}
                          >
                            ${stay.pricePerNight}/night
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* View More Pill Button */}
                <button
                  type="button"
                  className="btn-view-more-pill"
                  onClick={() => setViewMode('list')}
                >
                  <span>View More · {CURATED_STAYS.length} Total Picks</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* VIEW MODE: LIST (Screenshot 3) */}
            {viewMode === 'list' && (
              <div>
                {/* User Match Banner */}
                <div className="curated-user-banner">
                  <div className="curated-avatar-circle">
                    <span>{displayInitials.charAt(0)}</span>
                  </div>
                  <div className="curated-user-text">
                    <h2>
                      Your <span>twelve</span> curated picks
                    </h2>
                    <p>Based on your trip preferences</p>
                  </div>
                </div>

                {/* Curated List Items */}
                <div className="curated-list-container">
                  {filteredStays.map((stay) => (
                    <div
                      key={stay.id}
                      className="curated-list-item"
                      onClick={() => setSelectedStay(stay)}
                    >
                      <div className="curated-item-left">
                        <img
                          src={stay.image}
                          alt={stay.name}
                          className="curated-item-thumb"
                        />
                        <div className="curated-item-details">
                          <h4 className="curated-item-title">{stay.name}</h4>
                          <div className="curated-item-meta">
                            <span>
                              <Home size={13} />
                              {stay.type}
                            </span>
                            <span>·</span>
                            <span>
                              <Users size={13} />
                              Guests {stay.guests}
                            </span>
                            <span>·</span>
                            <span>Price ${stay.pricePerNight > 150 ? '$$$' : '$$'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="curated-item-right">
                        <span className="match-badge">
                          {stay.matchScore}% Match
                        </span>
                        <div className="star-rating-badge">
                          <Star size={13} />
                          <span>★ {stay.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW MODE: MAP */}
            {viewMode === 'map' && (
              <div
                style={{
                  background: 'var(--bg-surface-warm)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  border: '1px solid var(--border-light)',
                  marginBottom: '24px'
                }}
              >
                <MapPin size={36} color="var(--accent-olive)" style={{ marginBottom: '12px' }} />
                <h3 className="section-serif-title" style={{ marginBottom: '6px' }}>
                  Interactive Destination Map
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Showing curated stay locations with match ratings across San Francisco & Barcelona.
                </p>
                <button
                  type="button"
                  className="btn-primary-luxury"
                  style={{ width: 'fit-content', margin: '0 auto' }}
                  onClick={() => setViewMode('gallery')}
                >
                  Return to Curated Gallery
                </button>
              </div>
            )}

            {/* Route Ledgers & Active Expeditions Section */}
            <div style={{ marginTop: '28px', marginBottom: '24px' }}>
              <div className="section-header-row">
                <div>
                  <h3 className="section-serif-title">Active Group Ledgers</h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Instant debt minimization and UPI expense splitting
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-action-btn"
                  onClick={onCreateGroup}
                >
                  <Plus size={14} />
                  <span>New Group</span>
                </button>
              </div>

              {isLoadingGroups ? (
                <div className="empty-module">Loading your active travel ledgers...</div>
              ) : groups.length === 0 ? (
                <div className="empty-module">
                  No active travel groups yet. Create a trip or join with an invite code.
                </div>
              ) : (
                <div className="ticket-route-grid">
                  {groups.map((group) => {
                    const isSettled = group.status === 'SETTLED';
                    return (
                      <div
                        key={group.id}
                        className="ticket-route-card"
                        onClick={() => setSelectedGroup(group)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="route-nodes-row">
                          <div className="route-node">
                            <span className="route-node-code">
                              {group.destination.slice(0, 3).toUpperCase()}
                            </span>
                            <span className="route-node-sub">{group.destination}</span>
                          </div>

                          <div className="route-connector">
                            <div className="route-dotted-line" />
                            <div className="route-plane-badge">
                              <Plane size={14} />
                            </div>
                          </div>

                          <div className="route-node text-right">
                            <span className="route-node-code">
                              {group.memberCount} PAX
                            </span>
                            <span className="route-node-sub">Travelers</span>
                          </div>
                        </div>

                        <div className="route-meta-row">
                          <div>
                            <span className="meta-time-bold">{group.name}</span>
                            <span>
                              {new Date(group.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span
                              className={`meta-time-bold ${isSettled ? 'text-emerald' : 'text-amber'}`}
                            >
                              {isSettled ? 'Settled' : 'Active Split'}
                            </span>
                            <span>{group.currency} Ledger</span>
                          </div>
                        </div>

                        <div className="ticket-bottom-pill">
                          <div className="ticket-provider-info">
                            <div className="provider-icon-badge">
                              {group.destination.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="provider-name">{group.name}</div>
                              <div className="provider-tag">
                                {isSettled ? 'Completed Trip' : 'Balanced Split'}
                              </div>
                            </div>
                          </div>
                          <ArrowRight size={16} color="var(--text-secondary)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        )}

        {/* ---------------- TAB: EXPENSE SPLIT & SETTLEMENT ENGINE ---------------- */}
        {dockTab === 'expenses' && (() => {
          const activeGrp = MOCK_DASHBOARD_GROUPS.find((g) => g.id === selectedExpenseGroupId) || MOCK_DASHBOARD_GROUPS[0];
          const optimal = calculateOptimalSettlements(
            activeGrp.members,
            activeGrp.currency,
            activeGrp.currencySymbol
          );

          const handleCopyShare = () => {
            let text = `*⚡ ${activeGrp.name} — Expense Settlement Summary (Triptual)*\n\n`;
            text += `*Summary:* ${optimal.transfers.length} simplified transfers needed.\n\n`;
            optimal.transfers.forEach((t, i) => {
              text += `${i + 1}. ${t.from.name} ➡️ pays ${t.currencySymbol}${t.amount.toLocaleString()} ➡️ ${t.to.name}\n`;
            });
            text += `\n_Generated via Triptual AI Settlement Engine_`;

            navigator.clipboard.writeText(text);
            setIsCopiedShare(true);
            setTimeout(() => setIsCopiedShare(false), 2500);
          };

          return (
            <main className="expense-split-dashboard">
              {/* Header Title */}
              <div className="curated-header-info">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--badge-match-bg)', color: 'var(--badge-match-text)', padding: '3px 12px', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: 700, marginBottom: '6px' }}>
                  <Zap size={13} /> Graph Debt Optimization
                </div>
                <h2 className="curated-title">Expense Split & Settlements</h2>
                <div className="curated-meta">
                  <span>Auto-balance group expenses · Minimum payment routes</span>
                </div>
              </div>

              {/* Group Selector Horizontal Pills */}
              <div className="category-pills-bar">
                {MOCK_DASHBOARD_GROUPS.map((grp) => (
                  <button
                    key={grp.id}
                    type="button"
                    className={`category-pill ${selectedExpenseGroupId === grp.id ? 'active' : ''}`}
                    onClick={() => setSelectedExpenseGroupId(grp.id)}
                  >
                    <span>{grp.name}</span>
                    <span style={{ opacity: 0.75, fontSize: '0.72rem' }}>({grp.currencySymbol}{grp.totalSpent.toLocaleString()})</span>
                  </button>
                ))}
              </div>

              {/* 3 Metric Cards */}
              <div className="expense-split-hero-strip">
                <div className="expense-metric-card">
                  <div className="expense-metric-header">
                    <span className="expense-metric-title">Total Spending</span>
                    <Wallet size={16} color="var(--accent-olive)" />
                  </div>
                  <div className="expense-metric-val">
                    {activeGrp.currencySymbol}{activeGrp.totalSpent.toLocaleString()}
                  </div>
                  <div className="expense-metric-sub">
                    Across {activeGrp.expenses.length} itemized receipts
                  </div>
                </div>

                <div className="expense-metric-card">
                  <div className="expense-metric-header">
                    <span className="expense-metric-title">Debt Simplification</span>
                    <Zap size={16} color="var(--accent-amber)" />
                  </div>
                  <div className="expense-metric-val" style={{ color: 'var(--accent-olive)' }}>
                    {optimal.optimizedTxCount} Transfers
                  </div>
                  <div className="expense-metric-sub">
                    ⚡ {optimal.reductionPercentage}% fewer transactions
                  </div>
                </div>

                <div className="expense-metric-card">
                  <div className="expense-metric-header">
                    <span className="expense-metric-title">Your Balance</span>
                    <CreditCard size={16} color="var(--accent-emerald)" />
                  </div>
                  <div className="expense-metric-val" style={{ color: activeGrp.userBalance >= 0 ? 'var(--accent-olive)' : 'var(--accent-rose)' }}>
                    {activeGrp.userBalance >= 0 ? `+${activeGrp.currencySymbol}${activeGrp.userBalance.toLocaleString()}` : `-${activeGrp.currencySymbol}${Math.abs(activeGrp.userBalance).toLocaleString()}`}
                  </div>
                  <div className="expense-metric-sub">
                    {activeGrp.userBalance >= 0 ? 'You get back from members' : 'You owe to organizers'}
                  </div>
                </div>
              </div>

              {/* 2-Column Interactive Split Matrix */}
              <div className="expense-split-grid">
                {/* Column 1: Optimized Settlement Instructions */}
                <div className="expense-split-card">
                  <div className="section-header-row" style={{ marginBottom: '14px' }}>
                    <div>
                      <h3 className="section-serif-title">Optimal Transfer Instructions</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Execute these {optimal.transfers.length} direct settlements to clear all debts.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-icon-circle"
                      onClick={handleCopyShare}
                      title="Copy WhatsApp Summary"
                      style={{ flexShrink: 0 }}
                    >
                      {isCopiedShare ? <Check size={16} color="var(--accent-emerald)" /> : <Share2 size={16} />}
                    </button>
                  </div>

                  <div className="settlement-transfers-list">
                    {optimal.transfers.map((tx) => {
                      const isCompleted = completedTransferIds.includes(tx.id);
                      return (
                        <div key={tx.id} className="transfer-item-card" style={{ opacity: isCompleted ? 0.6 : 1 }}>
                          <div className="transfer-parties-row">
                            <div className="party-avatar" style={{ background: tx.from.avatarBg }}>
                              {tx.from.name[0]}
                            </div>
                            <div>
                              <div className="party-name">{tx.from.name}</div>
                              <div className="party-sub">pays</div>
                            </div>

                            <ArrowRight size={14} color="var(--text-muted)" style={{ margin: '0 4px' }} />

                            <div className="party-avatar" style={{ background: tx.to.avatarBg }}>
                              {tx.to.name[0]}
                            </div>
                            <div>
                              <div className="party-name">{tx.to.name}</div>
                              <div className="party-sub">receives</div>
                            </div>
                          </div>

                          <div className="transfer-item-actions-side">
                            <div className="transfer-val">
                              {tx.currencySymbol}{tx.amount.toLocaleString()}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                              <button
                                type="button"
                                className="btn-settle-action-pill"
                                onClick={() => setSettleTransferData(tx)}
                                title="Settle via UPI"
                              >
                                <Zap size={11} />
                                <span>UPI</span>
                              </button>
                              <button
                                type="button"
                                className="btn-settle-action-pill"
                                style={{ background: isCompleted ? 'var(--accent-emerald)' : 'var(--bg-surface-subtle)', color: isCompleted ? '#FFF' : 'var(--text-secondary)' }}
                                onClick={() => {
                                  if (completedTransferIds.includes(tx.id)) {
                                    setCompletedTransferIds((p) => p.filter((i) => i !== tx.id));
                                  } else {
                                    setCompletedTransferIds((p) => [...p, tx.id]);
                                  }
                                }}
                                title="Mark as settled"
                              >
                                <Check size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Itemized Receipts & Quick Add */}
                <div className="expense-split-card">
                  <div className="section-header-row" style={{ marginBottom: '14px' }}>
                    <div>
                      <h3 className="section-serif-title">Itemized Expense Receipts</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {activeGrp.expenses.length} bills recorded in {activeGrp.name}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-primary-luxury"
                      style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                      onClick={() => setIsQuickExpenseOpen(true)}
                    >
                      <Plus size={14} />
                      <span>Add Bill</span>
                    </button>
                  </div>

                  <div>
                    {activeGrp.expenses.map((exp) => {
                      const catIcons: Record<string, string> = {
                        Stay: '🏠',
                        Food: '🍽️',
                        Transport: '✈️',
                        Activities: '🏄',
                        Supplies: '🛒',
                        Other: '🧾'
                      };
                      return (
                        <div key={exp.id} className="expense-item-row">
                          <div className="expense-item-left">
                            <div className="expense-cat-badge">
                              {catIcons[exp.category] || '🧾'}
                            </div>
                            <div>
                              <div className="expense-item-title">{exp.title}</div>
                              <div className="expense-item-meta">
                                Paid by {exp.paidBy.name} · {exp.date}
                              </div>
                            </div>
                          </div>

                          <div className="expense-item-right">
                            <div className="expense-item-amount">
                              {activeGrp.currencySymbol}{exp.amount.toLocaleString()}
                            </div>
                            <span className="expense-item-split-tag">
                              Split ÷ {exp.splitWithCount}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </main>
          );
        })()}

        {/* ---------------- TAB: TRIPS & LEDGERS ---------------- */}
        {dockTab === 'trips' && (
          <main>
            <div className="curated-header-info">
              <h2 className="curated-title">All Expeditions & Trips</h2>
              <div className="curated-meta">
                <span>Manage member ratios, record bills, and settle balances</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary-luxury"
                style={{ width: 'auto', flex: 1 }}
                onClick={onCreateGroup}
              >
                <Plus size={16} />
                <span>Create New Trip</span>
              </button>
              <button
                type="button"
                className="btn-secondary-luxury"
                style={{ width: 'auto', flex: 1 }}
                onClick={() => setIsJoinGroupOpen(true)}
              >
                <Share2 size={16} />
                <span>Join with Code</span>
              </button>
            </div>

            <div className="ticket-route-grid">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="ticket-route-card"
                  onClick={() => setSelectedGroup(group)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="route-nodes-row">
                    <div className="route-node">
                      <span className="route-node-code">{group.name}</span>
                      <span className="route-node-sub">{group.destination}</span>
                    </div>
                    <div className="route-connector">
                      <div className="route-dotted-line" />
                      <div className="route-plane-badge">
                        <Compass size={14} />
                      </div>
                    </div>
                    <div className="route-node text-right">
                      <span className="route-node-code">{group.memberCount}</span>
                      <span className="route-node-sub">Members</span>
                    </div>
                  </div>

                  <div className="route-meta-row">
                    <div>
                      <span className="meta-time-bold">Status</span>
                      <span className={group.status === 'SETTLED' ? 'text-emerald' : 'text-amber'}>
                        {group.status === 'SETTLED' ? 'Fully Settled' : 'Active Split'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="meta-time-bold">Currency</span>
                      <span>{group.currency}</span>
                    </div>
                  </div>

                  <div className="ticket-bottom-pill">
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Open Group Ledger & Splits
                    </span>
                    <ArrowRight size={16} />
                  </div>
                </div>
              ))}
            </div>
          </main>
        )}
      </div>

      {/* Bottom Floating Navigation Dock (Mobile-First) */}
      <nav className={`yondr-bottom-dock ${isProfileMenuOpen ? 'dock-behind-drawer' : ''}`}>
        <div className="yondr-bottom-dock-inner">
          <button
            type="button"
            className={`dock-tab-btn ${dockTab === 'explore' ? 'active' : ''}`}
            onClick={() => setDockTab('explore')}
          >
            <Compass size={20} />
            <span>Explore</span>
          </button>

          <button
            type="button"
            className={`dock-tab-btn ${dockTab === 'trips' ? 'active' : ''}`}
            onClick={() => setDockTab('trips')}
          >
            <RoundtableGroupsIcon size={26} />
            <span>Groups</span>
          </button>

          {/* Central Elevated Floating Action Button (+) */}
          <div className="dock-fab-wrapper">
            <button
              type="button"
              className="dock-fab-btn"
              onClick={onCreateGroup}
              title="Create New Trip"
            >
              <Plus size={24} strokeWidth={2.6} />
            </button>
            <span className="dock-fab-label">Create</span>
          </div>

          <button
            type="button"
            className={`dock-tab-btn ${dockTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setDockTab('expenses')}
          >
            <Split size={20} />
            <span>Split</span>
          </button>

          <button
            type="button"
            className={`dock-tab-btn ${isPaymentHistoryOpen ? 'active' : ''}`}
            onClick={() => setIsPaymentHistoryOpen(true)}
            title="Payment History"
          >
            <CreditCard size={20} />
            <span>Payments</span>
          </button>
        </div>
      </nav>

      {/* Interactive Modals */}
      {isQuickExpenseOpen && (
        <QuickExpenseModal
          isOpen={isQuickExpenseOpen}
          groups={MOCK_DASHBOARD_GROUPS}
          selectedGroupId={selectedGroup?.id || groups[0]?.id}
          onClose={() => setIsQuickExpenseOpen(false)}
          onAddExpense={() => loadGroups()}
        />
      )}

      {isJoinGroupOpen && (
        <JoinGroupModal
          isOpen={isJoinGroupOpen}
          onClose={() => setIsJoinGroupOpen(false)}
          onJoinSuccess={() => loadGroups()}
        />
      )}

      {settleTransferData && (
        <SettleUpModal
          isOpen={Boolean(settleTransferData)}
          transfer={settleTransferData}
          groupId={selectedGroup?.id || groups[0]?.id}
          onClose={() => setSettleTransferData(null)}
          onConfirmSettlement={() => {
            setSettleTransferData(null);
            loadGroups();
          }}
        />
      )}
    </div>
  );
};
