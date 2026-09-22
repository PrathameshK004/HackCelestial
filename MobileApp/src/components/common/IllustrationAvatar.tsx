import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Camera as CameraIcon } from 'lucide-react-native';
import { getIllustrationById, getIllustrationAsset } from '../../constants/illustrations';
import { colors } from '../../theme/colors';
import { SERVER_BASE } from '../../api/apiClient';

interface IllustrationAvatarProps {
  avatar?: string | null;
  name?: string;
  size?: number;
  showEditBadge?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  backgroundColor?: string;
}

export const IllustrationAvatar: React.FC<IllustrationAvatarProps> = ({
  avatar,
  name,
  size = 76,
  showEditBadge = false,
  onPress,
  style,
  textStyle,
  backgroundColor,
}) => {
  const isIllustration = Boolean(avatar && avatar.startsWith('ill_'));
  const isHttpImage = Boolean(
    avatar &&
      (avatar.startsWith('http://') ||
        avatar.startsWith('https://') ||
        avatar.startsWith('data:image') ||
        avatar.startsWith('/illustrations/'))
  );
  const isEmoji = Boolean(avatar && !isIllustration && !isHttpImage && avatar.length <= 4);

  const illustrationAsset = isIllustration ? getIllustrationAsset(avatar) : null;
  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : '?';

  const radius = size / 2;
  const fontSize = Math.round(size * 0.38);

  const renderContent = () => {
    // 1. Google-Style Real Illustration Asset
    if (isIllustration && illustrationAsset) {
      return (
        <View
          style={[
            styles.illustrationWrap,
            {
              width: size,
              height: size,
              borderRadius: radius,
            },
          ]}
        >
          <Image
            source={illustrationAsset}
            style={{ width: size, height: size, borderRadius: radius }}
            resizeMode="cover"
          />
        </View>
      );
    }

    // 2. HTTP / Data URL / Server Image
    if (isHttpImage && avatar) {
      const uri = avatar.startsWith('/illustrations/') || avatar.startsWith('/')
        ? `${SERVER_BASE}${avatar}`
        : avatar;

      return (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: radius }}
          resizeMode="cover"
        />
      );
    }

    // 3. Emoji Avatar
    if (isEmoji && avatar) {
      return (
        <View
          style={[
            styles.initialWrap,
            {
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: backgroundColor || colors.primary50,
            },
          ]}
        >
          <Text style={{ fontSize: Math.round(size * 0.5) }}>{avatar}</Text>
        </View>
      );
    }

    // 4. Elegant Initial Fallback
    return (
      <View
        style={[
          styles.initialWrap,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: backgroundColor || colors.primary600,
          },
        ]}
      >
        <Text
          style={[
            styles.initialText,
            { fontSize },
            textStyle,
          ]}
        >
          {initial}
        </Text>
      </View>
    );
  };

  const ContainerComponent = onPress ? TouchableOpacity : View;

  return (
    <ContainerComponent
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={[styles.container, { width: size, height: size }, style]}
    >
      {renderContent()}

      {/* Camera / Edit Badge for Google-like avatar changing */}
      {showEditBadge && (
        <View
          style={[
            styles.editBadge,
            {
              width: Math.max(24, Math.round(size * 0.32)),
              height: Math.max(24, Math.round(size * 0.32)),
              borderRadius: Math.max(24, Math.round(size * 0.32)) / 2,
            },
          ]}
        >
          <CameraIcon size={Math.round(size * 0.16)} color="#FFFFFF" strokeWidth={2.4} />
        </View>
      )}
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    backgroundColor: '#1E293B',
  },
  initialWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  initialText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
