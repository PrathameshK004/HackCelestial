import React from 'react';
import { MapPin, Calendar, Users, Coins, Split, Eye, Sparkles } from 'lucide-react';
import { TripFormData } from '../types/group';
import { CURRENCY_OPTIONS, EXPENSE_SPLIT_OPTIONS } from '../mock/mockData';

interface TripPreviewProps {
  formData: TripFormData;
  durationDays: number;
  startDateFormatted: string;
  endDateFormatted: string;
}

export const TripPreview: React.FC<TripPreviewProps> = ({
  formData,
  durationDays,
  startDateFormatted,
  endDateFormatted
}) => {
  const currencyObj = CURRENCY_OPTIONS.find((c) => c.code === formData.currency);
  const splitObj = EXPENSE_SPLIT_OPTIONS.find((s) => s.id === formData.expenseSplit);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="preview-card">
      <div className="preview-top-banner">
        <div className="preview-tag">
          <Eye size={12} />
          <span>Live Preview • {formData.tripType}</span>
        </div>
        <h3 className="preview-trip-name">
          {formData.groupName || 'Untitled Group Trip'}
        </h3>
        <div className="preview-destination-row">
          <MapPin size={15} style={{ color: '#10b981' }} />
          <span>{formData.destination || 'No destination chosen yet'}</span>
        </div>
      </div>

      <div className="preview-body">
        <div className="preview-item-row">
          <span className="preview-item-label">
            <Calendar size={15} />
            Dates & Duration
          </span>
          <span className="preview-item-value">
            {startDateFormatted && endDateFormatted ? (
              <>
                {startDateFormatted} – {endDateFormatted}
                <div style={{ color: '#059669', fontSize: '0.75rem', fontWeight: '600' }}>
                  {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
                </div>
              </>
            ) : (
              <span style={{ color: '#94a3b8' }}>Dates pending</span>
            )}
          </span>
        </div>

        <div className="preview-item-row">
          <span className="preview-item-label">
            <Users size={15} />
            Travelers
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="preview-item-value">
              {formData.travelers.length} {formData.travelers.length === 1 ? 'Member' : 'Members'}
            </span>
            <div className="preview-avatars-stack">
              {formData.travelers.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="preview-mini-avatar"
                  style={{ backgroundColor: t.avatarBg || '#059669' }}
                  title={t.name}
                >
                  {getInitials(t.name)}
                </div>
              ))}
              {formData.travelers.length > 4 && (
                <div
                  className="preview-mini-avatar"
                  style={{ backgroundColor: '#475569' }}
                >
                  +{formData.travelers.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="preview-item-row">
          <span className="preview-item-label">
            <Sparkles size={15} />
            Group Tier
          </span>
          <span className="preview-item-value">
            {formData.travelers.length > 6 ? (
              <span style={{ color: '#d97706', fontWeight: 700 }}>
                Large Squad (₹19 Fee)
              </span>
            ) : (
              <span style={{ color: '#059669', fontWeight: 600 }}>
                Free Tier ({formData.travelers.length}/6)
              </span>
            )}
          </span>
        </div>

        <div className="preview-item-row">
          <span className="preview-item-label">
            <Coins size={15} />
            Currency
          </span>
          <span className="preview-item-value">
            {currencyObj?.symbol} {currencyObj?.code}
          </span>
        </div>

        <div className="preview-item-row">
          <span className="preview-item-label">
            <Split size={15} />
            Split Rule
          </span>
          <span className="preview-item-value" style={{ color: '#047857' }}>
            {splitObj?.title || 'Equal Split'}
          </span>
        </div>

        {formData.description && (
          <div className="preview-desc-inline">
            <span className="preview-desc-label">Notes:</span>
            <span className="preview-desc-content">{formData.description}</span>
          </div>
        )}
      </div>
    </div>
  );
};
