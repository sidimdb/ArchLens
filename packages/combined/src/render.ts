/**
 * Render the combined Markdown summary.
 *
 * Layout:
 *   1. Header (project, date, two scores side-by-side)
 *   2. Architectural Health
 *      - Score, grade, rule pass/fail table
 *      - Top 3 weakest rules
 *   3. UX Audit
 *      - Verdict counts
 *      - Per-issue table (only the meaningful columns)
 *   4. Combined Recommendations
 *      - Cherry-picks from both modes
 *
 * Either input is optional. If only the statik report is given, the
 * UX audit section is replaced with "Not yet captured." Same the
 * other way around.
 */

import type {
  RuntimeIssueSummary,
  RuntimeReport,
  StatikReport,
} from "./types";

export interface RenderOptions {
  projectName: string;
  statik: StatikReport | null;
  runtime: RuntimeReport | null;
}

export function buildCombinedReport(options: RenderOptions): string {
  const sections: string[] = [];

  sections.push(buildHeader(options));
  sections.push(buildStatikSection(options.statik));
  sections.push(buildRuntimeSection(options.runtime));
  sections.push(buildRecommendations(options.statik, options.runtime));

  return sections.join("\n");
}

/* ---------------- header ---------------- */

function buildHeader(options: RenderOptions): string {
  const archScore = options.statik
    ? Math.round(options.statik.overallScore) + "/100"
    : "—";
  const archGrade = options.statik?.grade ?? "—";

  const verdictCounts = options.runtime
    ? countVerdicts(options.runtime.issues)
    : null;
  const uxScore = verdictCounts
    ? verdictCounts.verified +
      "/" +
      options.runtime!.issues.length +
      " verified"
    : "—";

  const now = new Date();
  const isoDate = now.toISOString();
  const humanDate = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return [
    "# ArchLens — Combined Project Audit",
    "",
    "**Project:** " + options.projectName + "  ",
    "**Date:** " + humanDate + " (" + isoDate + ")",
    "",
    "| Mode | Score |",
    "|---|---|",
    "| Architectural Health | **" + archScore + "** (Grade " + archGrade + ") |",
    "| UX Audit | **" + uxScore + "** |",
    "",
    "---",
    "",
  ].join("\n");
}

/* ---------------- statik ---------------- */

function buildStatikSection(report: StatikReport | null): string {
  const lines: string[] = ["## Architectural Health", ""];

  if (!report) {
    lines.push("_No static analysis report supplied._");
    lines.push("", "---", "");
    return lines.join("\n");
  }

  const passed = report.rules.filter((r) => r.status === "pass").length;
  const failed = report.rules.filter((r) => r.status === "fail").length;
  const na = report.rules.filter(
    (r) => r.status === "not_applicable"
  ).length;
  const totalViolations = report.rules.reduce(
    (s, r) => s + r.violationCount,
    0
  );

  lines.push("**Overall:** " + Math.round(report.overallScore) + "/100, grade " + report.grade);
  lines.push(
    "**Project size:** " +
      report.project.fileCount +
      " files, " +
      (report.project.totalLoc?.toLocaleString?.() ??
        String(report.project.totalLoc)) +
      " LOC"
  );
  lines.push(
    "**Rules:** " +
      passed +
      " passed, " +
      failed +
      " failed, " +
      na +
      " n/a — " +
      totalViolations +
      " total violation(s)"
  );
  lines.push("");

  // Per-rule table
  lines.push("| Rule | Status | Score | Violations |");
  lines.push("|---|---|---|---|");
  for (const r of report.rules) {
    const glyph = ruleGlyph(r.status);
    lines.push(
      "| " +
        r.name +
        " | " +
        glyph +
        " " +
        r.status +
        " | " +
        Math.round(r.score) +
        " | " +
        r.violationCount +
        " |"
    );
  }
  lines.push("");

  // Weakest rules summary
  const weakest = [...report.rules]
    .filter((r) => r.status !== "not_applicable")
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  if (weakest.length > 0 && weakest[0]!.score < 100) {
    lines.push("**Weakest rules:**");
    for (const r of weakest) {
      lines.push(
        "- " + r.name + " — " + Math.round(r.score) + "/100"
      );
    }
    lines.push("");
  }

  lines.push("---", "");
  return lines.join("\n");
}

