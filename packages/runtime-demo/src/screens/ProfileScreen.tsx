/**
 * Profile screen.
 *
 * Profile header, stat tiles, an editable details list, and account
 * actions — plenty to inspect.
 *
 * 🎯 Planted UX issue: the "Bio" card uses `#5a5a5a` text on a
 * `#4a4a4a` background. Contrast ratio is well below WCAG AA
 * (about 1.3:1) — effectively unreadable.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing } from "../components/theme";
import { Avatar, Card, Divider, Screen, SectionHeader } from "../components/ui";
import { PrimaryButton, SecondaryButton } from "../components/buttons";
import { StatCard } from "../components/StatCard";
import { ListRow } from "../components/ListRow";

export function ProfileScreen(): React.ReactElement {
  return (
    <Screen>
      {/* Profile header */}
      <View style={styles.header}>
        <Avatar initials="AL" size={72} />
        <Text style={styles.name}>Alex Lee</Text>
        <Text style={styles.handle}>@alexlee · Joined 2024</Text>
        <View style={styles.headerButtons}>
          <SecondaryButton label="Edit profile" />
          <PrimaryButton label="Share" />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statRow}>
        <StatCard value="128" label="Workouts" accent={palette.primary} />
        <StatCard value="42" label="Streak days" accent={palette.success} />
        <StatCard value="7" label="Badges" accent={palette.warning} />
      </View>

      {/* Bio — planted low-contrast issue */}
      <SectionHeader title="Bio" />
      <View style={styles.bioCard}>
        <Text style={styles.lowContrast}>
          Marathon runner and weekend cyclist. Chasing a sub-4-hour
          finish this season.
        </Text>
      </View>

      {/* Account details */}
      <SectionHeader title="Account" action="Manage" />
      <Card>
        <ListRow icon="📧" title="Email" subtitle="alex@example.com" trailing="›" />
        <Divider />
        <ListRow icon="📱" title="Phone" subtitle="+1 555 0134" trailing="›" />
        <Divider />
        <ListRow icon="🔒" title="Password" subtitle="Last changed 3 mo ago" trailing="›" />
      </Card>

      <View style={styles.signout}>
        <SecondaryButton label="Sign out" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.lg },
  name: { fontSize: 22, fontWeight: "800", color: palette.ink, marginTop: spacing.sm },
  handle: { fontSize: 13, color: palette.muted },
  headerButtons: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },

  statRow: { flexDirection: "row", gap: spacing.md },

  bioCard: {
    backgroundColor: "#4a4a4a",
    padding: spacing.lg,
    borderRadius: radii.md,
  },
  // 🎯 Dark gray on dark gray — planted contrast issue.
  lowContrast: { color: "#5a5a5a", fontSize: 14, lineHeight: 20 },

  signout: { marginTop: spacing.xl },
});
