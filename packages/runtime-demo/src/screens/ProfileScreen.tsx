/**
 * Profile screen.
 *
 * 🎯 Planted UX issue: the info card uses `#5a5a5a` text on a
 * `#4a4a4a` background. Contrast ratio is well below WCAG AA
 * (about 1.3:1). A reviewer would annotate this as unreadable.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function ProfileScreen(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.lowContrast}>Email: user@example.com</Text>
        <Text style={styles.lowContrast}>Name: John Doe</Text>
        <Text style={styles.lowContrast}>Member since: 2024</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16, color: "#111" },

  card: {
    backgroundColor: "#4a4a4a",
    padding: 20,
    borderRadius: 8,
  },
  // Dark gray on dark gray — planted contrast issue.
  lowContrast: {
    color: "#5a5a5a",
    fontSize: 14,
    marginBottom: 8,
  },
});
