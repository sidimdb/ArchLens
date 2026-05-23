/**
 * StatCard — a single metric tile (value + label + trend).
 *
 * Used in rows of three on the dashboard. A good traversal example:
 * tapping the big number selects the <Text>, stepping up selects the
 * <StatCard>, up again the stats row, then the screen.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, radii, shadow, spacing } from "./theme";

export function StatCard({
  value,
  label,
  trend,
  accent = palette.primary,
}: {
  value: string;
  label: string;
  trend?: string;
  accent?: string;
}): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={[styles.accentDot, { backgroundColor: accent }]} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {trend ? <Text style={[styles.trend, { color: accent }]}>{trend}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow.card,
  },
  accentDot: { width: 10, height: 10, borderRadius: 5, marginBottom: spacing.sm },
  value: { fontSize: 22, fontWeight: "800", color: palette.ink },
  label: { fontSize: 12, color: palette.muted, marginTop: 2 },
  trend: { fontSize: 12, fontWeight: "700", marginTop: spacing.xs },
});
