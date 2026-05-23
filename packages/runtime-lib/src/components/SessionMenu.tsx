/**
 * Floating session pill + bottom-sheet manager.
 *
 * - Pill: a compact "<count> issues" chip above the FAB, shown only
 *   when there is ≥1 annotation and annotation mode is off.
 * - Sheet: tapping the pill opens a sheet that lists every captured
 *   annotation. Each row shows a thumbnail, the screen + component,
 *   and the note. The reviewer can:
 *     • tap a row to edit its note,
 *     • tap × to delete that one annotation,
 *     • Export & Share the whole session,
 *     • Clear the whole session.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useArchLens, type Annotation } from "../state/context";

export function SessionMenu(): React.ReactElement | null {
  const {
    annotations,
    isAnnotating,
    storageWarning,
    exportSession,
    clearAnnotations,
    deleteAnnotation,
    updateAnnotationNote,
  } = useArchLens();
  const [open, setOpen] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  // Which annotation is being edited (id), and the in-progress text.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");

  if (annotations.length === 0 || isAnnotating) return null;

  const onExport = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await exportSession();
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed.";
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

  const onDelete = (ann: Annotation): void => {
    Alert.alert(
      "Delete annotation?",
      "Remove this single annotation? This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (editingId === ann.id) setEditingId(null);
            void deleteAnnotation(ann.id);
          },
        },
      ]
    );
  };

  const startEdit = (ann: Annotation): void => {
    setEditingId(ann.id);
    setEditText(ann.note);
  };

  const commitEdit = (): void => {
    if (editingId) void updateAnnotationNote(editingId, editText.trim());
    setEditingId(null);
    setEditText("");
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
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Session</Text>
            <Text style={styles.sheetSub}>
              {annotations.length} annotation
              {annotations.length === 1 ? "" : "s"} captured · tap a note to
              edit
            </Text>

            {storageWarning ? (
              <View style={styles.warnBanner}>
                <Text style={styles.warnText}>
                  ⚠ Storage is getting full — export soon. Further captures
                  may not save reliably on some devices.
                </Text>
              </View>
            ) : null}

            {/* Annotation list */}
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
            >
              {annotations.map((ann, i) => (
                <View key={ann.id} style={styles.row}>
                  <Image
                    source={{
                      uri: "data:image/png;base64," + ann.screenshotBase64,
                    }}
                    style={styles.thumb}
                    resizeMode="cover"
                    fadeDuration={0}
                  />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      #{i + 1} · {ann.screenName} ·{" "}
                      {ann.element.componentName}
                    </Text>

                    {editingId === ann.id ? (
                      <TextInput
                        style={styles.editInput}
                        value={editText}
                        onChangeText={setEditText}
                        onBlur={commitEdit}
                        multiline
                        autoFocus
                        placeholder="Edit note…"
                        placeholderTextColor="#999"
                      />
                    ) : (
                      <Pressable onPress={() => startEdit(ann)}>
                        <Text style={styles.rowNote} numberOfLines={3}>
                          {ann.note || "(no note — tap to add)"}
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={"Delete annotation " + (i + 1)}
                    style={styles.deleteBtn}
                    onPress={() => onDelete(ann)}
                    hitSlop={8}
                  >
                    <Text style={styles.deleteX}>×</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            {/* Actions */}
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
                <>
                  <Text style={styles.actionText}>Export & Share</Text>
                  <Text style={styles.actionSubText}>
                    Markdown + JSON, opens the share sheet
                  </Text>
                </>
              )}
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
          </View>
        </View>
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
    maxHeight: "85%",
  },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  sheetSub: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 12 },

  warnBanner: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  warnText: { fontSize: 12, color: "#92610b", lineHeight: 17 },

  list: { maxHeight: 340, marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  thumb: {
    width: 40,
    height: 64,
    borderRadius: 4,
    backgroundColor: "#000",
    marginRight: 10,
  },
  rowBody: { flex: 1 },
  rowMeta: {
    fontSize: 11,
    color: "#888",
    fontFamily: "monospace",
    marginBottom: 2,
  },
  rowNote: { fontSize: 13, color: "#111", lineHeight: 18 },
  editInput: {
    fontSize: 13,
    color: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 40,
    textAlignVertical: "top",
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    backgroundColor: "#fef2f2",
  },
  deleteX: { color: "#DC2626", fontSize: 18, fontWeight: "700", lineHeight: 20 },

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

  cancel: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
  cancelText: { fontSize: 14, color: "#666", fontWeight: "600" },
});
