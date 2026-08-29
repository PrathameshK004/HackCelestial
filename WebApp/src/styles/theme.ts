/**
 * Triptual Global UI & Design System Configuration
 * Centralized theme constants for colors, typography scales, layout, and component standards.
 */

export const THEME = {
  // Brand Color Palette
  colors: {
    // Primary Brand
    brandOlive: '#2E331B',
    brandOliveMedium: '#3A4023',
    brandOliveLight: '#464B29',
    brandOliveSubtle: 'rgba(46, 51, 27, 0.08)',

    // Radiant Accent & Sun Highlights
    accentChartreuse: '#E5EC68',
    accentGold: '#D4AF37',
    accentChartreuseSubtle: 'rgba(229, 236, 104, 0.18)',

    // Backgrounds & Canvas
    bgApp: '#FAF8F5',
    bgSurface: '#FFFFFF',
    bgSurfaceWarm: '#F5F3EF',
    bgSurfaceSubtle: '#EDEAE4',

    // Text & Content
    textPrimary: '#1E2614',
    textSecondary: '#4A5240',
    textMuted: '#7D8471',
    textWhite: '#FFFFFF',

    // Status & Feedback
    emerald: '#10B981',
    emeraldSubtle: 'rgba(16, 185, 129, 0.12)',
    rose: '#E11D48',
    roseSubtle: 'rgba(225, 29, 72, 0.12)',
    amber: '#F59E0B',
    amberSubtle: 'rgba(245, 158, 11, 0.14)',

    // Borders
    borderLight: 'rgba(46, 51, 27, 0.08)',
    borderCard: 'rgba(46, 51, 27, 0.14)',
    borderActive: '#2E331B'
  },

  // Typography Scales (Compact, clean & refined)
  typography: {
    fonts: {
      serif: 'Playfair Display, Georgia, serif',
      sans: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif'
    },
    sizes: {
      heroTitle: '1.6rem',
      pageTitle: '1.35rem',
      sectionTitle: '1.05rem',
      cardTitle: '0.95rem',
      body: '0.82rem',
      subText: '0.74rem',
      caption: '0.70rem',
      micro: '0.66rem'
    },
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },

  // Layout Constraints
  layout: {
    pageMaxWidth: '680px',
    dashboardMaxWidth: '1180px',
    cardPadding: '16px 14px',
    gap: '14px',
    headerMarginBottom: '18px'
  },

  // Border Radii
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px'
  },

  // Icon Standard Sizes
  icons: {
    nav: 18,
    tab: 20,
    headerBack: 18,
    action: 15,
    pill: 12,
    badge: 11
  }
} as const;

export type ThemeConfig = typeof THEME;
