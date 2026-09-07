import React, { useState } from 'react';
import { X, Receipt, Tag, Users, Check, Sliders, Home, Compass, ShieldCheck } from 'lucide-react';
import { GroupCardItem, GroupExpense } from '../../mock/dashboardMockData';
import { groupService } from '../../services/group.service';

interface QuickExpenseModalProps {
  groups: GroupCardItem[];
  selectedGroupId?: string;
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (groupId: string, newExpense: Omit<GroupExpense, 'id'>) => void;
}

type CostSplitModel = 'EQUAL' | 'ACTIVITY_BASED' | 'ROOM_SHARE' | 'PARTICIPANT_BASED' | 'ORGANIZER_PAID';

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
  groups,
  selectedGroupId,
  isOpen,
  onClose,
  onAddExpense,
}) => {
  if (!isOpen) return null;

  const initialGroupId = selectedGroupId || (groups[0]?.id || '');
  const [groupId, setGroupId] = useState(initialGroupId);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'Stay' | 'Food' | 'Transport' | 'Activities' | 'Supplies' | 'Other'>('Food');
  const [splitModel, setSplitModel] = useState<CostSplitModel>('EQUAL');
  const [paidById, setPaidById] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<{ [memberId: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const currentGroup = groups.find((g) => g.id === groupId) || groups[0];

  // Initialize selected members when group changes
  React.useEffect(() => {
    if (currentGroup) {
      setSelectedMemberIds(currentGroup.members.map((m) => m.id));
      const initialCustom: { [id: string]: string } = {};
      currentGroup.members.forEach((m) => {
        initialCustom[m.id] = '1';
      });
      setCustomValues(initialCustom);
    }
  }, [currentGroup?.id]);

  const activePayerId = paidById || currentGroup?.members[0]?.id;

  const toggleMemberOptIn = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleCustomValueChange = (memberId: string, val: string) => {
    setCustomValues((prev) => ({ ...prev, [memberId]: val }));
  };

  const calculateLiveShares = () => {
    const total = Number(amount) || 0;
    if (total <= 0 || !currentGroup) return {};

    const shares: { [id: string]: number } = {};

    if (splitModel === 'ORGANIZER_PAID') {
      currentGroup.members.forEach((m) => {
        shares[m.id] = 0;
      });
      return shares;
    }

    if (splitModel === 'ACTIVITY_BASED' || splitModel === 'EQUAL') {
      const activeIds = splitModel === 'ACTIVITY_BASED' ? selectedMemberIds : currentGroup.members.map((m) => m.id);
      const count = activeIds.length || 1;
      const perPerson = Math.round((total / count) * 100) / 100;
      currentGroup.members.forEach((m) => {
        shares[m.id] = activeIds.includes(m.id) ? perPerson : 0;
      });
      return shares;
    }

    if (splitModel === 'ROOM_SHARE') {
      const activeUnits = currentGroup.members.reduce((acc, m) => {
        const u = Number(customValues[m.id]) || 1;
        return acc + u;
      }, 0) || 1;
      currentGroup.members.forEach((m) => {
        const u = Number(customValues[m.id]) || 1;
        shares[m.id] = Math.round(((total * u) / activeUnits) * 100) / 100;
      });
      return shares;
    }

    if (splitModel === 'PARTICIPANT_BASED') {
      currentGroup.members.forEach((m) => {
        shares[m.id] = Number(customValues[m.id]) || 0;
      });
      return shares;
    }

    return shares;
  };

  const liveEstimatedShares = calculateLiveShares();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    if (!title.trim() || !amount || Number(amount) <= 0 || !currentGroup) return;

    if (splitModel === 'ACTIVITY_BASED' && selectedMemberIds.length === 0) {
      setFeedbackError('Please select at least one participating traveler for this activity.');
      return;
    }

    const payer = currentGroup.members.find((m) => m.id === activePayerId) || currentGroup.members[0];
    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setIsSubmitting(true);

    try {
      // Build structured participants array for recalculation engine
      const participantsPayload = currentGroup.members.map((m) => ({
        memberId: m.id,
        shareType:
          splitModel === 'ROOM_SHARE'
            ? 'ROOM_UNIT'
            : splitModel === 'PARTICIPANT_BASED'
            ? 'FIXED_AMOUNT'
            : 'EQUAL_UNIT',
        shareValue:
          splitModel === 'ROOM_SHARE' || splitModel === 'PARTICIPANT_BASED'
            ? Number(customValues[m.id]) || 1.0
            : 1.0,
        isOptedIn: selectedMemberIds.includes(m.id),
      }));

      // Call live backend endpoint
      if (currentGroup.id) {
        await groupService.addExpense(currentGroup.id, {
          description: title.trim(),
          amount: Number(amount).toFixed(2),
          category,
          currency: currentGroup.currency || 'INR',
          splitModel,
          paidByMemberId: payer.id,
          participants: participantsPayload,
          paymentMethod: 'UPI',
        });
      }

      onAddExpense(currentGroup.id, {
        title: title.trim(),
        amount: Number(amount),
        currency: currentGroup.currency,
        category,
        paidBy: {
          name: payer.name,
          avatarBg: payer.avatarBg,
          isUser: payer.isUser,
        },
        splitWithCount:
          splitModel === 'ACTIVITY_BASED'
            ? selectedMemberIds.length
            : splitModel === 'ORGANIZER_PAID'
            ? 1
            : currentGroup.members.length,
        date: today,
        time: timeNow,
      });

      onClose();
    } catch (err: any) {
      console.warn('Backend expense add error:', err);
      setFeedbackError(err.message || 'Failed to persist expense to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="settle-modal-card" style={{ maxWidth: '620px', width: '92%' }}>
        <div className="modal-top-bar">
          <div className="modal-heading-group">
            <span className="badge-pill-emerald">Multi-Vendor Ledger</span>
            <h3 className="modal-main-title">Add Group Expense</h3>
          </div>
          <button type="button" className="btn-close-circle" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {feedbackError && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', margin: '0 20px 10px' }}>
            {feedbackError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="settle-form-content">
          {/* Select Group */}
          <div className="form-group-block">
            <label className="form-group-label">Select Group Trip</label>
            <select
              className="styled-text-input"
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setPaidById('');
              }}
            >
              {groups.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {grp.name} ({grp.destination})
                </option>
              ))}
            </select>
          </div>

          {/* Title & Amount */}
          <div className="form-row-2col">
            <div className="form-group-block">
              <label className="form-group-label">Expense Description</label>
              <div className="input-with-icon">
                <Receipt size={16} className="input-inner-icon" />
                <input
                  type="text"
                  className="styled-text-input pl-icon"
                  placeholder="e.g. Scuba Diving, Villa Deposit, Seafood Dinner"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-block">
              <label className="form-group-label">
                Amount ({currentGroup?.currencySymbol || '₹'})
              </label>
              <input
                type="number"
                step="any"
                className="styled-text-input font-bold"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category Selector */}
          <div className="form-group-block">
            <label className="form-group-label">Category</label>
            <div className="category-chips-row">
              {(['Food', 'Stay', 'Transport', 'Activities', 'Supplies', 'Other'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-pill-btn ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  <Tag size={13} />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cost-Sharing Model (5 Models from PRD) */}
          <div className="form-group-block">
            <label className="form-group-label">Cost-Sharing Policy (PRD Multi-Vendor Engine)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
              {[
                { id: 'EQUAL', label: 'Equal Split', icon: Users },
                { id: 'ACTIVITY_BASED', label: 'Activity Opt-In', icon: Compass },
                { id: 'ROOM_SHARE', label: 'Room Units', icon: Home },
                { id: 'PARTICIPANT_BASED', label: 'Custom Fixed', icon: Sliders },
                { id: 'ORGANIZER_PAID', label: 'Organizer Paid', icon: ShieldCheck },
              ].map((model) => {
                const IconComponent = model.icon;
                const isCurrent = splitModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSplitModel(model.id as CostSplitModel)}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '8px',
                      border: isCurrent ? '1.5px solid #10b981' : '1px solid var(--border-light, #2e3820)',
                      background: isCurrent ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card, #1c2612)',
                      color: isCurrent ? '#10b981' : 'var(--text-secondary, #a3b899)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: isCurrent ? 600 : 500,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <IconComponent size={16} />
                    <span style={{ textAlign: 'center' }}>{model.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid By */}
          <div className="form-group-block">
            <label className="form-group-label">Paid By (Who fronted the money?)</label>
            <div className="traveler-selector-grid">
              {currentGroup?.members.map((member) => {
                const isSelected = activePayerId === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    className={`traveler-select-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => setPaidById(member.id)}
                  >
                    <div className="avatar-dot" style={{ backgroundColor: member.avatarBg }}>
                      {member.name[0]}
                    </div>
                    <span className="member-name-truncate">
                      {member.name} {member.isUser && '(You)'}
                    </span>
                    {isSelected && <Check size={14} className="ml-auto text-emerald" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Member Participation Breakdown */}
          <div className="form-group-block">
            <label className="form-group-label">
              {splitModel === 'ACTIVITY_BASED'
                ? 'Select Travelers Participating in this Activity'
                : splitModel === 'ROOM_SHARE'
                ? 'Room Occupancy Units per Traveler (e.g. 1 = Single, 0.5 = Shared)'
                : splitModel === 'PARTICIPANT_BASED'
                ? 'Custom Amount per Traveler'
                : splitModel === 'ORGANIZER_PAID'
                ? 'Covered 100% by Payer / Sponsor'
                : 'Split Breakdown'}
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {currentGroup?.members.map((m) => {
                const isOptedIn = selectedMemberIds.includes(m.id);
                const estimatedOwed = liveEstimatedShares[m.id] || 0;

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: isOptedIn ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {splitModel === 'ACTIVITY_BASED' && (
                        <input
                          type="checkbox"
                          checked={isOptedIn}
                          onChange={() => toggleMemberOptIn(m.id)}
                          style={{ accentColor: '#10b981', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      )}
                      <div className="avatar-dot" style={{ backgroundColor: m.avatarBg, width: '24px', height: '24px', fontSize: '11px' }}>
                        {m.name[0]}
                      </div>
                      <span style={{ fontSize: '13px', color: isOptedIn ? '#fff' : '#6b7280' }}>
                        {m.name} {m.isUser && '(You)'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {splitModel === 'ROOM_SHARE' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Units:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="5"
                            value={customValues[m.id] || '1'}
                            onChange={(e) => handleCustomValueChange(m.id, e.target.value)}
                            style={{ width: '50px', padding: '2px 4px', fontSize: '12px', background: '#1c2612', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }}
                          />
                        </div>
                      )}

                      {splitModel === 'PARTICIPANT_BASED' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Owes:</span>
                          <input
                            type="number"
                            step="any"
                            value={customValues[m.id] || ''}
                            placeholder="0.00"
                            onChange={(e) => handleCustomValueChange(m.id, e.target.value)}
                            style={{ width: '70px', padding: '2px 4px', fontSize: '12px', background: '#1c2612', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }}
                          />
                        </div>
                      )}

                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>
                        {currentGroup?.currencySymbol || '₹'}{estimatedOwed.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="modal-bottom-actions">
            <button type="button" className="btn-cancel-flat" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-confirm-settlement" disabled={isSubmitting}>
              {isSubmitting ? 'Saving to Ledger...' : 'Save to Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
