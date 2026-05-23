/**
 * Note input sheet. Opens after the reviewer confirms an element in
 * the inspector and lets them tag a category + write a note.
 *
 * Layout, top → bottom:
 *   - grabber handle + title (matches the session sheet)
 *   - element-identity card (component name, source, screen)
 *   - screenshot preview with a read-only highlight of the element
 *   - category chips
 *   - free-form note field
 *   - Cancel / Save actions
 *
 * Save → finalizes the pending annotation and persists it.
 * Cancel → discards the pending annotation, returns to the overlay.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useArchLens,
  UX_CATEGORIES,
  type UxCategory,
} from "../state/context";
import { colors, radius, shadow } from "../theme";

const SCREENSHOT_DISPLAY_WIDTH = 240;

export function NoteModal(): React.ReactElement | null {
  const { pending, setPending, saveAnnotation } = useArchLens();
  const [note, setNote] = useState<string>("");
  const [category, setCategory] = useState<UxCategory | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Reset the note + category whenever a new pending annotation arrives.
  const pendingId = pending?.id ?? null;
  useEffect(() => {
    setNote("");
    setCategory(null);
  }, [pendingId]);

  // ---------- Memoized image source ----------
  // Build the data-URI exactly once per pending annotation. Without
  // this, every re-render produces a new `source` object and the
  // Image re-decodes the base64 PNG, which is expensive.
  const imageSource = useMemo(
    () =>
      pending
        ? { uri: "data:image/png;base64," + pending.screenshotBase64 }
        : { uri: "" },
    [pending?.screenshotBase64, pending]
  );

  if (!pending) return null;

  // ---------- Geometry ----------
  // Scale the captured screen coordinates into the preview using the
  // real screen dimensions captured at annotation time, so the box
  // lands correctly on every phone width.
  const screenWidth = pending.screenDimensions.width || 390;
  const screenHeight = pending.screenDimensions.height || 800;
  const scale = SCREENSHOT_DISPLAY_WIDTH / screenWidth;
  const previewHeight = screenHeight * scale;

  const b = pending.element.bounds;
  const boxStyle = {
    left: b.x * scale,
    top: b.y * scale,
    width: Math.max(b.width * scale, 4),
    height: Math.max(b.height * scale, 4),
  };

  const sourceLine = pending.element.fileName
    ? pending.element.fileName.split(/[\\/]/).pop()! +
      (pending.element.lineNumber ? ":" + pending.element.lineNumber : "")
    : "no source map";

  const onCancel = (): void => {
    setPending(null);
    setNote("");
    setCategory(null);
  };

  const onSave = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    try {
      await saveAnnotation(note.trim(), category ?? undefined);
      setNote("");
      setCategory(null);
    } finally {
      setSaving(false);
    }
  };

  const canSave = !saving && note.trim().length > 0;

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <View style={styles.handle} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>New annotation</Text>

            {/* Element identity */}
            <View style={styles.identityCard}>
              <View style={styles.identityHead}>
                <View style={styles.codeChip}>
                  <Text style={styles.codeChipText}>{"</>"}</Text>
                </View>
                <Text style={styles.identityName} numberOfLines={1}>
                  {pending.element.componentName}
                </Text>
              </View>
              <Text style={styles.identityMeta} numberOfLines={1}>
                {sourceLine} · {pending.screenName}
              </Text>
            </View>

            {/* Screenshot preview */}
            <View
              style={[
                styles.preview,
                { width: SCREENSHOT_DISPLAY_WIDTH, height: previewHeight },
              ]}
            >
              <Image
                source={imageSource}
                style={[
                  styles.previewImage,
                  { width: SCREENSHOT_DISPLAY_WIDTH, height: previewHeight },
                ]}
                resizeMode="cover"
                fadeDuration={0}
              />
              <View style={[styles.box, boxStyle]} pointerEvents="none" />
            </View>
            <Text style={styles.caption}>
              Highlight shows the element you selected
            </Text>

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {UX_CATEGORIES.map((c) => {
                const selected = category === c;
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setCategory(selected ? null : c)}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipSelected,
                      pressed && !selected && styles.chipPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Note */}
            <Text style={styles.label}>Note</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="What's wrong with this element?"
              placeholderTextColor="#9CA3AF"
              multiline={true}
              numberOfLines={4}
              autoFocus={true}
            />
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnCancel,
                pressed && styles.btnPressed,
              ]}
              onPress={onCancel}
              disabled={saving}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnSave,
                !canSave && styles.btnDisabled,
                pressed && canSave && styles.btnPressed,
              ]}
              onPress={onSave}
              disabled={!canSave}
            >
              <Text style={styles.btnSaveText}>
                {saving ? "Saving…" : "Save annotation"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingTop: 10,
    maxHeight: "92%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    alignSelf: "flex-start",
    marginBottom: 14,
  },

  // ----- Element identity card -----
  identityCard: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#eef2f7",
    borderRadius: radius.box,
    padding: 12,
    marginBottom: 16,
  },
  identityHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  codeChip: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.highlightFill,
    alignItems: "center",
    justifyContent: "center",
  },
  codeChipText: {
    color: colors.highlight,
    fontSize: 11,
    fontWeight: "800",
  },
  identityName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },
  identityMeta: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: "monospace",
    marginTop: 6,
  },

  // ----- Preview -----
  preview: {
    backgroundColor: "#000",
    borderRadius: radius.box,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: { width: "100%", height: "100%" },
  box: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.highlight,
    backgroundColor: colors.highlightFill,
    borderRadius: 2,
  },
  caption: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 18,
  },

  // ----- Labels / chips / input -----
  label: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignSelf: "flex-start",
    marginBottom: 18,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  chipPressed: { backgroundColor: "#f3f4f6" },
  chipSelected: {
    backgroundColor: colors.highlight,
    borderColor: colors.highlight,
  },
  chipText: { fontSize: 13, color: colors.inkSoft, fontWeight: "600" },
  chipTextSelected: { color: colors.white },
  input: {
    width: "100%",
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.box,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: "#fcfcfd",
    textAlignVertical: "top",
  },

  // ----- Actions -----
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.box,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: { opacity: 0.85 },
  btnCancel: { backgroundColor: "#f3f4f6" },
  btnCancelText: { color: colors.inkSoft, fontSize: 14, fontWeight: "600" },
  btnSave: { backgroundColor: colors.ink, ...shadow.float },
  btnSaveText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  btnDisabled: { opacity: 0.4 },
});
