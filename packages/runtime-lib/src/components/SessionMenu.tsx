/**
 * Small floating pill that surfaces session-level actions when the
 * reviewer has at least one captured annotation.
 *
 * Behavior:
 *   - Hidden when annotations.length === 0 OR when annotation mode
 *     is currently active (the FAB owns the screen then).
 *   - Visible: a compact "<count> issues" pill above the FAB.
 *   - Tapping the pill opens a small action sheet with Export and
 *     Clear options.
 *
 * Phase 3 only wires Export and Clear. Future phases can add
 * "Resume verification", "View list", etc.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useArchLens } from "../state/context";

export function SessionMenu(): React.ReactElement | null {
  const {
    annotations,
    isAnnotating,
    exportSession,
    clearAnnotations,
  } = useArchLens();
  const [open, setOpen] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  if (annotations.length === 0 || isAnnotating) return null;

  const onExport = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await exportSession();
      setOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Export failed.";
      Alert.alert("ArchLens — Export failed", message);
    } finally {
      setBusy(false);
    }
  };

  const onClear = (): void => {
    Alert.alert(
      "Clear session?",
      "This deletes " +
        annotations.length +
        " annotation(s) from this device. Make sure you've exported first.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            void clearAnnotations();
            setOpen(false);
          },
        },
      ]
    );
  };

  const issuesLabel =
    annotations.length === 1 ? "1 issue" : annotations.length + " issues";

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={"Open session menu — " + issuesLabel}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        onPress={() => setOpen(true)}
      >
        <View style={styles.dot} />
        <Text style={styles.pillText}>{issuesLabel}</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/*
            Stop-propagation: tapping the sheet itself shouldn't
            close it. Pressing outside (the backdrop) does.
          */}
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>Session</Text>
            <Text style={styles.sheetSub}>
              {annotations.length} annotation
              {annotations.length === 1 ? "" : "s"} captured
            </Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                pressed && styles.actionPressed,
              ]}
              onPress={onExport}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#1a1a1a" />
              ) : (
                <Text style={styles.actionText}>Export & Share</Text>
              )}
              <Text style={styles.actionSubText}>
                Markdown + JSON, opens the share sheet
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                styles.actionDanger,
                pressed && styles.actionPressed,
              ]}
              onPress={onClear}
              disabled={busy}
            >
              <Text style={[styles.actionText, styles.actionDangerText]}>
                Clear session
              </Text>
              <Text style={styles.actionSubText}>
                Delete all captured annotations from this device
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={styles.cancel}
              onPress={() => setOpen(false)}
            >
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    right: 20,
    bottom: 110,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 9998,
  },
  pillPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginRight: 8,
  },
  pillText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  sheetSub: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 16 },

  action: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 8,
  },
  actionPressed: { opacity: 0.7 },
  actionDanger: { backgroundColor: "#fef2f2" },
  actionText: { fontSize: 15, fontWeight: "600", color: "#111" },
  actionDangerText: { color: "#DC2626" },
  actionSubText: { fontSize: 12, color: "#666", marginTop: 2 },

  cancel: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  cancelText: { fontSize: 14, color: "#666", fontWeight: "600" },
});
