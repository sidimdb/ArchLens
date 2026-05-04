/**
 * About screen.
 *
 * 🎯 Planted UX issue: the "Visit our website" line is tappable
 * (opens a URL) but it's styled identically to the surrounding body
 * text — no underline, no link color, no chevron. Users have no way
 * to know it's interactive without trying it.
 */

import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

export function AboutScreen(): React.ReactElement {
  const openSite = (): void => {
    void Linking.openURL("https://example.com");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>About</Text>

      <Text style={styles.body}>
        FitTrack v1.0 — your personal fitness companion. Track workouts,
        nutrition, and progress all in one place.
      </Text>

      {/* Tappable, but styled like plain body text — planted issue. */}
      <Pressable onPress={openSite}>
        <Text style={styles.body}>Visit our website for more info.</Text>
      </Pressable>

      <Text style={styles.body}>Version 1.0.0 · Build 2026.05</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16, color: "#111" },

  body: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
    marginBottom: 16,
  },
});
