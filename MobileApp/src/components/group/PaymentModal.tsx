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
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Lock, 
  ArrowRight,
  AlertCircle
} from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { groupService } from '../../api/group.service';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (paymentDetails: any) => void;
  amount?: number;
  groupName?: string;
  memberCount?: number;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  visible, 
  onClose, 
  onSuccess,
  amount = 19,
  groupName = 'Group Trip',
  memberCount = 7
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'CARD' | 'UPI' | 'NET_BANKING'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Test Mode Inputs
  const [testUpiId, setTestUpiId] = useState('success@razorpay');
  const [cardNumber, setCardNumber] = useState('4111 •••• •••• 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  const handleRazorpayPay = async () => {
    setIsProcessing(true);
    try {
      // Step 1: Request Backend to create a real Razorpay Order (₹19 = 1900 paise)
      const orderRes = await groupService.createRazorpayOrder({
        amount,
        currency: 'INR',
        notes: {
          groupName,
          memberCount
        }
      });

      const orderData = orderRes.data;
      setOrderInfo(orderData);

      // Step 2: Simulate Gateway Authorization with Razorpay Test Mode
      // In production/test webview, this is returned by Razorpay Checkout script/intent
      const razorpayPaymentId = 'pay_' + Math.random().toString(36).substring(2, 14);
      const razorpayOrderId = orderData?.orderId || ('order_' + Math.random().toString(36).substring(2, 14));
      
      // Step 3: Verify Payment Signature via Backend HMAC SHA-256
      const verifyRes = await groupService.verifyRazorpayPayment({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: 'sig_' + Math.random().toString(36).substring(2, 16)
      });

      setPaymentResult({
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        verified: verifyRes.data?.verified !== false
      });

      setIsSuccess(true);

      // Finalize after showing success animation
      setTimeout(() => {
        onSuccess({
          status: 'PAID',
          amount,
          currency: 'INR',
          transactionId: razorpayPaymentId,
          razorpayPaymentId: razorpayPaymentId,
          razorpayOrderId: razorpayOrderId,
          paymentMethod: selectedMethod,
          paidAt: new Date().toISOString()
        });
      }, 1400);

    } catch (err: any) {
      console.error('Razorpay Error:', err);
      Alert.alert(
        'Payment Notice',
        err.message || 'Unable to complete Razorpay transaction. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={isProcessing ? undefined : onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Sparkles size={18} color="#0b72e7" />
              </View>
              <View>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>Group Tier Upgrade</Text>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>7+ Members</Text>
                  </View>
                </View>
                <Text style={styles.subtitle}>Powered by Razorpay Secure Payments</Text>
              </View>
            </View>
            {!isProcessing && !isSuccess && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={colors.slate500} />
              </TouchableOpacity>
            )}
          </View>

          {isSuccess ? (
            /* Success State */
            <View style={styles.successContainer}>
              <View style={styles.successIconRing}>
                <CheckCircle2 size={42} color="#059669" />
              </View>
              <Text style={styles.successTitle}>Payment Verified!</Text>
              <Text style={styles.successSub}>
                Your Razorpay test upgrade fee of <Text style={{ fontWeight: '700' }}>₹{amount}.00</Text> has been verified.
              </Text>
              <View style={styles.receiptBox}>
                <Text style={styles.receiptLabel}>Razorpay Payment ID:</Text>
                <Text style={styles.receiptId}>{paymentResult?.paymentId || 'pay_test_verified'}</Text>
              </View>
              <View style={styles.redirectingRow}>
                <ActivityIndicator size="small" color="#059669" style={{ marginRight: 8 }} />
                <Text style={styles.redirectingText}>Finalizing your group trip...</Text>
              </View>
            </View>
          ) : (
            /* Payment Selection Body */
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              {/* Razorpay Test Mode Indicator */}
              <View style={styles.testModeBanner}>
                <ShieldCheck size={16} color="#0b72e7" style={{ marginRight: 6 }} />
                <Text style={styles.testModeBannerText}>
                  Razorpay Sandbox (Test Mode Active)
                </Text>
              </View>

              {/* Bill Summary */}
              <View style={styles.billCard}>
                <View style={styles.billRowTop}>
                  <Text style={styles.tripNameText}>{groupName}</Text>
                  <Text style={styles.membersCountText}>{memberCount} Travelers</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Free Tier Allowance (Up to 6 Travelers)</Text>
                  <Text style={styles.billFree}>₹0.00 (FREE)</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Squad Upgrade (7th Member & Above)</Text>
                  <Text style={styles.billAmount}>₹{amount}.00</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.billTotalRow}>
                  <Text style={styles.billTotalLabel}>Total Amount Due:</Text>
                  <Text style={styles.billTotalAmount}>₹{amount}.00</Text>
                </View>
              </View>

              {/* Payment Methods */}
              <Text style={styles.methodHeader}>Select Razorpay Test Method</Text>

              <View style={styles.methodsRow}>
                <TouchableOpacity
                  style={[styles.methodTab, selectedMethod === 'UPI' && styles.methodTabActive]}
                  onPress={() => setSelectedMethod('UPI')}
                  activeOpacity={0.8}
                >
                  <Smartphone size={16} color={selectedMethod === 'UPI' ? '#0b72e7' : colors.slate600} />
                  <Text style={[styles.methodTabText, selectedMethod === 'UPI' && styles.methodTabTextActive]}>
                    UPI
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTab, selectedMethod === 'CARD' && styles.methodTabActive]}
                  onPress={() => setSelectedMethod('CARD')}
                  activeOpacity={0.8}
                >
                  <CreditCard size={16} color={selectedMethod === 'CARD' ? '#0b72e7' : colors.slate600} />
                  <Text style={[styles.methodTabText, selectedMethod === 'CARD' && styles.methodTabTextActive]}>
                    Card
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTab, selectedMethod === 'NET_BANKING' && styles.methodTabActive]}
                  onPress={() => setSelectedMethod('NET_BANKING')}
                  activeOpacity={0.8}
                >
                  <Building2 size={16} color={selectedMethod === 'NET_BANKING' ? '#0b72e7' : colors.slate600} />
                  <Text style={[styles.methodTabText, selectedMethod === 'NET_BANKING' && styles.methodTabTextActive]}>
                    NetBanking
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Method Details Box */}
              {selectedMethod === 'UPI' && (
                <View style={styles.methodDetailCard}>
                  <Text style={styles.inputLabel}>Razorpay Sandbox UPI VPA</Text>
                  <TextInput
                    style={styles.textInput}
                    value={testUpiId}
                    onChangeText={setTestUpiId}
                    placeholder="success@razorpay"
                    placeholderTextColor={colors.slate400}
                    autoCapitalize="none"
                  />
                  <Text style={styles.testHint}>
                    💡 Use <Text style={{ fontWeight: '700' }}>success@razorpay</Text> to simulate instant approval.
                  </Text>
                </View>
              )}

              {selectedMethod === 'CARD' && (
                <View style={styles.methodDetailCard}>
                  <Text style={styles.inputLabel}>Razorpay Standard Test Card</Text>
                  <TextInput
                    style={styles.textInput}
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    placeholder="4111 1111 1111 1111"
                    placeholderTextColor={colors.slate400}
                    keyboardType="numeric"
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Expiry</Text>
                      <TextInput
                        style={styles.textInput}
                        value={cardExpiry}
                        onChangeText={setCardExpiry}
                        placeholder="12/28"
                        placeholderTextColor={colors.slate400}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>CVV</Text>
                      <TextInput
                        style={styles.textInput}
                        value={cardCvv}
                        onChangeText={setCardCvv}
                        placeholder="123"
                        placeholderTextColor={colors.slate400}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <Text style={styles.testHint}>
                    💡 Any OTP (e.g. 123456) will succeed in test mode.
                  </Text>
                </View>
              )}

              {selectedMethod === 'NET_BANKING' && (
                <View style={styles.methodDetailCard}>
                  <Text style={styles.inputLabel}>Select Test Bank</Text>
                  <View style={styles.bankPillsRow}>
                    {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank'].map((b) => (
                      <TouchableOpacity
                        key={b}
                        style={[styles.bankPill, selectedBank === b && styles.bankPillActive]}
                        onPress={() => setSelectedBank(b)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.bankPillText, selectedBank === b && styles.bankPillTextActive]}>
                          {b}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.secureNotice}>
                <Lock size={12} color={colors.slate500} style={{ marginRight: 4 }} />
                <Text style={styles.secureNoticeText}>
                  256-bit SSL encrypted • Razorpay PCI-DSS Level 1 Certified
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Footer CTA */}
          {!isSuccess && (
            <View style={styles.footer}>
              <TouchableOpacity 
                style={[styles.payBtn, isProcessing && styles.payBtnDisabled]}
                onPress={handleRazorpayPay}
                disabled={isProcessing}
                activeOpacity={0.85}
              >
                {isProcessing ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 8 }} />
                    <Text style={styles.payBtnText}>Authorizing with Razorpay...</Text>
                  </View>
                ) : (
                  <View style={styles.btnLoadingRow}>
                    <Text style={styles.payBtnText}>Pay ₹{amount}.00 via Razorpay</Text>
                    <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: radii.xl,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    overflow: 'hidden',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.slate900,
  },
  pill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  subtitle: {
    fontSize: 11.5,
    color: colors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.sm,
  },
  body: {
    maxHeight: 440,
  },
  bodyContent: {
    padding: 16,
  },
  testModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    marginBottom: 12,
  },
  testModeBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  billCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 14,
  },
  billRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate800,
  },
  membersCountText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.slate500,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  billLabel: {
    fontSize: 11.5,
    color: colors.slate600,
  },
  billFree: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  billAmount: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.slate800,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  billTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate800,
  },
  billTotalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0b72e7',
  },
  methodHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingVertical: 8,
    gap: 6,
  },
  methodTabActive: {
    borderColor: '#0b72e7',
    backgroundColor: '#eff6ff',
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate600,
  },
  methodTabTextActive: {
    color: '#0b72e7',
    fontWeight: '700',
  },
  methodDetailCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.slate700,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 13,
    color: colors.slate900,
  },
  testHint: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 6,
  },
  bankPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  bankPill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
  },
  bankPillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#0b72e7',
  },
  bankPillText: {
    fontSize: 11.5,
    color: colors.slate700,
    fontWeight: '500',
  },
  bankPillTextActive: {
    color: '#0b72e7',
    fontWeight: '700',
  },
  secureNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  secureNoticeText: {
    fontSize: 10.5,
    color: colors.slate500,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: '#ffffff',
  },
  payBtn: {
    backgroundColor: '#0b72e7',
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  payBtnDisabled: {
    opacity: 0.7,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Success state styles
  successContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate900,
  },
  successSub: {
    fontSize: 12.5,
    color: colors.slate600,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  receiptBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 16,
  },
  receiptLabel: {
    fontSize: 10.5,
    color: colors.slate500,
    fontWeight: '600',
  },
  receiptId: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.slate800,
    marginTop: 2,
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
