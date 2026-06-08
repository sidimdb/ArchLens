/**
 * @archlens/runtime — public API.
 *
 *   - <ArchLensProvider>      wraps the host app, mounts the FAB,
 *                             overlay, session menu, and note modal.
 *                             Pass projectKey + apiUrl to enable
 *                             cloud sync.
 *   - useArchLens()           read session state from any descendant.
 *   - setNavigationRef(ref)   optional opt-in for screen-name capture.
 *
 * The library is local-first: capture works fully offline. When cloud
 * config is supplied, the "Submit to dashboard" action ships pending
 * issues to the ArchLens cloud API as one audit session. Submitted
 * issues are immutable (chain-of-custody).
 */

export { ArchLensProvider } from "./components/ArchLensProvider";
export type { ArchLensProviderProps } from "./components/ArchLensProvider";

export {
  useArchLens,
  UX_CATEGORIES,
  UX_CATEGORY_DESCRIPTIONS,
} from "./state/context";
export type {
  ArchLensContextValue,
  Annotation,
  PendingAnnotation,
  ElementInfo,
  ElementBounds,
  UxCategory,
  SyncStatus,
} from "./state/context";

export { setNavigationRef } from "./integrations/navigation";

export const VERSION = "0.1.0";
