/**
 * ListRow — a leading icon + title/subtitle + trailing accessory row.
 *
 * The bread-and-butter list item used for activity feeds and menus.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing } from "./theme";

export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  trailing?: string;
  onPress?: () => void;
}): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  pressed: { opacity: 0.6 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 18 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600", color: palette.ink },
  subtitle: { fontSize: 13, color: palette.muted, marginTop: 2 },
  trailing: { fontSize: 14, fontWeight: "700", color: palette.inkSoft },
});
