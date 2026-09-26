import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Dimensions, Image, KeyboardAvoidingView, LayoutAnimation, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, UIManager, View } from 'react-native';
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, Clock3, Headphones, ImagePlus, Paperclip, Plus, Search, Send, SlidersHorizontal, Ticket } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { colors, radii, shadows } from '../theme/colors';
import { backgrounds, borders, cardRadius, fontSize as themeFontSize, fontWeight as fw, screenHeader, spacing } from '../theme/theme';
import { createSupportTicket, getTicketAttachmentUrl, getTicketMessages, listSupportTickets, sendTicketMessage, SupportAttachment, SupportTicketSummary, TicketMessage, updateSupportTicketStatus } from '../api/support.service';
import { socketService } from '../services/socketService';

const fs = { ...themeFontSize, modalTitle: themeFontSize.sectionTitle, modalSubtitle: themeFontSize.inputText };

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);

type Screen = 'tickets' | 'new' | 'chat';
type FaqCategory = 'all' | 'account' | 'trips' | 'expenses' | 'security';

const FAQ_DATA = [
  { id: 'faq-1', category: 'account' as FaqCategory, question: 'How do I manage my notifications?', answer: 'Open the app settings and choose Notification Settings to control trip updates, payment alerts, invite reminders, and group activity. You can enable or mute each alert independently.', tags: ['notifications', 'manage', 'settings', 'alerts', 'reminders'] },
  { id: 'faq-2', category: 'trips' as FaqCategory, question: 'How does group trip creation work on Triptual?', answer: 'Tap the add button from the home dock, add the trip details, and share the unique invite code with your friends so they can join the same trip group.', tags: ['create trip', 'invite code', 'group', 'travel plan'] },
  { id: 'faq-3', category: 'expenses' as FaqCategory, question: 'How does the Smart Debt Simplification work?', answer: 'The system groups all shared costs and calculates the minimum number of transactions needed so everyone settles their balances with fewer transfers.', tags: ['expenses', 'settlement', 'split', 'simplify'] },
  { id: 'faq-4', category: 'expenses' as FaqCategory, question: 'Can I settle payments directly using UPI or Razorpay?', answer: 'Yes. Open the group balances screen, select Settle Up, and choose a member to pay through their saved UPI or the secure Razorpay checkout flow.', tags: ['upi', 'pay', 'razorpay', 'settle'] },
  { id: 'faq-5', category: 'security' as FaqCategory, question: 'Is my personal data safe and private?', answer: 'Your data is protected with secure authentication, encrypted transport, and controlled access for profile and payment information.', tags: ['security', 'privacy', 'safe', 'encrypted'] },
  { id: 'faq-6', category: 'account' as FaqCategory, question: 'How do I update my profile and UPI details?', answer: 'From your profile drawer, tap My Profile and edit your name, travel preferences, profile image, and UPI ID whenever needed.', tags: ['profile', 'upi', 'avatar', 'travel style'] },
  { id: 'faq-7', category: 'security' as FaqCategory, question: 'How do I reset or change my account password?', answer: 'Go to Security & Privacy in the account settings, choose Change Password, and follow the step-by-step verification flow to update it securely.', tags: ['password', 'reset', 'security', 'privacy'] },
  { id: 'faq-8', category: 'trips' as FaqCategory, question: 'How do I add or remove travelers from a trip?', answer: 'Open the trip details, go to members, and use the add or remove option to manage your travel group at any point before everyone has settled the trip.', tags: ['travelers', 'members', 'trip', 'group'] },
  { id: 'faq-9', category: 'trips' as FaqCategory, question: 'Can I edit trip details after inviting people?', answer: 'Yes. You can update the trip name, dates, destination, and budget any time before the trip is locked for settlement review.', tags: ['edit trip', 'dates', 'destination', 'changes'] },
  { id: 'faq-10', category: 'expenses' as FaqCategory, question: 'How do I add a new expense or reimbursement?', answer: 'Tap the expense tab in the trip, add the item, select the participants, and assign the amount so everyone sees the right split instantly.', tags: ['expense', 'reimbursement', 'split', 'amount'] },
  { id: 'faq-11', category: 'account' as FaqCategory, question: 'How do I switch my primary email or phone number?', answer: 'Visit your account settings and update the contact information under Personal Details to keep all trip alerts and confirmations current.', tags: ['email', 'phone', 'contact', 'account'] },
  { id: 'faq-12', category: 'security' as FaqCategory, question: 'How can I contact support if something goes wrong?', answer: 'Open the Help Center and submit a support ticket with the issue category, a clear description, and any screenshots so our team can help quickly.', tags: ['support', 'help', 'ticket', 'contact'] },
];
const FAQ_CATEGORIES: { key: FaqCategory; label: string }[] = [{ key: 'all', label: 'General' }, { key: 'account', label: 'Account' }, { key: 'trips', label: 'Trips & Groups' }, { key: 'expenses', label: 'Expenses & UPI' }, { key: 'security', label: 'Security' }];
const CATEGORIES = ['Job Application Inquiry', 'Other Technical Query', 'Payment Issue', 'Trip & Group Issue', 'Account & Login'];
const formatDate = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
const statusLabel = (status: string) => status.replace(/_/g, ' ');

