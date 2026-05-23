/**
 * Shared visual constants for the ArchLens runtime UI.
 *
 * All the floating-UI surfaces (the "UX Audit" button, the capture
 * overlay, the element inspector control bar, the note modal, and the
 * session menu) pull from here so the tool looks like one coherent
 * product rather than five separately-styled widgets.
 */

export const colors = {
  /** Primary dark surface — FAB, control bar, save button. */
  ink: "#111827",
  inkSoft: "#374151",
  /** Capture / destructive accent. */
  danger: "#DC2626",
  dangerSoft: "#fef2f2",
  /** Inspector highlight — the box drawn around the selected element. */
  highlight: "#3B82F6",
  highlightFill: "rgba(59, 130, 246, 0.18)",
  /** Spotlight scrim that dims everything except the selected element. */
  scrim: "rgba(0, 0, 0, 0.45)",
  white: "#ffffff",
  whiteSoft: "rgba(255, 255, 255, 0.72)",
  muted: "#9CA3AF",
} as const;

export const radius = {
  pill: 24,
  card: 16,
  box: 10,
  chip: 6,
} as const;

export const shadow = {
  // Cross-platform float: elevation (Android) + shadow* (iOS).
  float: {
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
} as const;

/** zIndex / elevation layering, lowest → highest. */
export const layers = {
  overlay: 9000,
  controlBar: 9500,
  fab: 9999,
} as const;
