import React, { useState } from 'react';
import { X, Receipt, Tag, Users, Check } from 'lucide-react';
import { GroupCardItem, GroupExpense } from '../../mock/dashboardMockData';

interface QuickExpenseModalProps {
  groups: GroupCardItem[];
  selectedGroupId?: string;
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (groupId: string, newExpense: Omit<GroupExpense, 'id'>) => void;
}

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
  const [paidById, setPaidById] = useState('');

  const currentGroup = groups.find((g) => g.id === groupId) || groups[0];

  const handlePayerChange = (memberId: string) => {
    setPaidById(memberId);
  };

  const activePayerId = paidById || currentGroup?.members[0]?.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) return;

    const payer = currentGroup.members.find((m) => m.id === activePayerId) || currentGroup.members[0];

    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    onAddExpense(currentGroup.id, {
      title: title.trim(),
      amount: Number(amount),
      currency: currentGroup.currency,
      category,
      paidBy: {
        name: payer.name,
        avatarBg: payer.avatarBg,
        isUser: payer.isUser
      },
      splitWithCount: currentGroup.members.length,
      date: today,
      time: timeNow
    });

    onClose();
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="settle-modal-card">
        <div className="modal-top-bar">
          <div className="modal-heading-group">
            <span className="badge-pill-emerald">Expense Ledger</span>
            <h3 className="modal-main-title">Add Quick Group Expense</h3>
          </div>
          <button type="button" className="btn-close-circle" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

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
              <label className="form-group-label">Expense Title</label>
              <div className="input-with-icon">
                <Receipt size={16} className="input-inner-icon" />
                <input
                  type="text"
                  className="styled-text-input pl-icon"
                  placeholder="e.g. Seafood Dinner, Uber Ride"
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

          {/* Paid By */}
          <div className="form-group-block">
            <label className="form-group-label">Paid By</label>
            <div className="traveler-selector-grid">
              {currentGroup?.members.map((member) => {
                const isSelected = (activePayerId === member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    className={`traveler-select-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => handlePayerChange(member.id)}
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

          {/* Split info notice */}
          <div className="split-notice-box">
            <Users size={16} className="text-emerald" />
            <div className="notice-text">
              <span>Split equally among all <strong>{currentGroup?.members.length || 0} members</strong> ({currentGroup?.currencySymbol}{amount ? (Number(amount) / (currentGroup?.members.length || 1)).toFixed(0) : '0'} / person).</span>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-bottom-actions">
            <button type="button" className="btn-cancel-flat" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-confirm-settlement">
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
