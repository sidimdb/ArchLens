/**
 * Note input modal. Opens after a successful tap+capture and lets
 * the reviewer add a free-form note describing the issue.
 *
 * The modal shows a thumbnail of the captured screenshot with a
 * read-only red box drawn over the auto-detected element's bounds.
 * The box is a visual confirmation of what the tap identified — it
 * is NOT editable. Trusting the detection (Option B's improved
 * heuristic) keeps the flow simple: tap → confirm → note → save.
 *
 * Save → finalizes the pending annotation and persists it.
 * Cancel → discards the pending annotation, returns to overlay.
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
import { useArchLens } from "../state/context";

const SCREENSHOT_DISPLAY_WIDTH = 280;

export function NoteModal(): React.ReactElement | null {
  const { pending, setPending, saveAnnotation } = useArchLens();
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Reset the note whenever a new pending annotation arrives.
  const pendingId = pending?.id ?? null;
  useEffect(() => {
    setNote("");
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
  // Scale the captured screen coordinates into the modal's preview
  // using the actual screen dimensions captured at annotation time,
  // so the box lands correctly on every phone width.
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

  const onCancel = (): void => {
    setPending(null);
    setNote("");
  };

  const onSave = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    try {
      await saveAnnotation(note.trim());
      setNote("");
    } finally {
      setSaving(false);
    }
  };

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
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.title}>New annotation</Text>

            <View style={styles.metaBlock}>
              <MetaRow
                label="Component"
                value={pending.element.componentName}
              />
              {pending.element.fileName ? (
                <MetaRow
                  label="Source"
                  value={
                    pending.element.fileName +
                    (pending.element.lineNumber
                      ? ":" + pending.element.lineNumber
                      : "")
                  }
                />
              ) : null}
              <MetaRow label="Screen" value={pending.screenName} />
            </View>

            <Text style={styles.hint}>
              The red box shows the element detected by your tap.
            </Text>

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
              {/* Read-only highlight of the detected element. */}
              <View style={[styles.box, boxStyle]} pointerEvents="none" />
            </View>

            <Text style={styles.label}>Note</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="What's wrong with this element?"
              placeholderTextColor="#999"
              multiline={true}
              numberOfLines={4}
              autoFocus={true}
            />
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnCancel]}
              onPress={onCancel}
              disabled={saving}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                styles.btnSave,
                (saving || note.trim().length === 0) && styles.btnDisabled,
              ]}
              onPress={onSave}
              disabled={saving || note.trim().length === 0}
            >
              <Text style={styles.btnSaveText}>
                {saving ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    maxHeight: "90%",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  metaBlock: {
    width: "100%",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  metaRow: { flexDirection: "row", marginBottom: 4 },
  metaLabel: {
    width: 90,
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: { flex: 1, fontSize: 13, color: "#111", fontFamily: "monospace" },
  hint: {
    width: "100%",
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 10,
  },
  preview: {
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
  },
  previewImage: { width: "100%", height: "100%" },
  box: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#DC2626",
    backgroundColor: "rgba(220, 38, 38, 0.18)",
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#111",
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: { backgroundColor: "#f3f4f6" },
  btnCancelText: { color: "#374151", fontSize: 14, fontWeight: "600" },
  btnSave: { backgroundColor: "#1a1a1a" },
  btnSaveText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  btnDisabled: { opacity: 0.4 },
});
