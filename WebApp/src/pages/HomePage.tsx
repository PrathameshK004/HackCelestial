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