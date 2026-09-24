/**
 * AboutScreen - About Triptual
 * Industry-Grade, Premium Aesthetic Mobile Screen
 * Visual parity with WebApp luxury warm alabaster & emerald design system
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
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Palmtree,
  Sparkles,
  ShieldCheck,
  Zap,
  Cpu,
  Layers,
  Heart,
  Globe,
  Lock,
  ChevronRight,
  ExternalLink,
  Code2,
  Share2,
  CheckCircle2,
  Radio,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../theme/colors';

interface AboutScreenProps {
  onBack?: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'tech' | 'privacy'>('overview');
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
      ? Math.max(StatusBar.currentHeight || 0, insets.top, 24) + 10
      : insets.top > 0
      ? 12
      : 16;

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const handleShareApp = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
          <Text style={styles.headerTitle}>About Triptual</Text>
        </View>

        <View style={styles.versionBadge}>
          <Text style={styles.versionBadgeText}>v1.4.2</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroLogoRow}>
            <View style={styles.logoCircle}>
              <Palmtree size={30} color={colors.primary600} strokeWidth={2.4} />
            </View>
            <View style={styles.heroTitleCol}>
              <View style={styles.brandTitleRow}>
                <Text style={styles.brandName}>Triptual</Text>
                <View style={styles.aiBadge}>
                  <Sparkles size={11} color="#059669" />
                  <Text style={styles.aiBadgeText}>AI Powered</Text>
                </View>
              </View>
              <Text style={styles.brandTagline}>Collaborative Travel & Smart Ledger</Text>
            </View>
          </View>

          <Text style={styles.heroDescription}>
            Triptual revolutionizes group travel by combining AI-driven stay matching with real-time expense recalculation engines and event-driven squad coordination.
          </Text>

          {/* Live Architecture Status Indicator */}
          <View style={styles.architectureBar}>
            <View style={styles.pulseDot} />
            <Text style={styles.architectureText}>
              Aiven Kafka Event Mesh & Socket.io WebSockets Active
            </Text>
          </View>
        </View>

        {/* Tab Navigation Pill Selector */}
        <View style={styles.navSegmentContainer}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'features', label: 'Features' },
            { key: 'tech', label: 'Tech Stack' },
            { key: 'privacy', label: 'Privacy' },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                onPress={() => setActiveTab(tab.key as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic Tab Content */}

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionHeading}>Our Core Mission</Text>
            <Text style={styles.paragraphText}>
              Planning group travel is notoriously complex—from negotiating destinations to tracking shared expenses. Triptual solves this with an integrated platform that keeps your group synchronized at every step.
            </Text>

            {/* Key Metrics Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>100%</Text>
                <Text style={styles.statLabel}>Transparent Split</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>&lt; 50ms</Text>
                <Text style={styles.statLabel}>Real-Time Sync</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>Zero</Text>
                <Text style={styles.statLabel}>Manual Math</Text>
              </View>
            </View>

            {/* Company Values */}
            <View style={styles.cardList}>
              <View style={styles.infoCard}>
                <View style={[styles.iconWrapper, { backgroundColor: '#ECFDF5' }]}>
                  <Zap size={20} color={colors.primary600} strokeWidth={2.2} />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitle}>Event-Driven Speed</Text>
                  <Text style={styles.cardSub}>
                    Powered by Apache Kafka, all trip updates, expense entries, and member invites stream instantly to every device.
                  </Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <View style={[styles.iconWrapper, { backgroundColor: '#EFF6FF' }]}>
                  <ShieldCheck size={20} color={colors.accentBlue} strokeWidth={2.2} />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitle}>Bank-Grade Security</Text>
                  <Text style={styles.cardSub}>
                    JWT token rotation, encrypted storage, and Razorpay integration ensure your financial and personal data remain protected.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 2. FEATURES TAB */}
        {activeTab === 'features' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionHeading}>Platform Capabilities</Text>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBadge}>
                <Sparkles size={18} color={colors.primary600} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>AI Curated Stays</Text>
                <Text style={styles.featureDesc}>
                  Algorithms match villas, resorts, and hotels based on group size, budget, distance, and vibe score.
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBadge}>
                <Layers size={18} color={colors.accentPurple} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Recalculation Engine</Text>
                <Text style={styles.featureDesc}>
                  Simplifies complex multi-currency group expenses into minimum direct settlements via UPI VPAs.
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBadge}>
                <Radio size={18} color={colors.accentRose} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Kafka Multi-Channel Alerts</Text>
                <Text style={styles.featureDesc}>
                  Sub-second notifications via WebSockets, Firebase FCM Push, In-App Inbox, and Email receipts.
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBadge}>
                <Globe size={18} color={colors.accentAmber} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Cross-Platform Workspace</Text>
                <Text style={styles.featureDesc}>
                  Seamless synchronization between React Native Mobile App (iOS/Android) and Next.js Web App.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 3. TECH STACK TAB */}
        {activeTab === 'tech' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionHeading}>Engineering Architecture</Text>
            <Text style={styles.paragraphText}>
              Triptual is engineered using high-performance microservices designed for low-latency collaboration and zero data loss.
            </Text>

            <View style={styles.techPillGrid}>
              {[
                { name: 'React Native & Expo', cat: 'Frontend Mobile' },
                { name: 'Node.js & Express 5', cat: 'Backend Gateway' },
                { name: 'Aiven Apache Kafka', cat: 'Event Streaming' },
                { name: 'PostgreSQL (Neon DB)', cat: 'Relational Database' },
                { name: 'Socket.io', cat: 'Real-Time WebSockets' },
                { name: 'Upstash Redis', cat: 'Session & Cache' },
                { name: 'Firebase FCM', cat: 'Push Notifications' },
                { name: 'Razorpay API', cat: 'Payment Gateway' },
              ].map((tech, idx) => (
                <View key={idx} style={styles.techPill}>
                  <Code2 size={14} color={colors.primary600} />
                  <View>
                    <Text style={styles.techName}>{tech.name}</Text>
                    <Text style={styles.techCat}>{tech.cat}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 4. PRIVACY & LEGAL TAB */}
        {activeTab === 'privacy' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionHeading}>Data Protection & Compliance</Text>

            <View style={styles.legalBox}>
              <View style={styles.legalHeader}>
                <Lock size={18} color={colors.primary600} />
                <Text style={styles.legalTitle}>Privacy First Guarantee</Text>
              </View>
              <Text style={styles.legalBody}>
                Your data is stored securely in encrypted databases. We do not sell your personal information or sharing payment details to third-party advertisers.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.legalLinkRow}
              onPress={() => handleOpenLink('https://triptual-web.vercel.app/privacy')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
              <ExternalLink size={16} color={colors.slate500} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.legalLinkRow}
              onPress={() => handleOpenLink('https://triptual-web.vercel.app/terms')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLinkText}>Terms of Service</Text>
              <ExternalLink size={16} color={colors.slate500} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.legalLinkRow}
              onPress={() => handleOpenLink('https://triptual-web.vercel.app/security')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLinkText}>Security Disclosure</Text>
              <ExternalLink size={16} color={colors.slate500} />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Action Footer Buttons */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShareApp}
            activeOpacity={0.8}
          >
            {copiedLink ? (
              <CheckCircle2 size={18} color="#059669" />
            ) : (
              <Share2 size={18} color={colors.slate800} />
            )}
            <Text style={styles.shareBtnText}>
              {copiedLink ? 'App Link Copied!' : 'Share Triptual App'}
            </Text>
          </TouchableOpacity>

          <View style={styles.copyrightCol}>
            <Text style={styles.copyrightText}>
              © 2026 Triptual Inc. All rights reserved.
            </Text>
            <Text style={styles.buildText}>
              Crafted with ❤️ for modern travelers worldwide.
            </Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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
  versionBadge: {
    backgroundColor: colors.primary50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  versionBadgeText: {
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
  heroCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFECE6',
    ...shadows.sm,
    marginBottom: 20,
  },
  heroLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  heroTitleCol: {
    flex: 1,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.slate900,
    letterSpacing: -0.4,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  aiBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#047857',
  },
  brandTagline: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.slate600,
    marginTop: 2,
  },
  heroDescription: {
    fontSize: 13.5,
    color: colors.slate700,
    lineHeight: 20,
    marginBottom: 16,
  },
  architectureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E8E4DA',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  architectureText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.slate700,
    flex: 1,
  },
  navSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radii.lg,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.slate600,
  },
  segmentTextActive: {
    color: colors.primary700,
    fontWeight: '800',
  },
  tabSection: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.slate900,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  paragraphText: {
    fontSize: 13.5,
    color: colors.slate600,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary600,
  },
  statLabel: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
    textAlign: 'center',
  },
  cardList: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.slate900,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 12.5,
    color: colors.slate600,
    lineHeight: 18,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  featureIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.slate900,
  },
  featureDesc: {
    fontSize: 12.5,
    color: colors.slate600,
    marginTop: 2,
    lineHeight: 18,
  },
  techPillGrid: {
    gap: 10,
    marginTop: 8,
  },
  techPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  techName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.slate900,
  },
  techCat: {
    fontSize: 11,
    color: colors.slate500,
  },
  legalBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary200,
    marginBottom: 16,
  },
  legalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  legalTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.primary900,
  },
  legalBody: {
    fontSize: 12.5,
    color: colors.primary900,
    lineHeight: 18,
  },
  legalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  legalLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate800,
  },
  footerSection: {
    marginTop: 10,
    alignItems: 'center',
    gap: 16,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  shareBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.slate800,
  },
  copyrightCol: {
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: colors.slate500,
  },
  buildText: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 2,
  },
});
