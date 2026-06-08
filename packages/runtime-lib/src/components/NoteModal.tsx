/**
 * Note input sheet. Opens after the reviewer confirms an element in
 * the inspector and lets them tag a category + write a note.
 *
 * Layout, top → bottom:
 *   - grabber handle
 *   - title
 *   - compact context strip: small thumbnail of the captured screen
 *     (with the highlight overlay) + the element's component name +
 *     source/screen meta. Reviewer can tap the thumb to expand it
 *     for a closer look.
 *   - **Note input** — the primary action. Big, autofocused.
 *   - Category chips — optional secondary tagging.
 *   - Sticky Cancel / Save footer.
 *
 * Save → finalizes the pending annotation and persists it.
 * Cancel → discards the pending annotation, returns to the overlay.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import {
  useArchLens,
  UX_CATEGORIES,
  UX_CATEGORY_DESCRIPTIONS,
  type UxCategory,
} from "../state/context";
import { colors, radius, shadow } from "../theme";

// The thumbnail now takes the full content width so the reviewer can
// clearly see the cropped close-up. Capped at 320 so it doesn't get
// silly-large on tablets. Square aspect — the crop region is centered
// inside it with subtle black bars if the element's bounding box
// isn't square.
const SHEET_PADDING_H = 20;
const THUMB_SIZE = Math.min(
  320,
  Dimensions.get("window").width - SHEET_PADDING_H * 2
);

const CROP_PADDING = 30; // px of surrounding context (in screen coords)

export function NoteModal(): React.ReactElement | null {
  const { pending, setPending, saveAnnotation } = useArchLens();
  const [note, setNote] = useState<string>("");
  const [category, setCategory] = useState<UxCategory | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Scroll the note input above the keyboard when it gets focus, so
  // the reviewer can actually see what they're writing.
  //
  // Two pieces work together:
  //   1. We track the live keyboard height and add it to the
  //      ScrollView's bottom padding only while the keyboard is open.
  //      This gives the scroll room to move the input near the top of
  //      the visible area — without it, scrollTo would bottom out
  //      before the input reached the desired position. When the
  //      keyboard closes, the padding goes back to 16 so the user
  //      doesn't see a big empty space below "Category".
  //   2. onLayout captures the Y position of the note wrapper inside
  //      the ScrollView's content. onFocus then scrollTo's that Y
  //      (minus a small margin so the label is still visible).
  const scrollRef = useRef<ScrollView | null>(null);
  const noteWrapperYRef = useRef<number>(0);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function onNoteLayout(e: LayoutChangeEvent): void {
    noteWrapperYRef.current = e.nativeEvent.layout.y;
  }
  function scrollNoteIntoView(): void {
    // Delay long enough for the keyboard's show event to fire and the
    // extra bottom padding to be applied — otherwise scrollTo clamps
    // to the old (shorter) content height.
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, noteWrapperYRef.current - 16),
        animated: true,
      });
    }, 250);
  }

  // Reset state whenever a new pending annotation arrives.
  const pendingId = pending?.id ?? null;
  useEffect(() => {
    setNote("");
    setCategory(null);
  }, [pendingId]);

  // Memoize the data-URI so the Image doesn't re-decode the base64 on
  // every render.
  const imageSource = useMemo(
    () =>
      pending
        ? { uri: "data:image/png;base64," + pending.screenshotBase64 }
        : { uri: "" },
    [pending?.screenshotBase64, pending]
  );

  if (!pending) return null;

  const screenWidth = pending.screenDimensions.width || 390;
  const screenHeight = pending.screenDimensions.height || 800;
  const b = pending.element.bounds;

  // Build a zoomed-in CROP of the highlighted element instead of
  // showing the whole page squished into a tiny thumbnail. The crop
  // is the element + a ~30px padding ring, scaled to fit a square
  // 96px box. The reviewer actually sees what they captured.
  //
  // Algorithm:
  //   1. crop rect = element bounds + padding, clamped to the screen.
  //   2. scale to fit inside the square thumb.
  //   3. position the screenshot inside an `overflow:hidden` clip so
  //      only the cropped region shows.
  //   4. the highlight overlay sits at the same scale, on top.
  const cropL = Math.max(0, b.x - CROP_PADDING);
  const cropT = Math.max(0, b.y - CROP_PADDING);
  const cropR = Math.min(screenWidth, b.x + b.width + CROP_PADDING);
  const cropB = Math.min(screenHeight, b.y + b.height + CROP_PADDING);
  const cropW = Math.max(1, cropR - cropL);
  const cropH = Math.max(1, cropB - cropT);
  const cropScale = Math.min(THUMB_SIZE / cropW, THUMB_SIZE / cropH);

  // Center the (possibly off-aspect) crop inside the square thumb.
  const fitW = cropW * cropScale;
  const fitH = cropH * cropScale;
  const offsetX = (THUMB_SIZE - fitW) / 2;
  const offsetY = (THUMB_SIZE - fitH) / 2;

  // Underlying image: positioned so the crop region lands in the
  // visible portion of the clip.
  const imageWidth = screenWidth * cropScale;
  const imageHeight = screenHeight * cropScale;
  const imageLeft = offsetX - cropL * cropScale;
  const imageTop = offsetY - cropT * cropScale;

  // Highlight: where the element sits inside the clip.
  const boxStyle = {
    left: offsetX + (b.x - cropL) * cropScale,
    top: offsetY + (b.y - cropT) * cropScale,
    width: Math.max(b.width * cropScale, 3),
    height: Math.max(b.height * cropScale, 3),
  };

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

          {/* Whole content scrolls together — title, thumb strip,
              note, and category. Only the handle (above) and the
              Cancel/Save footer (below) stay fixed. */}
          <ScrollView
            ref={scrollRef}
            style={styles.scrollArea}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 16 + keyboardHeight },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>New annotation</Text>

            {/* Small inline label — element + screen */}
            <Text style={styles.contextLine} numberOfLines={1}>
              <Text style={styles.contextName}>
                {"<" + pending.element.componentName + ">"}
              </Text>
              <Text style={styles.contextMeta}>
                {"  ·  " + pending.screenName}
              </Text>
            </Text>

            {/* Big zoomed-in crop of the element — full content width. */}
            <View style={styles.thumb}>
              <Image
                source={imageSource}
                style={{
                  position: "absolute",
                  left: imageLeft,
                  top: imageTop,
                  width: imageWidth,
                  height: imageHeight,
                }}
                resizeMode="cover"
                fadeDuration={0}
              />
              <View
                style={[styles.thumbBox, boxStyle]}
                pointerEvents="none"
              />
            </View>

            {/* Note — the primary action. The wrapper's onLayout
                captures the Y position inside the ScrollView so we
                can scroll the input above the keyboard when the
                reviewer taps it. */}
            <View onLayout={onNoteLayout}>
              <Text style={styles.label}>What's wrong with this element?</Text>
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholder="Describe the issue you spotted…"
                placeholderTextColor="#9CA3AF"
                multiline={true}
                numberOfLines={5}
                onFocus={scrollNoteIntoView}
              />
            </View>

            {/* Category — optional secondary tag */}
            <Text style={[styles.label, styles.labelSecondary]}>
              Category <Text style={styles.labelMuted}>(optional)</Text>
            </Text>
            <View style={styles.chipRow}>
              {UX_CATEGORIES.map((c) => {
                const selected = category === c;
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={
                      c + ". " + UX_CATEGORY_DESCRIPTIONS[c]
                    }
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
            {category ? (
              <Text style={styles.chipHint} numberOfLines={2}>
                {UX_CATEGORY_DESCRIPTIONS[category]}
              </Text>
            ) : null}
          </ScrollView>

          {/* Sticky footer */}
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
                {saving ? "Saving…" : "Save"}
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
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 14,
  },

  // ----- Inline info line + big square crop -----
  contextLine: {
    marginBottom: 10,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignSelf: "center",
    backgroundColor: "#000",
    borderRadius: radius.box,
    overflow: "hidden",
    position: "relative",
    marginBottom: 18,
  },
  thumbBox: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.highlight,
    backgroundColor: colors.highlightFill,
    borderRadius: 2,
  },
  contextName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  contextMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  // ----- Scrollable content -----
  scrollArea: {
    // Lets the ScrollView take only as much room as it needs; the
    // footer below stays anchored to the bottom of the sheet.
  },
  scrollContent: {
    paddingHorizontal: 20,
    // Base bottom padding only. The real scrollable buffer is added
    // dynamically (= keyboard height) on top of this when the
    // keyboard is open — see contentContainerStyle in render. That
    // way there's no permanent empty space below "Category" when the
    // keyboard is closed.
  },

  // ----- Labels / chips / input -----
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 8,
  },
  labelSecondary: {
    marginTop: 18,
    color: colors.inkSoft,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  labelMuted: {
    fontWeight: "500",
    color: colors.muted,
    textTransform: "none",
    letterSpacing: 0,
  },
  input: {
    width: "100%",
    minHeight: 130,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.box,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  chipPressed: { backgroundColor: "#f3f4f6" },
  chipSelected: {
    backgroundColor: colors.highlight,
    borderColor: colors.highlight,
  },
  chipText: { fontSize: 12, color: colors.inkSoft, fontWeight: "600" },
  chipTextSelected: { color: colors.white },
  chipHint: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: "italic",
    marginTop: 6,
    marginBottom: 18,
  },

  // ----- Sticky footer -----
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#ffffff",
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
