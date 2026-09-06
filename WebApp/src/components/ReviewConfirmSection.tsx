import React from 'react';
import { Compass, Calendar, Coins, Split, MapPin, CheckCircle2, ArrowLeft, Check, Loader2, Mail } from 'lucide-react';
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

        {/* Row 4: Group Tier & Billing Summary */}
        <div className={`confirm-field-box confirm-billing-card ${formData.travelers.length > 6 ? 'is-premium' : ''}`}>
          <div className="confirm-billing-header">
            <div className="confirm-billing-title-wrap">
              <Coins size={18} className={formData.travelers.length > 6 ? 'text-amber-600' : 'text-emerald-600'} />
              <div>
                <span className="confirm-label" style={{ marginBottom: '2px' }}>Group Tier & Activation</span>
                <span className="confirm-value-bold">
                  {formData.travelers.length > 6 ? 'Large Squad Tier (7+ Members)' : 'Standard Free Tier (Up to 6 Members)'}
                </span>
              </div>
            </div>
            {formData.travelers.length > 6 ? (
              formData.payment?.status === 'PAID' ? (
                <span className="billing-status-pill paid">
                  <CheckCircle2 size={13} />
                  ₹19.00 Payment Verified
                </span>
              ) : (
                <span className="billing-status-pill pending">
                  ₹19.00 Fee Required
                </span>
              )
            ) : (
              <span className="billing-status-pill free">
                <CheckCircle2 size={13} />
                Free Tier (₹0)
              </span>
            )}
          </div>

          <div className="confirm-billing-breakdown">
            <div className="confirm-billing-item">
              <span>Free Tier Allowance (Up to 6 Travelers):</span>
              <span>₹0.00</span>
            </div>
            {formData.travelers.length > 6 && (
              <div className="confirm-billing-item">
                <span>Large Squad Upgrade Fee (7th Member & Above):</span>
                <span className="text-amber-600 font-semibold">+₹19.00</span>
              </div>
            )}
            <div className="confirm-billing-item confirm-billing-total">
              <span>Total Payable:</span>
              <strong className="billing-total-val">
                {formData.travelers.length > 6 ? '₹19.00' : '₹0.00 (FREE)'}
              </strong>
            </div>
          </div>

          {formData.payment?.transactionId && (
            <div className="confirm-billing-receipt">
              <span>Verified Payment Receipt:</span>
              <code>{formData.payment.transactionId}</code>
              <span className="receipt-method-tag">{formData.payment.paymentMethod || 'UPI'}</span>
            </div>
          )}
        </div>

        {/* Row 5: Travelers & Official Invitations */}
        <div className="confirm-travelers-block">
          <div className="confirm-travelers-header">
            <span className="confirm-label">Travelers & Invitations ({formData.travelers.length})</span>
            <span className="confirm-travelers-hint">
              Official invitation links will be dispatched. Travelers will join the shared group ledger once approved.
            </span>
          </div>

          <div className="confirm-travelers-grid">
            {formData.travelers.map((traveler, index) => (
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
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {index >= 6 && (
                    <span className="confirm-role-pill paid-slot-tag">
                      +₹19
                    </span>
                  )}
                  {traveler.role === 'Organizer' ? (
                    <span className="confirm-role-pill role-org">
                      Organizer
                    </span>
                  ) : traveler.status === 'ACCEPTED' ? (
                    <span className="confirm-role-pill role-trav">
                      Joined
                    </span>
                  ) : (
                    <span className="traveler-role-tag invite-tag" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                      <Mail size={11} />
                      <span>Invite Pending</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assurance Notice */}
      <div className="confirm-notice-banner">
        <CheckCircle2 size={18} className="confirm-notice-icon" />
        <span>
          Official invitation emails with approval links will be delivered immediately upon creation. Invited participants join the ledger upon accepting.
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
          className={`btn btn-primary confirm-submit-btn ${formData.travelers.length > 6 && formData.payment?.status !== 'PAID' ? 'btn-pay-action' : ''}`}
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="spin-animation" />
              <span>Creating Group Workspace...</span>
            </>
          ) : formData.travelers.length > 6 && formData.payment?.status !== 'PAID' ? (
            <>
              <Coins size={18} />
              <span>Pay ₹19 & Create Group</span>
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
