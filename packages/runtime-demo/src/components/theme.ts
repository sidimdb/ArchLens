/**
 * Demo design tokens.
 *
 * Centralizing colors / spacing keeps the FitTrack demo looking like a
 * real, cohesive product — which makes the UX-audit walkthrough more
 * convincing than five differently-styled screens.
 */

export const palette = {
  bg: "#F4F6FA",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF2F9",
  ink: "#0F172A",
  inkSoft: "#475569",
  muted: "#94A3B8",
  border: "#E2E8F0",
  // Monochrome primary — same dark slate as `ink`. Picking a near-
  // black instead of a saturated brand color keeps the demo looking
  // editorial / black-and-white instead of generic-SaaS-blue.
  primary: "#0F172A",
  primaryDark: "#000000",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#EF4444",
  // `accent` is still used by a couple of QuickAction tiles to keep
  // the grid from being totally monochrome. Set to the dark ink too
  // so the app stays in black/white territory.
  accent: "#0F172A",
  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const shadow = {
  card: {
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
} as const;
