/**
 * Markdown report generator.
 *
 * Pure: takes the in-memory annotations array and returns a single
 * Markdown string. No file I/O, no React, no dependencies — easy to
 * unit-test in isolation, easy to reuse from non-RN code (the verify
 * CLI in Phase 4 reads this format).
 *
 * Design choices:
 *   - Screenshots are embedded inline as base64 data URIs so the
 *     report is a single file the reviewer can email or open in any
 *     Markdown viewer.
 *   - A machine-readable JSON block at the bottom mirrors the same
 *     data, with screenshot omitted (those live in the inline images
 *     above). The verify CLI will use the JSON to find each issue
 *     by id and pair it with after-screenshots.
 *   - Each issue gets a stable `<a id="...">` anchor so we can link
 *     to specific issues from a verification summary later.
 *
 * The output format is intentionally close to what Emirhan's web
 * tool produces, so a developer who saw both has familiar muscle
 * memory.
 */

import type { Annotation } from "../state/context";

export interface MarkdownExportOptions {
  /** Friendly project / app name. Shown in the report header. */
  projectName?: string;
  /** Stable session id. Defaults to `session_<timestamp>`. */
  sessionId?: string;
  /**
   * If false, we omit the inline base64 screenshots. Useful when
   * exporting in two streams (markdown for review + screenshots as
   * separate files for the verify pipeline).
   */
  embedScreenshots?: boolean;
}

/**
 * Build a complete Markdown report for a set of annotations.
 */
export function buildMarkdownReport(
  annotations: Annotation[],
  options: MarkdownExportOptions = {}
): string {
  const projectName = options.projectName ?? "Untitled project";
  const sessionId = options.sessionId ?? "session_" + Date.now().toString(36);
  const embed = options.embedScreenshots ?? true;

  const sortedAnnotations = [...annotations].sort(
    (a, b) => a.capturedAt - b.capturedAt
  );

  const sections: string[] = [];

  sections.push(buildHeader(projectName, sessionId, sortedAnnotations.length));

  if (sortedAnnotations.length === 0) {
    sections.push(
      "_No annotations were captured in this session. Nothing to review._\n"
    );
  } else {
    sortedAnnotations.forEach((ann, i) => {
      sections.push(buildIssueSection(ann, i + 1, embed));
    });
  }

  sections.push(buildJsonAppendix(sortedAnnotations, projectName, sessionId));

  return sections.join("\n");
}

function buildHeader(
  projectName: string,
  sessionId: string,
  count: number
): string {
  const now = new Date();
  const isoDate = now.toISOString();
  const humanDate =
    now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return [
    "# UX Audit Report",
    "",
    "**Project:** " + escapeMd(projectName) + "  ",
    "**Date:** " + humanDate + " (" + isoDate + ")  ",
    "**Session ID:** `" + sessionId + "`  ",
    "**Total issues:** " + count,
    "",
    "---",
    "",
  ].join("\n");
}

function buildIssueSection(
  ann: Annotation,
  index: number,
  embed: boolean
): string {
  const headlineNote = truncate(ann.note, 80) || "(no note)";
  const sourceLine = ann.element.fileName
    ? ann.element.fileName +
      (ann.element.lineNumber ? ":" + ann.element.lineNumber : "")
    : "_unknown source_";

  const lines: string[] = [
    '<a id="issue-' + index + '"></a>',
    "## Issue #" + index + " — " + escapeMd(headlineNote),
    "",
    "**Screen:** " + escapeMd(ann.screenName) + "  ",
    "**Category:** " + (ann.category ? escapeMd(ann.category) : "_uncategorized_") + "  ",
    "**Component:** `<" + ann.element.componentName + ">`  ",
    "**Source:** `" + sourceLine + "`  ",
    "**Captured at:** " + new Date(ann.capturedAt).toISOString() + "  ",
    "**Status:** unverified",
    "",
    "**Reviewer note:**",
    "",
    blockquote(ann.note || "_(no note provided)_"),
    "",
    "**Element bounds:** x=" +
      Math.round(ann.element.bounds.x) +
      ", y=" +
      Math.round(ann.element.bounds.y) +
      ", w=" +
      Math.round(ann.element.bounds.width) +
      ", h=" +
      Math.round(ann.element.bounds.height),
    "",
  ];

  if (embed && ann.screenshotBase64) {
    lines.push("**Screenshot:**");
    lines.push("");
    lines.push(
      "![issue-" +
        index +
        "](data:image/png;base64," +
        ann.screenshotBase64 +
        ")"
    );
    lines.push("");
  } else {
    lines.push("**Screenshot:** _(omitted from this export)_");
    lines.push("");
  }

  lines.push("---", "");
  return lines.join("\n");
}

function buildJsonAppendix(
  annotations: Annotation[],
  projectName: string,
  sessionId: string
): string {
  // Strip screenshots from the JSON to keep the appendix small.
  // The verify CLI will pair annotations with separate after-images
  // by id, so it doesn't need the originals duplicated here.
  const slim = annotations.map((a) => ({
    id: a.id,
    capturedAt: a.capturedAt,
    note: a.note,
    category: a.category ?? null,
    element: a.element,
    screenName: a.screenName,
    // screenshotBase64 omitted on purpose — see comment above.
  }));

  const payload = {
    schema: "archlens-runtime-export@1",
    projectName,
    sessionId,
    generatedAt: new Date().toISOString(),
    annotations: slim,
  };

  return [
    "## Machine-readable export",
    "",
    "_The following block mirrors the data above in JSON form. " +
      "It exists so `@archlens/verify` and other downstream tools can " +
      "parse the report without scraping Markdown._",
    "",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "",
  ].join("\n");
}

/* ---------- small helpers ---------- */

function escapeMd(s: string): string {
  // We're not trying to be a full Markdown sanitizer — just stop
  // common breakers (backticks in component names, brackets in notes)
  // from corrupting the output.
  return s.replace(/([\\`*_{}\[\]()#+\-!])/g, "\\$1");
}

function blockquote(s: string): string {
  return s
    .split("\n")
    .map((line) => "> " + line)
    .join("\n");
}

function truncate(s: string, n: number): string {
  const trimmed = s.trim();
  if (trimmed.length <= n) return trimmed;
  return trimmed.slice(0, n - 1).trimEnd() + "…";
}
