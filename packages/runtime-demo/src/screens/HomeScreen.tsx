/**
 * Home screen.
 *
 * 🎯 Planted UX issue: the primary "Get Started" button is 80×18 px,
 * far below the 44×44 minimum recommended touch target. A reviewer
 * should annotate this immediately.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

export function HomeScreen(): React.ReactElement {
  const nav = useNavigation<Nav>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to FitTrack</Text>
      <Text style={styles.subtitle}>
        Track your daily fitness goals in one place.
      </Text>

      {/* Tiny button — planted issue */}
      <Pressable
        style={styles.tinyButton}
        onPress={() => nav.navigate("Profile")}
      >
        <Text style={styles.tinyButtonText}>Get Started</Text>
      </Pressable>

      <View style={styles.navList}>
        <NavLink label="Profile" onPress={() => nav.navigate("Profile")} />
        <NavLink label="Settings" onPress={() => nav.navigate("Settings")} />
        <NavLink
          label="Notifications"
          onPress={() => nav.navigate("Notifications")}
        />
        <NavLink label="About" onPress={() => nav.navigate("About")} />
      </View>
    </View>
  );
}

function NavLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable style={styles.navLink} onPress={onPress}>
      <Text style={styles.navLinkText}>{label} →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: "#fff" },
  title: { fontSize: 30, fontWeight: "700", marginBottom: 8, color: "#111" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 32 },

  tinyButton: {
    width: 80,
    height: 18,
    backgroundColor: "#3B82F6",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  tinyButtonText: { color: "#fff", fontSize: 9, fontWeight: "600" },

  navList: { gap: 8 },
  navLink: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  navLinkText: { fontSize: 16, color: "#111", fontWeight: "500" },
});
