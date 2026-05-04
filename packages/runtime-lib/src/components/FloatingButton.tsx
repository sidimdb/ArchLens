/**
 * The floating "annotation" button that hovers over the host app.
 *
 * - Idle state: dark circular FAB in the bottom-right with a small
 *   pencil icon. Tap to enter annotation mode.
 * - Active state: turns red, expands to show a hint text "Tap any
 *   element to annotate". Tap again to leave annotation mode.
 *
 * In Phase 1 this is purely a visual toggle. Phase 2 hooks the
 * "active state" up to a screen-wide overlay that captures taps
 * and identifies the underlying component.
 */

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useArchLens } from "../state/context";

export function FloatingButton(): React.ReactElement {
  const { isAnnotating, toggleAnnotating } = useArchLens();

  return (
    <Pressable
      onPress={toggleAnnotating}
      accessibilityRole="button"
      accessibilityLabel={
        isAnnotating
          ? "Exit ArchLens annotation mode"
          : "Enter ArchLens annotation mode"
      }
      style={({ pressed }) => [
        styles.button,
        isAnnotating ? styles.active : styles.idle,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.icon}>{isAnnotating ? "×" : "✎"}</Text>
      {isAnnotating ? (
        <Text style={styles.hint} numberOfLines={1}>
          Tap any element to annotate
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The FAB is absolutely positioned over the host app. zIndex +
  // elevation make sure it stays above app content on both platforms.
  button: {
    position: "absolute",
    right: 20,
    bottom: 40,
    minWidth: 56,
    minHeight: 56,
    borderRadius: 28,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 9999,
  },
  idle: {
    backgroundColor: "#1a1a1a",
  },
  active: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 20,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  icon: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24,
  },
  hint: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 10,
  },
});
