/**
 * Session state for the runtime library.
 *
 * Phase 2 expands this to track captured annotations end-to-end:
 *   - the bounds + component info from the element identifier,
 *   - the base64 screenshot from the screen capture,
 *   - the reviewer's free-form note,
 *   - the screen / route name from React Navigation (if available),
 * all keyed by a stable id so the export Markdown can reference them.
 */

import { createContext, useContext } from "react";

/** Bounding box of an element in screen pixel coordinates. */
export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * What we know about the tapped element. fileName / lineNumber come
 * from React's `_debugSource` fiber metadata in dev builds. They may
 * be absent if the element is a host primitive (raw <View>) or built
 * by a library that doesn't preserve source maps — we degrade
 * gracefully instead of refusing to capture.
 */
export interface ElementInfo {
  componentName: string;
  fileName?: string;
  lineNumber?: number;
  bounds: ElementBounds;
}

/** A single captured UX issue. */
export interface Annotation {
  /** Stable id (uuid-ish) used in the exported Markdown. */
  id: string;
  /** When captured (ms since epoch). */
  capturedAt: number;
  /** Free-form note from the reviewer. */
  note: string;
  /** Tapped element metadata. */
  element: ElementInfo;
  /** Base64-encoded PNG of the full screen at capture time. */
  screenshotBase64: string;
  /**
   * Current screen / route name, read from React Navigation if the
   * host app is using it. "unknown" otherwise.
   */
  screenName: string;
}

/**
 * The "in-flight" annotation — captured but the reviewer hasn't yet
 * filled in the note. Held in transient state while the NoteModal
 * is open. Becomes a full Annotation when the reviewer hits Save.
 */
export interface PendingAnnotation {
  id: string;
  capturedAt: number;
  element: ElementInfo;
  screenshotBase64: string;
  screenName: string;
}

export interface ArchLensContextValue {
  /** True while the reviewer is in tap-to-annotate mode. */
  isAnnotating: boolean;
  /** Flip annotation mode on/off. Tapping the FAB calls this. */
  toggleAnnotating: () => void;

  /**
   * Captured but not yet noted. While this is non-null, the
   * NoteModal is shown.
   */
  pending: PendingAnnotation | null;
  /** Called by AnnotationOverlay after a successful tap+capture. */
  setPending: (p: PendingAnnotation | null) => void;

  /**
   * Finalize the pending annotation with a note, persist it, and
   * clear `pending`. Called by NoteModal's Save button.
   */
  saveAnnotation: (note: string) => Promise<void>;

  /** All annotations from the current session. */
  annotations: Annotation[];
  /** Wipe the session (for example after Export). */
  clearAnnotations: () => Promise<void>;
}

export const ArchLensContext = createContext<ArchLensContextValue | null>(
  null
);

/**
 * Read session state and controls from inside any component below
 * <ArchLensProvider>. Throws a helpful error if the consumer forgot
 * to wrap their app — easier to debug than `Cannot read undefined`.
 */
export function useArchLens(): ArchLensContextValue {
  const ctx = useContext(ArchLensContext);
  if (!ctx) {
    throw new Error(
      "useArchLens() must be used inside <ArchLensProvider>. " +
        "Wrap your app's root in <ArchLensProvider> from @archlens/runtime."
    );
  }
  return ctx;
}
