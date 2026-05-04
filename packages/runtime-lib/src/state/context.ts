/**
 * Shared session state for the runtime library.
 *
 * Phase 1 only models the `isAnnotating` flag and the toggle, since
 * the floating button just flips a boolean. Phase 2 expands this to
 * track captured annotations (screenshot, component, note, ...).
 */

import { createContext, useContext } from "react";

/**
 * One captured UX issue. Phase 1 keeps this empty; populated in
 * Phase 2 once we wire up screen capture and component identification.
 */
export interface Annotation {
  /** Stable id (uuid-ish) so the export Markdown can reference it. */
  id: string;
  /** When the annotation was captured (ms since epoch). */
  capturedAt: number;
  /** Free-form note from the reviewer. Phase 2. */
  note: string;
  /** Screen / route name where the issue was found. Phase 2. */
  screenName?: string;
  /** Component name + source location, from React fiber. Phase 2. */
  componentPath?: string;
  /** Base64 PNG screenshot. Phase 2. */
  screenshotBase64?: string;
}

export interface ArchLensContextValue {
  /** True while the reviewer is in tap-to-annotate mode. */
  isAnnotating: boolean;
  /** Flip annotation mode on/off. */
  toggleAnnotating: () => void;
  /** All captured annotations in this session. Phase 2 fills this in. */
  annotations: Annotation[];
}

export const ArchLensContext = createContext<ArchLensContextValue | null>(null);

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
