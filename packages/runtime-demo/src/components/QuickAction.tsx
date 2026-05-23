/**
 * QuickAction — a square tile (icon + label) for the dashboard's
 * action grid. Tappable; comes in a couple of accent tones.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing } from "./theme";

export function QuickAction({
  icon,
  label,
  onPress,
  accent = palette.primary,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  accent?: string;
}): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent + "1A" }]}>
        <Text style={[styles.icon, { color: accent }]}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: "47%",
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "flex-start",
    gap: spacing.md,
  },
  pressed: { opacity: 0.85 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 20 },
  label: { fontSize: 14, fontWeight: "700", color: palette.ink },
});
