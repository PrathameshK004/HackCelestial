import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Inbox,
  CheckCheck,
  X,
  Clock,
  Compass,
  Split,
  ShieldCheck,
  Bell,
  Check,
  Trash2,
  Users,
  MapPin,
  Calendar,
  Loader2,
  MailCheck
} from 'lucide-react';
import { PendingInvitation } from '../../types/group';

export interface InboxNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  category: 'trip' | 'expense' | 'security' | 'system';
  actionTab?: 'explore' | 'trips' | 'expenses';
}

interface GitInboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InboxNotification[];
  pendingInvitations: PendingInvitation[];
  onMarkAllAsRead: () => void;
  onSelectNotification: (notification: InboxNotification) => void;
  onClearAll: () => void;
  onAcceptInvite: (inviteCode: string, groupName: string) => Promise<void>;
  onRejectInvite: (inviteCode: string, groupName: string) => Promise<void>;
  isProcessingInviteCode?: string | null;
}

export const GitInboxDrawer: React.FC<GitInboxDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  pendingInvitations,
  onMarkAllAsRead,
  onSelectNotification,
  onClearAll,
  onAcceptInvite,
  onRejectInvite,
  isProcessingInviteCode = null
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'invitations'>('all');

  if (!isOpen || typeof document === 'undefined') return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length + pendingInvitations.length;
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getCategoryIcon = (category: InboxNotification['category']) => {
    switch (category) {
      case 'trip':
        return <Compass size={12} className="git-inbox-cat-icon trip" />;
      case 'expense':
        return <Split size={12} className="git-inbox-cat-icon expense" />;
      case 'security':
        return <ShieldCheck size={12} className="git-inbox-cat-icon security" />;
      case 'system':
      default:
        return <Bell size={12} className="git-inbox-cat-icon system" />;
    }
  };

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start) return 'Flexible Dates';
    try {
      const s = new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (!end) return s;
      const e = new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return `${s} - ${e}`;
    } catch {
      return start;
    }
  };

  return createPortal(
    <div className="git-inbox-portal" role="dialog" aria-modal="true" aria-label="Notifications & Invitations Inbox">
      {/* Backdrop */}
      <div className="git-inbox-backdrop" onClick={onClose} />

      {/* Slide-out Drawer */}
      <div className="git-inbox-container">
        {/* Top Header */}
        <div className="git-inbox-header">
          <div className="git-inbox-title-row">
            <div className="git-inbox-title">
              <Inbox size={16} strokeWidth={2.2} className="git-inbox-title-icon" />
              <span>Inbox</span>
              {unreadCount > 0 && (
                <span className="git-inbox-count-badge">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="git-inbox-header-actions">
              {notifications.some(n => !n.isRead) && (
                <button
                  type="button"
                  className="git-inbox-action-btn"
                  onClick={onMarkAllAsRead}
                  title="Mark notifications as read"
                  aria-label="Mark notifications as read"
                >
                  <CheckCheck size={12} />
                  <span>Mark read</span>
                </button>
              )}

              <button
                type="button"
                className="git-inbox-close-btn"
                onClick={onClose}
                aria-label="Close inbox"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Filter Bar with Invitations */}
          <div className="git-inbox-filter-bar">
            <button
              type="button"
              className={`git-inbox-filter-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length + pendingInvitations.length})
            </button>
            <button
              type="button"
              className={`git-inbox-filter-pill ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              className={`git-inbox-filter-pill ${filter === 'invitations' ? 'active' : ''}`}
              onClick={() => setFilter('invitations')}
            >
              Invitations
              {pendingInvitations.length > 0 && (
                <span className="git-inbox-pill-count">{pendingInvitations.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Body / Feed */}
        <div className="git-inbox-body">
          {/* ---------------- INVITATIONS TAB ---------------- */}
          {filter === 'invitations' && (
            <div className="git-inbox-list">
              {pendingInvitations.length === 0 ? (
                <div className="git-inbox-empty-state">
                  <div className="git-inbox-empty-circle">
                    <MailCheck size={20} strokeWidth={2.2} />
                  </div>
                  <h4 className="git-inbox-empty-title">No pending invitations</h4>
                  <p className="git-inbox-empty-desc">
                    When you are invited to a group trip, it will arrive here in real-time as well as via email.
                  </p>
                </div>
              ) : (
                pendingInvitations.map((invite) => {
                  const isProcessing = isProcessingInviteCode === invite.inviteCode;
                  return (
                    <div key={invite.id} className="git-inbox-item git-inbox-invite-card unread">
                      <div className="git-inbox-item-top">
                        <div className="git-inbox-item-category">
                          <Users size={12} className="git-inbox-cat-icon trip" />
                          <span className="git-inbox-cat-label">Group Invitation</span>
                        </div>
                        <span className="git-inbox-role-badge">{invite.role || 'Traveler'}</span>
                      </div>

                      <div className="git-inbox-item-content">
                        <h5 className="git-inbox-item-title">
                          <span className="git-inbox-unread-bullet" />
                          {invite.groupName}
                        </h5>
                        <p className="git-inbox-item-desc">
                          Invited by <strong>{invite.organizerName || 'Trip Organizer'}</strong>
                        </p>
                      </div>

                      {/* Destination & Meta Strip */}
                      <div className="git-inbox-invite-meta">
                        {invite.destination && (
                          <div className="git-inbox-meta-cell">
                            <MapPin size={11} />
                            <span>{invite.destination}</span>
                          </div>
                        )}
                        <div className="git-inbox-meta-cell">
                          <Calendar size={11} />
                          <span>{formatDateRange(invite.startDate, invite.endDate)}</span>
                        </div>
                      </div>

                      {/* Interactive Accept & Deny Actions */}
                      <div className="git-inbox-invite-actions">
                        <button
                          type="button"
                          className="git-inbox-btn-accept"
                          onClick={() => onAcceptInvite(invite.inviteCode, invite.groupName)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 size={12} className="spin-animation" />
                          ) : (
                            <Check size={12} strokeWidth={2.4} />
                          )}
                          <span>Accept</span>
                        </button>

                        <button
                          type="button"
                          className="git-inbox-btn-deny"
                          onClick={() => onRejectInvite(invite.inviteCode, invite.groupName)}
                          disabled={isProcessing}
                        >
                          <X size={12} strokeWidth={2.4} />
                          <span>Deny</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ---------------- ALL TAB ---------------- */}
          {filter === 'all' && (
            <div className="git-inbox-list">
              {/* Show pending invitations first if any exist */}
              {pendingInvitations.length > 0 && (
                <div className="git-inbox-section-block">
                  <div className="git-inbox-section-subhead">
                    <span>Trip Invitations ({pendingInvitations.length})</span>
                  </div>
                  {pendingInvitations.map((invite) => {
                    const isProcessing = isProcessingInviteCode === invite.inviteCode;
                    return (
                      <div key={invite.id} className="git-inbox-item git-inbox-invite-card unread" style={{ marginBottom: '8px' }}>
                        <div className="git-inbox-item-top">
                          <div className="git-inbox-item-category">
                            <Users size={12} className="git-inbox-cat-icon trip" />
                            <span className="git-inbox-cat-label">Group Invitation</span>
                          </div>
                          <span className="git-inbox-role-badge">{invite.role || 'Traveler'}</span>
                        </div>

                        <div className="git-inbox-item-content">
                          <h5 className="git-inbox-item-title">
                            <span className="git-inbox-unread-bullet" />
                            {invite.groupName}
                          </h5>
                          <p className="git-inbox-item-desc">
                            Invited by <strong>{invite.organizerName || 'Trip Organizer'}</strong>
                          </p>
                        </div>

                        <div className="git-inbox-invite-meta">
                          {invite.destination && (
                            <div className="git-inbox-meta-cell">
                              <MapPin size={11} />
                              <span>{invite.destination}</span>
                            </div>
                          )}
                          <div className="git-inbox-meta-cell">
                            <Calendar size={11} />
                            <span>{formatDateRange(invite.startDate, invite.endDate)}</span>
                          </div>
                        </div>

                        <div className="git-inbox-invite-actions">
                          <button
                            type="button"
                            className="git-inbox-btn-accept"
                            onClick={() => onAcceptInvite(invite.inviteCode, invite.groupName)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 size={12} className="spin-animation" />
                            ) : (
                              <Check size={12} strokeWidth={2.4} />
                            )}
                            <span>Accept</span>
                          </button>

                          <button
                            type="button"
                            className="git-inbox-btn-deny"
                            onClick={() => onRejectInvite(invite.inviteCode, invite.groupName)}
                            disabled={isProcessing}
                          >
                            <X size={12} strokeWidth={2.4} />
                            <span>Deny</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Standard Activity Notifications */}
              {filteredNotifications.length === 0 && pendingInvitations.length === 0 ? (
                <div className="git-inbox-empty-state">
                  <div className="git-inbox-empty-circle">
                    <Check size={20} strokeWidth={2.4} />
                  </div>
                  <h4 className="git-inbox-empty-title">All caught up!</h4>
                  <p className="git-inbox-empty-desc">
                    You have no notifications or invitations right now. Activity and updates will appear here.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => (
                  <div
                    key={item.id}
                    className={`git-inbox-item ${!item.isRead ? 'unread' : 'read'}`}
                    onClick={() => onSelectNotification(item)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="git-inbox-item-top">
                      <div className="git-inbox-item-category">
                        {getCategoryIcon(item.category)}
                        <span className="git-inbox-cat-label">{item.category}</span>
                      </div>
                      <div className="git-inbox-item-time">
                        <Clock size={10} />
                        <span>{item.timestamp}</span>
                      </div>
                    </div>

                    <div className="git-inbox-item-content">
                      <h5 className="git-inbox-item-title">
                        {!item.isRead && <span className="git-inbox-unread-bullet" />}
                        {item.title}
                      </h5>
                      <p className="git-inbox-item-desc">{item.description}</p>
                    </div>

                    {item.actionTab && (
                      <div className="git-inbox-item-footer">
                        <span className="git-inbox-link-pill">
                          Open in {item.actionTab} &rarr;
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ---------------- UNREAD TAB ---------------- */}
          {filter === 'unread' && (
            <div className="git-inbox-list">
              {/* Unread invitations */}
              {pendingInvitations.map((invite) => {
                const isProcessing = isProcessingInviteCode === invite.inviteCode;
                return (
                  <div key={invite.id} className="git-inbox-item git-inbox-invite-card unread">
                    <div className="git-inbox-item-top">
                      <div className="git-inbox-item-category">
                        <Users size={12} className="git-inbox-cat-icon trip" />
                        <span className="git-inbox-cat-label">Group Invitation</span>
                      </div>
                      <span className="git-inbox-role-badge">{invite.role || 'Traveler'}</span>
                    </div>

                    <div className="git-inbox-item-content">
                      <h5 className="git-inbox-item-title">
                        <span className="git-inbox-unread-bullet" />
                        {invite.groupName}
                      </h5>
                      <p className="git-inbox-item-desc">
                        Invited by <strong>{invite.organizerName || 'Trip Organizer'}</strong>
                      </p>
                    </div>

                    <div className="git-inbox-invite-meta">
                      {invite.destination && (
                        <div className="git-inbox-meta-cell">
                          <MapPin size={11} />
                          <span>{invite.destination}</span>
                        </div>
                      )}
                      <div className="git-inbox-meta-cell">
                        <Calendar size={11} />
                        <span>{formatDateRange(invite.startDate, invite.endDate)}</span>
                      </div>
                    </div>

                    <div className="git-inbox-invite-actions">
                      <button
                        type="button"
                        className="git-inbox-btn-accept"
                        onClick={() => onAcceptInvite(invite.inviteCode, invite.groupName)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 size={12} className="spin-animation" />
                        ) : (
                          <Check size={12} strokeWidth={2.4} />
                        )}
                        <span>Accept</span>
                      </button>

                      <button
                        type="button"
                        className="git-inbox-btn-deny"
                        onClick={() => onRejectInvite(invite.inviteCode, invite.groupName)}
                        disabled={isProcessing}
                      >
                        <X size={12} strokeWidth={2.4} />
                        <span>Deny</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Unread regular notifications */}
              {filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  className="git-inbox-item unread"
                  onClick={() => onSelectNotification(item)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="git-inbox-item-top">
                    <div className="git-inbox-item-category">
                      {getCategoryIcon(item.category)}
                      <span className="git-inbox-cat-label">{item.category}</span>
                    </div>
                    <div className="git-inbox-item-time">
                      <Clock size={10} />
                      <span>{item.timestamp}</span>
                    </div>
                  </div>

                  <div className="git-inbox-item-content">
                    <h5 className="git-inbox-item-title">
                      <span className="git-inbox-unread-bullet" />
                      {item.title}
                    </h5>
                    <p className="git-inbox-item-desc">{item.description}</p>
                  </div>

                  {item.actionTab && (
                    <div className="git-inbox-item-footer">
                      <span className="git-inbox-link-pill">
                        Open in {item.actionTab} &rarr;
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {filteredNotifications.length === 0 && pendingInvitations.length === 0 && (
                <div className="git-inbox-empty-state">
                  <div className="git-inbox-empty-circle">
                    <Check size={20} strokeWidth={2.4} />
                  </div>
                  <h4 className="git-inbox-empty-title">All caught up!</h4>
                  <p className="git-inbox-empty-desc">
                    No unread notifications or invitations right now.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="git-inbox-footer">
            <button
              type="button"
              className="git-inbox-clear-all-btn"
              onClick={onClearAll}
            >
              <Trash2 size={12} />
              <span>Clear activity history</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
