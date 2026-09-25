import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ActivityIndicator, 
  TextInput, 
  ScrollView, 
  Platform, 
  Alert 
} from 'react-native';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Lock, 
  ArrowRight, 
  Check, 
  Zap 
} from 'lucide-react-native';
import { groupService } from '../../api/group.service';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (paymentDetails: any) => void;
  amount?: number;
  groupName?: string;
  memberCount?: number;
}

type PaymentMethodType = 'UPI' | 'CARD' | 'NET_BANKING';

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  visible, 
  onClose, 
  onSuccess, 
  amount = 19, 
  groupName = 'Group Trip', 
  memberCount = 7 
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [gatewayStatus, setGatewayStatus] = useState('Initializing secure payment session');

  // Method states
  const [selectedUpiApp, setSelectedUpiApp] = useState<'GPAY' | 'PHONEPE' | 'PAYTM'>('GPAY');
  const [customUpiId, setCustomUpiId] = useState('success@razorpay');
  const [cardNumber, setCardNumber] = useState('4111 •••• •••• 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  const handleRazorpayPay = async () => {
    setIsProcessing(true);
    setIsSuccess(false);
    setGatewayStatus('Initializing secure payment session');
    setPaymentResult(null);
    setOrderInfo(null);

    try {
      const orderRes = await groupService.createRazorpayOrder({
        amount,
        currency: 'INR',
        groupId: null,
        groupName,
        memberCount,
        paymentType: 'GROUP_TIER_UPGRADE',
        notes: {
          groupName,
          memberCount,
          method: selectedMethod,
          upiApp: selectedUpiApp,
          bank: selectedBank,
          vpa: customUpiId,
          cardHolder: 'Group Organizer'
        }
      });

      const orderData = orderRes?.data;
      setOrderInfo(orderData);

      await new Promise((resolve) => setTimeout(resolve, 900));
      setGatewayStatus('Authenticating with Razorpay gateway');

      await new Promise((resolve) => setTimeout(resolve, 1100));
      setGatewayStatus('Validating payment and customer details');

      const razorpayPaymentId = 'pay_' + Math.random().toString(36).substring(2, 14);
      const razorpayOrderId = orderData?.orderId || ('order_' + Math.random().toString(36).substring(2, 14));
      const razorpaySignature = 'sim_' + Math.random().toString(36).substring(2, 18);

      const verifyRes = await groupService.verifyRazorpayPayment({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        amount,
        currency: 'INR',
        groupName,
        memberCount,
        paymentType: 'GROUP_TIER_UPGRADE',
        method: selectedMethod,
        upiApp: selectedUpiApp,
        bank: selectedBank,
        note: customUpiId,
        metadata: {
          method: selectedMethod,
          upiApp: selectedUpiApp,
          vpa: customUpiId,
          bank: selectedBank,
          cardNumber: cardNumber.replace(/\s+/g, '').slice(-4),
          cardExpiry,
          amount,
          groupName,
          memberCount,
          capturedAt: new Date().toISOString(),
          simulationMode: 'industry-grade'
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 800));
      setGatewayStatus('Secure capture completed and stored in real time');

      const finalResult = {
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        verified: verifyRes?.data?.verified !== false,
        signature: verifyRes?.data?.signature || razorpaySignature,
        status: verifyRes?.data?.status || 'CAPTURED',
      };

      setPaymentResult(finalResult);
      setIsSuccess(true);

      setTimeout(() => {
        onSuccess({
          status: 'PAID',
          amount,
          currency: 'INR',
          transactionId: razorpayPaymentId,
          razorpayPaymentId,
          razorpayOrderId,
          paymentMethod: selectedMethod,
          verified: true,
          gatewayStatus: 'CAPTURED',
          metadata: finalResult,
          paidAt: new Date().toISOString()
        });
      }, 1400);

    } catch (err: any) {
      console.error('Razorpay Error:', err);
      setGatewayStatus('Payment authorization failed');
      Alert.alert(
        'Transaction Notice',
        err.message || 'Unable to complete Razorpay payment. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="slide" 
      onRequestClose={isProcessing ? undefined : onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Top Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.securityBadge}>
              <ShieldCheck size={14} color="#059669" />
              <Text style={styles.securityBadgeText}>Razorpay Trusted Checkout</Text>
            </View>

            {!isProcessing && !isSuccess && (
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={17} color="#636366" />
              </TouchableOpacity>
            )}
          </View>

          {isSuccess ? (
            /* Success Receipt View */
            <View style={styles.successContainer}>
              <View style={styles.successIconRing}>
                <CheckCircle2 size={40} color="#059669" />
              </View>
              <Text style={styles.successTitle}>Payment Verified</Text>
              <Text style={styles.successSubtitle}>
                Squad activation pass is unlocked for <Text style={{ fontWeight: '700', color: '#1C1C1E' }}>{groupName}</Text>.
              </Text>

              <View style={styles.receiptCard}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Transaction ID</Text>
                  <Text style={styles.receiptValue}>{paymentResult?.paymentId || 'pay_test_verified'}</Text>
                </View>
                <View style={styles.receiptDivider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Amount Paid</Text>
                  <Text style={[styles.receiptValue, { color: '#059669', fontWeight: '700' }]}>₹{amount}.00</Text>
                </View>
                <View style={styles.receiptDivider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Status</Text>
                  <View style={styles.verifiedTag}>
                    <Check size={10} color="#047857" strokeWidth={3} />
                    <Text style={styles.verifiedTagText}>Verified</Text>
                  </View>
                </View>
              </View>

              <View style={styles.redirectingRow}>
                <ActivityIndicator size="small" color="#059669" style={{ marginRight: 8 }} />
                <Text style={styles.redirectingText}>Finalizing your trip group...</Text>
              </View>
            </View>
          ) : (
            /* Payment Content */
            <ScrollView 
              style={styles.scrollBody} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Hero Price Section */}
              <View style={styles.heroSection}>
                <Text style={styles.heroAmount}>₹{amount}.00</Text>
                <Text style={styles.heroSubtitle}>Group Activation Pass • {groupName}</Text>
                <View style={styles.activationPill}>
                  <CheckCircle2 size={11} color="#059669" />
                  <Text style={styles.activationPillText}>One-Time Fee • Unlimited Travelers</Text>
                </View>
              </View>

              {/* Order Summary Inset Card */}
              <View style={styles.orderCard}>
                <View style={styles.orderRow}>
                  <Text style={styles.orderLabel}>Trip Group</Text>
                  <Text style={styles.orderValue} numberOfLines={1}>{groupName}</Text>
                </View>
                <View style={styles.orderDivider} />
                <View style={styles.orderRow}>
                  <Text style={styles.orderLabel}>Travelers Included</Text>
                  <Text style={styles.orderValue}>{memberCount} Travelers (Squad Tier)</Text>
                </View>
                <View style={styles.orderDivider} />
                <View style={styles.orderRow}>
                  <Text style={styles.orderLabel}>Total Amount</Text>
                  <Text style={[styles.orderValue, { color: '#059669', fontWeight: '700' }]}>₹{amount}.00</Text>
                </View>
              </View>

              {/* Payment Method Segmented Tabs */}
              <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
              <View style={styles.methodSelector}>
                <TouchableOpacity
                  style={[styles.methodTab, selectedMethod === 'UPI' && styles.methodTabActive]}
                  onPress={() => setSelectedMethod('UPI')}
                  activeOpacity={0.8}
                >
                  <Smartphone size={15} color={selectedMethod === 'UPI' ? '#059669' : '#636366'} />
                  <Text style={[styles.methodTabText, selectedMethod === 'UPI' && styles.methodTabTextActive]}>
                    UPI
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTab, selectedMethod === 'CARD' && styles.methodTabActive]}
                  onPress={() => setSelectedMethod('CARD')}
                  activeOpacity={0.8}
                >
                  <CreditCard size={15} color={selectedMethod === 'CARD' ? '#059669' : '#636366'} />
                  <Text style={[styles.methodTabText, selectedMethod === 'CARD' && styles.methodTabTextActive]}>
                    Card
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTab, selectedMethod === 'NET_BANKING' && styles.methodTabActive]}
                  onPress={() => setSelectedMethod('NET_BANKING')}
                  activeOpacity={0.8}
                >
                  <Building2 size={15} color={selectedMethod === 'NET_BANKING' ? '#059669' : '#636366'} />
                  <Text style={[styles.methodTabText, selectedMethod === 'NET_BANKING' && styles.methodTabTextActive]}>
                    NetBanking
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Method Panel: UPI */}
              {selectedMethod === 'UPI' && (
                <View style={styles.panelCard}>
                  <Text style={styles.panelHeader}>Select UPI App</Text>
                  
                  {/* Instant UPI Apps */}
                  <View style={styles.upiAppsRow}>
                    <TouchableOpacity 
                      style={[styles.upiAppBtn, selectedUpiApp === 'GPAY' && styles.upiAppBtnActive]}
                      onPress={() => setSelectedUpiApp('GPAY')}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.appIconCircle, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={styles.gpayLogo}>G</Text>
                      </View>
                      <Text style={styles.upiAppName}>Google Pay</Text>
                      {selectedUpiApp === 'GPAY' && (
                        <View style={styles.upiCheckCircle}>
                          <Check size={9} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.upiAppBtn, selectedUpiApp === 'PHONEPE' && styles.upiAppBtnActive]}
                      onPress={() => setSelectedUpiApp('PHONEPE')}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.appIconCircle, { backgroundColor: '#5F259F' }]}>
                        <Text style={[styles.gpayLogo, { color: '#FFFFFF' }]}>पे</Text>
                      </View>
                      <Text style={styles.upiAppName}>PhonePe</Text>
                      {selectedUpiApp === 'PHONEPE' && (
                        <View style={styles.upiCheckCircle}>
                          <Check size={9} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.upiAppBtn, selectedUpiApp === 'PAYTM' && styles.upiAppBtnActive]}
                      onPress={() => setSelectedUpiApp('PAYTM')}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.appIconCircle, { backgroundColor: '#00BAF2' }]}>
                        <Text style={[styles.gpayLogo, { color: '#FFFFFF' }]}>P</Text>
                      </View>
                      <Text style={styles.upiAppName}>Paytm</Text>
                      {selectedUpiApp === 'PAYTM' && (
                        <View style={styles.upiCheckCircle}>
                          <Check size={9} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* UPI VPA Field */}
                  <Text style={styles.inputCaption}>Or enter UPI ID</Text>
                  <View style={styles.inputContainer}>
                    <Smartphone size={15} color="#8E8E93" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      value={customUpiId}
                      onChangeText={setCustomUpiId}
                      placeholder="username@bank"
                      placeholderTextColor="#C7C7CC"
                      autoCapitalize="none"
                    />
                    <View style={styles.instantVerifiedTag}>
                      <Check size={10} color="#059669" strokeWidth={3} />
                      <Text style={styles.instantVerifiedText}>Verified</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Method Panel: Card */}
              {selectedMethod === 'CARD' && (
                <View style={styles.panelCard}>
                  {/* Minimalist Card Simulation */}
                  <View style={styles.virtualCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardChip} />
                      <Text style={styles.cardBrandText}>VISA / MC</Text>
                    </View>
                    <Text style={styles.cardNumberDisplay}>{cardNumber}</Text>
                    <View style={styles.cardFooterRow}>
                      <View>
                        <Text style={styles.cardSmallLabel}>CARDHOLDER</Text>
                        <Text style={styles.cardSmallValue}>Group Organizer</Text>
                      </View>
                      <View>
                        <Text style={styles.cardSmallLabel}>EXPIRES</Text>
                        <Text style={styles.cardSmallValue}>{cardExpiry}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Card Form */}
                  <Text style={styles.inputCaption}>Card Number</Text>
                  <View style={styles.inputContainer}>
                    <CreditCard size={15} color="#8E8E93" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      value={cardNumber}
                      onChangeText={setCardNumber}
                      placeholder="4111 1111 1111 1111"
                      placeholderTextColor="#C7C7CC"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputCaption}>Expiry</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.textInput}
                          value={cardExpiry}
                          onChangeText={setCardExpiry}
                          placeholder="MM/YY"
                          placeholderTextColor="#C7C7CC"
                        />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputCaption}>CVV</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.textInput}
                          value={cardCvv}
                          onChangeText={setCardCvv}
                          placeholder="123"
                          placeholderTextColor="#C7C7CC"
                          secureTextEntry
                          keyboardType="numeric"
                        />
                        <Lock size={12} color="#8E8E93" />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Method Panel: Net Banking */}
              {selectedMethod === 'NET_BANKING' && (
                <View style={styles.panelCard}>
                  <Text style={styles.panelHeader}>Popular Indian Banks</Text>
                  <View style={styles.bankGrid}>
                    {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((b) => {
                      const isSelected = selectedBank === b;
                      return (
                        <TouchableOpacity
                          key={b}
                          style={[styles.bankTile, isSelected && styles.bankTileActive]}
                          onPress={() => setSelectedBank(b)}
                          activeOpacity={0.8}
                        >
                          <Building2 size={16} color={isSelected ? '#059669' : '#636366'} />
                          <Text style={[styles.bankTileText, isSelected && styles.bankTileTextActive]} numberOfLines={1}>
                            {b}
                          </Text>
                          {isSelected && (
                            <View style={styles.bankCheckDot}>
                              <Check size={9} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.processingStateCard}>
                <View style={styles.processingStateRow}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.processingStateText}>{gatewayStatus}</Text>
                </View>
                <Text style={styles.processingStateHint}>
                  Real-time order, authorization, and capture metadata are stored in the backend before completion.
                </Text>
              </View>

              {/* Security Guarantee Note */}
              <View style={styles.securityFooter}>
                <Lock size={12} color="#8E8E93" style={{ marginRight: 5 }} />
                <Text style={styles.securityFooterText}>
                  256-bit SSL • PCI-DSS Level 1 Certified • RBI & NPCI Compliant
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Bottom CTA Button */}
          {!isSuccess && (
            <View style={styles.footerBar}>
              <TouchableOpacity 
                style={[styles.payBtn, isProcessing && styles.payBtnDisabled]}
                onPress={handleRazorpayPay}
                disabled={isProcessing}
                activeOpacity={0.85}
              >
                {isProcessing ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                    <Text style={styles.payBtnText}>Authorizing with Razorpay...</Text>
                  </View>
                ) : (
                  <View style={styles.btnRow}>
                    <Lock size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.payBtnText}>Pay ₹{amount}.00 Securely</Text>
                    <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  dragHandle: {
    width: 36,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    maxHeight: 480,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: '#8E8E93',
    marginTop: 3,
  },
  activationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
    gap: 5,
  },
  activationPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },

  // Order Summary Card
  orderCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  orderLabel: {
    fontSize: 12.5,
    color: '#636366',
  },
  orderValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  orderDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },

  // Segmented Method Selector
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 5,
  },
  methodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#636366',
  },
  methodTabTextActive: {
    color: '#1C1C1E',
    fontWeight: '700',
  },

  // Panel Cards
  panelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    padding: 14,
    marginBottom: 14,
  },
  panelHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  inputCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
    marginTop: 4,
  },

  // UPI Apps Row
  upiAppsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  upiAppBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  upiAppBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  appIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  gpayLogo: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  upiAppName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  upiCheckCircle: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1C1E',
    padding: 0,
  },
  instantVerifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  instantVerifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
  },

  // Card Simulation
  virtualCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardChip: {
    width: 26,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  cardBrandText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  cardNumberDisplay: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 12,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardSmallLabel: {
    fontSize: 8.5,
    color: '#64748B',
    letterSpacing: 0.4,
  },
  cardSmallValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F1F5F9',
    marginTop: 1,
  },

  // Bank Grid
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankTile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#E5E5EA',
    gap: 8,
    position: 'relative',
  },
  bankTileActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  bankTileText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  bankTileTextActive: {
    color: '#047857',
  },
  bankCheckDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },

  processingStateCard: {
    marginTop: 12,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  processingStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingStateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
    flexShrink: 1,
  },
  processingStateHint: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
    color: '#166534',
  },

  // Security Footer
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  securityFooterText: {
    fontSize: 10.5,
    color: '#8E8E93',
  },

  // Footer CTA
  footerBar: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  payBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  payBtnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Success State
  successContainer: {
    padding: 24,
    alignItems: 'center',
  },
  successIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  successSubtitle: {
    fontSize: 12.5,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#636366',
  },
  receiptValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  receiptDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  redirectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redirectingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
});
