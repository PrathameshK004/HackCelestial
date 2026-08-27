import React, { useState } from 'react';
import {
  Plus,
  Zap,
  Receipt,
  KeyRound,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
  ChevronRight,
  Scale,
  Search,
  Sparkles,
  Plane,
  Building2,
  Car
} from 'lucide-react';
import { GroupCardItem, SimplifiedTransfer } from '../../mock/dashboardMockData';
import { ActiveTab } from '../navigation/TabNavigation';

interface HomeTabProps {
  groups: GroupCardItem[];
  userName?: string;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenCreateGroup: () => void;
  onOpenQuickExpense: () => void;
  onOpenJoinGroup: () => void;
  onOpenSettleModal: (transfer: SimplifiedTransfer) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  groups,
  userName = 'Traveler',
  onNavigateTab,
  onOpenCreateGroup,
  onOpenQuickExpense,
  onOpenJoinGroup,
  onOpenSettleModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'stays' | 'transport'>('all');

  const totalTripsCount = groups.length;
  const totalSpentAcrossGroups = groups.reduce((acc, g) => acc + g.totalSpent, 0);
  const netUserBalance = groups.reduce(
    (acc, g) => acc + (g.currency === 'INR' ? g.userBalance : g.userBalance * 85),
    0
  );

  const filteredTrips = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allExpenses = groups
    .flatMap((g) =>
      g.expenses.map((e) => ({
        ...e,
        groupName: g.name,
        currencySymbol: g.currencySymbol
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  const pendingActionableDebts: SimplifiedTransfer[] = [
    {
      id: 'tx-quick-1',
      from: { id: 'user-2', name: 'Rahul Sharma', avatarBg: '#0284c7' },
      to: { id: 'user-1', name: userName, avatarBg: '#059669', isUser: true },
      amount: 2400,
      currency: 'INR',
      currencySymbol: '₹',
      status: 'pending',
      dueDate: 'Goa Trip Settlement'
    },
    {
      id: 'tx-quick-2',
      from: { id: 'user-1', name: userName, avatarBg: '#059669', isUser: true },
      to: { id: 'user-5', name: 'Vikram Mehta', avatarBg: '#d97706' },
      amount: 850,
      currency: 'INR',
      currencySymbol: '₹',
      status: 'pending',
      dueDate: 'Manali Trek Split'
    }
  ];

  return (
    <div className="home-content-wrapper">
      {/* 1. Hero Welcome & Net Standing Banner */}
      <section className="clean-hero-card">
        <div className="hero-top-row">
          <div>
            <div className="hero-pill-badge">
              <Sparkles size={13} className="text-emerald" />
              <span>Smart Travel Financial Command</span>
            </div>
            <h1 className="hero-title">
              Hello, <span className="text-emerald-glow">{userName.split(' ')[0]}</span> 👋
            </h1>
            <p className="hero-subtitle">
              Manage group travel expenses, split shared bills in real-time, and settle debts instantly.
            </p>
          </div>

          {/* Prominent Net Balance Card */}
          <div className="hero-balance-card">
            <span className="balance-card-label">Your Net Standing</span>
            <div className="balance-card-value-row">
              <span className={`balance-card-num ${netUserBalance >= 0 ? 'is-positive' : 'is-negative'}`}>
                {netUserBalance >= 0 ? '+' : '-'}₹{Math.abs(Math.round(netUserBalance)).toLocaleString()}
              </span>
            </div>
            <span className="balance-card-hint">
              {netUserBalance >= 0 ? 'To receive across all groups' : 'You owe to fellow travelers'}
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="hero-action-buttons-row">
          <button
            type="button"
            className="btn-hero-main"
            onClick={onOpenCreateGroup}
          >
            <Plus size={17} strokeWidth={2.6} />
            <span>Create New Trip</span>
          </button>

          <button
            type="button"
            className="btn-hero-amber"
            onClick={() => onNavigateTab('settlement')}
          >
            <Zap size={17} />
            <span>Settlement Engine</span>
          </button>

          <button
            type="button"
            className="btn-hero-outline"
            onClick={onOpenQuickExpense}
          >
            <Receipt size={16} />
            <span>Add Expense</span>
          </button>

          <button
            type="button"
            className="btn-hero-ghost"
            onClick={onOpenJoinGroup}
          >
            <KeyRound size={16} />
            <span>Join with Code</span>
          </button>
        </div>
      </section>

      {/* 2. Quick Search & Category Filter Bar */}
      <section className="search-filter-section">
        <div className="search-input-wrap">
          <Search size={18} className="search-input-icon" />
          <input
            type="text"
            className="clean-search-input"
            placeholder="Search active trips, destinations (Goa, Manali, Bali)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-pills-bar">
          <button
            type="button"
            className={`cat-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            <Plane size={15} />
            <span>All Trips ({groups.length})</span>
          </button>
          <button
            type="button"
            className={`cat-btn ${activeCategory === 'stays' ? 'active' : ''}`}
            onClick={() => setActiveCategory('stays')}
          >
            <Building2 size={15} />
            <span>Resorts & Stays</span>
          </button>
          <button
            type="button"
            className={`cat-btn ${activeCategory === 'transport' ? 'active' : ''}`}
            onClick={() => setActiveCategory('transport')}
          >
            <Car size={15} />
            <span>Transport</span>
          </button>
        </div>
      </section>

      {/* 3. Main Dashboard Layout (2 Columns on desktop, 1 on mobile) */}
      <div className="dashboard-grid-layout">
        {/* Left Main Column: Active Trips & Fast Settle */}
        <div className="dashboard-primary-col">
          {/* Active Trips Section */}
          <div className="clean-section-card">
            <div className="section-header-row">
              <div>
                <h2 className="section-main-title">Active & Upcoming Trips</h2>
                <p className="section-sub-title">Live budgets & traveler balances</p>
              </div>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => onNavigateTab('groups')}
              >
                <span>View All ({groups.length})</span>
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="trip-cards-grid">
              {filteredTrips.map((group) => {
                const spentPercent = Math.min(
                  Math.round((group.totalSpent / group.totalBudget) * 100),
                  100
                );
                return (
                  <div key={group.id} className="clean-trip-card">
                    {/* Card Header Banner */}
                    <div className="card-top-banner" style={{ background: group.coverGradient }}>
                      <div className="banner-badge-row">
                        <span className={`status-pill pill-${group.status}`}>
                          {group.status === 'active' && '● Live'}
                          {group.status === 'upcoming' && '🗓 Upcoming'}
                          {group.status === 'completed' && '✓ Done'}
                        </span>
                        <span className="type-badge">{group.tripType}</span>
                      </div>
                      <h3 className="card-trip-title">{group.name}</h3>
                      <span className="card-trip-dest">📍 {group.destination}</span>
                    </div>

                    {/* Card Body */}
                    <div className="card-body-content">
                      {/* Budget Progress Bar */}
                      <div className="budget-meter-wrap">
                        <div className="budget-meter-labels">
                          <span className="text-xs text-slate-500 font-semibold">Budget Spent</span>
                          <span className="text-xs font-bold text-slate-800">
                            {group.currencySymbol}{group.totalSpent.toLocaleString()} / {group.currencySymbol}{group.totalBudget.toLocaleString()}
                          </span>
                        </div>
                        <div className="meter-track">
                          <div
                            className="meter-fill"
                            style={{
                              width: `${spentPercent}%`,
                              backgroundColor: spentPercent > 90 ? '#e11d48' : '#10b981'
                            }}
                          />
                        </div>
                      </div>

                      {/* Members & User Balance Status */}
                      <div className="card-travelers-row">
                        <div className="avatar-stack-group">
                          {group.members.slice(0, 3).map((m) => (
                            <div
                              key={m.id}
                              className="stack-dot"
                              style={{ backgroundColor: m.avatarBg }}
                              title={m.name}
                            >
                              {m.name[0]}
                            </div>
                          ))}
                          {group.members.length > 3 && (
                            <div className="stack-dot stack-plus">+{group.members.length - 3}</div>
                          )}
                        </div>

                        <div className="user-trip-balance">
                          {group.userBalance > 0 ? (
                            <span className="balance-pill positive">
                              Owed +{group.currencySymbol}{group.userBalance.toLocaleString()}
                            </span>
                          ) : group.userBalance < 0 ? (
                            <span className="balance-pill negative">
                              Owes -{group.currencySymbol}{Math.abs(group.userBalance).toLocaleString()}
                            </span>
                          ) : (
                            <span className="balance-pill settled">All Settled</span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Card Actions */}
                      <div className="card-bottom-actions">
                        <button
                          type="button"
                          className="btn-card-outline"
                          onClick={() => onNavigateTab('groups')}
                        >
                          View Ledger
                        </button>
                        <button
                          type="button"
                          className="btn-card-solid"
                          onClick={() => onNavigateTab('settlement')}
                        >
                          <Zap size={14} />
                          <span>Settle Up</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instant Settlement Fast Lane Section */}
          <div className="clean-section-card">
            <div className="section-header-row">
              <div>
                <h2 className="section-main-title flex-center-gap">
                  <Zap size={18} className="text-amber" />
                  <span>Instant Settlement Fast Lane</span>
                </h2>
                <p className="section-sub-title">1-click direct peer settlement</p>
              </div>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => onNavigateTab('settlement')}
              >
                <span>Settlement Hub</span>
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="fast-settle-list">
              {pendingActionableDebts.map((item) => {
                const isUserPayer = item.from.isUser;
                return (
                  <div key={item.id} className="clean-fast-settle-row">
                    <div className="settle-row-left">
                      <div className={`settle-arrow-box ${isUserPayer ? 'is-payer' : 'is-receiver'}`}>
                        {isUserPayer ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                      </div>
                      <div>
                        <div className="settle-person-name">
                          {isUserPayer ? `You owe ${item.to.name}` : `${item.from.name} owes You`}
                        </div>
                        <div className="settle-note-text">{item.dueDate}</div>
                      </div>
                    </div>

                    <div className="settle-row-right">
                      <span className={`settle-amount-tag ${isUserPayer ? 'text-rose' : 'text-emerald'}`}>
                        {item.currencySymbol}{item.amount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        className={`btn-settle-chip ${isUserPayer ? 'btn-pay-now' : 'btn-remind'}`}
                        onClick={() => onOpenSettleModal(item)}
                      >
                        {isUserPayer ? 'Pay via UPI' : 'Record Paid'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Secondary Column: Quick Actions & Live Activity */}
        <div className="dashboard-secondary-col">
          {/* Quick Metrics Bar */}
          <div className="clean-section-card">
            <h3 className="sidebar-section-title">Trip Financial Health</h3>
            <div className="sidebar-stats-list">
              <div className="stat-row-item">
                <div className="stat-icon-wrap bg-emerald">
                  <Wallet size={16} />
                </div>
                <div className="stat-text-wrap">
                  <span className="stat-label">Total Spent Tracked</span>
                  <span className="stat-num">₹{totalSpentAcrossGroups.toLocaleString()}</span>
                </div>
              </div>

              <div className="stat-row-item">
                <div className="stat-icon-wrap bg-blue">
                  <TrendingUp size={16} />
                </div>
                <div className="stat-text-wrap">
                  <span className="stat-label">Active Travel Hubs</span>
                  <span className="stat-num">{totalTripsCount} Trips</span>
                </div>
              </div>

              <div className="stat-row-item">
                <div className="stat-icon-wrap bg-amber">
                  <Scale size={16} />
                </div>
                <div className="stat-text-wrap">
                  <span className="stat-label">Debts Simplified</span>
                  <span className="stat-num">73% Reduction</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="clean-section-card">
            <h3 className="sidebar-section-title">Recent Activity Feed</h3>
            <div className="activity-items-list">
              {allExpenses.map((exp) => (
                <div key={exp.id} className="clean-activity-row">
                  <div className="activity-icon-sq">
                    <Receipt size={15} />
                  </div>
                  <div className="activity-meta">
                    <div className="activity-title-top">
                      <span className="activity-title">{exp.title}</span>
                      <span className="activity-cost font-bold">
                        {exp.currencySymbol}{exp.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="activity-sub">
                      <span>Paid by {exp.paidBy.name.split(' ')[0]}</span>
                      <span className="dot">•</span>
                      <span className="text-emerald font-semibold">{exp.groupName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-add-expense-full"
              onClick={onOpenQuickExpense}
            >
              <Plus size={16} />
              <span>Record New Expense</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
