/**
 * HelpSupportScreen - Help Center Hub with FAQs & Contact Support
 * Layout matched 100% to reference Help Center UI with Triptual Emerald design system
 * Standardized typography sizes & spacing imported from theme.ts
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  BackHandler,
  Linking,
  Platform,
  StatusBar,
  LayoutAnimation,
  UIManager,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Mail,
  Send,
  X,
  Sparkles,
  MessageSquare,
  Clock,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../theme/colors';
import {
  backgrounds,
  borders,
  cardRadius,
  fontSize as fs,
  fontWeight as fw,
  spacing,
} from '../theme/theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItem {
  id: string;
  category: 'expenses' | 'trips' | 'account' | 'security';
  question: string;
  answer: string;
  tags: string[];
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'account',
    question: 'How do I manage my notifications?',
    answer: 'Go to Settings > Notification Settings to customize alerts for expenses, group invites, and counter payments.',
    tags: ['notifications', 'manage', 'settings', 'alerts'],
  },
  {
    id: 'faq-2',
    category: 'trips',
    question: 'How does group trip creation work on Triptual?',
    answer: 'Tap the "+" button on the home dock, enter trip details, and share your 6-character invite code with friends.',
    tags: ['create trip', 'invite code', 'group'],
  },
  {
    id: 'faq-3',
    category: 'expenses',
    question: 'How does the Smart Debt Simplification work?',
    answer: 'Our algorithm calculates the minimum direct transactions needed to settle all shared group debts automatically.',
    tags: ['expenses', 'settlement', 'recalculation', 'split'],
  },
  {
    id: 'faq-4',
    category: 'expenses',
    question: 'Can I settle payments directly using UPI or Razorpay?',
    answer: 'Tap "Settle Up" in group balances to pay members via their UPI VPA or book tour packages via Razorpay.',
    tags: ['upi', 'pay', 'razorpay', 'settlement'],
  },
  {
    id: 'faq-5',
    category: 'security',
    question: 'Is my personal data safe and private?',
    answer: 'Your data is secured with JWT token rotation, SSL/TLS encryption, and PCI-DSS compliant payment gateways.',
    tags: ['security', 'jwt', 'encryption', 'pci', 'privacy', 'safe'],
  },
  {
    id: 'faq-6',
    category: 'trips',
    question: 'How do AI Match Scores work for stays and packages?',
    answer: 'Our AI analyzes group size, travel preferences, and wishlist items to score stays from 0 to 100%.',
    tags: ['ai', 'match score', 'stays', 'packages'],
  },
  {
    id: 'faq-7',
    category: 'account',
    question: 'How do I update my profile and UPI details?',
    answer: 'Open the side drawer, select "My Profile", and edit your name, avatar, travel style, or UPI ID.',
    tags: ['profile', 'upi id', 'avatar', 'settings', 'trade'],
  },
  {
    id: 'faq-8',
    category: 'security',
    question: 'How do I reset or change my account password?',
    answer: 'Head to "Security & Privacy" in the account drawer and tap "Change Password" or use "Forgot Password".',
    tags: ['password', 'reset', 'change', 'security', 'forgot'],
  },
  {
    id: 'faq-9',
    category: 'trips',
    question: 'What should I do if I did not receive an invitation?',
    answer: 'Ask the host for their 6-character invite code, then tap "Join Group" on the Trips tab.',
    tags: ['invitation', 'code', 'email', 'join'],
  },
];

const CATEGORIES: { key: 'all' | 'account' | 'trips' | 'expenses' | 'security'; label: string }[] = [
  { key: 'all', label: 'General' },
  { key: 'account', label: 'Account' },
  { key: 'trips', label: 'Trips & Groups' },
  { key: 'expenses', label: 'Expenses & UPI' },
  { key: 'security', label: 'Security' },
];

interface HelpSupportScreenProps {
  onBack?: () => void;
}

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'account' | 'trips' | 'expenses' | 'security'>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');
  const [votedFaqs, setVotedFaqs] = useState<Record<string, 'up' | 'down'>>({});

  // Ticket Modal State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Hardware Back Handler
  useEffect(() => {
    const onHardwareBack = () => {
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [onBack]);

  const headerTopPadding =
    Platform.OS === 'android'
      ? Math.max(StatusBar.currentHeight || 0, insets.top, 24) + 6
      : insets.top > 0
      ? insets.top + 4
      : 14;

  // Filter FAQs based on category and search query
  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((faq) => {
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const handleVote = (id: string, type: 'up' | 'down') => {
    setVotedFaqs((prev) => ({ ...prev, [id]: type }));
  };

  const handleSendEmailSupport = () => {
    const email = 'triptual.support@gmail.com';
    const subject = encodeURIComponent('Triptual Support Inquiry');
    Linking.openURL(`mailto:${email}?subject=${subject}`).catch(() => {
      Alert.alert('Email Client Error', 'Could not launch default email app. Please write to triptual.support@gmail.com');
    });
  };

  const handleSubmitSupportTicket = () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert('Validation Error', 'Please enter both a subject and message.');
      return;
    }

    setIsSubmittingTicket(true);
    setTimeout(() => {
      setIsSubmittingTicket(false);
      setIsTicketModalOpen(false);
      setTicketSubject('');
      setTicketMessage('');
      Alert.alert('Ticket Submitted', 'Thank you! Our support team will respond within 24 hours.');
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header - Centered Title with Back Arrow */}
      <View style={[styles.header, { paddingTop: headerTopPadding }]}>
        <View style={styles.headerRow}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}

          <Text style={styles.headerTitle}>Help Center</Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Top Navigation Tabs (FAQ | Help & Contact) */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => setActiveTab('faq')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'faq' && styles.tabTextActive]}>
              FAQ
            </Text>
            {activeTab === 'faq' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => setActiveTab('contact')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'contact' && styles.tabTextActive]}>
              Help & Contact
            </Text>
            {activeTab === 'contact' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* TAB 1: FAQ VIEW */}
      {activeTab === 'faq' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Horizontal Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
            style={styles.categoryScrollView}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Search Input Bar */}
          <View style={styles.searchBar}>
            <Search size={16} color={colors.slate400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help..."
              placeholderTextColor={colors.slate400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <X size={15} color={colors.slate500} />
              </TouchableOpacity>
            ) : (
              <SlidersHorizontal size={15} color={colors.slate400} />
            )}
          </View>

          {/* Accordion FAQ Cards List */}
          <View style={styles.faqList}>
            {filteredFaqs.length === 0 ? (
              <View style={styles.emptyState}>
                <Search size={32} color={colors.slate300} />
                <Text style={styles.emptyTitle}>No matching answers found</Text>
                <Text style={styles.emptySub}>
                  Try adjusting your search query or select another category above.
                </Text>
              </View>
            ) : (
              filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                const userVote = votedFaqs[faq.id];

                return (
                  <View key={faq.id} style={styles.faqCard}>
                    <TouchableOpacity
                      style={styles.faqHeaderBtn}
                      onPress={() => toggleExpand(faq.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.faqQuestionText}>{faq.question}</Text>
                      {isExpanded ? (
                        <ChevronUp size={18} color={colors.primary600} strokeWidth={2.4} />
                      ) : (
                        <ChevronDown size={18} color={colors.slate500} strokeWidth={2.4} />
                      )}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.faqBody}>
                        <Text style={styles.faqAnswerText}>{faq.answer}</Text>

                        <View style={styles.faqFooter}>
                          <Text style={styles.wasHelpfulText}>Was this helpful?</Text>
                          <View style={styles.voteRow}>
                            <TouchableOpacity
                              style={[styles.voteBtn, userVote === 'up' && styles.voteBtnUp]}
                              onPress={() => handleVote(faq.id, 'up')}
                              activeOpacity={0.7}
                            >
                              <ThumbsUp size={12} color={userVote === 'up' ? colors.primary600 : colors.slate500} />
                              <Text style={[styles.voteText, userVote === 'up' && styles.voteTextUp]}>Yes</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.voteBtn, userVote === 'down' && styles.voteBtnDown]}
                              onPress={() => handleVote(faq.id, 'down')}
                              activeOpacity={0.7}
                            >
                              <ThumbsDown size={12} color={userVote === 'down' ? colors.accentRose : colors.slate500} />
                              <Text style={[styles.voteText, userVote === 'down' && styles.voteTextDown]}>No</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* TAB 2: HELP & CONTACT VIEW */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contactScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Contact Intro Card */}
          <View style={styles.contactIntroCard}>
            <View style={styles.contactIconCircle}>
              <MessageSquare size={22} color={colors.primary600} strokeWidth={2.2} />
            </View>
            <Text style={styles.contactIntroTitle}>We're here to help</Text>
            <Text style={styles.contactIntroSubtitle}>
              Can't find what you need in the FAQs? Contact the Triptual support team directly.
            </Text>
          </View>

          {/* Email Support Card */}
          <TouchableOpacity
            style={styles.contactChannelCard}
            onPress={handleSendEmailSupport}
            activeOpacity={0.8}
          >
            <View style={[styles.channelIconBox, { backgroundColor: backgrounds.infoBox }]}>
              <Mail size={18} color={colors.primary600} />
            </View>
            <View style={styles.channelTextCol}>
              <Text style={styles.channelTitle}>Email Customer Support</Text>
              <Text style={styles.channelSub}>triptual.support@gmail.com</Text>
            </View>
            <View style={styles.channelActionBadge}>
              <Text style={styles.channelActionBadgeText}>Send Email</Text>
            </View>
          </TouchableOpacity>

          {/* Ticket Submission Card */}
          <TouchableOpacity
            style={styles.contactChannelCard}
            onPress={() => setIsTicketModalOpen(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.channelIconBox, { backgroundColor: backgrounds.infoBox }]}>
              <Send size={18} color={colors.primary600} />
            </View>
            <View style={styles.channelTextCol}>
              <Text style={styles.channelTitle}>Submit Support Ticket</Text>
              <Text style={styles.channelSub}>Report expense, invite, or booking queries</Text>
            </View>
            <View style={styles.channelActionBadge}>
              <Text style={styles.channelActionBadgeText}>Open Ticket</Text>
            </View>
          </TouchableOpacity>

          {/* Support Working Hours Box */}
          <View style={styles.hoursCard}>
            <View style={styles.hoursRow}>
              <Clock size={14} color={colors.primary600} />
              <Text style={styles.hoursTitle}>Operating Response Window</Text>
            </View>
            <Text style={styles.hoursText}>
              Tickets are typically resolved within 24 hours. For payment issues, please include your UPI transaction ID.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Support Ticket Modal */}
      {isTicketModalOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.ticketModalCard}>
            <View style={styles.ticketModalHeader}>
              <View style={styles.ticketHeaderTitleRow}>
                <Sparkles size={16} color={colors.primary600} />
                <Text style={styles.ticketModalTitle}>Submit Support Ticket</Text>
              </View>
              <TouchableOpacity onPress={() => setIsTicketModalOpen(false)} style={styles.closeModalBtn}>
                <X size={16} color={colors.slate500} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Subject</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Issue with expense settlement"
              placeholderTextColor={colors.slate400}
              value={ticketSubject}
              onChangeText={setTicketSubject}
            />

            <Text style={styles.modalInputLabel}>Message Details</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Describe your issue or feedback in detail..."
              placeholderTextColor={colors.slate400}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={ticketMessage}
              onChangeText={setTicketMessage}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelTicketBtn}
                onPress={() => setIsTicketModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelTicketText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitTicketBtn, isSubmittingTicket && { opacity: 0.7 }]}
                onPress={handleSubmitSupportTicket}
                disabled={isSubmittingTicket}
                activeOpacity={0.85}
              >
                <Text style={styles.submitTicketText}>
                  {isSubmittingTicket ? 'Submitting...' : 'Send Message'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: backgrounds.screen,
  },
  header: {
    backgroundColor: backgrounds.card,
    borderBottomWidth: 1,
    borderBottomColor: borders.card,
    paddingHorizontal: spacing.headerHorizontal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontSize: fs.headerTitle, // 16
    fontWeight: fw.semiBold,
    color: colors.slate900,
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // Tabs Header
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: fs.inputText, // 13
    fontWeight: fw.medium,
    color: colors.slate500,
  },
  tabTextActive: {
    color: colors.primary600,
    fontWeight: fw.semiBold,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: colors.primary600,
    borderRadius: 1.5,
  },

  // Scroll Container
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.headerHorizontal,
    paddingTop: 12,
  },
  contactScrollContent: {
    paddingHorizontal: spacing.headerHorizontal,
    paddingTop: 16,
  },

  // Category Pills
  categoryScrollView: {
    marginBottom: 2,
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 16,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: cardRadius.inner, // 10
    backgroundColor: backgrounds.card,
    borderWidth: 1,
    borderColor: borders.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillActive: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  categoryLabel: {
    fontSize: fs.badgeText, // 11
    fontWeight: fw.medium,
    color: colors.slate700,
  },
  categoryLabelActive: {
    color: '#FFFFFF',
    fontWeight: fw.medium,
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card, // 10
    borderWidth: 1,
    borderColor: borders.card,
    paddingHorizontal: 12,
    height: spacing.inputHeight + 4, // 42
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fs.inputText, // 13
    color: colors.slate900,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 2,
  },

  // FAQ Accordion Cards
  faqList: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card, // 10
    borderWidth: 1,
    borderColor: borders.card,
    overflow: 'hidden',
    ...shadows.sm,
  },
  faqHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: fs.sectionTitle, // 14
    fontWeight: fw.semiBold,
    color: colors.slate900,
    lineHeight: 19,
    paddingRight: 10,
  },
  faqBody: {
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  faqAnswerText: {
    fontSize: fs.modalSubtitle, // 12
    lineHeight: 18,
    color: colors.slate600,
  },
  faqFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: backgrounds.screen,
  },
  wasHelpfulText: {
    fontSize: fs.caption - 1, // 11
    color: colors.slate400,
    fontWeight: fw.medium,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: backgrounds.screen,
    borderWidth: 1,
    borderColor: borders.card,
  },
  voteBtnUp: {
    backgroundColor: backgrounds.enableBg,
    borderColor: borders.infoBox,
  },
  voteBtnDown: {
    backgroundColor: backgrounds.danger,
    borderColor: '#FECDD3',
  },
  voteText: {
    fontSize: fs.badgeText, // 11
    fontWeight: fw.medium,
    color: colors.slate600,
  },
  voteTextUp: {
    color: colors.primary600,
  },
  voteTextDown: {
    color: colors.accentRose,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card,
    borderWidth: 1,
    borderColor: borders.card,
  },
  emptyTitle: {
    fontSize: fs.sectionTitle, // 14
    fontWeight: fw.semiBold,
    color: colors.slate900,
    marginTop: 10,
  },
  emptySub: {
    fontSize: fs.modalSubtitle, // 12
    color: colors.slate500,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // Contact Tab Styles
  contactIntroCard: {
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card, // 10
    padding: 16,
    borderWidth: 1,
    borderColor: borders.card,
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.sm,
  },
  contactIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: backgrounds.enableBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  contactIntroTitle: {
    fontSize: fs.modalTitle, // 15
    fontWeight: fw.semiBold,
    color: colors.slate900,
    marginBottom: 4,
  },
  contactIntroSubtitle: {
    fontSize: fs.modalSubtitle, // 12
    color: colors.slate500,
    textAlign: 'center',
    lineHeight: 18,
  },
  contactChannelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card, // 10
    padding: 14,
    borderWidth: 1,
    borderColor: borders.card,
    marginBottom: 10,
    gap: 10,
    ...shadows.sm,
  },
  channelIconBox: {
    width: 38,
    height: 38,
    borderRadius: cardRadius.inner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelTextCol: {
    flex: 1,
  },
  channelTitle: {
    fontSize: fs.sectionTitle, // 14
    fontWeight: fw.semiBold,
    color: colors.slate900,
  },
  channelSub: {
    fontSize: fs.infoText, // 11.5
    color: colors.slate500,
    marginTop: 2,
  },
  channelActionBadge: {
    backgroundColor: backgrounds.enableBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: cardRadius.inner,
    borderWidth: 1,
    borderColor: borders.infoBox,
  },
  channelActionBadgeText: {
    fontSize: fs.badgeText, // 11
    fontWeight: fw.semiBold,
    color: colors.primary600,
  },
  hoursCard: {
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: borders.card,
    marginTop: 2,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  hoursTitle: {
    fontSize: fs.deviceName, // 12.5
    fontWeight: fw.semiBold,
    color: colors.slate900,
  },
  hoursText: {
    fontSize: fs.infoText, // 11.5
    color: colors.slate500,
    lineHeight: 17,
  },

  // Ticket Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: backgrounds.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  ticketModalCard: {
    backgroundColor: backgrounds.modal,
    borderRadius: cardRadius.modal, // 14
    width: '100%',
    maxWidth: 400,
    padding: spacing.modalPadding,
    ...shadows.lg,
  },
  ticketModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  ticketHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketModalTitle: {
    fontSize: fs.modalTitle, // 15
    fontWeight: fw.semiBold,
    color: colors.slate900,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalInputLabel: {
    fontSize: fs.inputLabel, // 11
    fontWeight: fw.semiBold,
    color: colors.slate700,
    marginBottom: 4,
    marginTop: 6,
  },
  modalInput: {
    backgroundColor: backgrounds.input,
    borderRadius: cardRadius.inner,
    borderWidth: 1,
    borderColor: borders.input,
    paddingHorizontal: 10,
    height: spacing.inputHeight, // 38
    fontSize: fs.inputText, // 13
    color: colors.slate900,
  },
  modalTextArea: {
    height: 85,
    paddingTop: 8,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  cancelTicketBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: cardRadius.inner,
    backgroundColor: colors.slate100,
  },
  cancelTicketText: {
    fontSize: fs.buttonText - 1, // 12
    fontWeight: fw.medium,
    color: colors.slate600,
  },
  submitTicketBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: cardRadius.inner,
    backgroundColor: colors.primary600,
  },
  submitTicketText: {
    fontSize: fs.buttonText - 1, // 12
    fontWeight: fw.semiBold,
    color: '#FFFFFF',
  },
});
