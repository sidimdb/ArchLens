/**
 * Full-screen overlay shown while UX-Audit annotation mode is active.
 *
 * It sits between the host app and the floating button. Two phases:
 *
 *   AIM phase — the overlay is mostly transparent (host UI visible)
 *   but intercepts touches. On tap we capture a clean screenshot,
 *   then probe the full element hierarchy under the finger.
 *
 *   REFINE phase — a live "inspector": the selected element is
 *   spotlighted on the real screen (everything else dimmed) and a
 *   bottom control bar lets the reviewer step UP (broader / parent)
 *   or DOWN (more specific / child) through the ancestor chain, with
 *   live "N up · N down" counts. Confirm hands the chosen level to the
 *   NoteModal; Cancel returns to the aim phase.
 *
 * The screenshot is taken at tap time — before the spotlight + control
 * bar render — so neither ends up in the captured image.
 */

import React, { useEffect, useState, type RefObject } from "react";
import {
  ActivityIndicator,
  Dimensions,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
  type GestureResponderEvent,
} from "react-native";

// LayoutAnimation works on iOS out of the box, but Android needs an
// explicit opt-in. Safe to call multiple times; UIManager guards.
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { captureScreenshot } from "../capture/screenshot";
import { identifyHierarchyAtPoint } from "../identify/identifyAtPoint";
import { getCurrentScreenName } from "../integrations/navigation";
import {
  useArchLens,
  type ElementInfo,
  type PendingAnnotation,
  type ScreenDimensions,
} from "../state/context";
import { colors, radius, shadow, layers } from "../theme";

export interface AnnotationOverlayProps {
  /**
   * Ref to the host-app View we identify against and capture. Same
   * view that <ArchLensProvider> wraps the children with.
   */
  rootRef: RefObject<View | null>;
}

/** Transient state for the live refine phase. */
interface RefineState {
  candidates: ElementInfo[];
  index: number;
  screenshotBase64: string;
  screenName: string;
  screenDimensions: ScreenDimensions;
}

