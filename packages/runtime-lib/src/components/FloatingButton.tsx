/**
 * The floating "UX Audit" button that hovers over the host app.
 *
 * - Idle state: a dark pill in the bottom-right reading "UX Audit"
 *   with a small target icon. Tap to enter annotation mode.
 * - Active state: turns red, swaps to a "×" + "Tap an element" hint.
 *   Tap again to leave annotation mode.
 *
 * The pill (rather than a bare icon circle) makes the tool
 * self-explanatory — a reviewer who has never seen it knows what it
 * is at a glance.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useArchLens } from "../state/context";
import { colors, radius, shadow, layers } from "../theme";

export function FloatingButton(): React.ReactElement {
  const { isAnnotating, toggleAnnotating } = useArchLens();

  return (
    <Pressable
      onPress={toggleAnnotating}
      accessibilityRole="button"
      accessibilityLabel={
        isAnnotating
          ? "Exit UX Audit annotation mode"
          : "Start a UX Audit — tap to annotate elements"
      }
      style={({ pressed }) => [
        styles.button,
        isAnnotating ? styles.active : styles.idle,
        pressed && styles.pressed,
      ]}
    >
      {isAnnotating ? (
        <>
          <Text style={styles.icon}>×</Text>
          <Text style={styles.label} numberOfLines={1}>
            Tap an element
          </Text>
        </>
      ) : (
        <>
          <View style={styles.target}>
            <View style={styles.targetDot} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            UX Audit
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Absolutely positioned over the host app; zIndex + elevation keep
  // it above app content on both platforms.
  button: {
    position: "absolute",
    right: 20,
    bottom: 40,
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: layers.fab,
    ...shadow.float,
  },
  idle: { backgroundColor: colors.ink },
  active: { backgroundColor: colors.danger, paddingHorizontal: 20 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },

  // Idle "target" glyph — a ring with a center dot, reads as a
  // crosshair / inspector cursor.
  target: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  targetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },

  icon: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24,
    marginRight: 8,
  },
  label: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
