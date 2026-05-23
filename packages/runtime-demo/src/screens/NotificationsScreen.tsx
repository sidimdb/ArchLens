/**
 * Notifications screen.
 *
 * Header with filter chips and a "Mark all read" action, then the
 * notifications list.
 *
 * 🎯 Planted UX issue: the list is empty, but the screen renders
 * nothing in that case — no empty-state illustration, no "you're all
 * caught up" message. The user can't tell if it's loading, broken, or
 * genuinely empty.
 */

import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, spacing } from "../components/theme";
import { Chip } from "../components/ui";
import { SecondaryButton } from "../components/buttons";

interface Notification {
  id: string;
  title: string;
  body: string;
}

const FILTERS = ["All", "Unread", "Mentions"] as const;

export function NotificationsScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<string>("All");

  // Deliberately empty — the planted issue is the missing empty state.
  const notifications: Notification[] = [];

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <SecondaryButton label="Mark all read" />
      </View>

      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)}>
            <Chip label={f} active={filter === f} />
          </Pressable>
        ))}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemBody}>{item.body}</Text>
          </View>
        )}
        // 🎯 No ListEmptyComponent — that's the planted issue.
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 26, fontWeight: "800", color: palette.ink },

  chips: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },

  list: { gap: spacing.sm },
  row: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  itemTitle: { fontSize: 16, fontWeight: "600", color: palette.ink },
  itemBody: { fontSize: 14, color: palette.inkSoft, marginTop: 4 },
});
