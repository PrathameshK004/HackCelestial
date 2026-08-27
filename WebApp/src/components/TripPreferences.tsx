import React from 'react';
import { SlidersHorizontal, Coins } from 'lucide-react';
import { CURRENCY_OPTIONS } from '../mock/mockData';
import { Currency, ExpenseSplit } from '../types/group';
import { ExpenseSplitSelector } from './ExpenseSplitSelector';

interface TripPreferencesProps {
  currency: Currency;
  onCurrencyChange: (curr: Currency) => void;
  expenseSplit: ExpenseSplit;
  onExpenseSplitChange: (split: ExpenseSplit) => void;
}

export const TripPreferences: React.FC<TripPreferencesProps> = ({
  currency,
  onCurrencyChange,
  expenseSplit,
  onExpenseSplitChange
}) => {
  return (
    <div className="form-section-card">
      <div className="section-header">
        <div className="section-title-row">
          <h3 className="section-title">
            <SlidersHorizontal size={20} className="section-title-icon" />
            Trip Preferences
          </h3>
        </div>
        <p className="section-subtitle">Set your primary trip currency and default expense sharing formula.</p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="currency-select">
          Default Currency <span className="required-star">*</span>
        </label>
        <div className="input-with-icon">
          <div className="input-icon">
            <Coins size={18} />
          </div>
          <select
            id="currency-select"
            className="select-input"
            style={{ paddingLeft: '42px' }}
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value as Currency)}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} ({c.symbol}) — {c.subtitle}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ExpenseSplitSelector
        selected={expenseSplit}
        onChange={onExpenseSplitChange}
      />
    </div>
  );
};
