/**
 * Full-screen overlay shown while annotation mode is active.
 *
 * It sits between the host app and the floating button. The overlay
 * is mostly transparent — the host app's UI is still visible — but
 * it intercepts every touch so we can run identification + capture
 * before the touch reaches the host.
 *
 * Flow:
 *   1. Reviewer taps the overlay at (pageX, pageY).
 *   2. We call identifyAtPoint(rootRef, x, y) → ElementInfo.
 *   3. We call captureScreenshot(rootRef) → base64 PNG.
 *   4. We hand the result to the context as a "pending" annotation,
 *      which causes the NoteModal to open for the reviewer to add a
 *      note.
 *
 * A small instructional banner sits at the top so the reviewer
 * always knows what state they're in.
 */

import React, { useState, type RefObject } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import { captureScreenshot } from "../capture/screenshot";
import { identifyAtPoint } from "../identify/identifyAtPoint";
import { getCurrentScreenName } from "../integrations/navigation";
import { useArchLens, type PendingAnnotation } from "../state/context";

export interface AnnotationOverlayProps {
  /**
   * Ref to the host-app View we want to identify against and
   * capture. Same view that <ArchLensProvider> wraps the children
   * with.
   */
  rootRef: RefObject<View | null>;
}

export function AnnotationOverlay({
  rootRef,
}: AnnotationOverlayProps): React.ReactElement | null {
  const { isAnnotating, setPending, pending } = useArchLens();
  const [busy, setBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hide the overlay when annotation mode is off, OR when a pending
  // annotation already exists (the NoteModal owns the screen then).
  if (!isAnnotating || pending !== null) return null;

  const handleTap = async (e: GestureResponderEvent): Promise<void> => {
    if (busy) return;
    const { pageX, pageY } = e.nativeEvent;

    setBusy(true);
    setErrorMsg(null);

    try {
      // Order matters: capture the screenshot FIRST, before any
      // state change re-renders the overlay. The overlay's
      // `pointerEvents="box-only"` setting lets touches through
      // while still being visible, but the screenshot will include
      // the overlay if we delay. So we capture immediately, then
      // do identification.
      const screenshotBase64 = await captureScreenshot(rootRef);
      const element = await identifyAtPoint(rootRef, pageX, pageY);

      if (!element) {
        setErrorMsg("Couldn't identify that element. Try tapping again.");
        setBusy(false);
        return;
      }

      const pending: PendingAnnotation = {
        id: makeId(),
        capturedAt: Date.now(),
        element,
        screenshotBase64,
        screenName: getCurrentScreenName(),
      };

      setPending(pending);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Capture failed.";
      setErrorMsg(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root} pointerEvents="box-only">
      <Pressable
        accessibilityLabel="Tap any element to annotate"
        style={styles.tapTarget}
        onPress={handleTap}
      >
        {/* Top instructional banner */}
        <View style={styles.banner} pointerEvents="none">
          <Text style={styles.bannerTitle}>Annotation mode</Text>
          <Text style={styles.bannerSubtitle}>
            Tap any element to capture it
          </Text>
        </View>

        {busy ? (
          <View style={styles.busyOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#ffffff" />
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

function makeId(): string {
  // Cheap, collision-resistant-enough id for a single dev session.
  return (
    "ann_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    // Above app, below FAB. FAB uses zIndex 9999.
    zIndex: 9000,
    elevation: 9,
  },
  tapTarget: {
    flex: 1,
    // Subtle red wash so the reviewer sees they're in capture mode.
    // Low alpha keeps the host UI readable underneath.
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(220, 38, 38, 0.95)",
    alignItems: "center",
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  bannerSubtitle: {
    color: "#ffffff",
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  busyOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  busyText: {
    color: "#ffffff",
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
    borderRadius: 8,
  },
  errorText: { color: "#fff", fontSize: 13 },
});
