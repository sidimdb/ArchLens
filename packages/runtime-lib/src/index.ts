/**
 * @archlens/runtime — ArchLens runtime UX audit library.
 *
 * Phase 0 scaffold. Real implementation begins in Phase 1.
 *
 * Public API surface (planned):
 *   - <ArchLensProvider>          wraps the host app, mounts the floating
 *                                 annotation button in dev mode.
 *   - useArchLens()               returns session state + control functions.
 *   - exportSession()             serializes captured annotations as Markdown.
 */

export const VERSION = "0.0.1";

/**
 * Placeholder so TypeScript treats this file as a module. Phase 1 replaces
 * this with the real <ArchLensProvider> component and supporting exports.
 */
export function __archlensRuntimePlaceholder(): string {
  return "archlens-runtime scaffold ready";
}
