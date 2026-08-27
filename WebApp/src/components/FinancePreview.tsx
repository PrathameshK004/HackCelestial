import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export const FinancePreview: React.FC = () => {
  const features = [
    'Shared expenses with automated ledgers',
    'Individual expense tracking & itemization',
    'Real-time multi-currency split calculation',
    'Seamless payment & settlement tracking',
    'Automated refund & cancellation logs'
  ];

  return (
    <div className="finance-features-card">
      <div className="finance-header">
        <ShieldCheck size={17} className="section-title-icon" />
        <span>Your Trip Finances</span>
      </div>
      <ul className="finance-list">
        {features.map((feat, idx) => (
          <li key={idx} className="finance-list-item">
            <CheckCircle2 size={15} className="finance-check-icon" />
            <span>{feat}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