interface HelpSupportScreenProps { onBack?: () => void; }

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'faq' | 'tickets'>('faq');
  const [screen, setScreen] = useState<Screen>('tickets');
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketSummary | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [attachment, setAttachment] = useState<SupportAttachment | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (screen !== 'tickets') { setScreen('tickets'); return true; } onBack?.(); return Boolean(onBack); }); return () => subscription.remove(); }, [onBack, screen]);
  const loadTickets = async () => { setLoading(true); setError(''); try { setTickets(await listSupportTickets()); } catch (err: any) { setError(err?.message || 'Could not load your support tickets.'); } finally { setLoading(false); } };
  useEffect(() => { loadTickets(); }, []);

  useEffect(() => {
    if (screen !== 'chat' || !selectedTicket) return;
    const ticketNumber = selectedTicket.ticketNumber;
    void socketService.connect();
    socketService.joinTicket(ticketNumber);
    const unsubscribe = socketService.on('ticket:message', (payload) => {
      if (payload?.ticketNumber !== ticketNumber) return;
      const incoming = payload.message as TicketMessage | undefined;
      if (!incoming?.id) return;
      setMessages((current) => current.some((item) => item.id === incoming.id) ? current : [...current, incoming]);
    });
    const unsubscribeStatus = socketService.on('ticket:status_change', (payload) => {
      if (payload?.ticketNumber !== ticketNumber || !payload.status) return;
      setSelectedTicket((current) => current?.ticketNumber === ticketNumber ? { ...current, status: payload.status } : current);
      setTickets((current) => current.map((item) => item.ticketNumber === ticketNumber ? { ...item, status: payload.status } : item));
    });
    const unsubscribeReconnect = socketService.onConnected(() => {
      getTicketMessages(ticketNumber).then((result) => {
        setSelectedTicket((current) => current?.ticketNumber === ticketNumber ? result.ticket : current);
        setMessages((current) => {
          const byId = new Map((result.messages || []).map((message) => [message.id, message]));
          current.forEach((message) => byId.set(message.id, message));
          return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      }).catch((err) => console.warn('Could not resync support chat after reconnect:', err));
    });
    return () => {
      unsubscribe();
      unsubscribeStatus();
      unsubscribeReconnect();
      socketService.leaveTicket(ticketNumber);
    };
  }, [screen, selectedTicket?.ticketNumber]);

  const chooseAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/csv',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.name || `support-${Date.now()}.pdf`,
        type: asset.mimeType || 'application/octet-stream',
      } satisfies SupportAttachment;

      setAttachment(file);
    } catch (err: any) {
      Alert.alert('Attachment error', err?.message || 'Unable to pick a file.');
    }
  };
  const openTicket = async (ticket: SupportTicketSummary) => { setSelectedTicket(ticket); setMessages([]); setScreen('chat'); setLoadingMessages(true); try { const result = await getTicketMessages(ticket.ticketNumber); setSelectedTicket(result.ticket || ticket); setMessages((current) => { const byId = new Map((result.messages || []).map((message) => [message.id, message])); current.forEach((message) => byId.set(message.id, message)); return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); }); } catch (err: any) { Alert.alert('Unable to open ticket', err?.message || 'Please try again.'); } finally { setLoadingMessages(false); } };
  const submitTicket = async () => {
    if (!category || !subject.trim() || !description.trim()) { Alert.alert('Complete your ticket', 'Choose a category and add a subject and description.'); return; }
    setSubmitting(true);
    try { const created = await createSupportTicket({ category, subject, message: description, attachment }); setTickets((current) => [{ ...created, category, subject: subject.trim(), message: description.trim(), status: created.status || 'OPEN' }, ...current]); setSubject(''); setDescription(''); setAttachment(null); setUrgent(false); setScreen('tickets'); Alert.alert('Ticket submitted', `${created.ticketNumber} has been created. Our support team will respond soon.`); } catch (err: any) { Alert.alert('Could not submit ticket', err?.message || 'Please try again.'); } finally { setSubmitting(false); }
  };
  const sendMessage = async () => {
    if (!selectedTicket || (!draft.trim() && !attachment)) return;
    setSending(true);
    try { const message = await sendTicketMessage(selectedTicket.ticketNumber, draft, attachment); setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]); setDraft(''); setAttachment(null); if (selectedTicket.status === 'RESOLVED') { const reopened = { ...selectedTicket, status: 'OPEN' }; setSelectedTicket(reopened); setTickets((current) => current.map((item) => item.ticketNumber === reopened.ticketNumber ? reopened : item)); } } catch (err: any) { Alert.alert('Message failed', err?.message || 'Please try again.'); } finally { setSending(false); }
  };
  const markResolved = async (ticket?: SupportTicketSummary) => {
    const activeTicket = ticket || selectedTicket;
    if (!activeTicket) return;
    try {
      const updated = await updateSupportTicketStatus(activeTicket.ticketNumber, 'RESOLVED');
      setSelectedTicket((current) => (current && current.ticketNumber === updated.ticketNumber ? updated : current));
      setTickets((current) => current.map((item) => item.ticketNumber === updated.ticketNumber ? { ...item, ...updated } : item));
    } catch (err: any) {
      Alert.alert('Unable to update ticket', err?.message || 'Please try again.');
    }
  };
  const headerTopPadding = Math.max(insets.top, 0) + screenHeader.topPadding;
  const Header = ({ title, subtitle, right, searchBar }: { title: string; subtitle?: string; right?: React.ReactNode; searchBar?: React.ReactNode }) => (
    <View style={[styles.header, { paddingTop: headerTopPadding, paddingBottom: screenHeader.bottomPadding }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => screen === 'tickets' ? onBack?.() : setScreen('tickets')} style={styles.headerBack} accessibilityLabel="Back">
          <ArrowLeft size={20} color={colors.slate900} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, title === 'Help Center' && { fontSize: fs.headerTitle, textAlign: 'center' }]}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>

        {right ? <View style={styles.headerAction}>{right}</View> : <View style={styles.headerSpacer} />}
      </View>

      {searchBar ? <View style={styles.headerSearchWrap}>{searchBar}</View> : null}
    </View>
  );
  const TabBar = () => <View style={styles.tabBar}><Pressable style={styles.tabButton} onPress={() => setActiveTab('faq')}><Text style={[styles.tabText, activeTab === 'faq' && styles.tabTextActive]}>FAQ</Text>{activeTab === 'faq' && <View style={styles.tabIndicator} />}</Pressable><Pressable style={styles.tabButton} onPress={() => { setActiveTab('tickets'); setScreen('tickets'); }}><Text style={[styles.tabText, activeTab === 'tickets' && styles.tabTextActive]}>Tickets</Text>{activeTab === 'tickets' && <View style={styles.tabIndicator} />}</Pressable></View>;
  const keyboardOffset = 0;

  if (screen === 'tickets' && activeTab === 'faq') return <View style={styles.container}><StatusBar barStyle="dark-content" backgroundColor={backgrounds.card} /><Header title="Help Center" /><TabBar /><FaqView /></View>;

  if (screen === 'new') return <View style={styles.container}><StatusBar barStyle="dark-content" backgroundColor={backgrounds.card} /><Header title="New ticket" right={<Headphones size={27} color={colors.slate900} />} /><ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled"><Text style={styles.label}>Category</Text><Pressable style={[styles.select, categoryOpen && styles.selectActive]} onPress={() => setCategoryOpen((value) => !value)}><Text style={styles.inputText}>{category}</Text><ChevronDown size={21} color={colors.slate500} /></Pressable>{categoryOpen && <View style={styles.categoryMenu}>{CATEGORIES.map((item) => <Pressable key={item} style={styles.categoryOption} onPress={() => { setCategory(item); setCategoryOpen(false); }}><Text style={styles.inputText}>{item}</Text></Pressable>)}</View>}<Text style={styles.label}>Subject</Text><TextInput style={styles.input} placeholder="E.g. Payment not going through" placeholderTextColor={colors.slate400} value={subject} onChangeText={setSubject} /><Text style={styles.label}>Describe your issue</Text><TextInput style={[styles.input, styles.textArea]} placeholder="Please provide as much detail as possible" placeholderTextColor={colors.slate400} multiline textAlignVertical="top" value={description} onChangeText={setDescription} /><Text style={styles.label}>Upload file</Text><Pressable style={styles.uploadBox} onPress={chooseAttachment}><ImagePlus size={23} color={colors.slate900} /><Text style={styles.uploadText}>{attachment?.name || 'Add screenshot / file'}</Text><Text style={styles.uploadHint}>Max 10 Mb</Text></Pressable><View style={styles.formSpacer} /><View style={styles.urgentRow}><Text style={styles.label}>Mark as urgent</Text><Switch value={urgent} onValueChange={setUrgent} trackColor={{ false: colors.slate200, true: colors.primary200 }} thumbColor={urgent ? colors.primary600 : colors.slate50} /></View><Pressable style={[styles.primaryButton, submitting && styles.disabled]} onPress={submitTicket} disabled={submitting}><Text style={styles.primaryButtonText}>{submitting ? 'Submitting...' : 'Submit Ticket'}</Text><Send size={19} color="#FFFFFF" /></Pressable></ScrollView></View>;

  if (screen === 'chat' && selectedTicket) return <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardOffset}><StatusBar barStyle="dark-content" backgroundColor={backgrounds.card} /><Header title={`Ticket #${selectedTicket.ticketNumber}`} subtitle={selectedTicket.subject} /><ScrollView style={styles.chatScroll} contentContainerStyle={[styles.chatContent, { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24 }]} keyboardShouldPersistTaps="handled"><View style={styles.datePill}><Text style={styles.dateText}>{formatDate(selectedTicket.createdAt)}</Text></View>{loadingMessages ? <ActivityIndicator color={colors.primary600} style={styles.loader} /> : messages.map((message) => <MessageBubble key={message.id} message={message} ticketNumber={selectedTicket.ticketNumber} />)}</ScrollView><View style={[styles.composer, { marginHorizontal: 0, marginBottom: 0, borderWidth: 1, borderColor: colors.slate200, borderRadius: 28, paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 12 }]}><Pressable onPress={chooseAttachment} style={styles.composerIcon}><Paperclip size={20} color={colors.slate500} /></Pressable><TextInput style={[styles.composerInput, { maxHeight: 84 }]} placeholder="Message" placeholderTextColor={colors.slate400} value={draft} onChangeText={setDraft} multiline /><Pressable onPress={sendMessage} style={[styles.sendButton, { width: 40, height: 40, borderRadius: 20 }]} disabled={sending}><Send size={17} color="#FFFFFF" /></Pressable></View></KeyboardAvoidingView>;

  const visibleTickets = tickets.filter((ticket) => `${ticket.ticketNumber} ${ticket.subject} ${ticket.message} ${ticket.category}`.toLowerCase().includes(search.toLowerCase()));
  return <View style={styles.container}><StatusBar barStyle="dark-content" backgroundColor={backgrounds.card} /><Header
    title="Support Tickets Desk"
    right={<Headphones size={25} color={colors.slate900} />}
    searchBar={
      <View style={styles.headerSearchBox}>
        <Search size={18} color={colors.slate400} />
        <TextInput style={styles.headerSearchInput} placeholder="Search conversation" placeholderTextColor={colors.slate400} value={search} onChangeText={setSearch} />
      </View>
    }
  /><ScrollView style={styles.ticketScroll} contentContainerStyle={styles.ticketContent}>{loading ? <ActivityIndicator color={colors.primary600} style={styles.loader} /> : error ? <EmptyState text={error} action="Retry" onPress={loadTickets} /> : visibleTickets.length === 0 ? <EmptyState text={search ? 'No tickets match your search.' : 'You have not created a support ticket yet.'} action="Create ticket" onPress={() => setScreen('new')} /> : visibleTickets.map((ticket) => <TicketCard key={ticket.ticketNumber} ticket={ticket} onPress={() => openTicket(ticket)} onResolve={() => markResolved(ticket)} />)}</ScrollView><Pressable style={[styles.fab, { bottom: 56 }]} onPress={() => setScreen('new')} accessibilityLabel="Create support ticket"><Plus size={28} color="#FFFFFF" /></Pressable></View>;
};

