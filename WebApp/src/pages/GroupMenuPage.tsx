import React, { useEffect, useState } from 'react';
import { ArrowLeft, Camera, Check, CircleDollarSign, Info, RefreshCw, WalletCards, X } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { groupService } from '../services/group.service';
import { GroupSummary, SettlementData } from '../types/group';
import { useAuth } from '../context/AuthContext';

type GroupMenu = 'details' | 'ratio' | 'pay';

interface GroupMenuPageProps {
  group: GroupSummary;
  settlement: SettlementData;
  initialMenu?: GroupMenu;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onSettled: () => Promise<void>;
}

export const GroupMenuPage: React.FC<GroupMenuPageProps> = ({ group, settlement, initialMenu = 'details', onBack, onRefresh, onSettled }) => {
  const { user } = useAuth();
  const [menu, setMenu] = useState<GroupMenu>(initialMenu);
  const [expense, setExpense] = useState({ description: '', amount: '', participants: settlement.members.map((member) => String(member.id)) });
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [upiUri, setUpiUri] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [message, setMessage] = useState('');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const scannerRef = React.useRef<QrScanner | null>(null);
  const isSettled = group.status === 'SETTLED';

  const navigate = (nextMenu: GroupMenu) => {
    window.history.pushState({ groupMenu: nextMenu }, '', `#group/${group.id}/${nextMenu}`);
    setMenu(nextMenu);
  };

  useEffect(() => {
    const handlePopState = () => {
      const nextMenu = window.location.hash.split('/').pop() as GroupMenu;
      if (['details', 'ratio', 'pay'].includes(nextMenu)) setMenu(nextMenu);
      else onBack();
    };
    window.addEventListener('popstate', handlePopState);
    window.history.replaceState({ groupMenu: initialMenu }, '', `#group/${group.id}/${initialMenu}`);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [group.id, initialMenu, onBack]);

  useEffect(() => () => { scannerRef.current?.stop(); scannerRef.current?.destroy(); }, []);

  const startScanner = () => {
    setMessage('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMessage('Camera requires HTTPS or localhost.');
      return;
    }
    setCameraOpen(true);
  };

  const openUpiIntent = (intent: string) => {
    const link = document.createElement('a');
    link.href = intent;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current) return;
    const scanner = new QrScanner(videoRef.current, (result) => {
      const value = typeof result === 'string' ? result : result.data;
      if (value.trim().toLowerCase().startsWith('upi://')) {
        setUpiUri(value);
        setCameraOpen(false);
        scanner.stop();
        scanner.destroy();
        scannerRef.current = null;
      } else setMessage('This QR is not a valid UPI QR.');
    }, { preferredCamera: 'environment', returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true });
    scannerRef.current = scanner;
    scanner.start().catch(() => setMessage('Camera permission is required to scan a UPI QR.'));
    return () => { scanner.stop(); scanner.destroy(); scannerRef.current = null; };
  }, [cameraOpen]);

  const recordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!expense.description.trim() || !expense.amount || !expense.participants.length) {
      setMessage('Enter remarks, amount, and at least one payee.');
      return;
    }
    if (paymentMethod === 'CASH' && !window.confirm('Confirm this cash payment?')) return;
    let paymentReference: string | undefined;
    if (paymentMethod === 'UPI') {
      if (!upiUri) { setMessage('Scan the payee QR before paying.'); return; }
      const payee = settlement.members.find((member) => expense.participants.includes(String(member.id)));
      if (!payee) { setMessage('Select a payee before paying.'); return; }
      const intent = new URL(upiUri);
      intent.searchParams.set('pn', payee.name);
      intent.searchParams.set('tn', expense.description.trim());
      intent.searchParams.set('am', Number(expense.amount).toFixed(2));
      intent.searchParams.set('cu', group.currency);
      paymentReference = intent.toString();
      setUpiUri(paymentReference);
      setPaymentPending(true);
      openUpiIntent(paymentReference);
      return;
    }
    await groupService.addExpense(group.id, { description: expense.description, amount: expense.amount, participants: expense.participants, paymentMethod, paymentReference });
    await onRefresh();
    setExpense({ description: '', amount: '', participants: settlement.members.map((member) => String(member.id)) });
    setMessage('Payment recorded successfully.');
    navigate('ratio');
  };

  const confirmUpi = async () => {
    setPaymentPending(false);
    await groupService.addExpense(group.id, { description: expense.description, amount: expense.amount, participants: expense.participants, paymentMethod: 'UPI', paymentReference: upiUri });
    await onRefresh();
    setExpense({ description: '', amount: '', participants: settlement.members.map((member) => String(member.id)) });
    setMessage('UPI payment recorded successfully.');
    navigate('ratio');
  };

  const payTransfer = async (transfer: SettlementData['transfers'][number], method: 'CASH' | 'UPI') => {
    const payee = settlement.members.find((member) => String(member.id) === transfer.to);
    const payer = settlement.members.find((member) => String(member.id) === transfer.from);
    if (!payee || !payer || String(payer.userId || '') !== String(user?.userId || '')) return;
    const remarks = window.prompt('Settlement remarks', `Settlement to ${payee.name}`);
    if (!remarks?.trim()) return;
    let reference: string | undefined;
    if (method === 'CASH') {
      if (!window.confirm(`Confirm cash settlement of ${group.currency} ${transfer.amount} to ${payee.name}?`)) return;
    } else {
      if (!payee.upiId) { setMessage('This payee has no UPI ID saved. Ask them to update their profile.'); return; }
      const intent = new URL('upi://pay');
      intent.searchParams.set('pa', payee.upiId);
      intent.searchParams.set('pn', payee.name);
      intent.searchParams.set('am', transfer.amount);
      intent.searchParams.set('tn', remarks.trim());
      intent.searchParams.set('cu', group.currency);
      reference = intent.toString();
      openUpiIntent(reference);
      if (!window.confirm('Did the UPI payment succeed?')) return;
    }
    await groupService.recordSettlement(group.id, { paidTo: payee.id.toString(), amount: transfer.amount, remarks: remarks.trim(), paymentMethod: method, paymentReference: reference });
    await onRefresh();
    setMessage('Settlement payment recorded.');
  };

  return <div className="group-page-shell">
    <header className="group-page-header">
      <button className="back-button" onClick={onBack}><ArrowLeft size={17} /> <span>All groups</span></button>
      <div className="group-page-title"><span className="group-mark">{group.destination.slice(0, 1).toUpperCase()}</span><div><strong>{group.name}</strong><small>{group.destination}</small></div></div>
      <button className="icon-action" onClick={onRefresh} title="Refresh group"><RefreshCw size={17} /></button>
    </header>
    <div className="group-page-layout">
      <nav className="group-page-menu" aria-label="Group menu">
        <button className={menu === 'details' ? 'active' : ''} onClick={() => navigate('details')}><Info size={18} /> Details</button>
        {!isSettled && <button className={menu === 'ratio' ? 'active' : ''} onClick={() => navigate('ratio')}><CircleDollarSign size={18} /> Ratio</button>}
        {!isSettled && <button className={menu === 'pay' ? 'active' : ''} onClick={() => navigate('pay')}><WalletCards size={18} /> Pay</button>}
      </nav>
      <main className="group-page-content">
        {message && <div className="dashboard-notice">{message}</div>}
        {menu === 'details' && <section className="group-view"><p className="eyebrow"><Info size={14} /> Group details</p><h1>{group.name}</h1><p className="page-subtitle">{isSettled ? 'Settled group record. No further edits are allowed.' : 'Your shared travel workspace.'}</p><div className="detail-grid"><div><small>Destination</small><strong>{group.destination}</strong></div><div><small>Travelers</small><strong>{group.memberCount}</strong></div><div><small>Currency</small><strong>{group.currency}</strong></div></div><h3 className="ledger-heading">Expense ledger</h3><div className="expense-ledger">{settlement.expenses.length ? settlement.expenses.map((record) => { const payerName = record.paidByName || settlement.members.find((member) => String(member.id) === String(record.paidBy))?.name || 'Unknown member'; const addedBy = record.createdByName || (record.createdBy === user?.userId ? user?.username || 'Current user' : 'Unknown member'); return <div className="ledger-row" key={record.id}><div><strong>{record.description}</strong><small>{payerName} paid · added by {addedBy} · {new Date(record.createdAt).toLocaleString()}</small><small>Split: {record.shares.map((share) => { const member = settlement.members.find((item) => String(item.id) === String(share.memberId)); return `${member?.name || 'Unknown member'} ${group.currency} ${(share.amountCents / 100).toFixed(2)}`; }).join(' · ')}</small></div><strong className="transfer-amount">{group.currency} {record.amount}</strong></div>; }) : <div className="empty-module">No expenses recorded.</div>}</div>{isSettled && settlement.settlementHistory?.length ? <div className="settlement-history"><h3>Completed settlements</h3>{settlement.settlementHistory.map((record) => <div className="history-row" key={record.id}><span><strong>{record.paidByName} paid {record.paidToName}</strong><small>{record.remarks} · {new Date(record.createdAt).toLocaleString()} · {record.paymentMethod}</small></span><strong>{group.currency} {record.amount}</strong></div>)}</div> : null}{!isSettled && settlement.transfers.length === 0 && <button className="settle-button" onClick={onSettled}><Check size={16} /> Mark group as settled</button>}</section>}
        {menu === 'ratio' && <section className="group-view"><p className="eyebrow"><CircleDollarSign size={14} /> Settlement engine</p><h1>Who owes whom</h1><p className="panel-copy">{settlement.expenses.length} shop expense{settlement.expenses.length === 1 ? '' : 's'} recorded. The engine divides each one and totals every person-to-person debt.</p><div className="ratio-summary"><span>Total recorded at shops</span><strong>{group.currency} {settlement.expenses.reduce((total, record) => total + Number(record.amount), 0).toFixed(2)}</strong></div><div className="transfer-list">{settlement.transfers.length ? settlement.transfers.map((transfer) => <div className="transfer-row" key={`${transfer.from}-${transfer.to}`}><span><strong>{transfer.fromName}</strong> owes <strong>{transfer.toName}</strong></span><span className="transfer-actions"><strong className="transfer-amount">{group.currency} {transfer.amount}</strong>{String(settlement.members.find((member) => String(member.id) === transfer.from)?.userId || '') === String(user?.userId || '') && <><button className="mini-action" onClick={() => payTransfer(transfer, 'UPI')}>Pay UPI</button><button className="mini-action" onClick={() => payTransfer(transfer, 'CASH')}>Cash paid</button></>}</span></div>) : <div className="empty-module">Everyone is balanced. You can mark the group as settled from Details.</div>}</div>{settlement.settlementHistory?.length ? <div className="settlement-history"><h3>Completed payments</h3>{settlement.settlementHistory.map((record) => <div className="history-row" key={record.id}><span><strong>{record.paidByName} paid {record.paidToName}</strong><small>{record.remarks} · {new Date(record.createdAt).toLocaleString()} · {record.paymentMethod}</small></span><strong>{group.currency} {record.amount}</strong></div>)}</div> : null}</section>}
        {!isSettled && menu === 'pay' && <section className="group-view"><p className="eyebrow"><WalletCards size={14} /> Shared shop expense</p><h1>Add what you paid</h1><p className="panel-copy">Record a restaurant, hotel, ticket, or other group purchase. Your account is automatically recorded as the payer.</p><form className="payment-page-form" onSubmit={recordPayment}><label>Shop or expense name<input required placeholder="e.g. Dinner at Coastal Kitchen" value={expense.description} onChange={(event) => setExpense({ ...expense, description: event.target.value })} /></label><label>Total amount ({group.currency})<input required type="number" min="0.01" step="0.01" placeholder="0.00" value={expense.amount} onChange={(event) => setExpense({ ...expense, amount: event.target.value })} /></label><fieldset><legend>Split this expense among</legend>{settlement.members.map((member) => <label className="member-check" key={String(member.id)}><input type="checkbox" checked={expense.participants.includes(String(member.id))} onChange={(event) => setExpense({ ...expense, participants: event.target.checked ? [...expense.participants, String(member.id)] : expense.participants.filter((id) => id !== String(member.id)) })} /> {member.name}</label>)}</fieldset><div className="payment-methods"><button type="button" className={paymentMethod === 'CASH' ? 'method-selected' : ''} onClick={() => setPaymentMethod('CASH')}>Cash at shop</button><button type="button" className={paymentMethod === 'UPI' ? 'method-selected' : ''} onClick={() => setPaymentMethod('UPI')}>UPI at shop</button></div>{paymentMethod === 'UPI' && <div className="upi-scanner"><button type="button" className="scan-button" onClick={startScanner}><Camera size={17} /> Scan shop QR</button>{upiUri && <span className="scan-success"><Check size={15} /> QR ready</span>}</div>}<button className="primary-action" type="submit" disabled={paymentPending}>{paymentPending ? 'Return after shop payment' : paymentMethod === 'UPI' ? 'Pay shop with UPI' : 'Confirm shop cash payment'}</button></form>{paymentPending && <div className="payment-return"><strong>Did the shop UPI payment succeed?</strong><button onClick={() => openUpiIntent(upiUri)}>Open UPI app</button><button onClick={confirmUpi}>Yes, record expense</button><button onClick={() => setPaymentPending(false)}><X size={15} /> Cancel</button></div>}</section>}
      </main>
    </div>
    {cameraOpen && <div className="camera-modal"><div className="camera-dialog"><button className="modal-close-btn" onClick={() => setCameraOpen(false)} title="Close scanner"><X size={18} /></button><h3>Scan UPI QR</h3><video ref={videoRef} autoPlay playsInline /><p>Point your camera at the payee's UPI QR.</p></div></div>}
  </div>;
};
