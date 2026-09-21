import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from 'expo-camera';
import {
  X,
  Zap,
  Camera,
  Keyboard,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react-native';
import { parseUpiQrString, ParsedUpiData } from '../../utils/upi.util';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.72, 280);

interface QrCameraScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (data: ParsedUpiData) => void;
}

export const QrCameraScannerModal: React.FC<QrCameraScannerModalProps> = ({
  visible,
  onClose,
  onScanSuccess,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Laser scan line animation
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (!permission || !permission.granted) {
        requestPermission();
      }
      setIsScanned(false);
      setManualInput('');
      setShowManualInput(false);

      // Start looping scan bar animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: SCAN_BOX_SIZE - 4,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
      setTorchEnabled(false);
    }
  }, [visible]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (isScanned || !result.data) return;
    setIsScanned(true);

    const parsed = parseUpiQrString(result.data);
    onScanSuccess(parsed);
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    setIsScanned(true);
    const parsed = parseUpiQrString(manualInput.trim());
    onScanSuccess(parsed);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        {/* Top Header Controls */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Scan UPI QR Code</Text>
            <Text style={styles.headerSubtitle}>
              PhonePe, GPay, Paytm, BharatPe
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.headerBtn, torchEnabled && styles.headerBtnActive]}
            onPress={() => setTorchEnabled((p) => !p)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Zap size={20} color={torchEnabled ? '#F59E0B' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        {/* Camera Viewfinder Area */}
        <View style={styles.cameraContainer}>
          {permission === null ? (
            <View style={styles.permissionFallback}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={[styles.permissionTitle, { fontSize: 15, marginTop: 12 }]}>
                Opening camera...
              </Text>
            </View>
          ) : permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={isScanned ? undefined : handleBarcodeScanned}
            />
          ) : (
            <View style={styles.permissionFallback}>
              <Camera size={48} color="#64748B" />
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionSub}>
                To scan vendor QR codes at counters or restaurants, grant camera permission.
              </Text>
              <TouchableOpacity
                style={styles.permissionBtn}
                onPress={requestPermission}
                activeOpacity={0.8}
              >
                <Text style={styles.permissionBtnText}>Enable Camera</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Mask Overlays around the scan box */}
          <View style={styles.overlayTop} />
          <View style={styles.overlayCenterRow}>
            <View style={styles.overlaySide} />
            <View style={styles.scanBox}>
              {/* 4 Corner brackets */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {/* Animated Laser Scanning Line */}
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [{ translateY: scanLineAnim }],
                  },
                ]}
              />

              <View style={styles.scanInstructionPill}>
                <Text style={styles.scanInstructionText}>
                  Align QR Code inside square
                </Text>
              </View>
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>

        {/* Bottom Control Panel */}
        <View style={styles.bottomPanel}>
          {showManualInput ? (
            <View style={styles.manualInputWrapper}>
              <Text style={styles.manualLabel}>
                Enter Payee UPI ID or Paste QR Text:
              </Text>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualInput}
                  placeholder="e.g. merchant@okhdfcbank"
                  placeholderTextColor="#94A3B8"
                  value={manualInput}
                  onChangeText={setManualInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.manualSubmitBtn,
                    !manualInput.trim() && styles.manualSubmitBtnDisabled,
                  ]}
                  onPress={handleManualSubmit}
                  disabled={!manualInput.trim()}
                >
                  <CheckCircle2 size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.switchModeBtn}
                onPress={() => setShowManualInput(false)}
              >
                <Text style={styles.switchModeText}>← Back to Camera View</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.optionsWrapper}>
              {/* Manual Entry Button */}
              <TouchableOpacity
                style={styles.manualEntryBtn}
                onPress={() => setShowManualInput(true)}
                activeOpacity={0.8}
              >
                <Keyboard size={18} color="#FFFFFF" />
                <Text style={styles.manualEntryBtnText}>
                  Type UPI ID Manually
                </Text>
              </TouchableOpacity>

              <View style={styles.securityTag}>
                <ShieldCheck size={13} color="#10B981" />
                <Text style={styles.securityTagText}>
                  Standard NPCI QR Scanner · Real-time verification
                </Text>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  permissionFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 9999,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Scan Box & Mask */
  overlayTop: {
    height: (SCREEN_HEIGHT - SCAN_BOX_SIZE - 200) / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  overlayCenterRow: {
    height: SCAN_BOX_SIZE,
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#10B981',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  scanLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2.5,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  scanInstructionPill: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  scanInstructionText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
  },

  /* Bottom Controls */
  bottomPanel: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  optionsWrapper: {
    gap: 14,
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#243E36',
    paddingVertical: 13,
    borderRadius: 14,
  },
  manualEntryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityTagText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  /* Manual Input Box */
  manualInputWrapper: {
    gap: 10,
  },
  manualLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  manualSubmitBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitBtnDisabled: {
    backgroundColor: '#334155',
  },
  switchModeBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  switchModeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
});
