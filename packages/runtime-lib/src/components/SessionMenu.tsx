/**
 * Floating session pill + bottom-sheet manager for the UX Audit.
 *
 * - Pill: a compact "<count> issues" chip above the FAB, shown only
 *   when there is ≥1 annotation and annotation mode is off.
 * - Sheet: tapping the pill opens the "UX Audit" panel that lists
 *   every captured annotation, grouped by screen. Each row shows a
 *   thumbnail, the component, its category tag, and the note. The
 *   reviewer can:
 *     • tap a row to edit its note,
 *     • tap × to delete that one annotation,
 *     • Export & Share the whole session,
 *     • Clear the whole session.
 */

import React, { useMemo, useState } from "react";
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
import { colors, radius, shadow, layers } from "../theme";

interface ScreenGroup {
  screenName: string;
  items: Annotation[];
}

export function SessionMenu(): React.ReactElement | null {
  const {
    annotations,
    isInspecting,
    storageWarning,
    exportSession,
    clearAnnotations,
    deleteAnnotation,
    updateAnnotationNote,
  } = useArchLens();
  const [open, setOpen] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");

  // Stable issue number per annotation id (capture order), and the
  // by-screen grouping used for the list layout.
  const { numberById, groups } = useMemo(() => {
    const numberById = new Map<string, number>();
    annotations.forEach((a, i) => numberById.set(a.id, i + 1));

    const order: string[] = [];
    const byScreen = new Map<string, Annotation[]>();
    for (const a of annotations) {
      const key = a.screenName || "unknown";
      if (!byScreen.has(key)) {
        byScreen.set(key, []);
        order.push(key);
      }
      byScreen.get(key)!.push(a);
    }
    const groups: ScreenGroup[] = order.map((screenName) => ({
      screenName,
      items: byScreen.get(screenName)!,
    }));
    return { numberById, groups };
  }, [annotations]);

  // The pill is visible whenever there's at least one issue — including
  // mid-audit, so the reviewer can see the running count and open the
  // list. It only hides while the inspector control bar is up, so it
  // can't collide with that bottom-of-screen UI.
  if (annotations.length === 0 || isInspecting) return null;

  const onExport = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await exportSession();
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed.";
      Alert.alert("UX Audit — Export failed", message);
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
        accessibilityLabel={"Open UX Audit session — " + issuesLabel}
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
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>UX Audit</Text>
            <Text style={styles.sheetSub}>
              {annotations.length} issue
              {annotations.length === 1 ? "" : "s"} across {groups.length}{" "}
              screen{groups.length === 1 ? "" : "s"} · tap a note to edit
            </Text>

            {storageWarning ? (
              <View style={styles.warnBanner}>
                <Text style={styles.warnText}>
                  ⚠ Storage is getting full — export soon. Further captures
                  may not save reliably on some devices.
                </Text>
              </View>
            ) : null}

            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
            >
              {groups.map((group) => (
                <View key={group.screenName} style={styles.group}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle} numberOfLines={1}>
                      {group.screenName}
                    </Text>
                    <Text style={styles.groupCount}>{group.items.length}</Text>
                  </View>

                  {group.items.map((ann) => (
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
                        <View style={styles.rowMetaLine}>
                          <Text style={styles.rowMeta} numberOfLines={1}>
                            #{numberById.get(ann.id)} ·{" "}
                            {ann.element.componentName}
                          </Text>
                          {ann.category ? (
                            <View style={styles.catChip}>
                              <Text style={styles.catChipText}>
                                {ann.category}
                              </Text>
                            </View>
                          ) : null}
                        </View>

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
                        accessibilityLabel={
                          "Delete annotation " + numberById.get(ann.id)
                        }
                        style={styles.deleteBtn}
                        onPress={() => onDelete(ann)}
                        hitSlop={8}
                      >
                        <Text style={styles.deleteX}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

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
                <ActivityIndicator size="small" color={colors.white} />
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
              <Text style={[styles.actionSubText, styles.actionDangerSub]}>
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
    bottom: 104,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    zIndex: layers.fab,
    ...shadow.float,
  },
  pillPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginRight: 8,
  },
  pillText: { color: colors.white, fontSize: 13, fontWeight: "600" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: colors.ink },
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

  list: { marginBottom: 12 },
  group: { marginBottom: 14 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  groupTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  groupCount: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    marginLeft: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  thumb: {
    width: 40,
    height: 64,
    borderRadius: 6,
    backgroundColor: "#000",
    marginRight: 10,
  },
  rowBody: { flex: 1 },
  rowMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 6,
  },
  rowMeta: {
    flexShrink: 1,
    fontSize: 11,
    color: "#888",
    fontFamily: "monospace",
  },
  catChip: {
    backgroundColor: colors.highlightFill,
    borderRadius: radius.chip,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catChipText: { fontSize: 10, fontWeight: "700", color: colors.highlight },
  rowNote: { fontSize: 13, color: "#111", lineHeight: 18 },
  editInput: {
    fontSize: 13,
    color: "#111",
    borderWidth: 1,
    borderColor: colors.ink,
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
    backgroundColor: colors.dangerSoft,
  },
  deleteX: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },

  action: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.ink,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionPressed: { opacity: 0.85 },
  actionDanger: { backgroundColor: colors.dangerSoft },
  actionText: { fontSize: 15, fontWeight: "700", color: colors.white },
  actionDangerText: { color: colors.danger },
  actionSubText: { fontSize: 12, color: colors.whiteSoft, marginTop: 2 },
  actionDangerSub: { color: "#b45309" },

  cancel: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
  cancelText: { fontSize: 14, color: "#666", fontWeight: "600" },
});
