/**
 * Settings screen.
 *
 * Mixes properly-grouped setting cards with one deliberately bad
 * section so a reviewer can compare them side by side.
 *
 * 🎯 Planted UX issue: the "Notifications" rows separate each label
 * from its toggle by the full screen width with no card, divider, or
 * grouping — it's not clear which switch controls which label.
 */

import React, { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { palette, spacing } from "../components/theme";
import { Card, Divider, Screen, SectionHeader } from "../components/ui";
import { SecondaryButton } from "../components/buttons";
import { ListRow } from "../components/ListRow";

export function SettingsScreen(): React.ReactElement {
  const [push, setPush] = useState<boolean>(false);
  const [email, setEmail] = useState<boolean>(true);
  const [marketing, setMarketing] = useState<boolean>(false);
  const [dark, setDark] = useState<boolean>(false);
  const [haptics, setHaptics] = useState<boolean>(true);

  return (
    <Screen>
      <Text style={styles.title}>Settings</Text>

      {/* Properly grouped account section */}
      <SectionHeader title="Account" />
      <Card>
        <ListRow icon="👤" title="Edit profile" trailing="›" />
        <Divider />
        <ListRow icon="🔒" title="Privacy & security" trailing="›" />
        <Divider />
        <ListRow icon="💳" title="Subscription" subtitle="Free plan" trailing="›" />
      </Card>

      {/* 🎯 Planted issue: ungrouped, wide-gap toggle rows */}
      <SectionHeader title="Notifications" />
      <View style={styles.badRow}>
        <Text style={styles.badLabel}>Push notifications</Text>
        <Switch value={push} onValueChange={setPush} />
      </View>
      <View style={styles.badRow}>
        <Text style={styles.badLabel}>Email updates</Text>
        <Switch value={email} onValueChange={setEmail} />
      </View>
      <View style={styles.badRow}>
        <Text style={styles.badLabel}>Marketing emails</Text>
        <Switch value={marketing} onValueChange={setMarketing} />
      </View>

      {/* Properly grouped preferences with the same control type */}
      <SectionHeader title="Preferences" />
      <Card>
        <View style={styles.goodRow}>
          <Text style={styles.goodLabel}>Dark mode</Text>
          <Switch value={dark} onValueChange={setDark} />
        </View>
        <Divider />
        <View style={styles.goodRow}>
          <Text style={styles.goodLabel}>Haptic feedback</Text>
          <Switch value={haptics} onValueChange={setHaptics} />
        </View>
      </Card>

      <View style={styles.danger}>
        <SecondaryButton label="Delete account" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800", color: palette.ink, marginBottom: spacing.xs },

  // 🎯 Wide gap, no card / no divider — the planted issue.
  badRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  badLabel: { fontSize: 14, color: "#222" },

  goodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  goodLabel: { fontSize: 15, fontWeight: "600", color: palette.ink },

  danger: { marginTop: spacing.xl },
});
