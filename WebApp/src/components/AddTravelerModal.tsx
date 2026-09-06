import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UserPlus, 
  Mail, 
  User, 
  CheckCircle2, 
  UserX, 
  Loader2
} from 'lucide-react';

import { Traveler } from '../types/group';
import { groupService } from '../services/group.service';

interface AddTravelerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (traveler: Omit<Traveler, 'id'>) => void;
  existingEmails: string[];
}

const AVATAR_COLORS = ['#059669', '#0284c7', '#7c3aed', '#ea580c', '#db2777', '#d97706', '#0891b2'];

export const AddTravelerModal: React.FC<AddTravelerModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingEmails
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Live registration check states
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<{
    checked: boolean;
    isRegistered: boolean;
    registeredUsername?: string;
  } | null>(null);

  const checkTimeoutRef = useRef<any>(null);

  // Debounced check whenever email changes
  useEffect(() => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setRegistrationStatus(null);
      setIsCheckingUser(false);
      return;
    }

    setIsCheckingUser(true);
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await groupService.checkRegisteredUser(cleanEmail);
        if (res.data?.isRegistered && res.data.user) {
          setRegistrationStatus({
            checked: true,
            isRegistered: true,
            registeredUsername: res.data.user.username,
          });
          // Auto-fill name if user hasn't typed one
          if (!name.trim()) {
            setName(res.data.user.username);
          }
        } else {
          setRegistrationStatus({
            checked: true,
            isRegistered: false,
          });
        }
      } catch (err) {
        console.warn('Check user error:', err);
        setRegistrationStatus(null);
      } finally {
        setIsCheckingUser(false);
      }
    }, 350);

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [email]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!name.trim()) {
      setNameError('Traveler name is required');
      valid = false;
    } else {
      setNameError('');
    }

    if (!email.trim()) {
      setEmailError('Email address is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else if (existingEmails.map(e => e.toLowerCase()).includes(email.trim().toLowerCase())) {
      setEmailError('This traveler email is already added');
      valid = false;
    } else {
      setEmailError('');
    }

    if (valid) {
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      onAdd({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'Traveler',
        avatarBg: randomColor,
        isRegistered: registrationStatus?.isRegistered || false,
        status: 'PENDING'
      });
      setName('');
      setEmail('');
      setNameError('');
      setEmailError('');
      setRegistrationStatus(null);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="modal-icon-badge">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="modal-title">Add Traveler</h3>
              <p className="modal-subtitle">Invite companions via official approval link</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Email Address with live verification */}
            <div className="form-group">
              <label className="form-label" htmlFor="traveler-email-input">
                Email Address <span className="required-star">*</span>
              </label>
              <div className="input-with-icon">
                <div className="input-icon">
                  <Mail size={18} />
                </div>
                <input
                  id="traveler-email-input"
                  type="email"
                  className={`text-input ${emailError ? 'has-error' : ''}`}
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  autoFocus
                />
                {isCheckingUser && (
                  <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center' }}>
                    <Loader2 size={16} className="spin-animation" style={{ color: 'var(--primary-600)' }} />
                  </div>
                )}
              </div>
              {emailError && <div className="field-error-msg">{emailError}</div>}

              {/* Dynamic Platform Status Chip */}
              {registrationStatus && !isCheckingUser && (
                <div className="mt-2">
                  {registrationStatus.isRegistered ? (
                    <div className="user-status-banner banner-registered">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <div>
                        <span><strong>Platform User:</strong> {registrationStatus.registeredUsername}</span>
                        <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.95rem' }} role="img" aria-label="email">📩</span>
                          <span>Official invite will be sent. Member joins group upon approval.</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="user-status-banner banner-unregistered">
                      <UserX size={16} className="text-amber-600" />
                      <div>
                        <span><strong>Not registered on platform yet.</strong></span>
                        <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.95rem' }} role="img" aria-label="email">📧</span>
                          <span>Official invitation link will be sent to join & approve.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Traveler Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="traveler-name-input">
                Full Name <span className="required-star">*</span>
              </label>
              <div className="input-with-icon">
                <div className="input-icon">
                  <User size={18} />
                </div>
                <input
                  id="traveler-name-input"
                  type="text"
                  className={`text-input ${nameError ? 'has-error' : ''}`}
                  placeholder="e.g. Alex Henderson"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                />
              </div>
              {nameError && <div className="field-error-msg">{nameError}</div>}
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary modal-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary modal-submit-btn">
              <UserPlus size={16} />
              <span className="btn-text-desktop">Add & Prepare Official Invite</span>
              <span className="btn-text-mobile">Add Traveler</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
