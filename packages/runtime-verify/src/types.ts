/**
 * Shared types for the verify CLI.
 *
 * The "issue" type here is what we extract from a Phase-3 Markdown
 * report (annotation metadata + the embedded base64 screenshot).
 * Stays decoupled from `@archlens/runtime`'s in-memory `Annotation`
 * type so the CLI can be used against reports produced by future
 * versions of the runtime library too.
 */

export type Verdict = "verified" | "rejected" | "uncertain";

/**
 * One issue extracted from the report. Index is 1-based to match
 * the Markdown's `Issue #N` numbering.
 */
export interface ReportIssue {
  index: number;
  /** Stable id from the runtime-export@1 schema. */
  id: string;
  /** Reviewer's note. */
  note: string;
  /** Component name (e.g. "SaveButton"). */
  componentName: string;
  /** Source file:line, or undefined if unknown. */
  source?: string;
  /** Screen / route name. */
  screenName: string;
  /** ISO timestamp when captured. */
  capturedAt: string;
  /** Base64 PNG (no `data:` prefix). */
  beforeBase64: string;
}

export interface VerifiedIssue extends ReportIssue {
  verdict: Verdict | "no-after";
  reasoning: string;
  verifiedAt: string;
}

export interface ReportMetadata {
  schema: string;
  projectName: string;
  sessionId: string;
  generatedAt: string;
}

export interface ParsedReport {
  metadata: ReportMetadata;
  issues: ReportIssue[];
  /** The raw Markdown string, kept so we can rewrite it surgically. */
  rawMarkdown: string;
}
