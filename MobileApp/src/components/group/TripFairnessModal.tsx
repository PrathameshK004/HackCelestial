/**
 * TripFairnessModal.tsx
 * Comprehensive TripFairness AI & Settlement Intelligence Modal
 * Displays explainable fairness scoring, financial stress index, anomaly alerts,
 * multi-mode settlement strategies, budget category health, and fairness timeline.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Scale,
  Sparkles,
  Info,
  CreditCard,
  UserCheck,
  Activity,
  PieChart,
  Clock,
  Sliders,
  Zap,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { TripFairnessInsight, TripFairnessTransfer } from '../../types';

interface TripFairnessModalProps {
  visible: boolean;
  onClose: () => void;
  insight: TripFairnessInsight | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSettleTransfer?: (transfer: TripFairnessTransfer) => void;
}

type SettlementMode = 'min_transfers' | 'organizer_hub' | 'threshold_filter';

export const TripFairnessModal: React.FC<TripFairnessModalProps> = ({
  visible,
  onClose,
  insight,
  isLoading,
  onRefresh,
  onSettleTransfer,
}) => {
  const [settlementMode, setSettlementMode] = useState<SettlementMode>('min_transfers');
  const [showTimeline, setShowTimeline] = useState(false);

  const score = insight?.fairnessScore ?? 100;
  const riskLevel = insight?.riskLevel ?? (score >= 80 ? 'low' : score >= 60 ? 'moderate' : 'high');

  const getScoreTheme = () => {
    if (score >= 80) {
      return {
        badgeBg: colors.primary50,
        badgeBorder: colors.primary200,
        textColor: colors.primary700,
        label: 'Low Financial Risk',
      };
    }
    if (score >= 60) {
      return {
        badgeBg: colors.accentAmberLight,
        badgeBorder: '#fde68a',
        textColor: colors.accentAmber,
        label: 'Moderate Disparity',
      };
    }
    return {
      badgeBg: colors.accentRoseLight,
      badgeBorder: '#fecdd3',
      textColor: colors.accentRose,
      label: 'High Imbalance Risk',
    };
  };

  const theme = getScoreTheme();
  const breakdown = insight?.scoreBreakdown;
  const strategy = insight?.settlementStrategy;
  const rawMinTransfers = strategy?.minTransferSet || [];
  const detailedIssues = insight?.detailedIssues || [];
  const travelerBreakdown = strategy?.travelerBreakdown || [];
  const riskAssessment = insight?.riskAssessment;
  const budgetHealth = insight?.budgetHealth;
  const timeline = insight?.timeline || [];

  // Determine active transfers based on selected mode
  let activeTransfers: TripFairnessTransfer[] = rawMinTransfers;
  let modeSubtitle = 'Minimal transfers between members';
  let absorbedNotice: string | null = null;

  if (settlementMode === 'organizer_hub' && strategy?.alternativeStrategies?.organizerHub) {
    activeTransfers = strategy.alternativeStrategies.organizerHub;
    modeSubtitle = 'All settlements routed through the trip organizer hub';
  } else if (settlementMode === 'threshold_filter' && strategy?.alternativeStrategies?.thresholdFilter) {
    const filterData = strategy.alternativeStrategies.thresholdFilter;
    activeTransfers = filterData.activeTransfers;
    modeSubtitle = `Transfers under ₹${filterData.threshold} absorbed to avoid micro-debt friction`;
    if (filterData.absorbedTransfers?.length > 0) {
      absorbedNotice = `${filterData.absorbedTransfers.length} micro-transfer(s) totalling ₹${filterData.absorbedTotal} absorbed into tip pool.`;
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.headerIconWrap}>
                <ShieldCheck size={20} color={colors.primary600} />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.headerTitle}>TripFairness AI™</Text>
                  <View style={[
                    styles.aiTag,
                    {
                      backgroundColor: insight?.source === 'offline-local-ai' || insight?.engineMode === 'OFFLINE_EDGE_AI'
                        ? '#ecfdf5'
                        : colors.accentPurpleLight,
                      borderColor: insight?.source === 'offline-local-ai' || insight?.engineMode === 'OFFLINE_EDGE_AI'
                        ? '#a7f3d0'
                        : '#e9d5ff',
                      borderWidth: 1,
                    }
                  ]}>
                    <Sparkles size={10} color={insight?.source === 'offline-local-ai' || insight?.engineMode === 'OFFLINE_EDGE_AI' ? '#059669' : colors.accentPurple} />
                    <Text style={[
                      styles.aiTagText,
                      { color: insight?.source === 'offline-local-ai' || insight?.engineMode === 'OFFLINE_EDGE_AI' ? '#047857' : colors.accentPurple }
                    ]}>
                      {insight?.source === 'offline-local-ai' || insight?.engineMode === 'OFFLINE_EDGE_AI' ? '⚡ OFFLINE-FIRST AI' : '☁️ NUGEN CLOUD'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.headerSubtitle}>
                  {insight?.source === 'offline-local-ai' || insight?.engineMode === 'OFFLINE_EDGE_AI'
                    ? '100% on-device edge intelligence • Zero cloud delay'
                    : 'Cloud aligned intelligence & settlement optimization'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.slate600} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Score Banner */}
            <View style={styles.scoreCard}>
              <View style={styles.scoreRow}>
                <View style={[styles.scoreCircle, { borderColor: theme.textColor }]}>
                  <Text style={[styles.scoreValue, { color: theme.textColor }]}>{score}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <View style={[styles.riskPill, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                    <Text style={[styles.riskPillText, { color: theme.textColor }]}>
                      {theme.label}
                    </Text>
                  </View>
                  <Text style={styles.summaryText}>
                    {insight?.summary || 'Fairness report ready. Review balances and optimization steps below.'}
                  </Text>
                  {strategy?.confidence !== undefined && (
                    <Text style={styles.confidenceText}>
                      Engine Confidence: <Text style={{ fontWeight: '700' }}>{strategy.confidence}%</Text>
                    </Text>
                  )}
                </View>
              </View>

              {/* Breakdown Bars */}
              {breakdown && (
                <View style={styles.breakdownSection}>
                  <Text style={styles.breakdownTitle}>Fairness Pillars</Text>

                  {/* Pillar 1: Spend Distribution */}
                  <View style={styles.pillarRow}>
                    <View style={styles.pillarHeader}>
                      <Text style={styles.pillarLabel}>Spend Distribution</Text>
                      <Text style={styles.pillarValue}>{breakdown.spendDistributionScore}/100</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${breakdown.spendDistributionScore}%`,
                            backgroundColor: breakdown.spendDistributionScore > 70 ? colors.primary500 : colors.accentAmber,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Pillar 2: Settlement Health */}
                  <View style={styles.pillarRow}>
                    <View style={styles.pillarHeader}>
                      <Text style={styles.pillarLabel}>Settlement Integrity</Text>
                      <Text style={styles.pillarValue}>{breakdown.settlementHealthScore}/100</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${breakdown.settlementHealthScore}%`,
                            backgroundColor: breakdown.settlementHealthScore > 70 ? colors.primary500 : colors.accentAmber,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Pillar 3: Coverage */}
                  <View style={styles.pillarRow}>
                    <View style={styles.pillarHeader}>
                      <Text style={styles.pillarLabel}>Participant Allocation</Text>
                      <Text style={styles.pillarValue}>{breakdown.coverageScore}/100</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${breakdown.coverageScore}%`,
                            backgroundColor: breakdown.coverageScore > 70 ? colors.primary500 : colors.accentAmber,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* ⚡ Executive AI Narrative & Briefing Card (Top USP) */}
            {insight?.aiNarrative && (
              <View style={styles.aiNarrativeCard}>
                <View style={styles.aiNarrativeHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} color="#059669" />
                    <Text style={styles.aiNarrativeTitle}>Executive AI Advisory</Text>
                  </View>
                  <View style={styles.offlinePill}>
                    <Text style={styles.offlinePillText}>
                      {insight.source === 'offline-local-ai' ? '⚡ 0ms Edge Engine' : '☁️ Aligned Model'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.aiNarrativeContent}>{insight.aiNarrative}</Text>
                {insight.confidenceScore && (
                  <View style={styles.aiNarrativeFooter}>
                    <Text style={styles.aiConfidenceBadge}>
                      Engine Confidence: {insight.confidenceScore}% • Zero-Leak Privacy
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Financial Stress & Group Risk Assessment */}
            {riskAssessment && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Activity size={16} color={riskAssessment.financialStressIndex >= 50 ? colors.accentRose : colors.primary700} />
                    <Text style={styles.sectionTitle}>Financial Stress Detector</Text>
                  </View>
                  <View style={[
                    styles.stressPill,
                    {
                      backgroundColor: riskAssessment.stressLevel === 'critical' || riskAssessment.stressLevel === 'elevated'
                        ? colors.accentRoseLight
                        : riskAssessment.stressLevel === 'moderate'
                        ? colors.accentAmberLight
                        : colors.primary50,
                      borderColor: riskAssessment.stressLevel === 'critical' || riskAssessment.stressLevel === 'elevated'
                        ? '#fecdd3'
                        : riskAssessment.stressLevel === 'moderate'
                        ? '#fde68a'
                        : colors.primary200,
                    }
                  ]}>
                    <Text style={[
                      styles.stressPillText,
                      {
                        color: riskAssessment.stressLevel === 'critical' || riskAssessment.stressLevel === 'elevated'
                          ? colors.accentRose
                          : riskAssessment.stressLevel === 'moderate'
                          ? colors.accentAmber
                          : colors.primary700
                      }
                    ]}>
                      Stress Index: {riskAssessment.financialStressIndex}/100
                    </Text>
                  </View>
                </View>

                <Text style={styles.stressNarrative}>{riskAssessment.stressNarrative}</Text>

                {riskAssessment.stressFactors?.length > 0 && (
                  <View style={{ gap: 6, marginTop: 8 }}>
                    {riskAssessment.stressFactors.map((factor, fIdx) => (
                      <View key={`factor-${fIdx}`} style={styles.factorRow}>
                        <Zap size={12} color={colors.accentAmber} />
                        <Text style={styles.factorDesc}>{factor.description}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Settlement Strategy & Mode Switcher */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} color={colors.primary700} />
                  <Text style={styles.sectionTitle}>Optimized Settle-up Plan</Text>
                </View>
                <View style={styles.transferCountPill}>
                  <Text style={styles.transferCountText}>
                    {activeTransfers.length} Transfer{activeTransfers.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>

              {/* Mode Switcher Tabs */}
              <View style={styles.modeTabBar}>
                <TouchableOpacity
                  style={[styles.modeTab, settlementMode === 'min_transfers' && styles.modeTabActive]}
                  onPress={() => setSettlementMode('min_transfers')}
                >
                  <Text style={[styles.modeTabText, settlementMode === 'min_transfers' && styles.modeTabTextActive]}>
                    Direct Min
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeTab, settlementMode === 'organizer_hub' && styles.modeTabActive]}
                  onPress={() => setSettlementMode('organizer_hub')}
                >
                  <Text style={[styles.modeTabText, settlementMode === 'organizer_hub' && styles.modeTabTextActive]}>
                    Organizer Hub
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeTab, settlementMode === 'threshold_filter' && styles.modeTabActive]}
                  onPress={() => setSettlementMode('threshold_filter')}
                >
                  <Text style={[styles.modeTabText, settlementMode === 'threshold_filter' && styles.modeTabTextActive]}>
                    No Micro-Debts
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.strategySummary}>{modeSubtitle}</Text>

              {absorbedNotice && (
                <View style={styles.absorbedBox}>
                  <Info size={12} color={colors.accentBlue} />
                  <Text style={styles.absorbedText}>{absorbedNotice}</Text>
                </View>
              )}

              {activeTransfers.length === 0 ? (
                <View style={styles.emptyTransferBox}>
                  <CheckCircle2 size={24} color={colors.primary600} />
                  <Text style={styles.emptyTransferText}>
                    All traveler balances are fully reconciled. No pending debts.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 8 }}>
                  {activeTransfers.map((transfer, idx) => (
                    <View key={`transfer-${idx}`} style={styles.transferCard}>
                      <View style={styles.transferInfo}>
                        <View style={styles.transferActors}>
                          <Text style={styles.actorName}>{transfer.fromName}</Text>
                          <View style={styles.transferArrowWrap}>
                            <ArrowRight size={14} color={colors.slate400} />
                          </View>
                          <Text style={styles.actorName}>{transfer.toName}</Text>
                        </View>
                        <Text style={styles.transferAmount}>
                          ₹{transfer.amount.toLocaleString('en-IN')}
                        </Text>
                      </View>

                      {onSettleTransfer && (
                        <TouchableOpacity
                          style={styles.settleBtn}
                          onPress={() => onSettleTransfer(transfer)}
                          activeOpacity={0.8}
                        >
                          <CreditCard size={12} color="#ffffff" />
                          <Text style={styles.settleBtnText}>Settle Up</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Budget Health & Category Breakdown */}
            {budgetHealth && budgetHealth.categoryBreakdown?.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <PieChart size={16} color={colors.primary700} />
                    <Text style={styles.sectionTitle}>Budget & Category Breakdown</Text>
                  </View>
                  <Text style={styles.budgetBurnText}>
                    Avg: ₹{budgetHealth.burnRatePerTraveler.toLocaleString('en-IN')}/traveler
                  </Text>
                </View>

                {budgetHealth.targetBudget && (
                  <View style={styles.budgetStatusRow}>
                    <Text style={styles.budgetMeta}>
                      Spend ₹{budgetHealth.totalSpend.toLocaleString('en-IN')} of ₹{budgetHealth.targetBudget.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[
                      styles.budgetStatusPill,
                      { color: budgetHealth.status === 'over_budget' ? colors.accentRose : colors.primary700 }
                    ]}>
                      {budgetHealth.budgetUtilizationPct}% used
                    </Text>
                  </View>
                )}

                <View style={{ gap: 8, marginTop: 10 }}>
                  {budgetHealth.categoryBreakdown.map((cat, cIdx) => (
                    <View key={`cat-${cIdx}`} style={styles.categoryItem}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={styles.catName}>{cat.category}</Text>
                        <Text style={styles.catAmount}>
                          ₹{cat.total.toLocaleString('en-IN')} ({cat.percentage}%)
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressBar, { width: `${Math.min(100, cat.percentage)}%`, backgroundColor: colors.primary600 }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Anomaly & Risk Alerts */}
            {detailedIssues.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={16} color={colors.accentAmber} />
                  <Text style={styles.sectionTitle}>Detected Anomalies & Risks</Text>
                </View>

                <View style={{ gap: 10 }}>
                  {detailedIssues.map((issue) => {
                    const isCrit = issue.severity === 'critical';
                    const isWarn = issue.severity === 'warning';
                    const chipBg = isCrit ? colors.accentRoseLight : isWarn ? colors.accentAmberLight : colors.accentBlueLight;
                    const chipBorder = isCrit ? '#fecdd3' : isWarn ? '#fde68a' : '#bae6fd';
                    const iconColor = isCrit ? colors.accentRose : isWarn ? colors.accentAmber : colors.accentBlue;

                    return (
                      <View
                        key={issue.id}
                        style={[styles.issueBox, { backgroundColor: chipBg, borderColor: chipBorder }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AlertTriangle size={14} color={iconColor} />
                          <Text style={[styles.issueTitle, { color: iconColor }]}>
                            {issue.title}
                          </Text>
                          <View style={styles.severityTag}>
                            <Text style={styles.severityText}>{issue.severity.toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={styles.issueDesc}>{issue.description}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Traveler Ledger Breakdown */}
            {travelerBreakdown.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <UserCheck size={16} color={colors.slate800} />
                  <Text style={styles.sectionTitle}>Traveler Ledger Positions</Text>
                </View>

                <View style={{ gap: 8 }}>
                  {travelerBreakdown.map((traveler) => {
                    const isOver = traveler.status === 'overpaid';
                    const isUnder = traveler.status === 'underpaid';
                    const balanceColor = isOver ? colors.primary700 : isUnder ? colors.accentRose : colors.slate500;
                    const prefix = isOver ? '+' : '';

                    return (
                      <View key={traveler.id} style={styles.travelerRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.travelerName}>{traveler.name}</Text>
                          <Text style={styles.travelerMeta}>
                            Paid ₹{traveler.paid.toLocaleString('en-IN')} · Share ₹{traveler.share.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.travelerNet, { color: balanceColor }]}>
                            {prefix}₹{traveler.netBalance.toLocaleString('en-IN')}
                          </Text>
                          <Text style={styles.travelerStatus}>
                            {isOver ? 'gets back' : isUnder ? 'owes group' : 'settled'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Fairness Progression Timeline (Collapsible) */}
            {timeline.length > 0 && (
              <View style={styles.sectionCard}>
                <TouchableOpacity
                  style={styles.sectionHeaderRow}
                  onPress={() => setShowTimeline(!showTimeline)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color={colors.primary700} />
                    <Text style={styles.sectionTitle}>Fairness Timeline ({timeline.length} Events)</Text>
                  </View>
                  <Text style={styles.toggleText}>{showTimeline ? 'Hide ▲' : 'View ▼'}</Text>
                </TouchableOpacity>

                {showTimeline && (
                  <View style={{ gap: 8, marginTop: 10 }}>
                    {timeline.slice(-6).map((step, sIdx) => (
                      <View key={`step-${sIdx}`} style={styles.timelineItem}>
                        <View style={styles.timelineBulletWrap}>
                          <View style={[
                            styles.timelineDot,
                            { backgroundColor: step.imbalanceImpact === 'high' ? colors.accentRose : colors.primary600 }
                          ]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.timelineTitle}>{step.title}</Text>
                            <Text style={styles.timelineAmount}>₹{step.amount.toLocaleString('en-IN')}</Text>
                          </View>
                          <Text style={styles.timelineSub}>
                            Cumulative spend: ₹{step.cumulativeSpend.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Recommendations */}
            {insight?.recommendations && insight.recommendations.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <CheckCircle2 size={16} color={colors.primary700} />
                  <Text style={styles.sectionTitle}>AI Recommendations</Text>
                </View>
                <View style={{ gap: 8 }}>
                  {insight.recommendations.map((rec, i) => (
                    <View key={`rec-${i}`} style={styles.recItem}>
                      <Text style={styles.recBullet}>•</Text>
                      <Text style={styles.recText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Refresh Action */}
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={onRefresh}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <RefreshCw size={14} color="#ffffff" />
                  <Text style={styles.refreshBtnText}>Re-analyze Ledger</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate900,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 1,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accentPurpleLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  aiTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accentPurple,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  scoreCard: {
    backgroundColor: colors.warmSurfaceSubtle,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  aiNarrativeCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  aiNarrativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiNarrativeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065f46',
  },
  offlinePill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  offlinePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  aiNarrativeContent: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1e293b',
  },
  aiNarrativeFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
  },
  aiConfidenceBadge: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  scoreMax: {
    fontSize: 10,
    color: colors.slate400,
    fontWeight: '600',
    marginTop: -2,
  },
  riskPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    marginBottom: 6,
  },
  riskPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryText: {
    fontSize: 12,
    color: colors.slate700,
    lineHeight: 16,
  },
  confidenceText: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 4,
  },
  breakdownSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 8,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillarRow: {
    gap: 4,
  },
  pillarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pillarLabel: {
    fontSize: 11,
    color: colors.slate600,
  },
  pillarValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate800,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.slate200,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  sectionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate900,
  },
  transferCountPill: {
    backgroundColor: colors.primary50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  transferCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary700,
  },
  modeTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: 3,
    marginVertical: 8,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  modeTabActive: {
    backgroundColor: '#ffffff',
    ...shadows.sm,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate600,
  },
  modeTabTextActive: {
    color: colors.primary700,
    fontWeight: '700',
  },
  strategySummary: {
    fontSize: 12,
    color: colors.slate600,
    marginBottom: 8,
  },
  absorbedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentBlueLight,
    padding: 8,
    borderRadius: radii.sm,
    marginBottom: 8,
  },
  absorbedText: {
    fontSize: 11,
    color: colors.accentBlue,
    fontWeight: '600',
    flex: 1,
  },
  emptyTransferBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary50,
    padding: 12,
    borderRadius: radii.md,
    marginTop: 6,
  },
  emptyTransferText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary900,
  },
  transferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warmSurfaceAlt,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  transferInfo: {
    flex: 1,
  },
  transferActors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actorName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate900,
  },
  transferArrowWrap: {
    paddingHorizontal: 2,
  },
  transferAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary700,
    marginTop: 2,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary600,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.md,
  },
  settleBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  stressPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  stressPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stressNarrative: {
    fontSize: 12,
    color: colors.slate700,
    lineHeight: 16,
    marginVertical: 4,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  factorDesc: {
    flex: 1,
    fontSize: 11,
    color: colors.slate600,
  },
  budgetBurnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate500,
  },
  budgetStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  budgetMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate700,
  },
  budgetStatusPill: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryItem: {
    gap: 2,
  },
  catName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate700,
  },
  catAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate900,
  },
  issueBox: {
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
  },
  issueTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  severityTag: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  severityText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.slate700,
  },
  issueDesc: {
    fontSize: 11,
    color: colors.slate700,
    lineHeight: 15,
  },
  travelerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  travelerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate900,
  },
  travelerMeta: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  travelerNet: {
    fontSize: 13,
    fontWeight: '800',
  },
  travelerStatus: {
    fontSize: 10,
    color: colors.slate400,
    marginTop: 1,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary700,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  timelineBulletWrap: {
    paddingTop: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate900,
  },
  timelineAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary700,
  },
  timelineSub: {
    fontSize: 10,
    color: colors.slate500,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  recBullet: {
    fontSize: 14,
    color: colors.primary600,
    fontWeight: '800',
    lineHeight: 16,
  },
  recText: {
    flex: 1,
    fontSize: 12,
    color: colors.slate700,
    lineHeight: 16,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.slate800,
    paddingVertical: 12,
    borderRadius: radii.md,
    marginTop: 4,
  },
  refreshBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
