import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Compass,
  Calendar,
  Zap,
  Share2,
  Check,
  Receipt,
  Eye,
  KeyRound,
  X
} from 'lucide-react';
import { GroupCardItem } from '../../mock/dashboardMockData';
import { ActiveTab } from '../navigation/TabNavigation';

interface MyGroupsTabProps {
  groups: GroupCardItem[];
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenCreateGroup: () => void;
  onOpenQuickExpense: (groupId?: string) => void;
  onOpenJoinGroup: () => void;
  onSelectGroupForSettlement?: (groupId: string) => void;
}

export const MyGroupsTab: React.FC<MyGroupsTabProps> = ({
  groups,
  onNavigateTab,
  onOpenCreateGroup,
  onOpenQuickExpense,
  onOpenJoinGroup,
  onSelectGroupForSettlement
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [selectedGroupModal, setSelectedGroupModal] = useState<GroupCardItem | null>(null);

  const filteredGroups = groups.filter((group) => {
    const matchesSearch =
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.tag.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || group.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCopyInvite = (group: GroupCardItem) => {
    const inviteUrl = `https://grouptrip-ledger.app/join/${group.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedGroupId(group.id);
    setTimeout(() => setCopiedGroupId(null), 2500);
  };

  const handleGoToSettlement = (groupId: string) => {
    if (onSelectGroupForSettlement) {
      onSelectGroupForSettlement(groupId);
    }
    onNavigateTab('settlement');
  };

  const formatDateRange = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  return (
    <div className="groups-page-container animate-fade-in">
      {/* 1. Header & Search Filter Bar */}
      <div className="clean-section-card groups-header-card">
        <div className="groups-top-title-row">
          <div>
            <h1 className="page-heading-large">My Group Trips</h1>
            <p className="page-heading-sub">
              Manage shared travel ledgers, invite friends, and settle balances.
            </p>
          </div>

          <div className="groups-cta-group">
            <button
              type="button"
              className="btn-outline-white"
              onClick={onOpenJoinGroup}
            >
              <KeyRound size={16} />
              <span>Join with Code</span>
            </button>

            <button
              type="button"
              className="btn-emerald-solid"
              onClick={onOpenCreateGroup}
            >
              <Plus size={17} strokeWidth={2.6} />
              <span>Create New Trip</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="groups-toolbar-row">
          <div className="groups-search-box">
            <Search size={17} className="search-box-icon" />
            <input
              type="text"
              className="groups-search-input"
              placeholder="Search by trip name or destination (Goa, Manali, Bali)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="status-pills-selector">
            <button
              type="button"
              className={`status-chip ${filterStatus === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({groups.length})
            </button>
            <button
              type="button"
              className={`status-chip ${filterStatus === 'active' ? 'is-active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              Active ({groups.filter((g) => g.status === 'active').length})
            </button>
            <button
              type="button"
              className={`status-chip ${filterStatus === 'upcoming' ? 'is-active' : ''}`}
              onClick={() => setFilterStatus('upcoming')}
            >
              Upcoming ({groups.filter((g) => g.status === 'upcoming').length})
            </button>
            <button
              type="button"
              className={`status-chip ${filterStatus === 'completed' ? 'is-active' : ''}`}
              onClick={() => setFilterStatus('completed')}
            >
              Completed ({groups.filter((g) => g.status === 'completed').length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Compass size={36} className="text-emerald" />
          </div>
          <h3>No Group Trips Found</h3>
          <p>
            {searchQuery
              ? `No trips match "${searchQuery}". Try a different keyword.`
              : 'You have not joined or created any trips in this category yet.'}
          </p>
          <button type="button" className="btn-emerald-solid" onClick={onOpenCreateGroup}>
            <Plus size={16} />
            <span>Create Your First Trip</span>
          </button>
        </div>
      ) : (
        <div className="groups-cards-layout">
          {filteredGroups.map((group) => {
            const spentPercent = Math.min(
              Math.round((group.totalSpent / group.totalBudget) * 100),
              100
            );
            const isCopied = copiedGroupId === group.id;

            return (
              <div key={group.id} className="clean-group-card">
                {/* Banner */}
                <div className="group-card-header-banner" style={{ background: group.coverGradient }}>
                  <div className="banner-top-pills">
                    <span className={`status-pill pill-${group.status}`}>
                      {group.status === 'active' && '● Live'}
                      {group.status === 'upcoming' && '🗓 Upcoming'}
                      {group.status === 'completed' && '✓ Completed'}
                    </span>
                    <span className="type-badge">{group.tripType}</span>
                  </div>

                  <h2 className="group-card-heading">{group.name}</h2>
                  <div className="group-card-sub-dest">
                    <span>📍 {group.destination}</span>
                    <span className="dest-tag-chip">{group.tag}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="group-card-main-body">
                  {/* Dates & Code */}
                  <div className="group-dates-strip">
                    <div className="dates-item">
                      <Calendar size={14} className="text-slate-400" />
                      <span>{formatDateRange(group.startDate, group.endDate)}</span>
                    </div>
                    <div className="code-badge">
                      Code: <strong>{group.inviteCode}</strong>
                    </div>
                  </div>

                  <p className="group-desc-preview">{group.description}</p>

                  {/* Budget tracker */}
                  <div className="group-budget-box">
                    <div className="budget-box-labels">
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
                          backgroundColor:
                            spentPercent > 90 ? '#e11d48' : spentPercent > 70 ? '#f59e0b' : '#10b981'
                        }}
                      />
                    </div>
                    <div className="budget-sub-row">
                      <span>{group.expenses.length} expenses logged</span>
                      <span>{spentPercent}% utilized</span>
                    </div>
                  </div>

                  {/* Travelers & Invite Link */}
                  <div className="group-travelers-section">
                    <div className="travelers-section-top">
                      <div className="flex-center-gap">
                        <Users size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-700">
                          {group.members.length} Travelers
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn-invite-copy"
                        onClick={() => handleCopyInvite(group)}
                      >
                        {isCopied ? (
                          <>
                            <Check size={12} className="text-emerald" />
                            <span className="text-emerald font-bold">Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 size={12} />
                            <span>Copy Invite</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="travelers-chips-stack">
                      {group.members.map((m) => (
                        <div key={m.id} className="traveler-chip-item" title={`${m.name} (${m.role})`}>
                          <div className="traveler-chip-dot" style={{ backgroundColor: m.avatarBg }}>
                            {m.name[0]}
                          </div>
                          <span>{m.name.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Net User Balance */}
                  <div className="group-user-balance-bar">
                    <span className="text-xs text-slate-500 font-semibold">Your Balance:</span>
                    {group.userBalance > 0 ? (
                      <span className="balance-pill positive font-bold">
                        You are owed +{group.currencySymbol}{group.userBalance.toLocaleString()}
                      </span>
                    ) : group.userBalance < 0 ? (
                      <span className="balance-pill negative font-bold">
                        You owe -{group.currencySymbol}{Math.abs(group.userBalance).toLocaleString()}
                      </span>
                    ) : (
                      <span className="balance-pill settled">✓ All Settled</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="group-actions-3col">
                    <button
                      type="button"
                      className="btn-action-ghost"
                      onClick={() => setSelectedGroupModal(group)}
                    >
                      <Eye size={14} />
                      <span>Ledger</span>
                    </button>

                    <button
                      type="button"
                      className="btn-action-ghost"
                      onClick={() => onOpenQuickExpense(group.id)}
                    >
                      <Receipt size={14} />
                      <span>+ Expense</span>
                    </button>

                    <button
                      type="button"
                      className="btn-action-emerald"
                      onClick={() => handleGoToSettlement(group.id)}
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
      )}

      {/* Group Ledger Modal */}
      {selectedGroupModal && (
        <div className="modal-backdrop-blur">
          <div className="settle-modal-card clean-ledger-modal">
            <div className="modal-top-bar">
              <div>
                <span className="badge-pill-emerald">{selectedGroupModal.destination}</span>
                <h3 className="modal-main-title">{selectedGroupModal.name} Ledger</h3>
              </div>
              <button
                type="button"
                className="btn-close-circle"
                onClick={() => setSelectedGroupModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-inner-scroll-body">
              <div className="ledger-stats-strip">
                <div>
                  <span className="text-xs text-slate-500">Total Spent</span>
                  <div className="font-bold text-base text-slate-900">
                    {selectedGroupModal.currencySymbol}{selectedGroupModal.totalSpent.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Travelers</span>
                  <div className="font-bold text-base text-slate-900">
                    {selectedGroupModal.members.length} Members
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Status</span>
                  <div className="font-bold text-base text-capitalize text-emerald">
                    {selectedGroupModal.status}
                  </div>
                </div>
              </div>

              <h4 className="ledger-subhead">Itemized Expenses ({selectedGroupModal.expenses.length})</h4>
              <div className="ledger-expenses-list">
                {selectedGroupModal.expenses.map((exp) => (
                  <div key={exp.id} className="clean-ledger-item">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{exp.title}</div>
                      <div className="text-xs text-slate-500">
                        Paid by {exp.paidBy.name} • {exp.date}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">
                      {selectedGroupModal.currencySymbol}{exp.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-bottom-actions mt-20">
                <button
                  type="button"
                  className="btn-cancel-flat"
                  onClick={() => setSelectedGroupModal(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-confirm-settlement"
                  onClick={() => {
                    const gid = selectedGroupModal.id;
                    setSelectedGroupModal(null);
                    handleGoToSettlement(gid);
                  }}
                >
                  <Zap size={15} />
                  <span>Launch Settlement Engine</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
