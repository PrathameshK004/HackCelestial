import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TabNavigation, ActiveTab } from '../components/navigation/TabNavigation';
import { HomeTab } from '../components/home/HomeTab';
import { MyGroupsTab } from '../components/groups/MyGroupsTab';
import { SettlementEngineTab } from '../components/settlement/SettlementEngineTab';
import { SettleUpModal } from '../components/settlement/SettleUpModal';
import { QuickExpenseModal } from '../components/home/QuickExpenseModal';
import { JoinGroupModal } from '../components/home/JoinGroupModal';
import { UserProfileModal } from '../components/profile/UserProfileModal';
import { PaymentHistoryModal } from '../components/profile/PaymentHistoryModal';
import { HelpSupportModal } from '../components/profile/HelpSupportModal';
import { ToastNotification, ToastMessage } from '../components/ToastNotification';
import { CreateGroupPage } from './CreateGroupPage';
import {
  MOCK_DASHBOARD_GROUPS,
  GroupCardItem,
  SimplifiedTransfer,
  GroupExpense
} from '../mock/dashboardMockData';
import { groupService } from '../services/group.service';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [groups, setGroups] = useState<GroupCardItem[]>(MOCK_DASHBOARD_GROUPS);
  const [isCreatingTripFlow, setIsCreatingTripFlow] = useState<boolean>(false);
  const [selectedGroupIdForSettlement, setSelectedGroupIdForSettlement] = useState<string | undefined>(undefined);

  // Modals
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [selectedGroupForExpense, setSelectedGroupForExpense] = useState<string | undefined>(undefined);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [settleTransferModal, setSettleTransferModal] = useState<SimplifiedTransfer | null>(null);

  // 6-Option Profile Menu Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [isHelpSupportOpen, setIsHelpSupportOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch groups from backend if available
  useEffect(() => {
    const fetchRemoteGroups = async () => {
      try {
        const res = await groupService.getMyGroups();
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const formattedRemote: GroupCardItem[] = res.data.map((rg: any, idx: number) => {
            const gradients = [
              'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              'linear-gradient(135deg, #047857 0%, #065f46 100%)',
              'linear-gradient(135deg, #10b981 0%, #f59e0b 100%)'
            ];
            return {
              id: rg.groupId || `grp-remote-${idx}`,
              name: rg.name || 'Group Trip',
              destination: rg.destination || 'Destination',
              tag: rg.tripType || 'Adventure',
              tripType: rg.tripType || 'Friends',
              status: 'active',
              startDate: rg.startDate || '2026-09-01',
              endDate: rg.endDate || '2026-09-05',
              currency: rg.currency || 'INR',
              currencySymbol: rg.currency === 'USD' ? '$' : '₹',
              totalBudget: 50000,
              totalSpent: 12500,
              userBalance: 1500,
              description: rg.description || 'Custom group trip ledger.',
              coverGradient: gradients[idx % gradients.length],
              inviteCode: rg.inviteCode || 'INVITE12',
              members: (rg.members || []).map((m: any, mIdx: number) => ({
                id: m.id || `m-${mIdx}`,
                name: m.name || 'Member',
                email: m.email || '',
                role: m.role || 'Traveler',
                avatarBg: m.avatarBg || '#059669',
                balance: 0
              })),
              expenses: []
            };
          });

          setGroups((prev) => {
            const existingIds = new Set(formattedRemote.map((g) => g.id));
            const retainedMocks = prev.filter((p) => !existingIds.has(p.id));
            return [...formattedRemote, ...retainedMocks];
          });
        }
      } catch {
        // Default to curated rich mock groups
      }
    };

    fetchRemoteGroups();
  }, []);

  const handleAddExpense = (groupId: string, newExpData: Omit<GroupExpense, 'id'>) => {
    const newId = `exp-${Date.now()}`;
    const newExpense: GroupExpense = {
      id: newId,
      ...newExpData
    };

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          const updatedExpenses = [newExpense, ...g.expenses];
          const updatedSpent = g.totalSpent + newExpense.amount;
          return {
            ...g,
            expenses: updatedExpenses,
            totalSpent: updatedSpent
          };
        }
        return g;
      })
    );

    addToast(`Expense "${newExpData.title}" logged successfully!`, 'success');
  };

  const handleConfirmSettlement = (_transferId: string, method: string, _notes?: string) => {
    addToast(`Settlement recorded via ${method.toUpperCase()}!`, 'success');
  };

  const handleJoinSuccess = (groupName: string) => {
    addToast(`Successfully joined "${groupName}"!`, 'success');
    setActiveTab('groups');
  };

  // If user clicked Create Trip and wants full wizard view
  if (isCreatingTripFlow) {
    return (
      <div className="create-trip-flow-wrapper">
        <div className="top-return-bar">
          <button
            type="button"
            className="btn-back-to-home"
            onClick={() => setIsCreatingTripFlow(false)}
          >
            ← Back to Home Dashboard
          </button>
        </div>
        <CreateGroupPage />
      </div>
    );
  }

  return (
    <div className="app-container home-page-layout">
      {/* Tabular Menu Top Navigation with 6-Option Profile/Three-Dot Menu */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        groupCount={groups.length}
        pendingSettlementsCount={2}
        onCreateGroupClick={() => setIsCreatingTripFlow(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenPaymentHistory={() => setIsPaymentHistoryOpen(true)}
        onOpenHelpSupport={() => setIsHelpSupportOpen(true)}
      />

      {/* Main Tab Content */}
      <main className="main-tab-content">
        {activeTab === 'home' && (
          <HomeTab
            groups={groups}
            userName={user?.username || 'Yogesh Dandawalkar'}
            onNavigateTab={setActiveTab}
            onOpenCreateGroup={() => setIsCreatingTripFlow(true)}
            onOpenQuickExpense={() => {
              setSelectedGroupForExpense(groups[0]?.id);
              setIsQuickExpenseOpen(true);
            }}
            onOpenJoinGroup={() => setIsJoinGroupOpen(true)}
            onOpenSettleModal={(transfer) => setSettleTransferModal(transfer)}
          />
        )}

        {activeTab === 'groups' && (
          <MyGroupsTab
            groups={groups}
            onNavigateTab={setActiveTab}
            onOpenCreateGroup={() => setIsCreatingTripFlow(true)}
            onOpenQuickExpense={(groupId) => {
              setSelectedGroupForExpense(groupId || groups[0]?.id);
              setIsQuickExpenseOpen(true);
            }}
            onOpenJoinGroup={() => setIsJoinGroupOpen(true)}
            onSelectGroupForSettlement={(groupId) => setSelectedGroupIdForSettlement(groupId)}
          />
        )}

        {activeTab === 'settlement' && (
          <SettlementEngineTab
            groups={groups}
            preSelectedGroupId={selectedGroupIdForSettlement}
            onOpenSettleModal={(transfer) => setSettleTransferModal(transfer)}
            onConfirmSettlementDirect={(_transferId) => {
              addToast('Settlement transfer marked as completed!', 'success');
            }}
          />
        )}
      </main>

      {/* 6-Option Profile Modals */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSaveSuccess={(msg) => addToast(msg, 'success')}
      />

      <PaymentHistoryModal
        isOpen={isPaymentHistoryOpen}
        onClose={() => setIsPaymentHistoryOpen(false)}
      />

      <HelpSupportModal
        isOpen={isHelpSupportOpen}
        onClose={() => setIsHelpSupportOpen(false)}
      />

      {/* Settle Up, Expense & Join Modals */}
      <SettleUpModal
        transfer={settleTransferModal}
        isOpen={!!settleTransferModal}
        onClose={() => setSettleTransferModal(null)}
        onConfirmSettlement={handleConfirmSettlement}
      />

      <QuickExpenseModal
        groups={groups}
        selectedGroupId={selectedGroupForExpense}
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        onAddExpense={handleAddExpense}
      />

      <JoinGroupModal
        isOpen={isJoinGroupOpen}
        onClose={() => setIsJoinGroupOpen(false)}
        onJoinSuccess={handleJoinSuccess}
      />

      {/* Toast Notification Container */}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
