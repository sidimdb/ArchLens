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
  primary: "#3B82F6",
  primaryDark: "#2563EB",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#EF4444",
  accent: "#8B5CF6",
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
