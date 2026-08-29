import React from 'react';

interface TriptualLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
}

export const TriptualLogo: React.FC<TriptualLogoProps> = ({
  size = 32,
  showText = true,
  className = '',
  variant = 'dark'
}) => {
  return (
    <div
      className={`triptual-brand-wrap ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      <img
        src="/triptual-logo.png"
        alt="Triptual Emblem"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '9999px',
          objectFit: 'cover',
          boxShadow: '0 2px 8px rgba(46, 51, 27, 0.15)',
          border: '1.5px solid rgba(229, 236, 104, 0.5)',
          flexShrink: 0
        }}
      />
      {showText && (
        <span
          className="triptual-logo-text"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: size > 32 ? '1.8rem' : '1.6rem',
            fontWeight: 600,
            color: variant === 'light' ? '#FFFFFF' : 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1
          }}
        >
          Triptual
        </span>
      )}
    </div>
  );
};
