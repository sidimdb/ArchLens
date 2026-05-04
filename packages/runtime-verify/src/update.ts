/**
 * Rewrite a parsed Markdown report with verification verdicts.
 *
 * Two changes per issue:
 *   1. Replace the line `**Status:** unverified` with a colored
 *      status line plus AI verdict + reasoning + timestamp.
 *   2. Add a "Verification Summary" section above the JSON
 *      appendix at the end of the document.
 *
 * We do not modify the JSON appendix itself — Phase 4 keeps the
 * source-of-truth in the `runtime-export@1` schema unchanged so a
 * report can be re-verified later. The verdicts live in the
 * Markdown only; if you re-export from a fresh annotation session
 * the original JSON is reproducible.
 */

import type { ParsedReport, VerifiedIssue, Verdict } from "./types";

interface VerdictGlyph {
  emoji: string;
  label: string;
}

const GLYPHS: Record<Verdict | "no-after", VerdictGlyph> = {
  verified: { emoji: "✅", label: "verified" },
  rejected: { emoji: "❌", label: "rejected" },
  uncertain: { emoji: "⚠️", label: "uncertain" },
  "no-after": { emoji: "➖", label: "no after screenshot" },
};

export function buildVerifiedMarkdown(
  report: ParsedReport,
  verified: VerifiedIssue[],
  modelName: string
): string {
  const verdictById = new Map<string, VerifiedIssue>();
  for (const v of verified) verdictById.set(v.id, v);

  const updated = rewriteStatusLines(report.rawMarkdown, verified);
  const summary = buildSummarySection(verified, modelName);

  // Insert the summary just before the "## Machine-readable export"
  // heading, so the JSON appendix stays at the very end.
  return insertSummaryBeforeAppendix(updated, summary);
}

function rewriteStatusLines(
  markdown: string,
  verified: VerifiedIssue[]
): string {
  // Walk issue-by-issue. We only target the FIRST occurrence of
  // `**Status:** unverified` per issue heading, so we replace the
  // status block per issue without disturbing the rest.
  let out = markdown;

  for (const v of verified) {
    const glyph = GLYPHS[v.verdict];
    const replacement = [
      "**Status:** " + glyph.emoji + " " + glyph.label + "  ",
      "**AI verdict:** " + v.verdict + "  ",
      "**AI reasoning:** " + escapeForLine(v.reasoning) + "  ",
      "**Verified at:** " + v.verifiedAt,
    ].join("\n");

    // Anchor to this issue's section: find the `<a id="issue-N">`
    // anchor, then replace the next `**Status:** unverified` after it.
    const anchor = '<a id="issue-' + v.index + '"></a>';
    const anchorPos = out.indexOf(anchor);
    if (anchorPos === -1) continue;

    const statusPos = out.indexOf("**Status:** unverified", anchorPos);
    if (statusPos === -1) continue;

    out =
      out.slice(0, statusPos) +
      replacement +
      out.slice(statusPos + "**Status:** unverified".length);
  }

  return out;
}

function buildSummarySection(
  verified: VerifiedIssue[],
  modelName: string
): string {
  const counts: Record<Verdict | "no-after", number> = {
    verified: 0,
    rejected: 0,
    uncertain: 0,
    "no-after": 0,
  };
  for (const v of verified) counts[v.verdict] += 1;

  const lines: string[] = [];
  lines.push("## Verification Summary");
  lines.push("");
  lines.push("| Verdict | Count |");
  lines.push("|---|---|");
  for (const k of ["verified", "rejected", "uncertain", "no-after"] as const) {
    const g = GLYPHS[k];
    lines.push("| " + g.emoji + " " + g.label + " | " + counts[k] + " |");
  }
  lines.push("");
  lines.push(
    "_Verified by " +
      modelName +
      " at " +
      new Date().toISOString() +
      "._"
  );
  lines.push("");
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function insertSummaryBeforeAppendix(
  markdown: string,
  summary: string
): string {
  const heading = "## Machine-readable export";
  const idx = markdown.indexOf(heading);
  if (idx === -1) {
    // No appendix found — append summary at the end.
    return markdown + "\n" + summary;
  }
  return markdown.slice(0, idx) + summary + markdown.slice(idx);
}

/** Collapse newlines so a multi-line reasoning fits on one MD line. */
function escapeForLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
