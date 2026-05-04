/**
 * @archlens/runtime — public API.
 *
 * Phase 2 surface:
 *   - <ArchLensProvider>      wraps the host app, mounts the FAB,
 *                             overlay, and note modal in dev mode.
 *   - useArchLens()           read session state from any descendant.
 *   - setNavigationRef(ref)   optional opt-in for screen-name capture
 *                             (host apps that use react-navigation).
 *   - Annotation              type for captured UX issues.
 *   - ElementInfo             type returned by the identifier.
 *
 * Phase 3 will add:
 *   - exportSession()         → Markdown report ready for @archlens/verify.
 */

export { ArchLensProvider } from "./components/ArchLensProvider";
export type { ArchLensProviderProps } from "./components/ArchLensProvider";

export { useArchLens } from "./state/context";
export type {
  ArchLensContextValue,
  Annotation,
  PendingAnnotation,
  ElementInfo,
  ElementBounds,
} from "./state/context";

export { setNavigationRef } from "./integrations/navigation";

export const VERSION = "0.0.2";
