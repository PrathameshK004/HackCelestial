import React, { useState } from 'react';
import { X, Receipt, Users, Check, Sliders, Home, Compass, ShieldCheck } from 'lucide-react';
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
    <div className="modal-backdrop-blur quick-expense-backdrop">
      <div className="settle-modal-card quick-expense-modal-card">
        <div className="quick-expense-header">
          <div>
            <h3 className="modal-main-title">Add Group Expense</h3>
            <p>Add expense and split costs with group</p>
          </div>
          <button type="button" className="btn-close-circle" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {feedbackError && (
          <div className="quick-expense-error">
            {feedbackError}
          </div>
        )}

        <form id="quick-expense-form" onSubmit={handleSubmit} className="settle-form-content">
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
          <div className="quick-expense-title-amount">
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
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cost-Sharing Model (5 Models from PRD) */}
          <div className="form-group-block">
            <label className="form-group-label">Cost-Sharing Model</label>
            <div className="quick-expense-model-list">
              {[
                { id: 'EQUAL', label: 'Equal Split', description: 'Divided evenly among all selected travelers', icon: Users },
                { id: 'PARTICIPANT_BASED', label: 'Participant-Based', description: 'Per-person customized share', icon: Sliders },
                { id: 'ROOM_SHARE', label: 'Room Share', description: 'Split based on occupied rooms', icon: Home },
                { id: 'ACTIVITY_BASED', label: 'Activity-Based', description: 'Split only among opted-in members', icon: Compass },
                { id: 'ORGANIZER_PAID', label: 'Organizer Sponsored', description: 'Organizer covers full cost, 0 debt', icon: ShieldCheck },
              ].map((model) => {
                const IconComponent = model.icon;
                const isCurrent = splitModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSplitModel(model.id as CostSplitModel)}
                    className={`quick-expense-model ${isCurrent ? 'active' : ''}`}
                    aria-pressed={isCurrent}
                  >
                    <span className="quick-expense-model-icon"><IconComponent size={17} /></span>
                    <span className="quick-expense-model-copy">
                      <span className="quick-expense-model-title">{model.label}</span>
                      <span className="quick-expense-model-description">{model.description}</span>
                    </span>
                    {isCurrent && <Check size={17} className="quick-expense-model-check" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid By */}
          <div className="form-group-block">
            <label className="form-group-label">Paid By</label>
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
                ? `Split Among (${selectedMemberIds.length} selected travelers)`
                : splitModel === 'ROOM_SHARE'
                ? 'Room Units per Traveler'
                : splitModel === 'PARTICIPANT_BASED'
                ? 'Custom Amount per Traveler'
                : splitModel === 'ORGANIZER_PAID'
                ? 'Covered by Organizer'
                : 'Split Breakdown'}
            </label>

            <div className="quick-expense-member-list">
              {currentGroup?.members.map((m) => {
                const isOptedIn = selectedMemberIds.includes(m.id);
                const estimatedOwed = liveEstimatedShares[m.id] || 0;

                return (
                  <div
                    key={m.id}
                    className={`quick-expense-member-row ${isOptedIn ? 'selected' : ''}`}
                  >
                    <div className="quick-expense-member-identity">
                      {splitModel === 'ACTIVITY_BASED' && (
                        <input
                          type="checkbox"
                          checked={isOptedIn}
                          onChange={() => toggleMemberOptIn(m.id)}
                          className="quick-expense-member-checkbox"
                        />
                      )}
                      <div className="avatar-dot" style={{ backgroundColor: m.avatarBg, width: '24px', height: '24px', fontSize: '11px' }}>
                        {m.name[0]}
                      </div>
                      <span className="quick-expense-member-name">
                        {m.name} {m.isUser && '(You)'}
                      </span>
                    </div>

                    <div className="quick-expense-member-values">
                      {splitModel === 'ROOM_SHARE' && (
                        <div className="quick-expense-member-input-wrap">
                          <span>Units</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="5"
                            value={customValues[m.id] || '1'}
                            onChange={(e) => handleCustomValueChange(m.id, e.target.value)}
                            className="quick-expense-member-input"
                          />
                        </div>
                      )}

                      {splitModel === 'PARTICIPANT_BASED' && (
                        <div className="quick-expense-member-input-wrap">
                          <span>Owes</span>
                          <input
                            type="number"
                            step="any"
                            value={customValues[m.id] || ''}
                            placeholder="0.00"
                            onChange={(e) => handleCustomValueChange(m.id, e.target.value)}
                            className="quick-expense-member-input"
                          />
                        </div>
                      )}

                      <span className="quick-expense-member-share">
                        {currentGroup?.currencySymbol || '₹'}{estimatedOwed.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </form>
        <div className="quick-expense-footer">
          <button type="submit" form="quick-expense-form" className="quick-expense-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving Expense...' : `Add Expense • ${currentGroup?.currencySymbol || '₹'}${(Number(amount) || 0).toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  );
};
