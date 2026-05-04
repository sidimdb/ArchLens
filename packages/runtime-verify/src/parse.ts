/**
 * Parse a Phase-3 ArchLens Markdown report.
 *
 * The Markdown is structured but not standardized — we parse it by:
 *   1. Reading the `runtime-export@1` JSON appendix at the bottom
 *      for all the structured metadata (avoids regex-scraping the
 *      headings).
 *   2. Reading inline `![issue-N](data:image/png;base64,...)` lines
 *      to recover each issue's screenshot.
 *
 * If the JSON appendix is missing (older or hand-edited report), we
 * throw a clear error rather than guessing — the CLI then prints
 * something useful instead of a stack trace.
 */

import * as fs from "node:fs";
import type { ParsedReport, ReportIssue, ReportMetadata } from "./types";

interface JsonAppendix {
  schema: string;
  projectName: string;
  sessionId: string;
  generatedAt: string;
  annotations: Array<{
    id: string;
    capturedAt: number;
    note: string;
    element: {
      componentName: string;
      fileName?: string;
      lineNumber?: number;
    };
    screenName: string;
  }>;
}

const APPENDIX_RE = /```json\s+([\s\S]*?)```/g;
const SCREENSHOT_RE = /!\[issue-(\d+)\]\(data:image\/png;base64,([^)]+)\)/g;

export function parseReport(markdownPath: string): ParsedReport {
  const raw = fs.readFileSync(markdownPath, "utf8");

  const appendix = extractAppendix(raw);
  if (!appendix) {
    throw new Error(
      "Could not find an `archlens-runtime-export@1` JSON appendix in " +
        markdownPath +
        ". This CLI only understands reports produced by " +
        "@archlens/runtime v0.0.3 or newer."
    );
  }

  if (appendix.schema !== "archlens-runtime-export@1") {
    throw new Error(
      "Report uses unsupported schema `" +
        appendix.schema +
        "`. This CLI handles archlens-runtime-export@1."
    );
  }

  const screenshots = extractScreenshots(raw);

  const issues: ReportIssue[] = appendix.annotations.map((a, i) => {
    const index = i + 1;
    const beforeBase64 = screenshots.get(index);
    if (!beforeBase64) {
      throw new Error(
        "Issue #" +
          index +
          " is referenced in the JSON appendix but its inline screenshot " +
          "(![issue-" +
          index +
          "](data:image/png;base64,...)) was not found in the Markdown."
      );
    }

    const source =
      a.element.fileName && a.element.lineNumber
        ? a.element.fileName + ":" + a.element.lineNumber
        : a.element.fileName;

    return {
      index,
      id: a.id,
      note: a.note,
      componentName: a.element.componentName,
      source,
      screenName: a.screenName,
      capturedAt: new Date(a.capturedAt).toISOString(),
      beforeBase64,
    };
  });

  const metadata: ReportMetadata = {
    schema: appendix.schema,
    projectName: appendix.projectName,
    sessionId: appendix.sessionId,
    generatedAt: appendix.generatedAt,
  };

  return { metadata, issues, rawMarkdown: raw };
}

/**
 * Find the LAST ```json ... ``` block in the Markdown that parses
 * as the runtime-export schema. We pick the last block (rather than
 * first) because the appendix is appended at the bottom — finding
 * the last one is robust even if a reviewer pasted JSON inside a
 * note earlier in the file.
 */
function extractAppendix(markdown: string): JsonAppendix | null {
  const matches: string[] = [];
  let m: RegExpExecArray | null;

  // Reset regex state — global regexes are stateful in JS.
  APPENDIX_RE.lastIndex = 0;
  while ((m = APPENDIX_RE.exec(markdown)) !== null) {
    if (m[1]) matches.push(m[1]);
  }

  // Walk from the back, return the first one that parses as our schema.
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(matches[i]!) as JsonAppendix;
      if (parsed && parsed.schema && parsed.annotations) return parsed;
    } catch {
      continue;
    }
  }

  return null;
}

function extractScreenshots(markdown: string): Map<number, string> {
  const out = new Map<number, string>();
  let m: RegExpExecArray | null;

  SCREENSHOT_RE.lastIndex = 0;
  while ((m = SCREENSHOT_RE.exec(markdown)) !== null) {
    const index = Number.parseInt(m[1]!, 10);
    if (Number.isFinite(index)) out.set(index, m[2]!);
  }

  return out;
}
