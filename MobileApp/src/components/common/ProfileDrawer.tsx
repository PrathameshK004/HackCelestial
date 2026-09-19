/**
 * Profile Side Drawer (Mobile Hamburger Menu)
 * 100% Visual Parity with WebApp mobile side drawer & user screenshot
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import {
  X,
  User,
  CreditCard,
  Heart,
  ShieldCheck,
  CircleHelp,
  Info,
  LogOut,
  Palmtree,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.82, 330);

interface ProfileDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectOption?: (key: string) => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  visible,
  onClose,
  onSelectOption,
}) => {
  const { user, logout } = useAuth();
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#FFFFFF', true);
      StatusBar.setBarStyle('dark-content', true);
    }
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const displayName = user?.name || 'Yogesh Dandawalkar';
  const displayEmail = user?.emailId || 'yogeshdand04@gmail.com';
  const displayInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'YD';

  const menuItems = [
    {
      key: 'profile',
      title: 'My Profile',
      subtitle: 'Personal & travel identity',
      icon: User,
    },
    {
      key: 'payments',
      title: 'Payments',
      subtitle: 'UPI VPAs & settlement history',
      icon: CreditCard,
    },
    {
      key: 'saved',
      title: 'Saved trips',
      subtitle: '2 saved destinations',
      icon: Heart,
    },
    {
      key: 'security',
      title: 'Security & Setting',
      subtitle: 'Password, 2FA & devices',
      icon: ShieldCheck,
    },
    {
      key: 'help',
      title: 'Help & Support',
      subtitle: 'FAQs & support guides',
      icon: CircleHelp,
    },
    {
      key: 'about',
      title: 'About Triptual',
      subtitle: 'Algorithm, security & mission',
      icon: Info,
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <View style={styles.modalOverlay}>
        {/* Dimmed Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Sliding Drawer Container */}
        <Animated.View
          style={[
            styles.drawerContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Header: Brand + Close Button */}
              <View style={styles.drawerHeader}>
                <View style={styles.brandRow}>
                  <View style={styles.brandLogoCircle}>
                    <Palmtree size={18} color="#464B29" strokeWidth={2.4} />
                  </View>
                  <Text style={styles.brandText}>Triptual</Text>
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={handleClose}
                  activeOpacity={0.7}
                  accessibilityLabel="Close menu"
                >
                  <X size={16} color="#4B5563" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              {/* User Mini Card */}
              <View style={styles.userCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{displayInitials}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                </View>
              </View>

              {/* 6 Navigation Options */}
              <View style={styles.menuList}>
                {menuItems.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.menuItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        handleClose();
                        onSelectOption?.(item.key);
                      }}
                    >
                      <View style={styles.menuIconBadge}>
                        <IconComp size={16} color="#2D3227" strokeWidth={2} />
                      </View>
                      <View style={styles.menuTextCol}>
                        <Text style={styles.menuTitle}>{item.title}</Text>
                        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Logout Option */}
              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                activeOpacity={0.7}
                onPress={async () => {
                  handleClose();
                  await logout();
                }}
              >
                <View style={styles.logoutIconBadge}>
                  <LogOut size={16} color="#E11D48" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.logoutTitle}>Logout</Text>
                  <Text style={styles.menuSubtitle}>
                    End active session securely
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(12, 16, 8, 0.6)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 25,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 36,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#E8E1D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1F16',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3EFEA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAE5DE',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAF7F2',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F2EDE5',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#464B29',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#1A1F16',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.2,
  },
  userEmail: {
    fontSize: 11.5,
    color: '#71717A',
    marginTop: 2,
  },
  menuList: {
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  menuIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3EFEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1A1F16',
    letterSpacing: -0.1,
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECE7DF',
    marginVertical: 12,
    marginHorizontal: 4,
  },
  logoutItem: {
    marginTop: 2,
  },
  logoutIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#E11D48',
    letterSpacing: -0.1,
  },
});