const FaqView = () => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FaqCategory>('all');
  const [expanded, setExpanded] = useState('faq-1');
  const filtered = useMemo(() => FAQ_DATA.filter((item) => {
    const text = `${item.question} ${item.answer} ${item.tags.join(' ')}`.toLowerCase();
    return (category === 'all' || item.category === category) && text.includes(query.toLowerCase().trim());
  }), [category, query]);

  return <ScrollView style={styles.faqScroll} contentContainerStyle={[styles.faqContent, { paddingBottom: Math.max(insets.bottom + 18, 26) }]} showsVerticalScrollIndicator={false}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faqCategoryRow}>
      {FAQ_CATEGORIES.map((item) => <Pressable key={item.key} style={[styles.faqCategory, category === item.key && styles.faqCategoryActive]} onPress={() => setCategory(item.key)}><Text style={[styles.faqCategoryText, category === item.key && styles.faqCategoryTextActive]}>{item.label}</Text></Pressable>)}
    </ScrollView>
    <View style={styles.faqSearch}><Search size={18} color={colors.slate400} /><TextInput style={styles.faqSearchInput} placeholder="Search for help..." placeholderTextColor={colors.slate400} value={query} onChangeText={setQuery} /><SlidersHorizontal size={18} color={colors.slate400} /></View>
    {filtered.map((item) => { const isOpen = expanded === item.id; return <View key={item.id} style={[styles.faqCard, isOpen && styles.faqCardOpen]}><Pressable style={styles.faqQuestion} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded(isOpen ? '' : item.id); }}><Text style={styles.faqQuestionText}>{item.question}</Text>{isOpen ? <ChevronUp size={22} color={colors.primary600} /> : <ChevronDown size={22} color={colors.slate500} />}</Pressable>{isOpen && <View style={styles.faqAnswer}><Text style={styles.faqAnswerText}>{item.answer}</Text></View>}</View>; })}
  </ScrollView>;
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'OPEN') return null;
  return <View style={styles.statusBadge}><Text style={styles.statusText}>{statusLabel(status)}</Text></View>;
};
const TicketCard = ({ ticket, onPress, onResolve }: { ticket: SupportTicketSummary; onPress: () => void; onResolve?: () => void }) => (
  <Pressable style={[styles.ticketCard, { marginBottom: 20, borderRadius: 10, padding: 16 }]} onPress={onPress}>
    <View style={styles.ticketTop}>
      <View style={styles.ticketId}><Ticket size={18} color={colors.primary600} /><Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text></View>
      <StatusBadge status={ticket.status} />
    </View>

    <Text style={[styles.ticketSubject, { marginTop: 18 }]}>{ticket.subject}</Text>
    <Text style={[styles.ticketMessage, { marginTop: 7 }]} numberOfLines={1}>{ticket.message}</Text>

    <View style={[styles.ticketDivider, { marginTop: 16, marginBottom: 12 }]} />

    <View style={styles.ticketMeta}>
      <View style={styles.categoryTag}><Text style={styles.categoryTagText}>{ticket.category}</Text></View>
      <View style={styles.dateMeta}><Clock3 size={16} color={colors.slate400} /><Text style={styles.dateMetaText}>{formatDate(ticket.createdAt)}</Text><ChevronRight size={19} color={colors.primary600} /></View>
    </View>

    {ticket.status !== 'RESOLVED' && onResolve ? (
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onResolve();
        }}
        style={[styles.resolveButton, { marginHorizontal: 0, marginBottom: 0, marginTop: 12, borderRadius: 12 }]}>
        <Text style={styles.resolveText}>Mark as solved</Text>
      </Pressable>
    ) : null}
  </Pressable>
);
const MessageBubble = ({ message, ticketNumber }: { message: TicketMessage; ticketNumber?: string }) => {
  const mine = message.senderRole === 'USER';
  const attachmentName = message.attachmentName || '';
  const attachmentUrl = message.attachmentUrl ? getTicketAttachmentUrl(ticketNumber || '', message.attachmentUrl) : null;
  const [imageRatio, setImageRatio] = useState(1.7);
  const isImageAttachment = Boolean(
    attachmentUrl && (
      /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(attachmentName) ||
      /^data:image\//i.test(attachmentUrl) ||
      /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(attachmentUrl) ||
      attachmentName.toLowerCase().includes('image')
    )
  );
  useEffect(() => {
    if (!attachmentUrl || !isImageAttachment) return;
    Image.getSize(attachmentUrl, (width, height) => {
      if (width > 0 && height > 0) setImageRatio(width / height);
    });
  }, [attachmentUrl, isImageAttachment]);

  const imageWidth = Math.min(Dimensions.get('window').width * 0.64, 420);
  return <View style={[styles.messageRow, mine && styles.messageRowMine]}>{!mine && <View style={styles.agentIcon}><Headphones size={16} color={colors.primary600} /></View>}<View style={[styles.messageBubble, mine ? styles.mineBubble : styles.agentBubble]}>{!mine && <Text style={styles.agentName}>{message.senderName || 'Support team'}</Text>}{message.message && <Text style={[styles.messageText, mine && styles.mineMessageText]}>{message.message}</Text>}{attachmentUrl && isImageAttachment ? <Image source={{ uri: attachmentUrl }} style={[styles.attachmentImage, { width: imageWidth, aspectRatio: imageRatio }]} resizeMode="cover" /> : null}{attachmentUrl && !isImageAttachment ? <View style={styles.attachmentPill}><Text style={styles.attachmentName}>{attachmentName || 'Attachment'}</Text></View> : null}<Text style={[styles.messageTime, mine && styles.mineMessageText]}>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text></View></View>;
};
const EmptyState = ({ text, action, onPress }: { text: string; action: string; onPress: () => void }) => <View style={styles.emptyState}><Text style={styles.emptyText}>{text}</Text><Pressable onPress={onPress}><Text style={styles.emptyAction}>{action}</Text></Pressable></View>;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: backgrounds.screen },
  header: {
    backgroundColor: screenHeader.backgroundColor,
    borderBottomWidth: 1,
    borderBottomColor: screenHeader.borderColor,
    paddingHorizontal: screenHeader.horizontalPadding,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: screenHeader.height - (screenHeader.bottomPadding || 0),
  },
  headerSearchWrap: {
    width: '100%',
    marginTop: 0,
  },
  headerSearchBox: {
    height: 44,
    borderWidth: 1,
    borderColor: borders.input,
    borderRadius: cardRadius.pill,
    backgroundColor: backgrounds.input,
    paddingHorizontal: spacing.cardPadding - 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSearchInput: {
    flex: 1,
    color: colors.slate900,
    fontSize: fs.modalSubtitle,
    paddingVertical: 0,
  },
  headerBack: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: screenHeader.titleColor,
    fontSize: screenHeader.titleFontSize,
    fontWeight: screenHeader.titleFontWeight,
    letterSpacing: screenHeader.titleLetterSpacing,
  },
  headerSubtitle: { color: colors.slate500, fontSize: fs.caption, marginTop: 2 },
  headerAction: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-end' },
  headerSpacer: { width: 36 },
  tabBar: { height: 52, backgroundColor: backgrounds.card, borderBottomWidth: 1, borderBottomColor: borders.header, flexDirection: 'row' },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tabText: { color: colors.slate600, fontSize: fs.modalTitle, fontWeight: fw.semiBold },
  tabTextActive: { color: colors.primary600 },
  tabIndicator: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: colors.primary600 },
  faqScroll: { flex: 1 },
  faqContent: { paddingHorizontal: spacing.screenHorizontal, paddingTop: 20, paddingBottom: 36 },
  faqCategoryRow: { gap: 8, paddingBottom: 16, paddingRight: 8 },
  faqCategory: { paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: cardRadius.inner, backgroundColor: backgrounds.card },
  faqCategoryActive: { backgroundColor: colors.primary600, borderColor: colors.primary600 },
  faqCategoryText: { color: colors.slate600, fontSize: fs.inputText, fontWeight: fw.semiBold },
  faqCategoryTextActive: { color: '#FFFFFF' },
  faqSearch: { height: 40, borderWidth: 1, borderColor: colors.slate300, borderRadius: cardRadius.pill, backgroundColor: backgrounds.card, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  faqSearchInput: { flex: 1, color: colors.slate900, fontSize: 11.5 },
  faqCard: { backgroundColor: backgrounds.card, borderWidth: 1, borderColor: colors.slate300, borderRadius: cardRadius.card, marginBottom: 12, ...shadows.sm },
  faqCardOpen: { borderColor: colors.primary200 },
  faqQuestion: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  faqQuestionText: { flex: 1, color: colors.slate900, fontSize: fs.modalSubtitle, fontWeight: fw.bold, lineHeight: 18 },
  faqAnswer: { borderTopWidth: 1, borderTopColor: colors.slate200, paddingHorizontal: 16, paddingVertical: 12 },
  faqAnswerText: { color: colors.slate600, fontSize: 11.5, lineHeight: 18 },
  searchBox: { height: 58, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#B7C4D3', borderRadius: cardRadius.pill, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 0, marginTop: 0 },
  searchInput: { flex: 1, color: colors.slate900, fontSize: fs.modalSubtitle },
  ticketScroll: { flex: 1 },
  ticketContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 112 },
  ticketCard: { backgroundColor: backgrounds.card, borderWidth: 1, borderColor: colors.slate300, borderRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, marginBottom: 14, ...shadows.sm },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketId: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketNumber: { color: colors.primary600, fontSize: fs.sectionTitle, fontWeight: fw.bold },
  statusBadge: { backgroundColor: '#F8E7A8', borderColor: '#E4C86C', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, minHeight: 30, justifyContent: 'center' },
  statusText: { color: '#A45A00', fontSize: fs.badgeText, fontWeight: fw.bold, textTransform: 'uppercase' },
  ticketSubject: { color: colors.slate900, fontSize: fs.modalTitle, fontWeight: fw.bold, marginTop: 16 },
  ticketMessage: { color: colors.slate600, fontSize: fs.inputText, marginTop: 6 },
  ticketDivider: { height: 1, backgroundColor: colors.slate200, marginTop: 16, marginBottom: 12 },
  ticketMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryTag: { borderWidth: 1, borderColor: colors.slate300, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, maxWidth: '56%' },
  categoryTagText: { color: colors.slate600, fontSize: fs.badgeText, fontWeight: fw.medium },
  dateMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dateMetaText: { color: colors.slate500, fontSize: fs.caption },
  fab: { position: 'absolute', right: 24, bottom: 28, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary600, alignItems: 'center', justifyContent: 'center', ...shadows.lg }, formContent: { padding: 30, paddingBottom: 34, minHeight: '100%' }, label: { color: colors.slate900, fontSize: fs.sectionTitle, fontWeight: fw.bold, marginBottom: 8, marginTop: 20 }, select: { height: 88, borderWidth: 2, borderColor: borders.active, borderRadius: cardRadius.inner, backgroundColor: backgrounds.input, paddingHorizontal: 27, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, selectActive: { borderColor: colors.primary700 }, inputText: { color: colors.slate900, fontSize: fs.modalTitle, fontWeight: fw.medium, flex: 1 }, categoryMenu: { backgroundColor: backgrounds.card, borderWidth: 1, borderColor: borders.card, borderRadius: cardRadius.inner, marginTop: 5, ...shadows.md }, categoryOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: colors.slate100 }, input: { height: 76, borderWidth: 1, borderColor: borders.input, borderRadius: cardRadius.inner, backgroundColor: backgrounds.input, paddingHorizontal: 27, color: colors.slate900, fontSize: fs.modalTitle }, textArea: { height: 154, paddingTop: 18 }, uploadBox: { height: 78, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.slate300, borderRadius: cardRadius.inner, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: backgrounds.input }, uploadText: { color: colors.slate900, fontSize: fs.modalSubtitle, fontWeight: fw.bold, maxWidth: '48%' }, uploadHint: { color: colors.slate400, fontSize: fs.caption }, formSpacer: { flex: 1, minHeight: 80 }, urgentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, primaryButton: { height: 58, borderRadius: cardRadius.inner, backgroundColor: colors.primary600, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...shadows.md }, primaryButtonText: { color: '#FFFFFF', fontSize: fs.modalTitle, fontWeight: fw.bold }, disabled: { opacity: 0.6 }, chatScroll: { flex: 1, backgroundColor: backgrounds.screen }, chatContent: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 20 }, datePill: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: cardRadius.pill, backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.slate200, marginBottom: 18 }, dateText: { color: colors.slate500, fontSize: fs.caption, fontWeight: fw.medium }, loader: { marginTop: 28 }, messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, maxWidth: '82%' }, messageRowMine: { alignSelf: 'flex-end', marginLeft: 'auto' }, agentIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary50, justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 10 }, messageBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' }, agentBubble: { backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.slate200 }, mineBubble: { backgroundColor: '#111827', borderWidth: 0 }, agentName: { color: colors.primary700, fontSize: fs.badgeText, fontWeight: fw.bold, marginBottom: 6 }, messageText: { color: colors.slate900, fontSize: fs.modalSubtitle, lineHeight: 20 }, mineMessageText: { color: '#FFFFFF' }, messageTime: { color: colors.slate400, fontSize: fs.caption, alignSelf: 'flex-end', marginTop: 6 }, attachmentImage: { width: 220, height: 220, maxWidth: 220, maxHeight: 220, borderRadius: 16, marginTop: 10, backgroundColor: colors.slate100, alignSelf: 'flex-start' }, attachmentPill: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primary50, borderWidth: 1, borderColor: colors.primary200, alignSelf: 'flex-start' }, attachmentName: { color: colors.primary700, fontSize: fs.caption, fontWeight: fw.semiBold }, composer: { minHeight: 66, backgroundColor: backgrounds.card, borderTopWidth: 1, borderTopColor: borders.header, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, composerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.slate100, justifyContent: 'center', alignItems: 'center' }, composerInput: { flex: 1, maxHeight: 90, color: colors.slate900, fontSize: fs.modalSubtitle, paddingVertical: 8 }, sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary600, alignItems: 'center', justifyContent: 'center' }, resolveButton: { marginHorizontal: 12, marginBottom: 12, backgroundColor: colors.primary50, borderWidth: 1, borderColor: colors.primary200, borderRadius: 14, paddingVertical: 12 }, resolveText: { color: colors.primary700, fontSize: fs.modalSubtitle, fontWeight: fw.semiBold, textAlign: 'center' }, emptyState: { alignItems: 'center', paddingTop: 90 }, emptyText: { color: colors.slate500, fontSize: fs.modalSubtitle, textAlign: 'center' }, emptyAction: { color: colors.primary600, fontSize: fs.modalSubtitle, fontWeight: fw.bold, marginTop: 14 },
});
