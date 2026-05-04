/**
 * @archlens/runtime — public API.
 *
 * Phase 1 surface:
 *   - <ArchLensProvider>     wraps the host app, mounts the floating
 *                            annotation button in dev mode.
 *   - useArchLens()          read session state from any descendant.
 *   - Annotation             type for captured UX issues (filled in P2).
 *
 * Phase 2 will add:
 *   - The tap-to-annotate overlay
 *   - Screenshot capture, route detection, component-source resolution
 *   - Note input modal
 *
 * Phase 3 will add:
 *   - exportSession()  → Markdown report ready for @archlens/verify.
 */

export { ArchLensProvider } from "./components/ArchLensProvider";
export type { ArchLensProviderProps } from "./components/ArchLensProvider";

export { useArchLens } from "./state/context";
export type {
  ArchLensContextValue,
  Annotation,
} from "./state/context";

export const VERSION = "0.0.1";
