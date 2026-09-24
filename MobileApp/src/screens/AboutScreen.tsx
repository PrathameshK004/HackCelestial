/**
 * AboutScreen - About Triptual
 * User-Centric Platform Purpose, Mission, Features & Trust
 * Visual parity with WebApp luxury design system & Mobile theme tokens
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  Linking,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Sparkles,
  Compass,
  ShieldCheck,
  Zap,
  Heart,
  Users,
  CreditCard,
  CheckCircle2,
  Lock,
  Share2,
  Check,
  ChevronRight,
  Award,
  Globe,
  Smile,
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

interface AboutScreenProps {
  onBack?: () => void;
  onCreateTrip?: () => void;
  onExploreStays?: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({
  onBack,
  onCreateTrip,
  onExploreStays,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'mission' | 'features' | 'security' | 'values'>('mission');
  const [copiedLink, setCopiedLink] = useState(false);

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

  const handleShareApp = () => {
    setCopiedLink(true);
    Alert.alert('Triptual Shared', 'App link copied to clipboard. Share it with your travel squad!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header - Consistent with Help Center & Security Screen */}
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

          <Text style={styles.headerTitle}>About Triptual</Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Top Navigation Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { key: 'mission', label: 'Our Mission' },
            { key: 'features', label: 'Features' },
            { key: 'security', label: 'Trust & Safety' },
            { key: 'values', label: 'Values' },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabBtn}
                onPress={() => setActiveTab(tab.key as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {isSelected && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Clean Hero Banner Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Sparkles size={12} color={colors.primary600} />
              <Text style={styles.heroBadgeText}>Harmonizing Group Travel & Finances</Text>
            </View>
          </View>

          <Text style={styles.heroHeading}>
            Architected for Explorers.{'\n'}
            <Text style={{ color: colors.primary600 }}>Refined by Mathematics.</Text>
          </Text>

          <Text style={styles.heroBody}>
            Adventures should be remembered for breathtaking sunrises and shared laughter—not ruined by messy spreadsheets, unpaid IOUs, and awkward money talks.
          </Text>

          <View style={styles.heroActionsRow}>
            {onCreateTrip && (
              <TouchableOpacity
                style={styles.heroPrimaryBtn}
                onPress={onCreateTrip}
                activeOpacity={0.85}
              >
                <Text style={styles.heroPrimaryBtnText}>Launch a Trip</Text>
                <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            )}

            {onExploreStays && (
              <TouchableOpacity
                style={styles.heroSecondaryBtn}
                onPress={onExploreStays}
                activeOpacity={0.8}
              >
                <Compass size={13} color={colors.slate600} />
                <Text style={styles.heroSecondaryBtnText}>Curated Stays</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Live Platform Impact Counters (Matching WebApp metrics) */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>45,000+</Text>
            <Text style={styles.metricLabel}>Trips Hosted</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: colors.primary600 }]}>73%</Text>
            <Text style={styles.metricLabel}>Less Friction</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>1-Tap</Text>
            <Text style={styles.metricLabel}>UPI Settle</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>100%</Text>
            <Text style={styles.metricLabel}>Transparency</Text>
          </View>
        </View>

        {/* TAB 1: OUR MISSION */}
        {activeTab === 'mission' && (
          <View style={styles.tabContentBlock}>
            {/* Why We Built Triptual Card */}
            <View style={styles.contentCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: backgrounds.enableBg }]}>
                  <Heart size={18} color={colors.primary600} />
                </View>
                <Text style={styles.cardHeaderTitle}>Why We Built Triptual</Text>
              </View>

              <Text style={styles.paragraphText}>
                Planning trips with friends is one of life’s greatest joys, but managing expenses has always been tedious. Between lost counter bills, mixed payment methods, and confusing calculations, someone always ends up carrying an unfair burden.
              </Text>
              <Text style={[styles.paragraphText, { marginTop: 8 }]}>
                Triptual provides an autonomous, real-time ledger that simplifies shared debts into the fewest possible direct payments—allowing you to focus on discovering new destinations together.
              </Text>
            </View>

            {/* Core Value Pillars */}
            <View style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Zap size={18} color={colors.primary600} />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Debt Minimization Engine</Text>
                <Text style={styles.featureDescription}>
                  Our algorithm automatically simplifies complex web debts among friends into minimum direct settlements, eliminating circular transactions.
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Compass size={18} color={colors.primary600} />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Boutique Stays & Curated Packages</Text>
                <Text style={styles.featureDescription}>
                  Discover handpicked eco-villas, alpine cabins, and bespoke stays scored to match your squad’s size, travel style, and budget.
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: '#EFF6FF' }]}>
                <CreditCard size={18} color={colors.accentBlue} />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Direct 1-Tap UPI Settle Up</Text>
                <Text style={styles.featureDescription}>
                  Instantly settle dues with any group member using their saved UPI VPA (Google Pay, PhonePe, Paytm) without manual account math.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: PLATFORM FEATURES */}
        {activeTab === 'features' && (
          <View style={styles.tabContentBlock}>
            {/* Step-by-Step Flow */}
            <View style={styles.contentCard}>
              <Text style={styles.cardHeaderTitle}>How Triptual Works For You</Text>
              <Text style={styles.subtleText}>A complete group travel toolkit built for seamless coordination.</Text>

              {/* Steps */}
              <View style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepTitle}>Create Your Trip & Invite Squad</Text>
                  <Text style={styles.stepDescription}>
                    Set your destination and dates. Share your unique 6-character code with friends for instant 1-tap join.
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepTitle}>Add Shared Expenses On-The-Go</Text>
                  <Text style={styles.stepDescription}>
                    Log meals, cabs, activities, or stays. Choose equal splits, custom amounts, or specific member shares.
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepTitle}>Real-Time Balance Sync</Text>
                  <Text style={styles.stepDescription}>
                    Everyone sees their live balance immediately. No end-of-trip spreadsheet headaches or forgotten receipts.
                  </Text>
                </View>
              </View>

              <View style={[styles.stepRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepTitle}>Instant Settlement with UPI</Text>
                  <Text style={styles.stepDescription}>
                    Tap 'Settle Up' to open your UPI app and pay members directly with zero transaction friction.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: TRUST & SAFETY */}
        {activeTab === 'security' && (
          <View style={styles.tabContentBlock}>
            <View style={styles.contentCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: backgrounds.enableBg }]}>
                  <ShieldCheck size={18} color={colors.primary600} />
                </View>
                <Text style={styles.cardHeaderTitle}>Our Privacy First Guarantee</Text>
              </View>
              <Text style={styles.paragraphText}>
                We believe that financial and trip details are deeply personal. Triptual was built from day one with strict confidentiality safeguards:
              </Text>

              <View style={styles.trustItemRow}>
                <CheckCircle2 size={16} color={colors.primary600} />
                <Text style={styles.trustItemText}>
                  Zero advertising tracking or selling of your personal data.
                </Text>
              </View>

              <View style={styles.trustItemRow}>
                <CheckCircle2 size={16} color={colors.primary600} />
                <Text style={styles.trustItemText}>
                  End-to-end encrypted storage for group records and balances.
                </Text>
              </View>

              <View style={styles.trustItemRow}>
                <CheckCircle2 size={16} color={colors.primary600} />
                <Text style={styles.trustItemText}>
                  Direct peer-to-peer UPI payments—we never hold your money.
                </Text>
              </View>

              <View style={styles.trustItemRow}>
                <CheckCircle2 size={16} color={colors.primary600} />
                <Text style={styles.trustItemText}>
                  Verified payment gateways (Razorpay) for secure package bookings.
                </Text>
              </View>
            </View>

            {/* Quick Links */}
            <View style={styles.linksCard}>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL('https://triptual.app/privacy').catch(() => {})}
                activeOpacity={0.7}
              >
                <Lock size={15} color={colors.slate500} />
                <Text style={styles.linkText}>Privacy Policy</Text>
                <ChevronRight size={15} color={colors.slate400} />
              </TouchableOpacity>

              <View style={styles.linkDivider} />

              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL('https://triptual.app/terms').catch(() => {})}
                activeOpacity={0.7}
              >
                <Award size={15} color={colors.slate500} />
                <Text style={styles.linkText}>Terms of Service</Text>
                <ChevronRight size={15} color={colors.slate400} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TAB 4: VALUES */}
        {activeTab === 'values' && (
          <View style={styles.tabContentBlock}>
            <View style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Award size={18} color={colors.primary600} />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Radical Transparency</Text>
                <Text style={styles.featureDescription}>
                  Every calculation is open and verified by every member in real time. Nobody is left guessing what they paid for.
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Users size={18} color={colors.primary600} />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Squad Harmony</Text>
                <Text style={styles.featureDescription}>
                  Travel brings people closer. Our mission is to keep money conversations light, effortless, and stress-free.
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Smile size={18} color={colors.accentBlue} />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Fairness for Everyone</Text>
                <Text style={styles.featureDescription}>
                  Whether splitting equally, per-item, or custom shares, Triptual respects each traveler's preference and budget.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Share Triptual Box */}
        <View style={styles.shareCard}>
          <View style={styles.shareTextCol}>
            <Text style={styles.shareTitle}>Love traveling with Triptual?</Text>
            <Text style={styles.shareSub}>Invite friends or share Triptual with your next squad.</Text>
          </View>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShareApp}
            activeOpacity={0.8}
          >
            {copiedLink ? <Check size={14} color="#FFFFFF" /> : <Share2 size={14} color="#FFFFFF" />}
            <Text style={styles.shareBtnText}>{copiedLink ? 'Copied' : 'Share App'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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

  // Navigation Tabs
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
    paddingTop: 14,
  },

  // Hero Card
  heroCard: {
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card, // 10
    borderWidth: 1,
    borderColor: borders.card,
    padding: 16,
    marginBottom: 12,
    ...shadows.sm,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: backgrounds.enableBg,
    borderWidth: 1,
    borderColor: borders.infoBox,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: cardRadius.inner,
  },
  heroBadgeText: {
    fontSize: fs.badgeText - 0.5, // 10.5
    fontWeight: fw.semiBold,
    color: colors.primary700,
  },
  heroHeading: {
    fontSize: 16,
    fontWeight: fw.semiBold,
    color: colors.slate900,
    lineHeight: 22,
    marginBottom: 6,
  },
  heroBody: {
    fontSize: fs.modalSubtitle, // 12
    color: colors.slate600,
    lineHeight: 18,
    marginBottom: 14,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary600,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: cardRadius.inner,
  },
  heroPrimaryBtnText: {
    fontSize: fs.badgeText, // 11
    fontWeight: fw.semiBold,
    color: '#FFFFFF',
  },
  heroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: backgrounds.screen,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: cardRadius.inner,
    borderWidth: 1,
    borderColor: borders.card,
  },
  heroSecondaryBtnText: {
    fontSize: fs.badgeText, // 11
    fontWeight: fw.medium,
    color: colors.slate700,
  },

  // Impact Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card, // 10
    borderWidth: 1,
    borderColor: borders.card,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  metricNumber: {
    fontSize: fs.headerTitle - 1, // 15
    fontWeight: fw.semiBold,
    color: colors.slate900,
  },
  metricLabel: {
    fontSize: fs.deviceMeta, // 10.5
    color: colors.slate500,
    marginTop: 2,
    fontWeight: fw.medium,
    textAlign: 'center',
  },

  // Tab Content Blocks
  tabContentBlock: {
    gap: 10,
  },
  contentCard: {
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card, // 10
    borderWidth: 1,
    borderColor: borders.card,
    padding: 16,
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: fs.sectionTitle, // 14
    fontWeight: fw.semiBold,
    color: colors.slate900,
  },
  paragraphText: {
    fontSize: fs.modalSubtitle, // 12
    lineHeight: 18,
    color: colors.slate600,
  },
  subtleText: {
    fontSize: fs.infoText, // 11.5
    color: colors.slate500,
    marginTop: 2,
    marginBottom: 14,
  },

  // Feature Cards
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card, // 10
    borderWidth: 1,
    borderColor: borders.card,
    padding: 14,
    gap: 12,
    ...shadows.sm,
  },
  featureIconBox: {
    width: 38,
    height: 38,
    borderRadius: cardRadius.inner, // 10
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fs.sectionTitle - 0.5, // 13.5
    fontWeight: fw.semiBold,
    color: colors.slate900,
    marginBottom: 3,
  },
  featureDescription: {
    fontSize: fs.modalSubtitle, // 12
    lineHeight: 17,
    color: colors.slate600,
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: backgrounds.enableBg,
    borderWidth: 1,
    borderColor: borders.infoBox,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: fs.badgeText, // 11
    fontWeight: fw.semiBold,
    color: colors.primary600,
  },
  stepTextCol: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fs.sectionTitle - 0.5, // 13.5
    fontWeight: fw.semiBold,
    color: colors.slate900,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: fs.infoText, // 11.5
    color: colors.slate600,
    lineHeight: 17,
  },

  // Trust items
  trustItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
  },
  trustItemText: {
    flex: 1,
    fontSize: fs.modalSubtitle, // 12
    color: colors.slate600,
    lineHeight: 18,
  },

  // Links Card
  linksCard: {
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card, // 10
    borderWidth: 1,
    borderColor: borders.card,
    overflow: 'hidden',
    ...shadows.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  linkText: {
    flex: 1,
    fontSize: fs.inputText, // 13
    fontWeight: fw.medium,
    color: colors.slate700,
  },
  linkDivider: {
    height: 1,
    backgroundColor: colors.slate100,
    marginLeft: 42,
  },

  // Share Card
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: backgrounds.card,
    borderRadius: cardRadius.card, // 10
    borderWidth: 1,
    borderColor: borders.card,
    padding: 14,
    marginTop: 12,
    gap: 10,
    ...shadows.sm,
  },
  shareTextCol: {
    flex: 1,
  },
  shareTitle: {
    fontSize: fs.sectionTitle - 0.5, // 13.5
    fontWeight: fw.semiBold,
    color: colors.slate900,
  },
  shareSub: {
    fontSize: fs.infoText, // 11.5
    color: colors.slate500,
    marginTop: 1,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary600,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: cardRadius.inner,
  },
  shareBtnText: {
    fontSize: fs.badgeText, // 11
    fontWeight: fw.semiBold,
    color: '#FFFFFF',
  },
});
