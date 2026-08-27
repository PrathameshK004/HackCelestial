import React from 'react';
import { Users, UserCheck, CreditCard, Sliders } from 'lucide-react';
import { EXPENSE_SPLIT_OPTIONS } from '../mock/mockData';
import { ExpenseSplit } from '../types/group';

interface ExpenseSplitSelectorProps {
  selected: ExpenseSplit;
  onChange: (split: ExpenseSplit) => void;
}

export const ExpenseSplitSelector: React.FC<ExpenseSplitSelectorProps> = ({ selected, onChange }) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'equal':
        return <Users size={18} />;
      case 'participant':
        return <UserCheck size={18} />;
      case 'organizer':
        return <CreditCard size={18} />;
      case 'custom':
        return <Sliders size={18} />;
      default:
        return <Users size={18} />;
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">Expense Split Mode</label>
      <div className="split-cards-grid" role="radiogroup" aria-label="Expense Split Mode">
        {EXPENSE_SPLIT_OPTIONS.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <div
              key={opt.id}
              role="radio"
              aria-checked={isSelected}
              className={`split-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onChange(opt.id as ExpenseSplit)}
            >
              <div className="split-card-header">
                <div className="split-title-wrap">
                  <span className="section-title-icon">{getIcon(opt.id)}</span>
                  <span className="split-card-title">{opt.title}</span>
                </div>
                <span className="split-badge">{opt.badge}</span>
              </div>
              <p className="split-card-desc">{opt.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
