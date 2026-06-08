/**
 * Floating session pill + bottom-sheet manager for the UX Audit.
 *
 * - Pill: a compact "<count> issues" chip above the FAB, visible
 *   whenever there's at least one captured issue and the inspector
 *   control bar isn't up.
 * - Sheet: tapping the pill opens the "UX Audit" panel that lists
 *   every captured annotation, grouped by screen, with a status
 *   badge per row (draft / submitting / submitted / failed). The
 *   reviewer can:
 *     • tap a row to edit its note (only while draft),
 *     • tap × to delete a single annotation (only while draft),
 *     • **Submit to dashboard** to batch-send everything pending,
 *     • **Clear submitted** to wipe rows the dashboard already has.
 *
 * Submitted rows are locked — chain-of-custody. Their content can't
 * be edited on the device any more than it can in the dashboard.
 *
 * Internal naming note: variables / types use `syncStatus` /
 * `pending` / `synced` because they describe the underlying sync
 * operation. Only the reviewer-facing labels speak "draft / submitted"
 * — that wording is friendlier for non-technical reviewers, who don't
 * think in terms of "syncing."
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
import {
  useArchLens,
  type Annotation,
  type SyncStatus,
} from "../state/context";
import { colors, radius, shadow, layers } from "../theme";

interface ScreenGroup {
  screenName: string;
  items: Annotation[];
}

const STATUS_LABEL: Record<SyncStatus, string> = {
  pending: "Draft",
  submitting: "Submitting…",
  synced: "✓ Submitted",
  failed: "⚠ Failed",
};

function statusOf(a: Annotation): SyncStatus {
  return a.syncStatus ?? "pending";
}

export function SessionMenu(): React.ReactElement | null {
  const {
    annotations,
    isInspecting,
    storageWarning,
    cloudConfigured,
    submitToDashboard,
    clearAnnotations,
    deleteAnnotation,
    updateAnnotationNote,
  } = useArchLens();
  const [open, setOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");

  const { numberById, groups, pendingCount, syncedCount, failedCount } =
    useMemo(() => {
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

      let pendingCount = 0,
        syncedCount = 0,
        failedCount = 0;
      for (const a of annotations) {
        const s = statusOf(a);
        if (s === "synced") syncedCount++;
        else if (s === "failed") failedCount++;
        else pendingCount++; // pending + submitting
      }
      return { numberById, groups, pendingCount, syncedCount, failedCount };
    }, [annotations]);

  if (annotations.length === 0 || isInspecting) return null;

  const onSubmit = async (): Promise<void> => {
    if (submitting || !cloudConfigured || pendingCount + failedCount === 0)
      return;
    setSubmitting(true);
    try {
      await submitToDashboard();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submit failed.";
      Alert.alert("UX Audit — Submit failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  const onClear = (): void => {
    if (syncedCount === 0) {
      Alert.alert(
        "Nothing to clear",
        "Clear only removes annotations the dashboard has already received. " +
          "Drafts are kept so you don't lose unsent work."
      );
      return;
    }
    Alert.alert(
      "Clear submitted annotations?",
      "Remove " +
        syncedCount +
        " annotation(s) the dashboard already has from this device. " +
        "Drafts will be kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            void clearAnnotations();
          },
        },
      ]
    );
  };

  const onDelete = (ann: Annotation): void => {
    if (statusOf(ann) === "synced") return; // locked
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
    if (statusOf(ann) === "synced") return; // locked
    setEditingId(ann.id);
    setEditText(ann.note);
  };

  const commitEdit = (): void => {
    if (editingId) void updateAnnotationNote(editingId, editText.trim());
    setEditingId(null);
    setEditText("");
  };

  const totalLabel =
    annotations.length === 1 ? "1 issue" : annotations.length + " issues";

  // The "submit" button's secondary line summarizes the state.
  const submitDisabled = submitting || pendingCount + failedCount === 0;
  let submitMainText: string;
  let submitSubText: string;
  if (!cloudConfigured) {
    submitMainText = "Cloud sync not configured";
    submitSubText =
      "Pass projectKey and apiUrl to <ArchLensProvider>";
  } else if (pendingCount + failedCount === 0) {
    submitMainText = "All submitted";
    submitSubText = "Nothing to submit. Capture more issues, then come back.";
  } else {
    submitMainText =
      "Submit " + (pendingCount + failedCount) + " to dashboard";
    submitSubText =
      failedCount > 0
        ? failedCount + " failed last time · " + pendingCount + " new draft"
        : "Send everything in this session as one batch";
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={"Open UX Audit session — " + totalLabel}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        onPress={() => setOpen(true)}
      >
        <View style={styles.dot} />
        <Text style={styles.pillText}>{totalLabel}</Text>
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
              {pendingCount} draft · {syncedCount} submitted
              {failedCount > 0 ? " · " + failedCount + " failed" : ""} · {" "}
              {groups.length} screen{groups.length === 1 ? "" : "s"}
            </Text>

            {storageWarning ? (
              <View style={styles.warnBanner}>
                <Text style={styles.warnText}>
                  ⚠ Storage is getting full — submit soon. Further captures
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

                  {group.items.map((ann) => {
                    const s = statusOf(ann);
                    const locked = s === "synced";
                    return (
                      <View
                        key={ann.id}
                        style={[styles.row, locked && styles.rowLocked]}
                      >
                        <Image
                          source={{
                            uri:
                              "data:image/png;base64," + ann.screenshotBase64,
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
                            <View
                              style={[
                                styles.statusBadge,
                                statusBadgeStyle(s),
                              ]}
                            >
                              {s === "submitting" ? (
                                <ActivityIndicator
                                  size="small"
                                  color={statusFg(s)}
                                />
                              ) : null}
                              <Text
                                style={[
                                  styles.statusText,
                                  { color: statusFg(s) },
                                ]}
                              >
                                {STATUS_LABEL[s]}
                              </Text>
                            </View>
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
                            <Pressable
                              onPress={() => startEdit(ann)}
                              disabled={locked}
                            >
                              <Text
                                style={[
                                  styles.rowNote,
                                  locked && styles.rowNoteLocked,
                                ]}
                                numberOfLines={3}
                              >
                                {ann.note ||
                                  (locked
                                    ? "(no note)"
                                    : "(no note — tap to add)")}
                              </Text>
                            </Pressable>
                          )}
                          {s === "failed" && ann.syncError ? (
                            <Text style={styles.errorText} numberOfLines={2}>
                              {ann.syncError}
                            </Text>
                          ) : null}
                        </View>

                        {!locked ? (
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
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            {/* Submit to dashboard */}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                submitDisabled && styles.actionDisabled,
                pressed && !submitDisabled && styles.actionPressed,
              ]}
              onPress={onSubmit}
              disabled={submitDisabled}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Text style={styles.actionText}>{submitMainText}</Text>
                  <Text style={styles.actionSubText}>{submitSubText}</Text>
                </>
              )}
            </Pressable>

            {/* Clear submitted */}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                styles.actionDanger,
                pressed && styles.actionPressed,
              ]}
              onPress={onClear}
              disabled={submitting}
            >
              <Text style={[styles.actionText, styles.actionDangerText]}>
                Clear submitted
              </Text>
              <Text style={[styles.actionSubText, styles.actionDangerSub]}>
                Remove rows the dashboard already has · keeps drafts
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

