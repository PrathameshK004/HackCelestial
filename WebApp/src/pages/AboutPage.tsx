import React, { useState } from 'react';
import {
  ArrowLeft, Award, Check, CheckCircle2, ChevronRight, Compass, Heart,
  Lock, MapPin, Share2, ShieldCheck, Sparkles, TrendingDown, Users, Wallet, Zap
} from 'lucide-react';

interface AboutPageProps {
  onBack: () => void;
  onExploreStays?: () => void;
  onCreateTrip?: () => void;
}

type AboutTab = 'mission' | 'algorithm' | 'security' | 'principles';

const tabs: Array<{ id: AboutTab; label: string; icon: React.ElementType }> = [
  { id: 'mission', label: 'Mission', icon: Heart },
  { id: 'algorithm', label: 'Smart settlement', icon: Zap },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'principles', label: 'Principles', icon: Award }
];

const featureCards = [
  ['Boutique stay curation', 'Handpicked stays and destinations that make the trip feel considered from the first plan.', 'Explore well', Compass, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=720&q=80'],
  ['Debt loop elimination', 'A clear ledger condenses tangled IOUs into the fewest direct payments possible.', 'Settle simply', TrendingDown, 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=720&q=80'],
  ['Direct UPI settlement', 'Pay through the apps you already trust, with a verified reference attached to every settlement.', 'Pay directly', Wallet, 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=720&q=80'],
  ['Easy group access', 'Invite companions with a personal link, code, or QR without adding another app to the trip.', 'Bring everyone in', Users, 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=720&q=80']
] as const;

const principles = [
  ['Radical serenity', 'Technology should reduce anxiety: clean screens, quiet notifications, and balances you can understand at a glance.'],
  ['Authentic sanctuaries', 'We champion boutique, eco-conscious stays that respect local culture and the places people travel to.'],
  ['Zero hidden fees', 'Every split is transparent. The ledger keeps the math honest and the group conversation comfortable.'],
  ['Always ready', 'Plans should keep moving on a mountain pass or in a weak-signal station, then sync when the connection returns.']
];

export const AboutPage: React.FC<AboutPageProps> = ({ onBack, onExploreStays, onCreateTrip }) => {
  const [activeTab, setActiveTab] = useState<AboutTab>('mission');
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Triptual', text: 'Plan the trip. Clear the ledger.', url: window.location.origin });
      else await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { /* Sharing can be dismissed. */ }
  };

  return (
    <main className="about-page-root animate-fade-in">
      <div className="about-page-container">
        <header className="about-home-header">
          <button type="button" className="btn-back-transparent" onClick={onBack} aria-label="Back to Dashboard" title="Back to Dashboard"><ArrowLeft size={21} /></button>
          <div className="about-home-brand"><img src="/triptual-logo.png" alt="Triptual" /><div><span className="about-home-eyebrow">The Triptual story</span><h1>About Triptual</h1></div></div>
          <button type="button" className="about-home-share" onClick={handleShare} aria-label={copied ? 'Link copied' : 'Share Triptual'}>{copied ? <Check size={16} /> : <Share2 size={16} />}<span>{copied ? 'Copied' : 'Share'}</span></button>
        </header>

        <section className="about-home-hero">
          <div className="about-home-hero-copy"><span className="about-home-kicker"><Sparkles size={14} /> Group travel, made lighter</span><h2>Plan the adventure.<br /><em>Clear the ledger.</em></h2><p>Triptual brings the itinerary, people, and money conversation into one calm workspace, so the best part of a group trip can stay at the center.</p><div className="about-home-actions">{onCreateTrip && <button type="button" className="about-primary-action" onClick={onCreateTrip}>Create a trip <ChevronRight size={16} /></button>}{onExploreStays && <button type="button" className="about-secondary-action" onClick={onExploreStays}><Compass size={15} /> Explore stays</button>}</div></div>
          <div className="about-home-hero-art" aria-hidden="true"><img src="https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85" alt="A group enjoying an open landscape" /><div className="about-hero-stamp"><MapPin size={14} /><span>Made for the<br /><strong>whole group</strong></span></div></div>
        </section>

        <section className="about-stat-strip" aria-label="Triptual highlights"><div><strong>One workspace</strong><span>for every trip detail</span></div><div><strong>Clear splits</strong><span>without awkward math</span></div><div><strong>Direct pay</strong><span>with verified references</span></div><div><strong>Private by design</strong><span>group access stays focused</span></div></section>

        <section className="about-story-section"><div className="about-section-heading"><span className="about-section-kicker">Why we built it</span><h2>Good trips deserve better logistics.</h2><p>Group travel creates lifelong memories, but the planning rarely feels as effortless as the destination. Triptual keeps the practical work visible, shared, and easy to act on.</p></div><div className="about-feature-grid">{featureCards.map(([title, description, label, Icon, image]) => <article className="about-feature-card" key={title}><div className="about-feature-image"><img src={image} alt="" /><span><Icon size={14} /> {label}</span></div><div className="about-feature-body"><h3>{title}</h3><p>{description}</p></div></article>)}</div></section>

        <section className="about-details-section"><div className="about-tabs" role="tablist" aria-label="About Triptual details">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}><Icon size={15} /><span>{label}</span></button>)}</div>
          {activeTab === 'mission' && <div className="about-detail-panel"><Heart size={20} /><div><h3>Travel together, without the friction.</h3><p>Triptual combines thoughtful travel discovery with an autonomous group ledger. Receipts, shares, approvals, and settlements stay connected, so nobody has to become the trip accountant.</p></div></div>}
          {activeTab === 'algorithm' && <div className="about-detail-panel"><Zap size={20} /><div><h3>From tangled IOUs to a clean next step.</h3><p>When everyone pays for different parts of a trip, the ledger calculates the smallest set of direct transfers needed to settle the group.</p><div className="about-before-after"><span><b>Before</b> multiple circular payments</span><strong>→</strong><span className="positive"><b>After</b> one clear settlement path</span></div></div></div>}
          {activeTab === 'security' && <div className="about-detail-panel"><ShieldCheck size={20} /><div><h3>Your money stays yours.</h3><p>Triptual does not store bank passwords, CVVs, or card numbers. Payments open through your bank or UPI app, while the ledger keeps the group record clear and auditable.</p><div className="about-check-list"><span><CheckCircle2 size={15} /> Encrypted transport</span><span><CheckCircle2 size={15} /> Zero-custody payments</span><span><CheckCircle2 size={15} /> Isolated group access</span></div></div></div>}
          {activeTab === 'principles' && <div className="about-principles-grid">{principles.map(([title, description]) => <article key={title}><CheckCircle2 size={16} /><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>}
        </section>

        <section className="about-rail-card"><div className="about-rail-icon"><ShieldCheck size={19} /></div><div><span className="about-section-kicker">Settlement rails</span><h2>Direct UPI, clear receipts.</h2><p>Use the payment app you already trust. Triptual records the verified reference without holding your funds in between.</p></div><div className="about-rail-tags"><span>PhonePe</span><span>Google Pay</span><span>Paytm</span><span>BHIM UPI</span></div></section>
        <footer className="about-home-footer"><span>Triptual · Smart group travel and expense ledger</span><button type="button" onClick={onBack}><ArrowLeft size={14} /> Back to Dashboard</button></footer>
      </div>
    </main>
  );
};
