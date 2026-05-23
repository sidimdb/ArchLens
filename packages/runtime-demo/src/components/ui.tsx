/**
 * Small reusable UI primitives for the FitTrack demo.
 *
 * Keeping these as named PascalCase components (rather than inline
 * JSX) is deliberate: when the ArchLens inspector walks the hierarchy
 * it surfaces real names like <Card> / <SectionHeader> and their
 * source files, and gives the parent/child traversal meaningful rungs
 * to step through.
 */

import React, { type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, radii, shadow, spacing } from "./theme";

export function Screen({ children }: { children: ReactNode }): React.ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onActionPress,
}: {
  title: string;
  action?: string;
  onActionPress?: () => void;
}): React.ReactElement {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Text style={styles.sectionAction} onPress={onActionPress}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}): React.ReactElement {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Divider(): React.ReactElement {
  return <View style={styles.divider} />;
}

export function Chip({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}): React.ReactElement {
  return (
    <View style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </View>
  );
}

export function Badge({
  count,
  tone = "primary",
}: {
  count: number | string;
  tone?: "primary" | "danger" | "success";
}): React.ReactElement {
  const bg =
    tone === "danger"
      ? palette.danger
      : tone === "success"
      ? palette.success
      : palette.primary;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  );
}

export function Avatar({
  initials,
  size = 44,
  color = palette.primary,
}: {
  initials: string;
  size?: number;
  color?: string;
}): React.ReactElement {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
        {initials}
      </Text>
    </View>
  );
}

export function ProgressBar({
  percent,
  color = palette.primary,
}: {
  percent: number;
  color?: string;
}): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.progressTrack}>
      <View
        style={[styles.progressFill, { width: `${clamped}%`, backgroundColor: color }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 3 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: palette.ink },
  sectionAction: { fontSize: 14, fontWeight: "600", color: palette.primary },

  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow.card,
  },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: spacing.md },

  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceAlt,
  },
  chipActive: { backgroundColor: palette.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: palette.inkSoft },
  chipTextActive: { color: palette.white },

  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: palette.white, fontSize: 12, fontWeight: "800" },

  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: palette.white, fontWeight: "800" },

  progressTrack: {
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceAlt,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: radii.pill },
});