function statusBadgeStyle(s: SyncStatus): { backgroundColor: string } {
  switch (s) {
    case "synced":
      return { backgroundColor: "#dcfce7" };
    case "failed":
      return { backgroundColor: "#fee2e2" };
    case "submitting":
      return { backgroundColor: "#e0e7ff" };
    default:
      return { backgroundColor: "#f3f4f6" };
  }
}
function statusFg(s: SyncStatus): string {
  switch (s) {
    case "synced":
      return "#15803d";
    case "failed":
      return "#b91c1c";
    case "submitting":
      return "#4338ca";
    default:
      return "#6b7280";
  }
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
  rowLocked: { opacity: 0.78 },
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
    flexWrap: "wrap",
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

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.chip,
  },
  statusText: { fontSize: 10, fontWeight: "700" },

  rowNote: { fontSize: 13, color: "#111", lineHeight: 18 },
  rowNoteLocked: { color: "#374151" },
  errorText: {
    fontSize: 11,
    color: "#b91c1c",
    marginTop: 4,
    fontStyle: "italic",
  },
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
  actionDisabled: { opacity: 0.5 },
  actionPressed: { opacity: 0.85 },
  actionDanger: { backgroundColor: colors.dangerSoft },
  actionText: { fontSize: 15, fontWeight: "700", color: colors.white },
  actionDangerText: { color: colors.danger },
  actionSubText: { fontSize: 12, color: colors.whiteSoft, marginTop: 2 },
  actionDangerSub: { color: "#b45309" },

  cancel: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
  cancelText: { fontSize: 14, color: "#666", fontWeight: "600" },
});