function ruleGlyph(status: "pass" | "fail" | "not_applicable"): string {
  if (status === "pass") return "✅";
  if (status === "fail") return "❌";
  return "➖";
}

/* ---------------- runtime ---------------- */

function buildRuntimeSection(report: RuntimeReport | null): string {
  const lines: string[] = ["## UX Audit", ""];

  if (!report) {
    lines.push("_No UX audit report supplied._");
    lines.push("", "---", "");
    return lines.join("\n");
  }

  if (report.issues.length === 0) {
    lines.push("_No UX issues captured in this session._");
    lines.push("", "---", "");
    return lines.join("\n");
  }

  const counts = countVerdicts(report.issues);

  lines.push("**Captured:** " + report.issues.length + " issue(s)");
  lines.push("**Session:** `" + report.sessionId + "`");
  lines.push("");
  lines.push("| Verdict | Count |");
  lines.push("|---|---|");
  lines.push("| ✅ verified | " + counts.verified + " |");
  lines.push("| ❌ rejected | " + counts.rejected + " |");
  lines.push("| ⚠️ uncertain | " + counts.uncertain + " |");
  lines.push("| ➖ no-after | " + counts["no-after"] + " |");
  lines.push("");

  lines.push("| # | Screen | Component | Note | Verdict |");
  lines.push("|---|---|---|---|---|");
  for (const issue of report.issues) {
    const truncatedNote = truncate(issue.note, 60);
    lines.push(
      "| " +
        issue.index +
        " | " +
        escapeMd(issue.screenName) +
        " | `<" +
        issue.componentName +
        ">` | " +
        escapeMd(truncatedNote) +
        " | " +
        verdictGlyph(issue.verdict) +
        " " +
        issue.verdict +
        " |"
    );
  }
  lines.push("");
  lines.push("---", "");
  return lines.join("\n");
}

function countVerdicts(issues: RuntimeIssueSummary[]): {
  verified: number;
  rejected: number;
  uncertain: number;
  "no-after": number;
} {
  const out = { verified: 0, rejected: 0, uncertain: 0, "no-after": 0 };
  for (const i of issues) out[i.verdict] += 1;
  return out;
}

function verdictGlyph(v: RuntimeIssueSummary["verdict"]): string {
  if (v === "verified") return "✅";
  if (v === "rejected") return "❌";
  if (v === "uncertain") return "⚠️";
  return "➖";
}

/* ---------------- recommendations ---------------- */

function buildRecommendations(
  statik: StatikReport | null,
  runtime: RuntimeReport | null
): string {
  const lines: string[] = ["## Recommendations", ""];

  const items: string[] = [];

  // From statik: include the worst non-passing rule (if any)
  if (statik) {
    const worst = [...statik.rules]
      .filter((r) => r.status === "fail")
      .sort((a, b) => a.score - b.score)[0];
    if (worst) {
      items.push(
        "**Architecture:** focus on **" +
          worst.name +
          "** (score " +
          Math.round(worst.score) +
          "). " +
          worst.explanation
      );
    }
  }

  // From runtime: rejected verdicts are "your fix didn't work"; surface them.
  if (runtime) {
    const rejected = runtime.issues.filter((i) => i.verdict === "rejected");
    for (const r of rejected.slice(0, 3)) {
      items.push(
        "**UX (rejected fix):** issue #" +
          r.index +
          " on `" +
          r.screenName +
          "` — " +
          r.reasoning
      );
    }

    const uncertain = runtime.issues.filter((i) => i.verdict === "uncertain");
    if (uncertain.length > 0) {
      items.push(
        "**UX (review needed):** " +
          uncertain.length +
          " issue(s) returned `uncertain` — manually verify them before shipping."
      );
    }
  }

  if (items.length === 0) {
    lines.push("_No outstanding recommendations. Everything passes._");
  } else {
    for (const item of items) lines.push("- " + item);
  }
  lines.push("");
  return lines.join("\n");
}

/* ---------------- helpers ---------------- */

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length <= n ? t : t.slice(0, n - 1) + "…";
}

function escapeMd(s: string): string {
  // Pipe needs escaping inside table cells; everything else is fine.
  return s.replace(/\|/g, "\\|");
}
