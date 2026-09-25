/**
 * Triptual Mobile Design System — Global Theme Tokens
 * ────────────────────────────────────────────────────
 * Single source of truth for card radius, background colors,
 * typography sizes, spacing, and layout tokens.
 *
 * All screens MUST import from this file to maintain visual consistency.
 * Reference: SecurityScreen.tsx (baseline design)
 */

import { colors } from "./colors";

// ── Background Colors ─────────────────────────────────────────────────────────
export const backgrounds = {
  /** Main screen / page background */
  screen: "#FDFEFE",
  /** Card / section surface */
  card: "#FFFFFF",
  /** Header background (matches screen) */
  header: "#FDFEFE",
  /** Input field background */
  input: "#F8FAFC",
  /** Modal overlay */
  overlay: "rgba(15, 23, 42, 0.65)",
  /** Modal card surface */
  modal: "#FFFFFF",
  /** Info box / highlight area */
  infoBox: "#ECFDF5",
  /** Danger / destructive action background */
  danger: "#FFE4E6",
  /** Enable confirmation icon bg */
  enableBg: "#ECFDF5",
  /** Disable confirmation icon bg */
  disableBg: "#FEF2F2",
} as const;

// ── Border Colors ─────────────────────────────────────────────────────────────
export const borders = {
  /** Default card border */
  card: colors.slate200,
  /** Header bottom divider */
  header: colors.slate200,
  /** Input field border */
  input: colors.slate200,
  /** Info box border */
  infoBox: colors.primary200,
  /** Active / focus border */
  active: colors.primary600,
} as const;

// ── Card / Container Radii ────────────────────────────────────────────────────
export const cardRadius = {
  /** Section card radius */
  card: 10,
  /** Modal card radius */
  modal: 14,
  /** Inner elements (inputs, badges, etc.) */
  inner: 10,
  /** Pill / badge shape */
  pill: 9999,
} as const;

// ── Typography Sizes ──────────────────────────────────────────────────────────
export const fontSize = {
  /** Screen header title */
  headerTitle: 16,
  /** Card / section title */
  sectionTitle: 14,
  /** Section subtitle / description */
  sectionSubtitle: 10.5,
  /** Input label (uppercase) */
  inputLabel: 11,
  /** Input text value */
  inputText: 13,
  /** Primary button text */
  buttonText: 13,
  /** Link text (e.g., "Forgot Password?") */
  linkText: 11.5,
  /** Badge label text */
  badgeText: 11,
  /** Info box body text */
  infoText: 11.5,
  /** Device name in session list */
  deviceName: 12.5,
  /** Device meta / secondary info */
  deviceMeta: 10.5,
  /** Destructive action button */
  dangerButton: 12,
  /** Modal title */
  modalTitle: 15,
  /** Modal subtitle / body */
  modalSubtitle: 12,
  /** Modal primary button */
  modalButton: 13,
  /** OTP digit input */
  otpDigit: 18,
  /** Confirmation modal title */
  confirmTitle: 15.5,
  /** Confirmation modal subtitle */
  confirmSubtitle: 12,
  /** Confirmation action buttons */
  confirmButton: 12,
  /** Small resend / timer text */
  caption: 12,
  /** Small badge inside device row */
  smallBadge: 10,
} as const;

// ── Font Weights ──────────────────────────────────────────────────────────────
export const fontWeight = {
  bold: "800" as const,
  semiBold: "700" as const,
  medium: "600" as const,
  regular: "400" as const,
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────────
export const spacing = {
  /** Screen horizontal padding */
  screenHorizontal: 20,
  /** Screen top padding */
  screenTop: 16,
  /** Screen bottom padding */
  screenBottom: 40,
  /** Header horizontal padding */
  headerHorizontal: 16,
  /** Header bottom padding */
  headerBottom: 12,
  /** Card internal padding */
  cardPadding: 18,
  /** Gap between cards / sections */
  cardGap: 16,
  /** Modal internal padding */
  modalPadding: 20,
  /** Gap between section title and content */
  sectionGap: 10,
  /** Input field height */
  inputHeight: 38,
  /** OTP box height */
  otpHeight: 42,
} as const;

// ── Screen Header Specification ─────────────────────────────────────────────
export const screenHeader = {
  height: 64,
  horizontalPadding: spacing.headerHorizontal,
  topPadding: 6,
  bottomPadding: spacing.headerBottom,
  backgroundColor: backgrounds.card,
  borderColor: borders.header,
  titleFontSize: 18,
  titleFontWeight: fontWeight.bold,
  titleColor: colors.slate900,
  titleLetterSpacing: -0.3,
} as const;

// ── Combined Theme Export ─────────────────────────────────────────────────────
export const theme = {
  backgrounds,
  borders,
  cardRadius,
  fontSize,
  fontWeight,
  spacing,
  screenHeader,
} as const;

export default theme;
