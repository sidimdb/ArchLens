/**
 * @archlens/runtime — public API.
 *
 * Phase 3 surface:
 *   - <ArchLensProvider>      wraps the host app, mounts the FAB,
 *                             overlay, session menu, and note modal.
 *   - useArchLens()           read session state from any descendant.
 *   - setNavigationRef(ref)   optional opt-in for screen-name capture.
 *   - buildMarkdownReport()   pure function: annotations → Markdown.
 *                             Useful from non-RN code (verify CLI).
 *   - exportAndShareSession() write Markdown + JSON, open share sheet.
 *
 * Phase 4 will use buildMarkdownReport from the verify CLI to parse
 * existing reports and re-emit them with verification verdicts.
 */

export { ArchLensProvider } from "./components/ArchLensProvider";
export type { ArchLensProviderProps } from "./components/ArchLensProvider";

export { useArchLens, UX_CATEGORIES } from "./state/context";
export type {
  ArchLensContextValue,
  Annotation,
  PendingAnnotation,
  ElementInfo,
  ElementBounds,
  UxCategory,
} from "./state/context";

export { setNavigationRef } from "./integrations/navigation";

export {
  buildMarkdownReport,
  type MarkdownExportOptions,
} from "./export/markdown";
export {
  exportAndShareSession,
  type ExportResult,
} from "./export/share";

export const VERSION = "0.0.4";
