import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Smartphone,
  CreditCard,
  ShieldCheck,
  Globe,
  Bell,
  Check,
  Sparkles,
  Camera
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (msg: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess
}) => {
  const { user } = useAuth();
  if (!isOpen) return null;

  const [username, setUsername] = useState(user?.username || 'Yogesh Dandawalkar');
  const [email, setEmail] = useState(user?.emailId || 'yogesh@example.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [upiId, setUpiId] = useState('yogesh@okaxis');
  const [defaultCurrency, setDefaultCurrency] = useState('INR (₹)');
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      if (onSaveSuccess) onSaveSuccess('Profile settings updated successfully!');
      onClose();
    }, 900);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="settle-modal-card profile-modal-card">
        {/* Top Header */}
        <div className="modal-top-bar">
          <div className="modal-heading-group">
            <span className="badge-pill-emerald">Account & Identity</span>
            <h3 className="modal-main-title">Organizer Profile</h3>
          </div>
          <button type="button" className="btn-close-circle" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Profile Card Header Banner */}
        <div className="profile-banner-header">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-large">
              {getInitials(username)}
            </div>
            <button type="button" className="btn-avatar-camera" title="Change Avatar">
              <Camera size={14} />
            </button>
          </div>

          <div className="profile-user-summary">
            <h4 className="profile-display-name">{username}</h4>
            <p className="profile-display-email">{email}</p>
            <div className="profile-badges-row">
              <span className="profile-status-badge">
                <ShieldCheck size={13} /> Verified Member
              </span>
              <span className="profile-tier-badge">
                <Sparkles size={13} /> Star Organizer
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="settle-form-content">
          <div className="form-row-2col">
            <div className="form-group-block">
              <label className="form-group-label">Full Name</label>
              <div className="input-with-icon">
                <User size={16} className="input-inner-icon text-slate-400" />
                <input
                  type="text"
                  className="styled-text-input pl-icon"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-block">
              <label className="form-group-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-inner-icon text-slate-400" />
                <input
                  type="email"
                  className="styled-text-input pl-icon"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-group-block">
              <label className="form-group-label">Phone Number</label>
              <div className="input-with-icon">
                <Smartphone size={16} className="input-inner-icon text-slate-400" />
                <input
                  type="text"
                  className="styled-text-input pl-icon"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group-block">
              <label className="form-group-label">Default Settlement UPI ID</label>
              <div className="input-with-icon">
                <CreditCard size={16} className="input-inner-icon text-emerald" />
                <input
                  type="text"
                  className="styled-text-input pl-icon font-semibold"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@upi"
                />
              </div>
            </div>
          </div>

          <div className="form-group-block">
            <label className="form-group-label">Default Trip Currency</label>
            <div className="input-with-icon">
              <Globe size={16} className="input-inner-icon text-slate-400" />
              <select
                className="styled-text-input pl-icon"
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
              >
                <option value="INR (₹)">INR (₹) — Indian Rupee (Default)</option>
                <option value="USD ($)">USD ($) — United States Dollar</option>
                <option value="EUR (€)">EUR (€) — Euro</option>
                <option value="AED (AED)">AED (AED) — UAE Dirham</option>
              </select>
            </div>
          </div>

          <div className="profile-preferences-strip">
            <div className="pref-item">
              <div className="flex-center-gap">
                <Bell size={15} className="text-emerald" />
                <span className="text-sm font-semibold">WhatsApp Instant Settle Alerts</span>
              </div>
              <input type="checkbox" defaultChecked className="styled-checkbox" />
            </div>
          </div>

          {/* Modal Bottom Actions */}
          <div className="modal-bottom-actions">
            <button type="button" className="btn-cancel-flat" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-confirm-settlement" disabled={isSaved}>
              {isSaved ? (
                <span className="flex-center-gap">
                  <Check size={16} /> Saved!
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
