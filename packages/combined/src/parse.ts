/**
 * Read each input format into a strongly-typed shape.
 *
 * - Statik report: a JSON file produced by `archlens-statik analyze`
 *   (or the backend's report endpoint).
 * - Runtime verified report: a Markdown file produced by
 *   `@archlens/verify`. We only need the JSON appendix at the
 *   bottom plus the per-issue verdicts written into the body — we
 *   don't reparse screenshots here, that's verify's job.
 */

import * as fs from "node:fs";
import type {
  RuntimeIssueSummary,
  RuntimeReport,
  StatikReport,
} from "./types";

export function parseStatikReport(jsonPath: string): StatikReport {
  const raw = fs.readFileSync(jsonPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      "Failed to parse statik report at " +
        jsonPath +
        ": " +
        (err instanceof Error ? err.message : String(err))
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      "Statik report at " + jsonPath + " did not parse as a JSON object."
    );
  }
  // Light validation — we don't enforce the full schema; if the file
  // is missing fields we surface them as undefined rather than throw.
  return parsed as StatikReport;
}

const APPENDIX_RE = /```json\s+([\s\S]*?)```/g;

interface AppendixShape {
  schema: string;
  projectName: string;
  sessionId: string;
  generatedAt: string;
  annotations: Array<{
    id: string;
    note: string;
    element: { componentName: string; fileName?: string; lineNumber?: number };
    screenName: string;
  }>;
}

/**
 * Extracts the JSON appendix and per-issue verdict lines from a
 * verified Markdown report.
 */
export function parseRuntimeReport(markdownPath: string): RuntimeReport {
  const raw = fs.readFileSync(markdownPath, "utf8");

  const appendix = extractLastAppendix(raw);
  if (!appendix) {
    throw new Error(
      "Could not find a runtime-export@1 JSON appendix in " +
        markdownPath +
        ". This must be a Markdown file produced by @archlens/runtime."
    );
  }

  const verdicts = extractVerdicts(raw);

  const issues: RuntimeIssueSummary[] = appendix.annotations.map((a, i) => {
    const index = i + 1;
    const v = verdicts.get(index);
    const source =
      a.element.fileName && a.element.lineNumber
        ? a.element.fileName + ":" + a.element.lineNumber
        : a.element.fileName;

    return {
      index,
      id: a.id,
      componentName: a.element.componentName,
      source,
      screenName: a.screenName,
      note: a.note,
      verdict: v?.verdict ?? "uncertain",
      reasoning: v?.reasoning ?? "(unverified)",
      verifiedAt: v?.verifiedAt ?? "",
    };
  });

  return {
    projectName: appendix.projectName,
    sessionId: appendix.sessionId,
    generatedAt: appendix.generatedAt,
    issues,
  };
}

/* ---------------- internals ---------------- */

function extractLastAppendix(markdown: string): AppendixShape | null {
  const matches: string[] = [];
  let m: RegExpExecArray | null;

  APPENDIX_RE.lastIndex = 0;
  while ((m = APPENDIX_RE.exec(markdown)) !== null) {
    if (m[1]) matches.push(m[1]);
  }

  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(matches[i]!) as AppendixShape;
      if (parsed && parsed.schema && parsed.annotations) return parsed;
    } catch {
      continue;
    }
  }
  return null;
}

interface ParsedVerdict {
  verdict: "verified" | "rejected" | "uncertain" | "no-after";
  reasoning: string;
  verifiedAt: string;
}

/**
 * Walk the Markdown looking for `<a id="issue-N"></a>` anchors,
 * then read the verdict block written by the verify CLI directly
 * underneath each one.
 */
function extractVerdicts(markdown: string): Map<number, ParsedVerdict> {
  const out = new Map<number, ParsedVerdict>();

  const anchorRe = /<a id="issue-(\d+)"><\/a>/g;
  let m: RegExpExecArray | null;
  anchorRe.lastIndex = 0;

  while ((m = anchorRe.exec(markdown)) !== null) {
    const idx = Number.parseInt(m[1]!, 10);
    if (!Number.isFinite(idx)) continue;

    const start = m.index;
    const nextAnchor = markdown.indexOf('<a id="issue-', start + m[0].length);
    const end = nextAnchor === -1 ? markdown.length : nextAnchor;
    const segment = markdown.slice(start, end);

    const verdict = oneOf(
      segment,
      /\*\*AI verdict:\*\*\s*(verified|rejected|uncertain|no after screenshot)/i
    );
    if (!verdict) continue;

    const normalizedVerdict =
      verdict.toLowerCase() === "no after screenshot"
        ? ("no-after" as const)
        : (verdict.toLowerCase() as ParsedVerdict["verdict"]);

    const reasoning =
      oneOf(segment, /\*\*AI reasoning:\*\*\s*([^\n]+)/) ?? "";
    const verifiedAt = oneOf(segment, /\*\*Verified at:\*\*\s*([^\s]+)/) ?? "";

    out.set(idx, {
      verdict: normalizedVerdict,
      reasoning: reasoning.replace(/\s+$/, ""),
      verifiedAt,
    });
  }

  return out;
}

function oneOf(s: string, re: RegExp): string | null {
  const r = re.exec(s);
  return r && r[1] ? r[1] : null;
}
