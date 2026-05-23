/**
 * About screen.
 *
 * App identity, description, a properly-styled links list, and social
 * buttons.
 *
 * 🎯 Planted UX issue: the "Visit our website" line is tappable (opens
 * a URL) but is styled identically to the surrounding body text — no
 * underline, no link color, no chevron. Users can't tell it's
 * interactive. (Contrast it with the clearly-styled rows in the Links
 * card below.)
 */

import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing } from "../components/theme";
import { Card, Divider, Screen } from "../components/ui";
import { IconButton } from "../components/buttons";
import { ListRow } from "../components/ListRow";

export function AboutScreen(): React.ReactElement {
  const openSite = (): void => {
    void Linking.openURL("https://example.com");
  };

  return (
    <Screen>
      {/* App identity */}
      <View style={styles.identity}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>FT</Text>
        </View>
        <Text style={styles.appName}>FitTrack</Text>
        <Text style={styles.version}>Version 1.0.0 · Build 2026.05</Text>
      </View>

      <Text style={styles.body}>
        FitTrack is your personal fitness companion — track workouts,
        nutrition, and progress all in one place.
      </Text>

      {/* 🎯 Tappable, but styled like plain body text — planted issue. */}
      <Pressable onPress={openSite}>
        <Text style={styles.body}>Visit our website for more info.</Text>
      </Pressable>

      {/* Properly-styled, obviously-tappable links for contrast */}
      <Card style={styles.linksCard}>
        <ListRow icon="❓" title="Help center" trailing="›" onPress={openSite} />
        <Divider />
        <ListRow icon="📄" title="Terms of service" trailing="›" onPress={openSite} />
        <Divider />
        <ListRow icon="🛡️" title="Privacy policy" trailing="›" onPress={openSite} />
      </Card>

      <Text style={styles.followLabel}>Follow us</Text>
      <View style={styles.social}>
        <IconButton glyph="🐦" onPress={openSite} />
        <IconButton glyph="📷" onPress={openSite} />
        <IconButton glyph="▶️" onPress={openSite} />
        <IconButton glyph="💬" onPress={openSite} tone="primary" />
      </View>

      <Text style={styles.footer}>© 2026 FitTrack Labs</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: "center", marginBottom: spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoText: { color: palette.white, fontSize: 26, fontWeight: "800" },
  appName: { fontSize: 22, fontWeight: "800", color: palette.ink },
  version: { fontSize: 13, color: palette.muted, marginTop: 2 },

  body: { fontSize: 15, color: palette.inkSoft, lineHeight: 22, marginBottom: spacing.lg },

  linksCard: { marginTop: spacing.sm },

  followLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  social: { flexDirection: "row", gap: spacing.md },

  footer: { fontSize: 12, color: palette.muted, textAlign: "center", marginTop: spacing.xxl },
});
