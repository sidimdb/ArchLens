/**
 * Notifications screen.
 *
 * 🎯 Planted UX issue: the notifications list is empty, but the
 * screen renders nothing in that case — no empty state illustration,
 * no "you're all caught up" message. The user can't tell if it's
 * loading, broken, or genuinely empty.
 */

import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

interface Notification {
  id: string;
  title: string;
  body: string;
}

export function NotificationsScreen(): React.ReactElement {
  // Deliberately empty — the planted issue is the missing empty state.
  const notifications: Notification[] = [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemBody}>{item.body}</Text>
          </View>
        )}
        // No ListEmptyComponent — that's the planted issue.
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16, color: "#111" },

  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemTitle: { fontSize: 16, fontWeight: "600", color: "#111" },
  itemBody: { fontSize: 14, color: "#555", marginTop: 4 },
});
