/**
 * Home / Dashboard screen.
 *
 * A realistic fitness dashboard: greeting header, goal progress, stat
 * tiles, a quick-action grid, a promo banner, and a recent-activity
 * list. Lots of nested, varied, tappable elements — ideal for
 * exercising the UX-audit inspector (deep parent/child traversal,
 * component+source identification, category tagging).
 *
 * 🎯 Planted UX issue: the promo banner's "Upgrade" button is 70×16 px,
 * far below the 44×44 minimum touch target.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { palette, radii, spacing } from "../components/theme";
import {
  Avatar,
  Card,
  Divider,
  ProgressBar,
  Screen,
  SectionHeader,
} from "../components/ui";
import { IconButton, PrimaryButton } from "../components/buttons";
import { StatCard } from "../components/StatCard";
import { QuickAction } from "../components/QuickAction";
import { ListRow } from "../components/ListRow";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

export function HomeScreen(): React.ReactElement {
  const nav = useNavigation<Nav>();

  return (
    <Screen>
      {/* Greeting header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar initials="AL" />
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name}>Alex Lee</Text>
          </View>
        </View>
        <IconButton glyph="⚙" onPress={() => nav.navigate("Settings")} />
      </View>

      {/* Today's goal */}
      <Card style={styles.goalCard}>
        <View style={styles.goalTop}>
          <Text style={styles.goalLabel}>Today's goal</Text>
          <Text style={styles.goalPct}>68%</Text>
        </View>
        <Text style={styles.goalSteps}>6,840 / 10,000 steps</Text>
        <View style={styles.goalBar}>
          <ProgressBar percent={68} />
        </View>
        <PrimaryButton label="Log a workout" onPress={() => nav.navigate("Profile")} />
      </Card>

      {/* Stats */}
      <SectionHeader title="This week" action="Details" onActionPress={() => nav.navigate("Profile")} />
      <View style={styles.statRow}>
        <StatCard value="48.2k" label="Steps" trend="▲ 12%" accent={palette.primary} />
        <StatCard value="3,120" label="Calories" trend="▲ 4%" accent={palette.warning} />
        <StatCard value="312" label="Active min" trend="▼ 2%" accent={palette.accent} />
      </View>

      {/* Quick actions */}
      <SectionHeader title="Quick actions" />
      <View style={styles.actionGrid}>
        <QuickAction icon="🏃" label="Start run" accent={palette.primary} />
        <QuickAction icon="🍎" label="Log meal" accent={palette.success} />
        <QuickAction icon="💧" label="Add water" accent={palette.primaryDark} />
        <QuickAction icon="😴" label="Sleep" accent={palette.accent} />
      </View>

      {/* Promo banner — contains the planted tiny-button issue */}
      <View style={styles.promo}>
        <View style={styles.promoBody}>
          <Text style={styles.promoTitle}>Go Premium</Text>
          <Text style={styles.promoText}>
            Unlock advanced insights and custom plans.
          </Text>
        </View>
        {/* 🎯 Tiny touch target — planted issue */}
        <Pressable style={styles.tinyBtn} onPress={() => nav.navigate("About")}>
          <Text style={styles.tinyBtnText}>Upgrade</Text>
        </Pressable>
      </View>

      {/* Recent activity */}
      <SectionHeader title="Recent activity" action="See all" onActionPress={() => nav.navigate("Notifications")} />
      <Card>
        <ListRow icon="🏃" title="Morning Run" subtitle="5.2 km · 28 min" trailing="320 cal" />
        <Divider />
        <ListRow icon="🚴" title="Evening Ride" subtitle="12 km · 42 min" trailing="410 cal" />
        <Divider />
        <ListRow icon="🧘" title="Yoga" subtitle="Flexibility · 20 min" trailing="95 cal" />
      </Card>

      {/* Explore */}
      <SectionHeader title="Explore" />
      <Card>
        <ListRow icon="👤" title="Profile" subtitle="Your account & stats" trailing="›" onPress={() => nav.navigate("Profile")} />
        <Divider />
        <ListRow icon="🔔" title="Notifications" subtitle="Alerts & reminders" trailing="›" onPress={() => nav.navigate("Notifications")} />
        <Divider />
        <ListRow icon="ℹ️" title="About FitTrack" subtitle="Version & links" trailing="›" onPress={() => nav.navigate("About")} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  greeting: { fontSize: 13, color: palette.muted },
  name: { fontSize: 20, fontWeight: "800", color: palette.ink },

  goalCard: { gap: spacing.md },
  goalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalLabel: { fontSize: 14, fontWeight: "700", color: palette.inkSoft },
  goalPct: { fontSize: 20, fontWeight: "800", color: palette.primary },
  goalSteps: { fontSize: 13, color: palette.muted },
  goalBar: { marginBottom: spacing.sm },

  statRow: { flexDirection: "row", gap: spacing.md },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },

  promo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.ink,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  promoBody: { flex: 1, paddingRight: spacing.md },
  promoTitle: { fontSize: 16, fontWeight: "800", color: palette.white },
  promoText: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  // 🎯 Planted issue: far below the 44×44 minimum touch target.
  tinyBtn: {
    width: 70,
    height: 16,
    backgroundColor: palette.primary,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tinyBtnText: { color: palette.white, fontSize: 9, fontWeight: "700" },
});