export function AnnotationOverlay({
  rootRef,
}: AnnotationOverlayProps): React.ReactElement | null {
  const { isAnnotating, setPending, pending, setInspecting } = useArchLens();
  const [busy, setBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refine, setRefine] = useState<RefineState | null>(null);
  // Where the inspector control bar sits. Auto-flips to "top" when the
  // selected element is near the bottom of the screen so the bar
  // never covers the highlight box. See `computeBarPosition` below.
  const [barAtTop, setBarAtTop] = useState<boolean>(false);

  // Drop any in-progress refinement if annotation mode is turned off.
  useEffect(() => {
    if (!isAnnotating) setRefine(null);
  }, [isAnnotating]);

  // Reset the bar to "bottom" each time a fresh refine starts.
  useEffect(() => {
    if (refine === null) setBarAtTop(false);
  }, [refine === null]);

  // Auto-flip on selection change. Hysteresis (different thresholds
  // for "flip up" vs "flip back down") keeps the bar from oscillating
  // when bounds hover near the boundary.
  useEffect(() => {
    if (!refine) return;
    const current = refine.candidates[refine.index];
    if (!current) return;
    const next = computeBarPosition(current.bounds, barAtTop);
    if (next !== barAtTop) {
      LayoutAnimation.configureNext({
        duration: 220,
        update: { type: "easeInEaseOut" },
        create: { type: "easeInEaseOut", property: "opacity" },
      });
      setBarAtTop(next);
    }
  }, [refine, barAtTop]);

  // Tell the rest of the UI (the FAB) when the control bar is up so it
  // can get out of the way.
  useEffect(() => {
    setInspecting(refine !== null);
  }, [refine, setInspecting]);

  // Hide the overlay when annotation mode is off, OR when a pending
  // annotation already exists (the NoteModal owns the screen then).
  if (!isAnnotating || pending !== null) return null;

  const handleTap = async (e: GestureResponderEvent): Promise<void> => {
    if (busy) return;
    const { pageX, pageY } = e.nativeEvent;

    setBusy(true);
    setErrorMsg(null);

    try {
      // Capture FIRST — before the spotlight / control bar render —
      // so the captured image is the clean host UI.
      const screenshotBase64 = await captureScreenshot(rootRef);
      const pick = await identifyHierarchyAtPoint(rootRef, pageX, pageY);

      const window = Dimensions.get("window");
      setRefine({
        candidates: pick.candidates,
        index: pick.bestIndex,
        screenshotBase64,
        screenName: getCurrentScreenName(),
        screenDimensions: { width: window.width, height: window.height },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Capture failed.";
      setErrorMsg(message);
    } finally {
      setBusy(false);
    }
  };

  // ---------- REFINE phase ----------
  if (refine) {
    const { candidates, index } = refine;
    const current = candidates[index]!;
    const downAvailable = index; // more specific levels (toward leaf)
    const upAvailable = candidates.length - 1 - index; // broader (toward root)

    const goUp = (): void =>
      setRefine((r) =>
        r ? { ...r, index: Math.min(r.index + 1, r.candidates.length - 1) } : r
      );
    const goDown = (): void =>
      setRefine((r) => (r ? { ...r, index: Math.max(r.index - 1, 0) } : r));

    const onConfirm = (): void => {
      // Breadcrumb from screen root down to the selected element.
      // candidates is leaf→root; everything from `index` onward is
      // the selected element + its ancestors; reverse → root → leaf.
      const hierarchyPath = refine.candidates
        .slice(refine.index)
        .reverse()
        .map((c) => c.componentName);
      const elementType = inferElementType(refine.candidates);

      const annotation: PendingAnnotation = {
        id: makeId(),
        capturedAt: Date.now(),
        element: current,
        screenshotBase64: refine.screenshotBase64,
        screenName: refine.screenName,
        screenDimensions: refine.screenDimensions,
        hierarchyPath,
        elementType,
      };
      setRefine(null);
      setPending(annotation);
    };

    const onCancelRefine = (): void => {
      setRefine(null);
      setErrorMsg(null);
    };

    const sourceLabel = current.fileName
      ? current.fileName.split(/[\\/]/).pop()! +
        (current.lineNumber ? ":" + current.lineNumber : "")
      : "no source map";

    return (
      <View style={styles.root} pointerEvents="box-none">
        {/*
          Touch absorber — locks the host app while the inspector is
          up. The user can interact with the control bar (its
          Pressables claim the responder first as the deepest target),
          but every other tap, drag, or scroll gesture is swallowed
          here and never reaches the host. This keeps the highlight
          box always aligned with the element underneath; the only
          way to navigate the host is Cancel → re-tap.
        */}
        <View
          style={StyleSheet.absoluteFillObject}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
        />
        <Spotlight bounds={current.bounds} />
        <ElementTag bounds={current.bounds} name={current.componentName} />

        {/* Inspector control bar — position auto-flips when the
            selected element would otherwise be covered. */}
        <View
          style={[
            styles.controlBar,
            barAtTop ? styles.controlBarTop : styles.controlBarBottom,
          ]}
        >
          <View style={styles.barHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.liveDot} />
              <Text style={styles.headerLabel}>INSPECTING</Text>
            </View>
            {/* Depth ladder: leftmost dot = most specific element,
                rightmost = broadest. The filled dot is where you are. */}
            <View style={styles.ladder}>
              {candidates.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.ladderDot,
                    i === index && styles.ladderDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          <Text style={styles.controlName} numberOfLines={1}>
            {current.componentName}
          </Text>
          <Text style={styles.controlSource} numberOfLines={1}>
            {sourceLabel}
            {"   ·   " +
              Math.round(current.bounds.width) +
              "×" +
              Math.round(current.bounds.height)}
          </Text>

          <View style={styles.stepRow}>
            <StepButton
              label="▲ Parent"
              sub={upAvailable + " up"}
              disabled={upAvailable === 0}
              onPress={goUp}
            />
            <StepButton
              label="▼ Child"
              sub={downAvailable + " down"}
              disabled={downAvailable === 0}
              onPress={goDown}
            />
          </View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.actionBtn,
                styles.cancelBtn,
                pressed && styles.pressed,
              ]}
              onPress={onCancelRefine}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.actionBtn,
                styles.confirmBtn,
                pressed && styles.pressed,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>Annotate this</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ---------- AIM phase ----------
  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel="Tap any element to inspect and annotate it"
        style={styles.tapTarget}
        onPress={handleTap}
      >
        <View style={styles.banner} pointerEvents="none">
          <Text style={styles.bannerTitle}>UX Audit · Inspect mode</Text>
          <Text style={styles.bannerSubtitle}>
            Tap any element to select it
          </Text>
        </View>

        {busy ? (
          <View style={styles.busyOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={styles.busyText}>Capturing…</Text>
          </View>
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBanner} pointerEvents="none">
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

/**
 * Dim everything except the selected element by drawing four scrim
 * rectangles around its bounds — the classic inspector "spotlight".
 */
function Spotlight({
  bounds,
}: {
  bounds: ElementInfo["bounds"];
}): React.ReactElement {
  const { width: W, height: H } = Dimensions.get("window");
  // Snap bounds to whole pixels. RN's renderer (especially on Android)
  // rasterizes integer-pixel native views; if we draw the highlight at
  // a subpixel position the visible result can look 1–2 px off and
  // gaps appear between the four scrim rects and the highlight box.
  // Rounding eliminates that visual mismatch without changing the
  // stored bounds (those remain precise for the dashboard).
  const x = Math.round(Math.max(0, bounds.x));
  const y = Math.round(Math.max(0, bounds.y));
  const w = Math.round(Math.max(0, Math.min(bounds.width, W - x)));
  const h = Math.round(Math.max(0, Math.min(bounds.height, H - y)));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* top */}
      <View style={[styles.scrim, { top: 0, left: 0, right: 0, height: y }]} />
      {/* bottom */}
      <View
        style={[styles.scrim, { top: y + h, left: 0, right: 0, bottom: 0 }]}
      />
      {/* left */}
      <View style={[styles.scrim, { top: y, left: 0, width: x, height: h }]} />
      {/* right */}
      <View
        style={[styles.scrim, { top: y, left: x + w, right: 0, height: h }]}
      />
      {/* highlight border */}
      <View
        style={[
          styles.highlightBox,
          { left: x, top: y, width: w, height: h },
        ]}
      />
    </View>
  );
}

/** Small floating chip showing the component name, pinned to the box. */
function ElementTag({
  bounds,
  name,
}: {
  bounds: ElementInfo["bounds"];
  name: string;
}): React.ReactElement {
  const { height: H } = Dimensions.get("window");
  // Same pixel-snap as Spotlight so the tag sits flush against the box.
  const x = Math.round(Math.max(6, bounds.x));
  // Prefer above the box; flip below if it would clip off the top.
  const above = bounds.y > 34;
  const top = Math.round(
    above
      ? Math.max(0, bounds.y - 28)
      : Math.min(H - 28, bounds.y + bounds.height + 6)
  );
  return (
    <View style={[styles.tag, { left: x, top }]} pointerEvents="none">
      <Text style={styles.tagText} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

function StepButton({
  label,
  sub,
  disabled,
  onPress,
}: {
  label: string;
  sub: string;
  disabled: boolean;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepBtn,
        disabled && styles.stepBtnDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.stepLabel, disabled && styles.stepTextDisabled]}>
        {label}
      </Text>
      <Text style={[styles.stepSub, disabled && styles.stepTextDisabled]}>
        {sub}
      </Text>
    </Pressable>
  );
}

function makeId(): string {
  return (
    "ann_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

/**
 * Best-effort element-kind classification from the candidate chain.
 * Walks from leaf-most upward, returns the first match. Useful for
 * dashboard filtering and at-a-glance scanning ("text vs button vs
 * image"). Falls back to "component" if nothing matches.
 */
function inferElementType(candidates: ElementInfo[]): string {
  for (const c of candidates) {
    const n = c.componentName;
    if (n === "Text" || n === "RCTText") return "text";
    if (n === "Image" || n === "RCTImage" || n === "ImageBackground") {
      return "image";
    }
    if (
      n === "Pressable" ||
      n === "Button" ||
      n === "TouchableOpacity" ||
      n === "TouchableHighlight" ||
      n === "TouchableWithoutFeedback" ||
      n === "TouchableNativeFeedback"
    ) {
      return "button";
    }
    if (n === "TextInput" || n === "RCTTextInput") return "input";
    if (n === "Switch") return "toggle";
    if (
      n === "ScrollView" ||
      n === "RCTScrollView" ||
      n === "FlatList" ||
      n === "SectionList"
    ) {
      return "list";
    }
  }
  return "component";
}

/**
 * Decide whether the inspector control bar should sit at the bottom
 * (default) or flip to the top to avoid covering the selected element.
 *
 * Hysteresis: the "flip up" threshold is more aggressive than the
 * "flip back down" threshold, so a small change in selection that
 * straddles the boundary doesn't cause the bar to bounce.
 *
 * If the selected element is genuinely huge (covers both ends of the
 * screen — e.g. the whole "screen" rung), keep the bar at the
 * bottom: there's nowhere it can sit that doesn't overlap, and the
 * bottom is the standard place users expect it.
 */
function computeBarPosition(
  bounds: ElementInfo["bounds"],
  currentAtTop: boolean
): boolean {
  const { height: screenHeight } = Dimensions.get("window");
  // Rough vertical footprint of the bar at each position.
  const BAR_FOOTPRINT_BOTTOM = 240; // bottom area the bar occupies
  const BAR_FOOTPRINT_TOP = 130; // top area when flipped (status bar + bar)

  const elementBottom = bounds.y + bounds.height;
  const elementTop = bounds.y;

  const bottomBlocked = elementBottom > screenHeight - BAR_FOOTPRINT_BOTTOM;
  const topBlocked = elementTop < BAR_FOOTPRINT_TOP;

  if (currentAtTop) {
    // Sticky: only flip back to bottom once the element has clearly
    // cleared the bottom zone (extra ~70px buffer).
    const clearedBottom =
      elementBottom < screenHeight - BAR_FOOTPRINT_BOTTOM - 70;
    if (clearedBottom) return false;
    // If staying at top would now cover the element, prefer bottom
    // (better-of-two-evils for the giant-element case).
    if (topBlocked && !bottomBlocked) return false;
    return true;
  }

  // Currently at bottom.
  if (bottomBlocked && !topBlocked) return true;
  return false;
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: layers.overlay,
    elevation: layers.overlay,
  },
  tapTarget: {
    flex: 1,
    backgroundColor: "rgba(59, 130, 246, 0.06)",
  },
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.ink,
    alignItems: "center",
  },
  bannerTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  bannerSubtitle: {
    color: colors.whiteSoft,
    fontSize: 12,
    marginTop: 2,
  },
  busyOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  busyText: {
    color: colors.white,
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  errorBanner: {
    position: "absolute",
    bottom: 110,
    left: 20,
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: radius.box,
  },
  errorText: { color: colors.white, fontSize: 13 },

  // ----- Refine phase -----
  scrim: {
    position: "absolute",
    backgroundColor: colors.scrim,
  },
  highlightBox: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.highlight,
    backgroundColor: colors.highlightFill,
    borderRadius: 2,
  },
  tag: {
    position: "absolute",
    maxWidth: 220,
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.chip,
  },
  tagText: { color: colors.white, fontSize: 11, fontWeight: "700" },

  controlBar: {
    position: "absolute",
    left: 12,
    right: 12,
    backgroundColor: colors.ink,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    zIndex: layers.controlBar,
    ...shadow.float,
  },
  controlBarBottom: { bottom: 20 },
  // Sits below the status bar / notch area on most phones; 50 is a
  // safe default without pulling in safe-area-context here.
  controlBarTop: { top: 50 },
  barHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.highlight,
  },
  headerLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  ladder: { flexDirection: "row", alignItems: "center", gap: 4 },
  ladderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  ladderDotActive: {
    backgroundColor: colors.highlight,
    width: 16,
    borderRadius: 3,
  },
  controlName: { color: colors.white, fontSize: 16, fontWeight: "800" },
  controlSource: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: "monospace",
    marginTop: 2,
    marginBottom: 10,
  },
  stepRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  stepBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.box,
    paddingVertical: 8,
  },
  stepBtnDisabled: { backgroundColor: "rgba(255,255,255,0.03)" },
  stepLabel: { color: colors.white, fontSize: 13, fontWeight: "700" },
  stepSub: { color: colors.muted, fontSize: 11 },
  stepTextDisabled: { color: "rgba(255,255,255,0.25)" },

  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.box,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: { backgroundColor: "rgba(255,255,255,0.10)" },
  cancelText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  confirmBtn: { backgroundColor: colors.highlight },
  confirmText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.8 },
});
