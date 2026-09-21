import React from 'react';
import { getIllustrationById } from '../constants/illustrations';

interface IllustrationAvatarProps {
  avatar?: string | null;
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const IllustrationAvatar: React.FC<IllustrationAvatarProps> = ({
  avatar,
  name,
  size = 64,
  className = '',
  style = {},
  onClick,
}) => {
  const isIllustration = Boolean(avatar && avatar.startsWith('ill_'));
  const isHttpOrLocalImage = Boolean(
    avatar &&
      (avatar.startsWith('http://') ||
        avatar.startsWith('https://') ||
        avatar.startsWith('data:image') ||
        avatar.startsWith('/illustrations/'))
  );
  const isEmoji = Boolean(avatar && !isIllustration && !isHttpOrLocalImage && avatar.length <= 4);

  const illustration = isIllustration ? getIllustrationById(avatar) : undefined;
  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : '?';

  // 1. Google-Style Real Generated Illustration
  if (illustration) {
    return (
      <img
        src={illustration.imageUrl}
        alt={illustration.name}
        onClick={onClick}
        className={`illustration-avatar ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          cursor: onClick ? 'pointer' : 'default',
          flexShrink: 0,
          ...style,
        }}
        title={illustration.name}
      />
    );
  }

  // 2. HTTP / Local Image URL
  if (isHttpOrLocalImage && avatar) {
    return (
      <img
        src={avatar}
        alt={name || 'Avatar'}
        onClick={onClick}
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          cursor: onClick ? 'pointer' : 'default',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  // 3. Emoji
  if (isEmoji && avatar) {
    return (
      <div
        onClick={onClick}
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: '#ecfdf5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${Math.round(size * 0.5)}px`,
          cursor: onClick ? 'pointer' : 'default',
          flexShrink: 0,
          ...style,
        }}
      >
        {avatar}
      </div>
    );
  }

  // 4. Initial Fallback
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(size * 0.4)}px`,
        fontWeight: 700,
        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
        ...style,
      }}
    >
      {initial}
    </div>
  );
};
