/**
 * HelpSupportScreen - Help & Support Hub with FAQs
 * Industry-Grade, Modern Aesthetic Mobile Screen matching Triptual design system
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
  Animated,
  LayoutAnimation,
  UIManager,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  HelpCircle,
  MessageSquare,
  Mail,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  CreditCard,
  Users,
  Bell,
  ShieldCheck,
  Compass,
  LifeBuoy,
  Send,
  X,
  Sparkles,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../theme/colors';

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
    category: 'trips',
    question: 'How does group trip creation work on Triptual?',
    answer: 'Creating a group trip is instant! Simply tap the "+" button on the home dock, enter your trip destination, date range, and estimated budget. You will automatically receive a unique 6-character invite code to share with your friends.',
    tags: ['create trip', 'invite code', 'group'],
  },
  {
    id: 'faq-2',
    category: 'expenses',
    question: 'How does the Smart Debt Simplification engine work?',
    answer: 'Triptual automatically computes shared balances after every expense entry. Instead of everyone making separate payments to each other, our algorithm calculates the minimum direct transactions required to settle all group debts completely.',
    tags: ['expenses', 'settlement', 'recalculation', 'split'],
  },
  {
    id: 'faq-3',
    category: 'expenses',
    question: 'Can I settle payments directly using UPI or Razorpay?',
    answer: 'Yes! When viewing group balances, tap "Settle Up" to initiate direct UPI payments to any member using their saved UPI VPA (e.g. name@okaxis) or complete tour package bookings via Razorpay.',
    tags: ['upi', 'pay', 'razorpay', 'settlement'],
  },
  {
    id: 'faq-4',
    category: 'security',
    question: 'Is my financial and payment data secure?',
    answer: 'Absolutely. Triptual uses RFC 6749 compliant JWT silent token rotation, SSL/TLS encryption for all microservice communications, and trusted PCI-DSS compliant payment gateways (Razorpay) for processing.',
    tags: ['security', 'jwt', 'encryption', 'pci'],
  },
  {
    id: 'faq-5',
    category: 'trips',
    question: 'How do AI Match Scores work for stays and packages?',
    answer: 'Our AI engine analyzes your group size, travel style (Boutique, Coastal, Mountain, etc.), wishlist items, and historical trip data to score stays from 0 to 100%, highlighting top walkable spots and curated inclusions.',
    tags: ['ai', 'match score', 'stays', 'packages'],
  },
  {
    id: 'faq-6',
    category: 'account',
    question: 'How do real-time notifications work?',
    answer: 'Triptual uses an Event-Driven Aiven Kafka message mesh combined with Socket.io WebSockets. When someone invites you, adds an expense, or updates an itinerary, you receive instant alerts across push notifications and in-app activity inbox.',
    tags: ['kafka', 'notifications', 'sockets', 'push'],
  },
  {
    id: 'faq-7',
    category: 'account',
    question: 'What should I do if I did not receive an invitation?',
    answer: 'Ensure the host has your registered email address or ask them for the 6-character invitation code. You can manually enter any invite code by tapping "Join Group" on the Trips tab.',
    tags: ['invitation', 'code', 'email', 'join'],
  },
  {
    id: 'faq-8',
    category: 'security',
    question: 'How can I update my profile or UPI ID?',
    answer: 'Open the hamburger menu from the top left of the home screen and select "My Profile". You can customize your name, avatar illustration, travel preferences, and UPI ID anytime.',
    tags: ['profile', 'upi id', 'avatar', 'settings'],
  },
];

interface HelpSupportScreenProps {
  onBack?: () => void;
}

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'expenses' | 'trips' | 'account' | 'security'>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');
  const [votedFaqs, setVotedFaqs] = useState<Record<string, 'up' | 'down'>>({});
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
      ? Math.max(StatusBar.currentHeight || 0, insets.top, 24) + 10
      : insets.top > 0
      ? 12
      : 16;

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
    const subject = encodeURIComponent('Triptual App Support Inquiry');
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
      Alert.alert('Ticket Submitted', 'Thank you! Our support team has received your inquiry and will respond within 24 hours.');
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: headerTopPadding }]}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Help & Support</Text>
        </View>

        <TouchableOpacity
          style={styles.emailSupportBtn}
          onPress={handleSendEmailSupport}
          activeOpacity={0.7}
        >
          <Mail size={16} color={colors.primary600} />
          <Text style={styles.emailSupportBtnText}>Email Support</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Support Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerHeaderRow}>
            <View style={styles.bannerIconCircle}>
              <LifeBuoy size={26} color={colors.primary600} strokeWidth={2.2} />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={styles.bannerTitle}>How can we help you today?</Text>
              <Text style={styles.bannerSubtitle}>
                Search our knowledge base or browse frequently asked questions below.
              </Text>
            </View>
          </View>

          {/* Search Input Bar */}
          <View style={styles.searchBar}>
            <Search size={18} color={colors.slate400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search expenses, invites, payments..."
              placeholderTextColor={colors.slate400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <X size={14} color={colors.slate500} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          style={styles.categoryScrollView}
        >
          {[
            { key: 'all', label: 'All FAQs', icon: HelpCircle },
            { key: 'trips', label: 'Trips & Groups', icon: Users },
            { key: 'expenses', label: 'Expenses & UPI', icon: CreditCard },
            { key: 'account', label: 'Notifications', icon: Bell },
            { key: 'security', label: 'Security & Privacy', icon: ShieldCheck },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.key;
            const IconComp = cat.icon;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat.key as any)}
                activeOpacity={0.7}
              >
                <IconComp size={14} color={isSelected ? colors.primary600 : colors.slate500} strokeWidth={2.2} />
                <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* FAQs List Section */}
        <View style={styles.faqSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <Text style={styles.faqCountTag}>{filteredFaqs.length} Articles</Text>
          </View>

          {filteredFaqs.length === 0 ? (
            <View style={styles.emptyState}>
              <Search size={36} color={colors.slate300} />
              <Text style={styles.emptyTitle}>No matching answers found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search query or select another category above.
              </Text>
            </View>
          ) : (
            <View style={styles.faqList}>
              {filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                const userVote = votedFaqs[faq.id];

                return (
                  <View key={faq.id} style={[styles.faqCard, isExpanded && styles.faqCardExpanded]}>
                    <TouchableOpacity
                      style={styles.faqHeaderBtn}
                      onPress={() => toggleExpand(faq.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.faqQuestionText}>{faq.question}</Text>
                      <View style={styles.chevronCircle}>
                        {isExpanded ? (
                          <ChevronUp size={16} color={colors.primary600} />
                        ) : (
                          <ChevronDown size={16} color={colors.slate400} />
                        )}
                      </View>
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
                              <ThumbsUp size={13} color={userVote === 'up' ? colors.primary600 : colors.slate500} />
                              <Text style={[styles.voteText, userVote === 'up' && styles.voteTextUp]}>Yes</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.voteBtn, userVote === 'down' && styles.voteBtnDown]}
                              onPress={() => handleVote(faq.id, 'down')}
                              activeOpacity={0.7}
                            >
                              <ThumbsDown size={13} color={userVote === 'down' ? colors.accentRose : colors.slate500} />
                              <Text style={[styles.voteText, userVote === 'down' && styles.voteTextDown]}>No</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Still Need Help Box */}
        <View style={styles.contactSupportCard}>
          <View style={styles.contactIconCircle}>
            <MessageSquare size={22} color={colors.primary600} strokeWidth={2.2} />
          </View>
          <View style={styles.contactTextCol}>
            <Text style={styles.contactTitle}>Still need assistance?</Text>
            <Text style={styles.contactSub}>
              Our dedicated support team is available 24/7 to resolve your trip, booking, or expense queries.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.openTicketBtn}
            onPress={() => setIsTicketModalOpen(true)}
            activeOpacity={0.85}
          >
            <Send size={15} color="#FFFFFF" />
            <Text style={styles.openTicketBtnText}>Submit Support Ticket</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Support Ticket Modal */}
      {isTicketModalOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.ticketModalCard}>
            <View style={styles.ticketModalHeader}>
              <View style={styles.ticketHeaderTitleRow}>
                <Sparkles size={18} color={colors.primary600} />
                <Text style={styles.ticketModalTitle}>Submit Support Ticket</Text>
              </View>
              <TouchableOpacity onPress={() => setIsTicketModalOpen(false)} style={styles.closeModalBtn}>
                <X size={18} color={colors.slate500} />
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  emailSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  emailSupportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary700,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
    ...shadows.sm,
    marginBottom: 16,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.slate900,
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    fontSize: 12.5,
    color: colors.slate600,
    marginTop: 2,
    lineHeight: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.slate800,
  },
  clearSearchBtn: {
    padding: 4,
  },
  categoryScrollView: {
    marginBottom: 20,
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  categoryPillActive: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary600,
  },
  categoryLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.slate700,
  },
  categoryLabelActive: {
    color: colors.primary700,
    fontWeight: '700',
  },
  faqSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.slate900,
    letterSpacing: -0.2,
  },
  faqCountTag: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.slate500,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.slate800,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12.5,
    color: colors.slate500,
    textAlign: 'center',
    marginTop: 4,
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: 'hidden',
  },
  faqCardExpanded: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.primary500,
    ...shadows.sm,
  },
  faqHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate900,
    lineHeight: 20,
  },
  chevronCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  faqAnswerText: {
    fontSize: 13,
    color: colors.slate600,
    lineHeight: 20,
    marginTop: 8,
  },
  faqFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  wasHelpfulText: {
    fontSize: 11.5,
    color: colors.slate500,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  voteBtnUp: {
    backgroundColor: '#ECFDF5',
  },
  voteBtnDown: {
    backgroundColor: '#FFE4E6',
  },
  voteText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate600,
  },
  voteTextUp: {
    color: colors.primary700,
    fontWeight: '700',
  },
  voteTextDown: {
    color: colors.accentRose,
    fontWeight: '700',
  },
  contactSupportCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFECE6',
    alignItems: 'center',
    textAlign: 'center',
    ...shadows.sm,
  },
  contactIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  contactTextCol: {
    alignItems: 'center',
    marginBottom: 14,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate900,
  },
  contactSub: {
    fontSize: 12.5,
    color: colors.slate600,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  openTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary600,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radii.md,
    width: '100%',
    justifyContent: 'center',
    ...shadows.sm,
  },
  openTicketBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  ticketModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...shadows.lg,
  },
  ticketModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ticketHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.slate900,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate700,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13.5,
    color: colors.slate800,
  },
  modalTextArea: {
    height: 100,
    paddingTop: 10,
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  cancelTicketBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radii.md,
  },
  cancelTicketText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate700,
  },
  submitTicketBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    borderRadius: radii.md,
  },
  submitTicketText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
