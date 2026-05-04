/**
 * Note input modal. Opens after a successful tap+capture and lets
 * the reviewer add a free-form note describing the issue.
 *
 * The modal shows a thumbnail of the captured screenshot with a red
 * box drawn over the tapped element's bounds, so the reviewer can
 * confirm they captured the right thing before writing the note.
 *
 * Save → finalizes the pending annotation and persists it.
 * Cancel → discards the pending annotation, returns to overlay.
 */

import React, { useState } from "react";
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

  // Reset the input when a new pending annotation arrives. We do
  // this here rather than in a useEffect to keep the modal stateless
  // when there's nothing pending.
  const pendingId = pending?.id ?? null;
  React.useEffect(() => {
    setNote("");
  }, [pendingId]);

  if (!pending) return null;

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

  // Approximate aspect ratio of a phone screen. The actual screenshot
  // dimensions vary by device; we use a tall preview that won't get
  // clipped on most phones.
  const previewHeight = SCREENSHOT_DISPLAY_WIDTH * 1.8;

  // Where to draw the red box, in the preview's coordinate space.
  // We don't know the original screenshot's exact pixel dimensions,
  // so we approximate by assuming the bounds are in a typical phone
  // resolution (~390 logical pixels wide). Phase 3 will measure
  // exactly when we generate the export.
  const ASSUMED_SCREEN_WIDTH = 390;
  const scale = SCREENSHOT_DISPLAY_WIDTH / ASSUMED_SCREEN_WIDTH;
  const boxStyle = {
    position: "absolute" as const,
    left: pending.element.bounds.x * scale,
    top: pending.element.bounds.y * scale,
    width: pending.element.bounds.width * scale,
    height: pending.element.bounds.height * scale,
    borderWidth: 2,
    borderColor: "#DC2626",
    backgroundColor: "rgba(220, 38, 38, 0.15)",
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

            {/* Captured element metadata */}
            <View style={styles.metaBlock}>
              <MetaRow label="Component" value={pending.element.componentName} />
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

            {/* Screenshot preview with bounding box */}
            <View
              style={[
                styles.preview,
                { width: SCREENSHOT_DISPLAY_WIDTH, height: previewHeight },
              ]}
            >
              <Image
                source={{ uri: "data:image/png;base64," + pending.screenshotBase64 }}
                style={[
                  styles.previewImage,
                  { width: SCREENSHOT_DISPLAY_WIDTH, height: previewHeight },
                ]}
                resizeMode="cover"
              />
              <View style={boxStyle} pointerEvents="none" />
            </View>

            {/* Note input */}
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

          {/* Buttons pinned to the bottom of the card */}
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
    marginBottom: 16,
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
  preview: {
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  previewImage: { width: "100%", height: "100%" },
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
