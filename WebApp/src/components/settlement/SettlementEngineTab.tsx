import React, { useState, useMemo } from 'react';
import {
  Zap,
  ArrowRight,
  Scale,
  CheckCircle2,
  Share2,
  Check,
  Smartphone,
  Plus,
  Trash2,
  Sliders
} from 'lucide-react';
import {
  GroupCardItem,
  SimplifiedTransfer,
  calculateOptimalSettlements
} from '../../mock/dashboardMockData';

interface SettlementEngineTabProps {
  groups: GroupCardItem[];
  preSelectedGroupId?: string;
  onOpenSettleModal: (transfer: SimplifiedTransfer) => void;
  onConfirmSettlementDirect: (transferId: string) => void;
}

export const SettlementEngineTab: React.FC<SettlementEngineTabProps> = ({
  groups,
  preSelectedGroupId,
  onOpenSettleModal,
  onConfirmSettlementDirect
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    preSelectedGroupId || groups[0]?.id || 'custom-sandbox'
  );
  const [isCopiedShare, setIsCopiedShare] = useState(false);
  const [completedTransferIds, setCompletedTransferIds] = useState<string[]>([]);

  // Sandbox mode
  const [isSandboxMode, setIsSandboxMode] = useState(selectedGroupId === 'custom-sandbox');
  const [sandboxMembers, setSandboxMembers] = useState([
    { id: 'sb-1', name: 'Yogesh (You)', balance: 4500, avatarBg: '#059669', isUser: true },
    { id: 'sb-2', name: 'Rahul Sharma', balance: -3000, avatarBg: '#0284c7' },
    { id: 'sb-3', name: 'Sneha Patil', balance: 1500, avatarBg: '#7c3aed' },
    { id: 'sb-4', name: 'Aditya Kulkarni', balance: -2000, avatarBg: '#ea580c' },
    { id: 'sb-5', name: 'Ananya Mehta', balance: -1000, avatarBg: '#ec4899' }
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberBalance, setNewMemberBalance] = useState('');

  const currentGroup = groups.find((g) => g.id === selectedGroupId);

  const settlementResult = useMemo(() => {
    if (isSandboxMode || !currentGroup) {
      return calculateOptimalSettlements(sandboxMembers, 'INR', '₹');
    }
    return calculateOptimalSettlements(
      currentGroup.members,
      currentGroup.currency,
      currentGroup.currencySymbol
    );
  }, [isSandboxMode, currentGroup, sandboxMembers]);

  const activeMembersList = isSandboxMode ? sandboxMembers : (currentGroup?.members || []);
  const currencySymbol = isSandboxMode ? '₹' : (currentGroup?.currencySymbol || '₹');

  const handleGroupSelect = (groupId: string) => {
    if (groupId === 'custom-sandbox') {
      setIsSandboxMode(true);
      setSelectedGroupId('custom-sandbox');
    } else {
      setIsSandboxMode(false);
      setSelectedGroupId(groupId);
    }
  };

  const handleToggleComplete = (transferId: string) => {
    if (completedTransferIds.includes(transferId)) {
      setCompletedTransferIds((prev) => prev.filter((id) => id !== transferId));
    } else {
      setCompletedTransferIds((prev) => [...prev, transferId]);
      onConfirmSettlementDirect(transferId);
    }
  };

  const handleShareSummary = () => {
    const title = isSandboxMode ? 'Custom Ledger Settlement' : `${currentGroup?.name} Settlement`;
    let text = `*⚡ ${title} (GroupTrip Ledger)*\n\n`;
    text += `*Summary:* ${settlementResult.transfers.length} simplified transfers needed.\n\n`;
    settlementResult.transfers.forEach((t, i) => {
      text += `${i + 1}. ${t.from.name} ➡️ pays ${t.currencySymbol}${t.amount.toLocaleString()} ➡️ ${t.to.name}\n`;
    });
    text += `\n_Generated via GroupTrip Ledger AI Settlement Engine_`;

    navigator.clipboard.writeText(text);
    setIsCopiedShare(true);
    setTimeout(() => setIsCopiedShare(false), 2500);
  };

  const handleAddSandboxMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const bal = Number(newMemberBalance) || 0;
    const newId = `sb-${Date.now()}`;
    const colors = ['#059669', '#0284c7', '#7c3aed', '#ea580c', '#ec4899', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    setSandboxMembers((prev) => [
      ...prev,
      { id: newId, name: newMemberName.trim(), balance: bal, avatarBg: randomColor }
    ]);
    setNewMemberName('');
    setNewMemberBalance('');
  };

  const handleRemoveSandboxMember = (id: string) => {
    setSandboxMembers((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="settlement-page-container animate-fade-in">
      {/* 1. Header & Group Selector */}
      <div className="clean-section-card settlement-header-card">
        <div className="settlement-top-row">
          <div>
            <div className="flex-center-gap mb-4">
              <span className="badge-pill-amber">
                <Zap size={14} /> AI Debt Minimization Engine
              </span>
            </div>
            <h1 className="page-heading-large">Settlement Engine</h1>
            <p className="page-heading-sub">
              Our graph minimization algorithm reduces circular debts into the minimum direct payments possible.
            </p>
          </div>

          <div className="settlement-controls-bar">
            <select
              className="clean-select-box"
              value={selectedGroupId}
              onChange={(e) => handleGroupSelect(e.target.value)}
            >
              {groups.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {grp.name} ({grp.destination})
                </option>
              ))}
              <option value="custom-sandbox">🛠 Custom Settlement Simulator</option>
            </select>

            <button
              type="button"
              className="btn-outline-share"
              onClick={handleShareSummary}
            >
              {isCopiedShare ? (
                <>
                  <Check size={15} className="text-emerald" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 size={15} />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Algorithm Metrics Strip */}
        <div className="clean-metrics-strip">
          <div className="metric-cell">
            <span className="metric-cell-label">Original Debts</span>
            <div className="metric-cell-val text-muted line-through">
              {settlementResult.originalTxCount} Payments
            </div>
          </div>

          <div className="metric-arrow">
            <ArrowRight size={20} className="text-amber" />
          </div>

          <div className="metric-cell is-highlight">
            <span className="metric-cell-label">Simplified Transfers</span>
            <div className="metric-cell-val text-emerald">
              {settlementResult.optimizedTxCount} Transfers
            </div>
            <span className="metric-cell-sub text-emerald">⚡ {settlementResult.reductionPercentage}% fewer transactions</span>
          </div>

          <div className="metric-cell">
            <span className="metric-cell-label">Total Volume</span>
            <div className="metric-cell-val">
              {currencySymbol}{settlementResult.totalVolume.toLocaleString()}
            </div>
          </div>

          <div className="metric-cell">
            <span className="metric-cell-label">Completed</span>
            <div className="metric-cell-val text-amber">
              {completedTransferIds.length} / {settlementResult.transfers.length}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Grid */}
      <div className="settlement-grid-layout">
        {/* Left: Simplified Transfers */}
        <div className="settlement-main-col">
          <div className="clean-section-card">
            <div className="section-header-row mb-16">
              <div>
                <h2 className="section-main-title">Optimized Payment Instructions</h2>
                <p className="section-sub-title">
                  Execute these {settlementResult.transfers.length} transfers to balance the group completely.
                </p>
              </div>
            </div>

            {settlementResult.transfers.length === 0 ? (
              <div className="empty-state-card py-40">
                <CheckCircle2 size={44} className="text-emerald" />
                <h3>All Accounts Balanced!</h3>
                <p>No pending debts found for this trip ledger.</p>
              </div>
            ) : (
              <div className="transfers-cards-stack">
                {settlementResult.transfers.map((item, idx) => {
                  const isDone = completedTransferIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`clean-transfer-card ${isDone ? 'is-done' : ''}`}
                    >
                      <div className="transfer-card-top-row">
                        <span className="transfer-seq-tag">Transfer #{idx + 1}</span>
                        {isDone ? (
                          <span className="transfer-status-done">
                            <Check size={12} /> Completed
                          </span>
                        ) : (
                          <span className="transfer-status-pending">● Pending</span>
                        )}
                      </div>

                      {/* Visual Flow Node */}
                      <div className="clean-flow-row">
                        <div className="flow-traveler-node">
                          <div
                            className="flow-avatar"
                            style={{ backgroundColor: item.from.avatarBg }}
                          >
                            {item.from.name[0]}
                          </div>
                          <div>
                            <div className="flow-name">{item.from.name}</div>
                            <span className="flow-role-tag payer">Payer (Owes)</span>
                          </div>
                        </div>

                        <div className="flow-center-box">
                          <span className="flow-amount-badge">
                            {item.currencySymbol}{item.amount.toLocaleString()}
                          </span>
                          <div className="flow-arrow-graphic">
                            <ArrowRight size={20} />
                          </div>
                          <span className="flow-method-caption">{item.dueDate}</span>
                        </div>

                        <div className="flow-traveler-node text-right">
                          <div
                            className="flow-avatar"
                            style={{ backgroundColor: item.to.avatarBg }}
                          >
                            {item.to.name[0]}
                          </div>
                          <div>
                            <div className="flow-name">{item.to.name}</div>
                            <span className="flow-role-tag receiver">Receiver</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="transfer-card-bottom-row">
                        <button
                          type="button"
                          className={`btn-transfer-complete ${isDone ? 'is-active' : ''}`}
                          onClick={() => handleToggleComplete(item.id)}
                        >
                          <CheckCircle2 size={15} />
                          <span>{isDone ? 'Completed' : 'Mark Done'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn-transfer-upi"
                          onClick={() => onOpenSettleModal(item)}
                          disabled={isDone}
                        >
                          <Smartphone size={15} />
                          <span>Settle via UPI</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sandbox controls if in simulator mode */}
          {isSandboxMode && (
            <div className="clean-section-card sandbox-box">
              <div className="flex-center-gap mb-12">
                <Sliders size={16} className="text-emerald" />
                <h4 className="font-bold text-slate-800">Add Traveler to Simulator</h4>
              </div>
              <form onSubmit={handleAddSandboxMember} className="sandbox-form-row">
                <input
                  type="text"
                  className="clean-search-input flex-1"
                  placeholder="Traveler Name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  required
                />
                <input
                  type="number"
                  className="clean-search-input w-130"
                  placeholder="Net Balance (₹)"
                  value={newMemberBalance}
                  onChange={(e) => setNewMemberBalance(e.target.value)}
                  required
                />
                <button type="submit" className="btn-emerald-solid">
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right: Net Balance Spectrum */}
        <div className="settlement-side-col">
          <div className="clean-section-card">
            <div className="flex-center-gap mb-6">
              <Scale size={17} className="text-emerald" />
              <h3 className="sidebar-section-title">Net Balance Spectrum</h3>
            </div>
            <p className="text-xs text-slate-500 mb-14">
              Net balance of all expenses paid minus shared obligations.
            </p>

            <div className="balance-spectrum-list">
              {activeMembersList.map((member) => {
                const isCreditor = member.balance > 0.01;
                const isDebtor = member.balance < -0.01;
                return (
                  <div key={member.id} className="spectrum-row">
                    <div className="flex-center-gap">
                      <div className="spectrum-dot" style={{ backgroundColor: member.avatarBg }}>
                        {member.name[0]}
                      </div>
                      <div>
                        <div className="spectrum-name">{member.name}</div>
                        <div className="spectrum-desc">
                          {isCreditor && 'Owed reimbursement'}
                          {isDebtor && 'Needs to pay'}
                          {!isCreditor && !isDebtor && 'Balanced'}
                        </div>
                      </div>
                    </div>

                    <div className="flex-center-gap">
                      <span
                        className={`spectrum-amount ${
                          isCreditor ? 'text-emerald' : isDebtor ? 'text-rose' : 'text-slate-500'
                        }`}
                      >
                        {isCreditor ? '+' : ''}{currencySymbol}{Math.round(member.balance).toLocaleString()}
                      </span>
                      {isSandboxMode && (
                        <button
                          type="button"
                          className="btn-delete-chip"
                          onClick={() => handleRemoveSandboxMember(member.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
