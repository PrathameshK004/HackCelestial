import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Split,
  Info,
  Menu,
  Car,
  ShoppingBag,
  Receipt,
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
  GroupCardItem,
  SimplifiedTransfer
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

  // Backend & Real Data States
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupSummary | null>(null);
  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [expenseGroupSettlement, setExpenseGroupSettlement] = useState<SettlementData | null>(null);
  const [expenseGroupBills, setExpenseGroupBills] = useState<any[]>([]);
  const [isLoadingExpenseData, setIsLoadingExpenseData] = useState<boolean>(false);

  // Modals & Menus
  const [selectedExpenseGroupId, setSelectedExpenseGroupId] = useState<string>('');
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
  const [splitTab, setSplitTab] = useState<'transfers' | 'expenses'>('transfers');

  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.mobile-side-drawer-portal')) {
        return;
      }
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
        if (response.data.length > 0) {
          setSelectedExpenseGroupId((prev) => {
            const exists = response.data.some((g: any) => g.id === prev);
            return exists && prev ? prev : response.data[0].id;
          });
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

  const loadExpenseGroupData = async (grpId: string) => {
    if (!grpId) return;
    setIsLoadingExpenseData(true);
    try {
      const [settlementRes, expensesRes] = await Promise.all([
        groupService.getSettlement(grpId).catch(() => null),
        groupService.getExpenses(grpId).catch(() => null)
      ]);
      if (settlementRes?.data) {
        setExpenseGroupSettlement(settlementRes.data);
      }
      if (expensesRes?.data && Array.isArray(expensesRes.data)) {
        setExpenseGroupBills(expensesRes.data);
      }
    } catch (e) {
      console.warn('Failed to load expense group data:', e);
    } finally {
      setIsLoadingExpenseData(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedExpenseGroupId) {
      loadExpenseGroupData(selectedExpenseGroupId);
    }
  }, [selectedExpenseGroupId]);

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

  // Dynamic Real Groups for QuickExpenseModal & Dashboards
  const realDashboardGroups: GroupCardItem[] = useMemo(() => {
    if (!groups || groups.length === 0) return [];
    return groups.map((g: any) => {
      const isSelected = g.id === selectedExpenseGroupId;
      const membersSource = (isSelected && expenseGroupSettlement?.members && expenseGroupSettlement.members.length > 0)
        ? expenseGroupSettlement.members
        : (g.members || []);

      const mappedMembers = membersSource.map((m: any) => ({
        id: String(m.id),
        name: m.name || 'Traveler',
        email: m.email || '',
        role: (m.role === 'Organizer' ? 'Organizer' : 'Traveler') as 'Organizer' | 'Traveler',
        avatarBg: m.avatarBg || '#10B981',
        isUser: m.userId === user?.userId,
        balance: m.netBalance || 0
      }));

      const finalMembers = mappedMembers.length > 0 ? mappedMembers : [
        {
          id: 'org-' + (user?.userId || 'me'),
          name: user?.username || 'You (Organizer)',
          email: user?.emailId || '',
          role: 'Organizer' as const,
          avatarBg: '#059669',
          isUser: true,
          balance: 0
        }
      ];

      return {
        id: g.id,
        name: g.name,
        destination: g.destination || 'Expedition',
        tag: g.tripType || 'Trip',
        tripType: (g.tripType || 'Friends') as any,
        status: 'active' as const,
        startDate: g.startDate || '',
        endDate: g.endDate || '',
        currency: g.currency || 'INR',
        currencySymbol: g.currency === 'USD' ? '$' : (g.currency === 'EUR' ? '€' : '₹'),
        totalBudget: 0,
        totalSpent: isSelected && expenseGroupSettlement?.totalSpend ? expenseGroupSettlement.totalSpend : 0,
        userBalance: 0,
        members: finalMembers,
        expenses: isSelected ? expenseGroupBills.map((b: any) => ({
          id: b.id,
          title: b.description,
          amount: Number(b.amount),
          currency: b.currency || 'INR',
          category: (b.category || 'Other') as any,
          paidBy: {
            name: b.paidBy?.name || 'Traveler',
            avatarBg: b.paidBy?.avatarBg || '#10B981',
            isUser: false
          },
          splitWithCount: b.splits?.length || 1,
          date: new Date(b.createdAt).toLocaleDateString(),
          time: new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })) : [],
        inviteCode: '',
        coverGradient: 'linear-gradient(135deg, #243E36 0%, #1A2E28 100%)',
        description: g.description || ''
      };
    });
  }, [groups, selectedExpenseGroupId, expenseGroupSettlement, expenseGroupBills, user]);

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
      <div className="app-wrapper">
        <PaymentsPage
          onBack={() => {
            setIsPaymentHistoryOpen(false);
            setDockTab('explore');
          }}
        />

        {/* Bottom Floating Navigation Dock (Mobile-First) */}
        <nav className="yondr-bottom-dock">
          <div className="yondr-bottom-dock-inner">
            <button
              type="button"
              className="dock-tab-btn"
              onClick={() => {
                setIsPaymentHistoryOpen(false);
                setDockTab('explore');
              }}
            >
              <Compass size={20} />
              <span>Explore</span>
            </button>

            <button
              type="button"
              className="dock-tab-btn"
              onClick={() => {
                setIsPaymentHistoryOpen(false);
                setDockTab('trips');
              }}
            >
              <RoundtableGroupsIcon size={26} />
              <span>Groups</span>
            </button>

            {/* Central Elevated Floating Action Button (+) */}
            <div className="dock-fab-wrapper">
              <button
                type="button"
                className="dock-fab-btn"
                onClick={() => {
                  setIsPaymentHistoryOpen(false);
                  onCreateGroup();
                }}
                title="Create New Trip"
              >
                <Plus size={24} strokeWidth={2.6} />
              </button>
              <span className="dock-fab-label">Create</span>
            </div>

            <button
              type="button"
              className="dock-tab-btn"
              onClick={() => {
                setIsPaymentHistoryOpen(false);
                setDockTab('expenses');
              }}
            >
              <Split size={20} />
              <span>Split</span>
            </button>

            <button
              type="button"
              className="dock-tab-btn active"
              onClick={() => setIsPaymentHistoryOpen(true)}
              title="Payment History"
            >
              <CreditCard size={20} />
              <span>Payments</span>
            </button>
          </div>
        </nav>
      </div>
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

  // If a group is selected, render GroupMenuPage immediately
  if (selectedGroup) {
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
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  boxShadow: 'none',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
                }}
                title="Back to matches"
              >
                <ArrowLeft size={22} color="#FFFFFF" />
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
                <span className="stay-name-pin-wrap">
                  <MapPin size={22} color="#E5EC68" fill="#E5EC68" />
                </span>
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

              <div className="compare-matrix-scroll">
                <table className="compare-matrix-table">
                  <thead>
                    <tr>
                      <th className="compare-col-label" style={{ width: '22%' }} />
                      <th className="compare-col-item active-col" style={{ width: '26%' }}>
                        <div className="compare-thumb-wrap">
                          <img
                            src={selectedStay.image}
                            alt={selectedStay.name}
                            className="compare-thumb-img active-thumb"
                          />
                          <span className="compare-current-badge">Selected</span>
                        </div>
                      </th>
                      <th className="compare-col-item" style={{ width: '26%' }}>
                        <div className="compare-thumb-wrap">
                          <img
                            src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=300&q=80"
                            alt="Alternative 1"
                            className="compare-thumb-img"
                          />
                          <span className="compare-alt-badge">Alt 1</span>
                        </div>
                      </th>
                      <th className="compare-col-item" style={{ width: '26%' }}>
                        <div className="compare-thumb-wrap">
                          <img
                            src="https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=300&q=80"
                            alt="Alternative 2"
                            className="compare-thumb-img"
                          />
                          <span className="compare-alt-badge">Alt 2</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Match</td>
                      <td className="active-col">
                        <span className="match-badge" style={{ padding: '2px 8px' }}>
                          {selectedStay.matchScore}%
                        </span>
                      </td>
                      <td>85%</td>
                      <td>81%</td>
                    </tr>
                    <tr>
                      <td>Price</td>
                      <td className="active-col" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        ${selectedStay.pricePerNight}
                      </td>
                      <td>$132</td>
                      <td>$120</td>
                    </tr>
                    <tr>
                      <td>Style</td>
                      <td className="active-col">{selectedStay.style}</td>
                      <td>Coastal</td>
                      <td>Classic</td>
                    </tr>
                    <tr>
                      <td>Location</td>
                      <td className="active-col">{selectedStay.distance}</td>
                      <td>1.2 km</td>
                      <td>2 km</td>
                    </tr>
                    <tr>
                      <td>Reviews</td>
                      <td className="active-col">★ {selectedStay.rating}</td>
                      <td>★ 4.91</td>
                      <td>★ 4.91</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
              <div className="sticky-action-header-row">
                <div className="sticky-price-col">
                  <div className="price-main">
                    ${selectedStay.pricePerNight}
                    <span className="price-period">/night</span>
                  </div>
                  <div className="price-sub">
                    ${selectedStay.pricePerNight * selectedStay.totalNights} total · {selectedStay.totalNights} nights
                  </div>
                </div>

                <div className="sticky-rating-pill">
                  <Star size={13} fill="var(--accent-chartreuse)" color="var(--accent-olive)" />
                  <span>{selectedStay.rating}</span>
                  <span style={{ color: 'var(--border-card)' }}>·</span>
                  <span style={{ color: 'var(--accent-olive)' }}>{selectedStay.matchScore}% Match</span>
                </div>
              </div>

              <div className="sticky-action-btns-group">
                <button
                  type="button"
                  className="btn-pill-action btn-pill-ledger"
                  onClick={() => onCreateGroup()}
                >
                  <Users size={15} />
                  <span>Create Trip Ledger</span>
                </button>
                <button
                  type="button"
                  className="btn-pill-action btn-pill-reserve"
                  onClick={() => {
                    alert(`Booking reservation confirmed for ${selectedStay.name}!`);
                  }}
                >
                  <span>Reserve</span>
                  <ArrowRight size={15} />
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

  // Reusable Profile Menu Content (for desktop dropdown and mobile side drawer)
  const renderProfileMenuItems = () => (
    <>
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
    </>
  );

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

                {/* Desktop Profile Dropdown (attached directly beneath avatar) */}
                {isProfileMenuOpen && (
                  <div className="luxury-profile-dropdown-menu desktop-profile-dropdown">
                    {renderProfileMenuItems()}
                  </div>
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
          if (!groups || groups.length === 0) {
            return (
              <main className="expense-split-dashboard animate-fade-in" style={{ padding: '24px 16px' }}>
                <div className="curated-header-info">
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(36, 62, 54, 0.08)', color: '#243E36', padding: '3px 12px', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: 700, marginBottom: '6px' }}>
                    <Zap size={13} color="#10B981" /> AI Debt Graph Active
                  </div>
                  <h2 className="curated-title">Expense Split & Settlement</h2>
                  <div className="curated-meta">
                    <span>Smart settlement algorithm · Zero redundant peer transfers</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid var(--border-light)', margin: '20px 0' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(36, 62, 54, 0.08)', color: '#243E36', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Zap size={26} color="#10B981" />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    No Active Expeditions Yet
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                    Create your first trip group with travel companions to start logging expenses with real-time graph debt simplification and zero breakpoints.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={onCreateGroup}
                    style={{ padding: '10px 24px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '0 auto' }}
                  >
                    <Plus size={16} strokeWidth={2.4} />
                    <span>Create Your First Trip</span>
                  </button>
                </div>
              </main>
            );
          }

          const activeGrp = groups.find((g) => g.id === selectedExpenseGroupId) || groups[0];
          const currencySymbol = activeGrp.currency === 'USD' ? '$' : (activeGrp.currency === 'EUR' ? '€' : '₹');
          const totalSpent = expenseGroupSettlement?.totalSpend ?? 0;
          const transfers = expenseGroupSettlement?.transfers ?? [];
          const bills = expenseGroupBills ?? [];

          const userMember = expenseGroupSettlement?.members?.find(
            (m: any) => (user?.userId && m.userId === user.userId) || (user?.emailId && m.email?.toLowerCase() === user.emailId.toLowerCase())
          );
          const userBalance = userMember?.netBalance ?? 0;

          const handleCopyShare = () => {
            let text = `*⚡ ${activeGrp.name} — Expense Settlement Summary (Triptual)*\n\n`;
            text += `*Total Spend:* ${currencySymbol}${totalSpent.toLocaleString()}\n`;
            text += `*Transfers Needed:* ${transfers.length} simplified peer transfers\n\n`;
            transfers.forEach((t: any, i: number) => {
              text += `${i + 1}. ${t.from.name} ➡️ pays ${currencySymbol}${Number(t.amount).toLocaleString()} ➡️ ${t.to.name}\n`;
            });
            text += `\n_Generated via Triptual AI Settlement Engine_`;

            navigator.clipboard.writeText(text);
            setIsCopiedShare(true);
            setTimeout(() => setIsCopiedShare(false), 2500);
          };

          return (
            <main className="expense-split-dashboard animate-fade-in">
              {/* Header Info */}
              <div className="curated-header-info">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(36, 62, 54, 0.08)', color: '#243E36', padding: '3px 12px', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: 700, marginBottom: '6px' }}>
                  <Zap size={13} color="#10B981" /> {isLoadingExpenseData ? 'Syncing Ledger...' : 'AI Debt Graph Active'}
                </div>
                <h2 className="curated-title">Expense Split & Settlement</h2>
                <div className="curated-meta">
                  <span>Smart settlement algorithm · Zero redundant peer transfers</span>
                </div>
              </div>

              {/* Group Selector Horizontal Capsule Pills */}
              <div className="split-groups-strip">
                {groups.map((grp: any) => {
                  const grpSym = grp.currency === 'USD' ? '$' : (grp.currency === 'EUR' ? '€' : '₹');
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      className={`split-group-pill ${selectedExpenseGroupId === grp.id ? 'active' : ''}`}
                      onClick={() => setSelectedExpenseGroupId(grp.id)}
                    >
                      <span>{grp.name}</span>
                      <span className="split-group-pill-spend">
                        ({grpSym}{grp.id === selectedExpenseGroupId ? totalSpent.toLocaleString() : (grp.memberCount ? `${grp.memberCount} members` : 'Trip')})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sleek Hero Settlement Overview Card */}
              <div className="split-hero-card">
                <div className="split-hero-top">
                  <div className="split-hero-badge">
                    <Zap size={12} color="#10B981" />
                    <span>Debt Simplification Graph ({activeGrp.expenseSplit || 'Equal'} Ratio)</span>
                  </div>

                  <button
                    type="button"
                    className="split-hero-share-btn"
                    onClick={handleCopyShare}
                    title="Copy WhatsApp Summary"
                  >
                    {isCopiedShare ? <Check size={13} color="#10B981" /> : <Share2 size={13} />}
                    <span>{isCopiedShare ? 'Copied' : 'Share'}</span>
                  </button>
                </div>

                <div className="split-hero-balance-section">
                  <span className="split-hero-balance-label">
                    {userBalance > 0 ? 'You are owed' : userBalance < 0 ? 'You owe' : 'Net Settlement'}
                  </span>
                  <div
                    className="split-hero-balance-amount"
                    style={{
                      color: userBalance > 0 ? '#10B981' : userBalance < 0 ? '#EF4444' : 'var(--text-primary)'
                    }}
                  >
                    {userBalance > 0
                      ? `+${currencySymbol}${userBalance.toLocaleString()}`
                      : userBalance < 0
                      ? `-${currencySymbol}${Math.abs(userBalance).toLocaleString()}`
                      : `${currencySymbol}0.00`}
                  </div>
                  <span className="split-hero-balance-sub">
                    {userBalance > 0
                      ? 'Companions will settle this to you'
                      : userBalance < 0
                      ? 'Your share of group expedition expenses'
                      : 'All companion balances are balanced'}
                  </span>
                </div>

                {/* Micro Metrics Strip */}
                <div className="split-hero-metrics-grid">
                  <div className="split-metric-item">
                    <span className="split-metric-k">Total Spent</span>
                    <span className="split-metric-v">
                      {currencySymbol}{totalSpent.toLocaleString()}
                    </span>
                  </div>

                  <div className="split-metric-divider" />

                  <div className="split-metric-item">
                    <span className="split-metric-k">Transfers Needed</span>
                    <span className="split-metric-v" style={{ color: '#10B981' }}>
                      {transfers.length} direct {transfers.length === 1 ? 'transfer' : 'transfers'}
                    </span>
                  </div>

                  <div className="split-metric-divider" />

                  <div className="split-metric-item">
                    <span className="split-metric-k">Active Receipts</span>
                    <span className="split-metric-v">
                      {bills.length} bills
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile View Switcher & Action Bar */}
              <div className="split-controls-row">
                <div className="split-capsule-switcher">
                  <button
                    type="button"
                    className={`split-capsule-tab ${splitTab === 'transfers' ? 'active' : ''}`}
                    onClick={() => setSplitTab('transfers')}
                  >
                    <span>Settlements</span>
                    <span className="split-tab-badge">{transfers.length}</span>
                  </button>

                  <button
                    type="button"
                    className={`split-capsule-tab ${splitTab === 'expenses' ? 'active' : ''}`}
                    onClick={() => setSplitTab('expenses')}
                  >
                    <span>Itemized Bills</span>
                    <span className="split-tab-badge">{bills.length}</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="split-add-bill-btn"
                  onClick={() => setIsQuickExpenseOpen(true)}
                >
                  <Plus size={15} strokeWidth={2.4} />
                  <span>Add Bill</span>
                </button>
              </div>

              {/* Interactive Split Grid (Responsive: Tab on Mobile, Dual Col on Desktop) */}
              <div className="split-grid-wrapper">
                {/* Column 1: Settlements List */}
                <div className={`split-column-card ${splitTab === 'transfers' ? 'active-tab' : 'inactive-tab'}`}>
                  <div className="split-col-header">
                    <div>
                      <h3 className="split-col-title">Optimal Route Instructions</h3>
                      <p className="split-col-sub">
                        Direct peer transfers to balance the ledger
                      </p>
                    </div>

                    <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                      {transfers.filter((t: any) => completedTransferIds.includes(t.id)).length}/{transfers.length} cleared
                    </span>
                  </div>

                  <div>
                    {transfers.map((tx: any) => {
                      const isCompleted = completedTransferIds.includes(tx.id);
                      return (
                        <div
                          key={tx.id}
                          className="split-transfer-item"
                          style={{ opacity: isCompleted ? 0.6 : 1 }}
                        >
                          <div className="split-transfer-parties">
                            <div className="split-party-chip">
                              <div className="split-party-avatar" style={{ background: tx.from?.avatarBg || '#243E36' }}>
                                {(tx.from?.name || 'T')[0]}
                              </div>
                              <div className="split-party-info">
                                <div className="split-party-name">{tx.from?.name || 'Traveler'}</div>
                                <div className="split-party-role">pays</div>
                              </div>
                            </div>

                            <ArrowRight size={14} color="#94A3B8" style={{ flexShrink: 0, margin: '0 4px' }} />

                            <div className="split-party-chip">
                              <div className="split-party-avatar" style={{ background: tx.to?.avatarBg || '#10B981' }}>
                                {(tx.to?.name || 'C')[0]}
                              </div>
                              <div className="split-party-info">
                                <div className="split-party-name">{tx.to?.name || 'Companion'}</div>
                                <div className="split-party-role">receives</div>
                              </div>
                            </div>
                          </div>

                          <div className="split-transfer-right">
                            <div className="split-transfer-amount">
                              {currencySymbol}{Number(tx.amount).toLocaleString()}
                            </div>

                            <div className="split-transfer-actions-grp">
                              <button
                                type="button"
                                className="split-upi-btn"
                                onClick={() => setSettleTransferData({
                                  id: tx.id,
                                  from: { id: tx.fromMemberId || tx.from?.id, name: tx.from?.name || 'Payer', avatarBg: tx.from?.avatarBg || '#243E36' },
                                  to: { id: tx.toMemberId || tx.to?.id, name: tx.to?.name || 'Recipient', avatarBg: tx.to?.avatarBg || '#10B981' },
                                  amount: tx.amount,
                                  currency: tx.currency || activeGrp.currency,
                                  currencySymbol
                                } as any)}
                                title="Settle via UPI"
                              >
                                <Zap size={11} />
                                <span>UPI</span>
                              </button>

                              <button
                                type="button"
                                className={`split-settle-toggle-btn ${isCompleted ? 'completed' : ''}`}
                                onClick={() => {
                                  if (completedTransferIds.includes(tx.id)) {
                                    setCompletedTransferIds((p) => p.filter((i) => i !== tx.id));
                                  } else {
                                    setCompletedTransferIds((p) => [...p, tx.id]);
                                  }
                                }}
                                title={isCompleted ? 'Mark uncompleted' : 'Mark as settled'}
                                aria-label="Toggle settled status"
                              >
                                <Check size={13} strokeWidth={2.8} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {transfers.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94A3B8' }}>
                        <Check size={28} style={{ margin: '0 auto 6px', color: '#10B981' }} />
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.88rem' }}>
                          All Settled!
                        </div>
                        <p style={{ fontSize: '0.74rem', margin: '4px 0 0' }}>
                          No pending transfers needed for this trip.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Itemized Receipts */}
                <div className={`split-column-card ${splitTab === 'expenses' ? 'active-tab' : 'inactive-tab'}`}>
                  <div className="split-col-header">
                    <div>
                      <h3 className="split-col-title">Itemized Expense Receipts</h3>
                      <p className="split-col-sub">
                        {bills.length} bills recorded in {activeGrp.name}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsQuickExpenseOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#243E36',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={13} />
                      <span>Add</span>
                    </button>
                  </div>

                  <div>
                    {bills.map((exp: any) => {
                      const getCategoryIcon = (cat: string) => {
                        switch (cat) {
                          case 'Stay':
                            return (
                              <div className="split-cat-bubble" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                                <Home size={17} strokeWidth={2.2} />
                              </div>
                            );
                          case 'Food':
                            return (
                              <div className="split-cat-bubble" style={{ background: '#FFF3E0', color: '#E65100' }}>
                                <Utensils size={17} strokeWidth={2.2} />
                              </div>
                            );
                          case 'Transport':
                            return (
                              <div className="split-cat-bubble" style={{ background: '#E0F7FA', color: '#00838F' }}>
                                <Car size={17} strokeWidth={2.2} />
                              </div>
                            );
                          case 'Activities':
                            return (
                              <div className="split-cat-bubble" style={{ background: '#F3E8FF', color: '#7E22CE' }}>
                                <Compass size={17} strokeWidth={2.2} />
                              </div>
                            );
                          case 'Supplies':
                            return (
                              <div className="split-cat-bubble" style={{ background: '#FEF3C7', color: '#D97706' }}>
                                <ShoppingBag size={17} strokeWidth={2.2} />
                              </div>
                            );
                          case 'Other':
                          default:
                            return (
                              <div className="split-cat-bubble" style={{ background: '#F1F5F9', color: '#475569' }}>
                                <Receipt size={17} strokeWidth={2.2} />
                              </div>
                            );
                        }
                      };

                      return (
                        <div key={exp.id} className="split-expense-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            {getCategoryIcon(exp.category)}

                            <div className="split-expense-info">
                              <div className="split-expense-title">{exp.description}</div>
                              <div className="split-expense-meta">
                                Paid by {exp.paidBy?.name || 'Traveler'} · {new Date(exp.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div className="split-expense-amount-col">
                            <div className="split-expense-amount">
                              {currencySymbol}{Number(exp.amount).toLocaleString()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                              <span className="split-expense-tag">
                                {exp.splitModel || 'EQUAL'} split
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm(`Delete expense "${exp.description}"?`)) {
                                    await groupService.deleteExpense(activeGrp.id, exp.id);
                                    loadExpenseGroupData(activeGrp.id);
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                                title="Delete expense"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {bills.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94A3B8' }}>
                        <Receipt size={28} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.88rem' }}>
                          No expenses yet
                        </div>
                        <p style={{ fontSize: '0.74rem', margin: '4px 0 0' }}>
                          Click "+ Add Bill" to record your first group expense.
                        </p>
                      </div>
                    )}
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
          groups={realDashboardGroups}
          selectedGroupId={selectedExpenseGroupId || groups[0]?.id}
          onClose={() => setIsQuickExpenseOpen(false)}
          onAddExpense={() => {
            loadGroups();
            if (selectedExpenseGroupId) loadExpenseGroupData(selectedExpenseGroupId);
          }}
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
          groupId={selectedExpenseGroupId || groups[0]?.id}
          onClose={() => setSettleTransferData(null)}
          onConfirmSettlement={() => {
            setSettleTransferData(null);
            loadGroups();
            if (selectedExpenseGroupId) loadExpenseGroupData(selectedExpenseGroupId);
          }}
        />
      )}

      {/* Standard Mobile Side Drawer (Mounted directly to document.body for zero right-side gap) */}
      {isProfileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="mobile-side-drawer-portal">
          <div
            className="mobile-drawer-backdrop"
            onClick={() => setIsProfileMenuOpen(false)}
          />
          <div className="mobile-side-drawer-container">
            {/* Mobile Drawer Header with Triptual Logo & Close Button */}
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

            {renderProfileMenuItems()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
