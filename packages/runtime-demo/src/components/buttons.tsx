/**
 * Button family for the FitTrack demo.
 *
 * A range of shapes/sizes on purpose — primary, secondary, round icon
 * — so the UX audit has varied touch targets to inspect and annotate
 * (including a couple that are intentionally a little small).
 */

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { palette, radii, spacing } from "./theme";

export function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  glyph,
  onPress,
  tone = "neutral",
}: {
  glyph: string;
  onPress?: () => void;
  tone?: "neutral" | "primary";
}): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.icon,
        tone === "primary" && styles.iconPrimary,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.iconGlyph, tone === "primary" && styles.iconGlyphPrimary]}
      >
        {glyph}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: palette.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: palette.white, fontSize: 15, fontWeight: "700" },

  secondary: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: palette.primary,
  },
  secondaryText: { color: palette.primary, fontSize: 15, fontWeight: "700" },

  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surfaceAlt,
  },
  iconPrimary: { backgroundColor: palette.primary },
  iconGlyph: { fontSize: 18, color: palette.inkSoft },
  iconGlyphPrimary: { color: palette.white },

  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
