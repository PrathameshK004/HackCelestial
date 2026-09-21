/**
 * Top App Header — Clean minimal layout matching reference image
 * Left: circular profile avatar | Center: pill search bar | Right: Inbox icon
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Search, Inbox } from 'lucide-react-native';
import { colors, radii } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { IllustrationAvatar } from './IllustrationAvatar';

interface HeaderProps {
  onPressProfile?: () => void;
  onPressNotifications?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onPressProfile,
  onPressNotifications,
  searchQuery = '',
  onSearchChange,
  unreadCount = 0,
}) => {
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const displayName = user?.name || user?.username || 'Yogesh Dandawalkar';

  return (
    <View style={styles.container}>
      {/* Left: Circular profile avatar */}
      <TouchableOpacity
        style={styles.avatarBtn}
        onPress={onPressProfile}
        activeOpacity={0.85}
        accessibilityLabel="Open profile menu"
      >
        <IllustrationAvatar
          avatar={user?.avatar}
          name={displayName}
          size={40}
          backgroundColor={user?.avatarBg || '#464B29'}
          style={styles.avatarCircle}
        />
      </TouchableOpacity>

      {/* Center: Pill search bar */}
      <TouchableOpacity
        style={styles.searchPill}
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
      >
        <Search
          size={16}
          color="#9CA3AF"
          strokeWidth={2.2}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search trips, expenses, places…"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </TouchableOpacity>

      {/* Right: Inbox icon (no circle background — bare icon like reference) */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onPressNotifications}
        activeOpacity={0.7}
        accessibilityLabel="Inbox & Notifications"
      >
        <Inbox size={22} color="#374151" strokeWidth={1.8} />
        {unreadCount > 0 && <View style={styles.inboxDot} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarBtn: {
    flexShrink: 0,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  searchPill: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 999,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
    margin: 0,
    height: Platform.OS === 'android' ? 42 : undefined,
    fontWeight: '400',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  inboxDot: {
    position: 'absolute',
    top: 4,
    right: 3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0969DA',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
