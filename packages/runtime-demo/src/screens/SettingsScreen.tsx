/**
 * Settings screen.
 *
 * 🎯 Planted UX issue: each row separates its label from its toggle
 * by 80% of the screen width with no visual grouping (no row
 * background, no divider). It's not immediately clear which switch
 * controls which label.
 */

import React, { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

export function SettingsScreen(): React.ReactElement {
  const [push, setPush] = useState<boolean>(false);
  const [email, setEmail] = useState<boolean>(true);
  const [marketing, setMarketing] = useState<boolean>(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Push notifications</Text>
        <Switch value={push} onValueChange={setPush} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Email updates</Text>
        <Switch value={email} onValueChange={setEmail} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Marketing emails</Text>
        <Switch value={marketing} onValueChange={setMarketing} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24, color: "#111" },

  // Wide gap between label and switch, no card / no divider — the
  // planted UX issue. Reviewer should call out the lack of grouping.
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  label: {
    fontSize: 14,
    color: "#222",
  },
});
