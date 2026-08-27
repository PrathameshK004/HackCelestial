<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { ArrowRight, Camera, Check, CircleDollarSign, Clock3, Info, Plus, RefreshCw, WalletCards, X } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { CreateGroupHeader } from '../components/CreateGroupHeader';
import { groupService } from '../services/group.service';
import { GroupSummary, SettlementData } from '../types/group';
import { GroupMenuPage } from './GroupMenuPage';

interface HomePageProps { onCreateGroup: () => void; }
type MenuTab = 'details' | 'ratio' | 'pay';

export const HomePage: React.FC<HomePageProps> = ({ onCreateGroup }) => {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selected, setSelected] = useState<GroupSummary | null>(null);
  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [expense, setExpense] = useState({ description: '', amount: '', paidBy: '', participants: [] as string[] });
  const [activeTab, setActiveTab] = useState<MenuTab>('details');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [upiUri, setUpiUri] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanError, setScanError] = useState('');
  const [paymentPending, setPaymentPending] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const scannerRef = React.useRef<QrScanner | null>(null);
  const [error, setError] = useState('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingSettlement, setIsLoadingSettlement] = useState(false);

  const loadGroups = async () => {
    setIsLoadingGroups(true);
    try { const response = await groupService.getMyGroups(); setGroups(response.data || []); setError(''); }
    catch (err: any) { setError(err.message || 'Could not load your groups'); }
    finally { setIsLoadingGroups(false); }
  };
  useEffect(() => { loadGroups(); }, []);
  useEffect(() => {
    if (!selected) return;
    setSettlement(null);
    setIsLoadingSettlement(true);
    groupService.getSettlement(selected.id).then((response) => {
      setSettlement(response.data);
      setExpense((previous) => ({ ...previous, paidBy: previous.paidBy || String(response.data.members[0]?.id || ''), participants: previous.participants.length ? previous.participants : response.data.members.map((member) => String(member.id)) }));
    }).catch((err: any) => setError(err.message || 'Could not calculate settlement'))
      .finally(() => setIsLoadingSettlement(false));
  }, [selected]);
  useEffect(() => {
    if (!cameraOpen || !videoRef.current) return;
    const scanner = new QrScanner(videoRef.current, (result) => {
      const value = typeof result === 'string' ? result : result.data;
      if (value.trim().toLowerCase().startsWith('upi://')) {
        setUpiUri(value);
        stopCamera();
      } else {
        setScanError('This QR is not a valid UPI payment QR.');
      }
    }, {
      preferredCamera: 'environment',
      returnDetailedScanResult: true,
      highlightScanRegion: true,
      highlightCodeOutline: true,
      maxScansPerSecond: 10,
    });
    scannerRef.current = scanner;
    scanner.start().catch(() => setScanError('Camera permission is required to scan a UPI QR.'));
    return () => { scanner.stop(); scanner.destroy(); scannerRef.current = null; };
  }, [cameraOpen]);

  const activeGroups = groups.filter((group) => group.status !== 'SETTLED');
  const settledGroups = groups.filter((group) => group.status === 'SETTLED');
  const addExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    try { await groupService.addExpense(selected.id, { ...expense, paymentMethod, paymentReference: paymentMethod === 'UPI' ? upiUri : undefined }); setExpense((previous) => ({ ...previous, description: '', amount: '' })); setUpiUri(''); const response = await groupService.getSettlement(selected.id); setSettlement(response.data); setError(''); setActiveTab('ratio'); }
    catch (err: any) { setError(err.message || 'Could not add expense'); }
  };
  const stopCamera = () => { scannerRef.current?.stop(); scannerRef.current?.destroy(); scannerRef.current = null; setCameraOpen(false); };
  const startCamera = async () => {
    setScanError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setScanError('Camera requires HTTPS or localhost. Use ADB reverse and open http://localhost:3000, or enable HTTPS.'); return; }
    setCameraOpen(true);
  };
  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (paymentMethod === 'CASH' && !window.confirm('Confirm that you paid this amount in cash?')) return;
    if (paymentMethod === 'UPI') {
      if (!upiUri) { setError('Scan a valid UPI QR before paying.'); return; }
      const payee = settlement?.members.find((member) => expense.participants.includes(String(member.id)));
      if (!payee || !expense.amount || !expense.description.trim()) { setError('Select a payee and enter remarks and amount before paying.'); return; }
      try {
        const intent = new URL(upiUri);
        intent.searchParams.set('pn', payee.name);
        intent.searchParams.set('tn', expense.description.trim());
        intent.searchParams.set('am', Number(expense.amount).toFixed(2));
        intent.searchParams.set('cu', selected?.currency || 'INR');
        setUpiUri(intent.toString());
        setPaymentPending(true);
        window.location.assign(intent.toString());
      } catch { setError('The scanned QR did not contain a valid UPI payment address.'); }
      return;
    }
    await addExpense(event);
  };
  const markSettled = async () => { if (!selected) return; await groupService.settleGroup(selected.id); setSelected(null); setSettlement(null); await loadGroups(); };

  if (selected && isLoadingSettlement) {
    return <div className="app-container"><CreateGroupHeader /><main className="main-content home-content"><button className="back-button" onClick={() => setSelected(null)}><ArrowRight size={17} /> Back to groups</button><section className="group-view loading-view"><p className="eyebrow"><CircleDollarSign size={14} /> Settlement engine</p><h1>Loading group ledger...</h1><p className="page-subtitle">Reading expenses and calculating who owes whom.</p></section></main></div>;
  }

  if (selected && settlement) {
    return <GroupMenuPage
      group={selected}
      settlement={settlement}
      onBack={() => { window.history.pushState({}, '', window.location.pathname); setSelected(null); setSettlement(null); }}
      onRefresh={async () => {
        const response = await groupService.getSettlement(selected.id);
        setSettlement(response.data);
      }}
      onSettled={markSettled}
    />;
  }

  return <div className="app-container"><CreateGroupHeader onHelpClick={() => setError('Choose a group, then use Pay to record only your own payment.')} />
    <main className="main-content home-content">
      <section className="home-intro"><div><span className="page-badge"><WalletCards size={13} /> Trip ledger</span><h1 className="page-title">Good to see you, back to the numbers.</h1><p className="page-subtitle">Active trips, settled history, and clear next payments in one place.</p></div><button className="primary-action" onClick={onCreateGroup}><Plus size={17} /> New group</button></section>
      {error && <div className="dashboard-notice">{error}</div>}
      <section className="module-grid"><div className="module-heading"><div><p className="eyebrow"><Clock3 size={14} /> Module 01</p><h2>Active groups</h2></div><span className="module-count">{activeGroups.length}</span></div><div className="group-list">{isLoadingGroups ? <div className="empty-module">Loading your groups...</div> : activeGroups.length ? activeGroups.map((group) => <button className={`group-row ${selected?.id === group.id ? 'selected' : ''}`} key={group.id} onClick={() => setSelected(group)}><span className="group-mark">{group.destination.slice(0, 1).toUpperCase()}</span><span className="group-row-copy"><strong>{group.name}</strong><small>{group.destination} · {group.memberCount} travelers</small></span><ArrowRight size={17} /></button>) : <div className="empty-module">No active groups yet. Start with a new trip.</div>}</div></section>
      <section className="module-grid history-module"><div className="module-heading"><div><p className="eyebrow"><Check size={14} /> Module 02</p><h2>Settled history</h2></div><span className="module-count muted-count">{settledGroups.length}</span></div><div className="group-list">{settledGroups.length ? settledGroups.map((group) => <button className="group-row history-row" key={group.id} onClick={() => setSelected(group)}><span className="group-mark settled-mark"><Check size={16} /></span><span className="group-row-copy"><strong>{group.name}</strong><small>{group.destination} · Fully settled</small></span><ArrowRight size={17} /></button>) : <div className="empty-module">Settled trips will live here for a clean record.</div>}</div></section>
      {selected && settlement && <section className="group-workspace"><aside className="group-sidebar"><div className="sidebar-title"><span className="group-mark">{selected.destination.slice(0, 1).toUpperCase()}</span><div><strong>{selected.name}</strong><small>{selected.destination}</small></div></div>{([['details', Info, 'Details'], ['ratio', CircleDollarSign, 'Ratio'], ['pay', WalletCards, 'Pay']] as const).map(([tab, Icon, label]) => <button className={`side-menu-item ${activeTab === tab ? 'active' : ''}`} key={tab} onClick={() => setActiveTab(tab)}><Icon size={17} /> {label}</button>)}<button className="side-refresh" onClick={() => groupService.getSettlement(selected.id).then((response) => setSettlement(response.data))}><RefreshCw size={15} /> Refresh</button></aside><div className="group-workspace-body">{activeTab === 'details' && <div><p className="eyebrow"><Info size={14} /> Group details</p><h2>{selected.name}</h2><div className="detail-grid"><div><small>Destination</small><strong>{selected.destination}</strong></div><div><small>Travelers</small><strong>{selected.memberCount}</strong></div><div><small>Currency</small><strong>{selected.currency}</strong></div></div><button className="settle-button" onClick={markSettled}><Check size={16} /> Mark group as settled</button></div>}{activeTab === 'ratio' && <div><p className="eyebrow"><CircleDollarSign size={14} /> Module 03</p><h2>Who pays whom</h2><p className="panel-copy">Transfers use exact cents and settle the smallest number of obligations.</p><div className="transfer-list">{settlement.transfers.length ? settlement.transfers.map((transfer) => <div className="transfer-row" key={`${transfer.from}-${transfer.to}`}><span>{transfer.fromName} pays <strong>{transfer.toName}</strong></span><strong className="transfer-amount">{selected.currency} {transfer.amount}</strong></div>) : <div className="empty-module">Everyone is balanced.</div>}</div></div>}{activeTab === 'pay' && <div><p className="eyebrow"><WalletCards size={14} /> Add your payment</p><h2>Pay for your group</h2><p className="panel-copy">You can record only payments made by your logged-in account.</p><form className="expense-form payment-form" onSubmit={submitPayment}><input required placeholder="What did you pay for?" value={expense.description} onChange={(event) => setExpense({ ...expense, description: event.target.value })} /><input required type="number" min="0.01" step="0.01" placeholder={`Amount (${selected.currency})`} value={expense.amount} onChange={(event) => setExpense({ ...expense, amount: event.target.value })} /><div className="recipient-list"><small>Paying for</small>{settlement.members.map((member) => <label key={String(member.id)}><input type="checkbox" checked={expense.participants.includes(String(member.id))} onChange={(event) => setExpense((previous) => ({ ...previous, participants: event.target.checked ? [...previous.participants, String(member.id)] : previous.participants.filter((id) => id !== String(member.id)) }))} /> {member.name}</label>)}</div><div className="payment-methods"><button type="button" className={paymentMethod === 'CASH' ? 'method-selected' : ''} onClick={() => setPaymentMethod('CASH')}>Cash</button><button type="button" className={paymentMethod === 'UPI' ? 'method-selected' : ''} onClick={() => setPaymentMethod('UPI')}>UPI</button></div>{paymentMethod === 'UPI' && <div className="upi-scanner"><button type="button" className="scan-button" onClick={startCamera}><Camera size={17} /> Scan recipient QR</button>{upiUri && <span className="scan-success"><Check size={15} /> QR ready</span>}{scanError && <span className="scan-error">{scanError}</span>}</div>}<button className="primary-action" type="submit" disabled={paymentPending}>{paymentPending ? 'Complete payment, then return here' : <><Check size={16} /> {paymentMethod === 'UPI' ? 'Pay with UPI' : 'Confirm cash payment'}</>}</button></form>{paymentPending && <div className="payment-return"><strong>Did the UPI payment succeed?</strong><button onClick={async () => { setPaymentPending(false); await addExpense({ preventDefault: () => undefined } as React.FormEvent); }}>Yes, record payment</button><button onClick={() => setPaymentPending(false)}><X size={15} /> Cancel</button></div>}</div>}</div></section>}
      {selected && settlement && <section className="expense-history"><div className="module-heading"><div><p className="eyebrow"><WalletCards size={14} /> Recorded payments</p><h2>Remarks and amounts</h2></div></div>{settlement.expenses.length ? <div className="expense-history-list">{settlement.expenses.map((record) => <div className="expense-history-row" key={record.id}><div><strong>{record.description}</strong><small>{record.paymentMethod || 'CASH'} payment</small></div><strong className="transfer-amount">{selected.currency} {record.amount}</strong></div>)}</div> : <div className="empty-module">Your recorded payments will appear here.</div>}</section>}
      {cameraOpen && <div className="camera-modal"><div className="camera-dialog"><button className="modal-close-btn" onClick={stopCamera} title="Close scanner"><X size={18} /></button><h3>Scan UPI QR</h3><video ref={videoRef} autoPlay playsInline /><p>Point your camera at the recipient’s UPI QR.</p></div></div>}
    </main></div>;
};
=======
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
>>>>>>> ef932bc34383e3359611c02248cb16f9aab4cb97
