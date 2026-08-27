import React from 'react';
import { Compass, Calendar, Coins, Split, MapPin, CheckCircle2, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { TripFormData } from '../types/group';
import { CURRENCY_OPTIONS, EXPENSE_SPLIT_OPTIONS } from '../mock/mockData';

interface ReviewConfirmSectionProps {
  formData: TripFormData;
  durationDays: number;
  startDateFormatted: string;
  endDateFormatted: string;
  onBackToEdit: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export const ReviewConfirmSection: React.FC<ReviewConfirmSectionProps> = ({
  formData,
  durationDays,
  startDateFormatted,
  endDateFormatted,
  onBackToEdit,
  onConfirm,
  isSubmitting = false
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
    <div className="confirm-section-container">
      {/* Header with uniform typography */}
      <div className="confirm-header">
        <h2 className="confirm-main-title">Confirm Group Application</h2>
        <p className="confirm-subtitle">
          Please review your trip details and traveler list before creating the group ledger.
        </p>
      </div>

      {/* Flat, Unified Details Grid - No Card in Card */}
      <div className="confirm-details-flat">
        {/* Row 1: Trip Identity */}
        <div className="confirm-grid-2col">
          <div className="confirm-field-box">
            <span className="confirm-label">Trip Name</span>
            <div className="confirm-val-row">
              <Compass size={18} className="confirm-icon-emerald" />
              <span className="confirm-value-bold">{formData.groupName || 'Untitled Group Trip'}</span>
              <span className="confirm-badge-type">{formData.tripType}</span>
            </div>
          </div>

          <div className="confirm-field-box">
            <span className="confirm-label">Destination</span>
            <div className="confirm-val-row">
              <MapPin size={18} className="confirm-icon-emerald" />
              <span className="confirm-value-bold">{formData.destination || 'Not selected'}</span>
            </div>
          </div>
        </div>

        {/* Row 2: Schedule & Financials */}
        <div className="confirm-grid-3col">
          <div className="confirm-field-box">
            <span className="confirm-label">Duration & Dates</span>
            <div className="confirm-val-row">
              <Calendar size={18} className="confirm-icon-emerald" />
              <span className="confirm-value">
                {startDateFormatted && endDateFormatted
                  ? `${startDateFormatted} - ${endDateFormatted}`
                  : 'Dates pending'}
              </span>
            </div>
            {durationDays > 0 && (
              <span className="confirm-subtag">{durationDays} Days Expedition</span>
            )}
          </div>

          <div className="confirm-field-box">
            <span className="confirm-label">Ledger Currency</span>
            <div className="confirm-val-row">
              <Coins size={18} className="confirm-icon-emerald" />
              <span className="confirm-value-bold">{currencyObj?.symbol} {formData.currency}</span>
            </div>
            <span className="confirm-subtag">{currencyObj?.label}</span>
          </div>

          <div className="confirm-field-box">
            <span className="confirm-label">Expense Split Strategy</span>
            <div className="confirm-val-row">
              <Split size={18} className="confirm-icon-emerald" />
              <span className="confirm-value-bold">{splitObj?.title || 'Equal Split'}</span>
            </div>
            <span className="confirm-subtag">{splitObj?.description || 'Everyone pays equally.'}</span>
          </div>

        </div>

        {/* Row 3: Description (if provided) */}
        {formData.description && (
          <div className="confirm-field-box">
            <span className="confirm-label">Trip Notes & Description</span>
            <p className="confirm-description-text">{formData.description}</p>
          </div>
        )}

        {/* Row 4: Confirmed Travelers */}
        <div className="confirm-travelers-block">
          <div className="confirm-travelers-header">
            <span className="confirm-label">Confirmed Travelers ({formData.travelers.length})</span>
            <span className="confirm-travelers-hint">
              Registered members will join immediately; unregistered members receive shareable invite links.
            </span>
          </div>

          <div className="confirm-travelers-grid">
            {formData.travelers.map((traveler) => (
              <div key={traveler.id} className="confirm-traveler-chip">
                <div
                  className="confirm-traveler-avatar"
                  style={{ backgroundColor: traveler.avatarBg || '#059669' }}
                >
                  {getInitials(traveler.name)}
                </div>
                <div className="confirm-traveler-info">
                  <span className="confirm-traveler-name">{traveler.name}</span>
                  <span className="confirm-traveler-email">{traveler.email}</span>
                </div>
                <span className={`confirm-role-pill ${traveler.role === 'Organizer' ? 'role-org' : 'role-trav'}`}>
                  {traveler.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assurance Notice */}
      <div className="confirm-notice-banner">
        <CheckCircle2 size={18} className="confirm-notice-icon" />
        <span>
          Once confirmed, all travelers will be added to the shared expense ledger. You can adjust split shares anytime.
        </span>
      </div>

      {/* Navigation Actions */}
      <div className="confirm-action-buttons">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBackToEdit}
          disabled={isSubmitting}
        >
          <ArrowLeft size={16} />
          <span>Back to Edit</span>
        </button>

        <button
          type="button"
          className="btn btn-primary confirm-submit-btn"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="spin-animation" />
              <span>Creating Group Workspace...</span>
            </>
          ) : (
            <>
              <Check size={18} />
              <span>Confirm & Create Group</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
