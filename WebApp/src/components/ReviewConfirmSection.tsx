import React from 'react';
import { 
  Compass, 
  Calendar, 
  Coins, 
  Split, 
  MapPin, 
  CheckCircle2, 
  ArrowLeft, 
  Check, 
  Loader2, 
  Mail, 
  ShieldCheck, 
  Users, 
  FileText
} from 'lucide-react';
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

      {/* Hero Summary Card: Group Banner & Quick Highlights */}
      <div className="confirm-hero-card">
        <div className="confirm-hero-top">
          <div className="confirm-hero-identity">
            <div className="confirm-hero-icon-box">
              <Compass size={24} className="confirm-hero-icon" />
            </div>
            <div className="confirm-hero-text">
              <div className="confirm-hero-title-row">
                <h3 className="confirm-trip-name">{formData.groupName || 'Untitled Group Trip'}</h3>
                {formData.tripType && (
                  <span className="confirm-badge-type">{formData.tripType}</span>
                )}
              </div>
              <div className="confirm-destination-row">
                <MapPin size={15} className="confirm-dest-icon" />
                <span className="confirm-dest-text">{formData.destination || 'Destination not set'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Highlights Bar (Mobile-first responsive pills) */}
        <div className="confirm-quick-stats">
          <div className="confirm-stat-pill">
            <Calendar size={14} className="stat-pill-icon" />
            <span className="stat-pill-val">
              {startDateFormatted && endDateFormatted
                ? `${startDateFormatted} – ${endDateFormatted}`
                : 'Dates pending'}
            </span>
            {durationDays > 0 && (
              <span className="stat-pill-tag">{durationDays} Days</span>
            )}
          </div>

          <div className="confirm-stat-pill">
            <Coins size={14} className="stat-pill-icon" />
            <span className="stat-pill-val">{currencyObj?.symbol} {formData.currency}</span>
            <span className="stat-pill-tag">{currencyObj?.label || 'Currency'}</span>
          </div>

          <div className="confirm-stat-pill">
            <Split size={14} className="stat-pill-icon" />
            <span className="stat-pill-val">{splitObj?.title || 'Equal Split'}</span>
          </div>

          <div className="confirm-stat-pill">
            <Users size={14} className="stat-pill-icon" />
            <span className="stat-pill-val">{formData.travelers.length} {formData.travelers.length === 1 ? 'Traveler' : 'Travelers'}</span>
          </div>
        </div>
      </div>

      {/* Detailed Content Grid */}
      <div className="confirm-details-grid">
        {/* Row: Trip Description (if provided) */}
        {formData.description && (
          <div className="confirm-detail-card confirm-desc-card">
            <div className="confirm-card-label-row">
              <FileText size={14} className="confirm-card-icon" />
              <span className="confirm-card-label">Trip Notes & Description</span>
            </div>
            <p className="confirm-desc-content">{formData.description}</p>
          </div>
        )}

        {/* Row: Group Tier & Billing Summary */}
        <div className={`confirm-detail-card confirm-billing-card ${formData.travelers.length > 6 ? 'is-premium' : ''}`}>
          <div className="confirm-billing-header">
            <div className="confirm-billing-title-wrap">
              <div className={`billing-icon-wrap ${formData.travelers.length > 6 ? 'icon-amber' : 'icon-emerald'}`}>
                <Coins size={18} />
              </div>
              <div>
                <span className="confirm-card-label">Group Tier & Activation</span>
                <span className="confirm-billing-tier-name">
                  {formData.travelers.length > 6 ? 'Large Squad Tier (7+ Members)' : 'Standard Free Tier (Up to 6 Members)'}
                </span>
              </div>
            </div>
            {formData.travelers.length > 6 ? (
              formData.payment?.status === 'PAID' ? (
                <span className="billing-status-pill paid">
                  <CheckCircle2 size={13} />
                  ₹19.00 Verified
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
                <span className="billing-addon-fee">+₹19.00</span>
              </div>
            )}
            <div className="confirm-billing-item confirm-billing-total">
              <span>Total Ledger Activation:</span>
              <strong className="billing-total-val">
                {formData.travelers.length > 6 ? '₹19.00' : '₹0.00 (FREE)'}
              </strong>
            </div>
          </div>

          {formData.payment?.transactionId && (
            <div className="confirm-billing-receipt">
              <div className="receipt-left">
                <span className="receipt-label">Payment Receipt:</span>
                <code className="receipt-code">{formData.payment.transactionId}</code>
              </div>
              <span className="receipt-method-tag">{formData.payment.paymentMethod || 'UPI'}</span>
            </div>
          )}
        </div>

        {/* Row: Travelers & Invitations Roster */}
        <div className="confirm-detail-card confirm-travelers-card">
          <div className="confirm-travelers-header">
            <div className="confirm-travelers-title-wrap">
              <div className="confirm-card-label-row">
                <Users size={15} className="confirm-card-icon" />
                <span className="confirm-card-label">Travelers & Squad Members</span>
                <span className="confirm-count-chip">{formData.travelers.length}</span>
              </div>
              <p className="confirm-travelers-hint">
                Official invitation links will be dispatched automatically upon confirmation.
              </p>
            </div>
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
                  <span className="confirm-traveler-email" title={traveler.email}>{traveler.email}</span>
                </div>
                <div className="confirm-traveler-badges">
                  {index >= 6 && (
                    <span className="confirm-role-pill paid-slot-tag" title="Paid squad slot">
                      +₹19
                    </span>
                  )}
                  {traveler.role === 'Organizer' ? (
                    <span className="confirm-role-pill role-org">
                      <ShieldCheck size={11} />
                      Organizer
                    </span>
                  ) : traveler.status === 'ACCEPTED' ? (
                    <span className="confirm-role-pill role-trav">
                      <Check size={11} />
                      Joined
                    </span>
                  ) : (
                    <span className="confirm-role-pill role-pending">
                      <Mail size={11} />
                      Pending
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
        <ShieldCheck size={18} className="confirm-notice-icon" />
        <div className="confirm-notice-text">
          <strong className="confirm-notice-headline">Instant Dispatch & Ledger Protection</strong>
          <span className="confirm-notice-body">
            Invitations and split settings are activated immediately. All group members can access the shared dashboard securely.
          </span>
        </div>
      </div>

      {/* Navigation & Action Buttons (Mobile-first responsive dock) */}
      <div className="confirm-action-buttons">
        <button
          type="button"
          className="btn btn-secondary confirm-back-btn"
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
