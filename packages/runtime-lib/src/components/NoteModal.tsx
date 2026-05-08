/**
 * Note input modal. Opens after a successful tap+capture and lets
 * the reviewer add a free-form note describing the issue.
 *
 * The modal shows a thumbnail of the captured screenshot with a red
 * box drawn over the tapped element's bounds. The reviewer can
 * drag-to-move the box's body and drag-to-resize from the
 * bottom-right corner before saving.
 *
 * Performance: drag gestures update Animated.Value-backed style
 * properties directly via setValue(). React state (`bounds`) is only
 * touched on release. That keeps the heavy modal — image, scroll
 * view, text input — from re-rendering at 60fps during drag, which
 * is what made the box feel laggy in the first version.
 *
 * Save → finalizes the pending annotation with the (possibly
 *        edited) bounds and persists it.
 * Cancel → discards the pending annotation, returns to overlay.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PanResponderGestureState,
} from "react-native";
import { useArchLens, type ElementBounds } from "../state/context";

const SCREENSHOT_DISPLAY_WIDTH = 280;
const HANDLE_SIZE = 22;
const MIN_BOX_SIZE = 24;

export function NoteModal(): React.ReactElement | null {
  const { pending, setPending, saveAnnotation } = useArchLens();
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // ---------- Bounds: committed (state) + live (refs + animated) ----------
  // `bounds` is the source of truth: updated only on release. The
  // animated values track the box during drag without re-rendering.
  const [bounds, setBounds] = useState<ElementBounds>(
    pending?.element.bounds ?? { x: 0, y: 0, width: 0, height: 0 }
  );

  // Mirror of `bounds` accessible synchronously from PanResponder
  // closures (state can be stale inside a memoized responder).
  const boundsRef = useRef(bounds);
  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  // The bounds the gesture started from — captured at onPanResponderGrant.
  const startBoundsRef = useRef<ElementBounds>(bounds);
  // The latest bounds computed during a move — committed to state on release.
  const liveBoundsRef = useRef<ElementBounds>(bounds);

  // ---------- Geometry ----------
  // We use the actual screen dimensions captured at annotation time so
  // the box scales correctly on every phone, regardless of width.
  const screenWidth = pending?.screenDimensions.width ?? 390;
  const screenHeight = pending?.screenDimensions.height ?? 800;
  const scale = SCREENSHOT_DISPLAY_WIDTH / screenWidth;
  const previewHeight = screenHeight * scale;
  const screenWidthRef = useRef(screenWidth);
  const screenHeightRef = useRef(screenHeight);
  const scaleRef = useRef(scale);
  useEffect(() => {
    screenWidthRef.current = screenWidth;
    screenHeightRef.current = screenHeight;
    scaleRef.current = scale;
  }, [screenWidth, screenHeight, scale]);

  // ---------- Animated values driving the box visually ----------
  // Initialized to current bounds in preview pixel space. setValue()
  // bypasses React's reconciler — silky smooth.
  const animLeft = useRef(new Animated.Value(bounds.x * scale)).current;
  const animTop = useRef(new Animated.Value(bounds.y * scale)).current;
  const animWidth = useRef(new Animated.Value(bounds.width * scale)).current;
  const animHeight = useRef(new Animated.Value(bounds.height * scale)).current;

  // Sync the animated values back to bounds whenever bounds change
  // outside of a drag (e.g. when the modal opens with a new pending,
  // or after a release commit). This is a no-op during a drag because
  // setBounds isn't called there.
  useEffect(() => {
    animLeft.setValue(bounds.x * scale);
    animTop.setValue(bounds.y * scale);
    animWidth.setValue(bounds.width * scale);
    animHeight.setValue(bounds.height * scale);
  }, [bounds, scale, animLeft, animTop, animWidth, animHeight]);

  // ---------- Lifecycle: reset note + bounds when a new pending arrives ----------
  const pendingId = pending?.id ?? null;
  useEffect(() => {
    setNote("");
    if (pending) setBounds(pending.element.bounds);
  }, [pendingId, pending]);

  // ---------- PanResponders ----------
  // Both handlers share the same shape: capture start bounds on grant,
  // update animated values + liveBoundsRef on move, commit on
  // release/terminate.

  const moveResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Capture even when an ancestor (ScrollView) wants the touch.
        onMoveShouldSetPanResponderCapture: () => true,

        onPanResponderGrant: () => {
          startBoundsRef.current = boundsRef.current;
          liveBoundsRef.current = boundsRef.current;
          setIsDragging(true);
        },

        onPanResponderMove: (_e, g: PanResponderGestureState) => {
          const start = startBoundsRef.current;
          const s = scaleRef.current;
          const sw = screenWidthRef.current;
          const sh = screenHeightRef.current;
          const newX = clamp(start.x + g.dx / s, 0, sw - start.width);
          const newY = clamp(start.y + g.dy / s, 0, sh - start.height);

          // Update visuals via animated values (no re-render).
          animLeft.setValue(newX * s);
          animTop.setValue(newY * s);

          // Stash for the eventual commit.
          liveBoundsRef.current = { ...start, x: newX, y: newY };
        },

        onPanResponderRelease: () => {
          setBounds(liveBoundsRef.current);
          setIsDragging(false);
        },
        onPanResponderTerminate: () => {
          setBounds(liveBoundsRef.current);
          setIsDragging(false);
        },
      }),
    [animLeft, animTop]
  );

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,

        onPanResponderGrant: () => {
          startBoundsRef.current = boundsRef.current;
          liveBoundsRef.current = boundsRef.current;
          setIsDragging(true);
        },

        onPanResponderMove: (_e, g: PanResponderGestureState) => {
          const start = startBoundsRef.current;
          const s = scaleRef.current;
          const sw = screenWidthRef.current;
          const sh = screenHeightRef.current;
          const maxW = sw - start.x;
          const maxH = sh - start.y;
          const newW = clamp(start.width + g.dx / s, MIN_BOX_SIZE, maxW);
          const newH = clamp(start.height + g.dy / s, MIN_BOX_SIZE, maxH);

          animWidth.setValue(newW * s);
          animHeight.setValue(newH * s);

          liveBoundsRef.current = { ...start, width: newW, height: newH };
        },

        onPanResponderRelease: () => {
          setBounds(liveBoundsRef.current);
          setIsDragging(false);
        },
        onPanResponderTerminate: () => {
          setBounds(liveBoundsRef.current);
          setIsDragging(false);
        },
      }),
    [animWidth, animHeight]
  );

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

  const onCancel = (): void => {
    setPending(null);
    setNote("");
  };

  const onSave = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    try {
      await saveAnnotation(note.trim(), bounds);
      setNote("");
    } finally {
      setSaving(false);
    }
  };

  // The handle's left/top are derived from the box's animated values
  // so it stays glued to the bottom-right corner without its own
  // animated values.
  const handleLeft = Animated.add(
    animLeft,
    Animated.subtract(animWidth, HANDLE_SIZE / 2)
  );
  const handleTop = Animated.add(
    animTop,
    Animated.subtract(animHeight, HANDLE_SIZE / 2)
  );

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
            // Lock vertical scroll while dragging so the ScrollView
            // doesn't compete with our PanResponder.
            scrollEnabled={!isDragging}
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
              Tap detected this element automatically. Drag the red box
              to move it, or drag the bottom-right corner to resize.
            </Text>

            <View
              style={[
                styles.preview,
                {
                  width: SCREENSHOT_DISPLAY_WIDTH,
                  height: previewHeight,
                },
              ]}
            >
              <Image
                source={imageSource}
                style={[
                  styles.previewImage,
                  {
                    width: SCREENSHOT_DISPLAY_WIDTH,
                    height: previewHeight,
                  },
                ]}
                resizeMode="cover"
                fadeDuration={0}
              />

              {/* Draggable box body — Animated.View so setValue updates
                  layout without React re-renders. */}
              <Animated.View
                {...moveResponder.panHandlers}
                style={[
                  styles.box,
                  {
                    left: animLeft,
                    top: animTop,
                    width: animWidth,
                    height: animHeight,
                  },
                ]}
              />

              {/* Resize handle — pinned to the box's bottom-right corner. */}
              <Animated.View
                {...resizeResponder.panHandlers}
                style={[
                  styles.resizeHandle,
                  { left: handleLeft, top: handleTop },
                ]}
              />
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

function clamp(n: number, min: number, max: number): number {
  if (max < min) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
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
  resizeHandle: {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#ffffff",
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
