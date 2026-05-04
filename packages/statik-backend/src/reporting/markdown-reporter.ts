/**
 * Markdown reporter.
 *
 * Produces a human-readable report that mirrors the JSON structure.
 * The frontend renders this as the "readable review" block so we
 * don't have to duplicate formatting logic in React.
 */

import { Report, RuleResult } from "../types";

function statusBadge(r: RuleResult): string {
  if (r.status === "pass") return "✅ PASS";
  if (r.status === "fail") return "❌ FAIL";
  return "➖ N/A";
}

function confidenceTag(c: RuleResult["confidence"]): string {
  return `confidence: ${c}`;
}

export function toMarkdown(report: Report): string {
  const lines: string[] = [];

  lines.push(`# Architectural Evaluation — ${report.project.name}`);
  lines.push("");
  lines.push(
    `**Overall Score:** ${report.overallScore} / 100 &nbsp;·&nbsp; **Grade:** ${report.grade}`
  );
  lines.push("");
  lines.push(
    `${report.project.fileCount} source files · ${report.project.totalLoc} LOC · ` +
      `generated ${new Date(report.generatedAt).toLocaleString()}`
  );
  lines.push("");

  lines.push("## Layer Breakdown");
  lines.push("");
  lines.push("| Layer | Files |");
  lines.push("|---|---|");
  const L = report.project.layerBreakdown;
  for (const key of Object.keys(L)) {
    const value = (L as Record<string, number>)[key];
    if (value > 0) lines.push(`| ${key} | ${value} |`);
  }
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(
    `**Strongest areas:** ${report.summary.strongest.join(", ") || "—"}`
  );
  lines.push(`**Weakest areas:** ${report.summary.weakest.join(", ") || "—"}`);
  lines.push("");

  lines.push("## Rules");
  lines.push("");
  for (const r of report.rules) {
    lines.push(`### ${statusBadge(r)} — ${r.name}`);
    lines.push("");
    lines.push(`_${r.description}_`);
    lines.push("");
    lines.push(
      `**Score:** ${r.score} / 100 &nbsp;·&nbsp; **Weight:** ${r.weight} &nbsp;·&nbsp; ${confidenceTag(r.confidence)}`
    );
    lines.push("");
    lines.push(r.explanation);
    lines.push("");

    if (r.violations.length > 0) {
      lines.push("**Violations:**");
      lines.push("");
      for (const v of r.violations.slice(0, 20)) {
        const loc = v.line ? `${v.file}:${v.line}` : v.file;
        lines.push(`- _[${v.severity}]_ **${loc}** — ${v.message}`);
      }
      if (r.violations.length > 20) {
        lines.push(
          `- …and ${r.violations.length - 20} more (see full JSON report).`
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
