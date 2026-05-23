#!/usr/bin/env node
/**
 * @archlens/verify CLI.
 *
 * Reads a Phase-3 ArchLens Markdown report, pairs each issue's
 * before-screenshot with a developer-supplied after-screenshot,
 * sends the pair plus the reviewer's note to Claude vision, and
 * rewrites the Markdown with verdicts + a summary.
 *
 * Usage:
 *   archlens-verify --report <ux-audit.md>
 *                   --after  <directory of after PNGs>
 *                   [--out   <output path>]
 *                   [--dry-run]
 *
 * After-screenshot naming convention:
 *   <after-dir>/issue-1.png, issue-2.png, ...
 *
 * --dry-run skips the API call and produces alternating
 * verified/uncertain verdicts. Use it before you have an Anthropic
 * API key, or to test the rewrite without burning tokens.
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";

import { DEFAULT_MODEL, getModel } from "@archlens/ai-client";
import { parseReport } from "./parse";
import type { RawVerdict } from "./verify";
import { verifyIssue } from "./verify";
import { buildVerifiedMarkdown } from "./update";
import type { ReportIssue, VerifiedIssue } from "./types";

interface Args {
  reportPath: string;
  afterDir: string;
  outPath: string | null;
  dryRun: boolean;
  verbose: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = { dryRun: false, verbose: false, outPath: null };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--report") out.reportPath = argv[++i];
    else if (a === "--after") out.afterDir = argv[++i];
    else if (a === "--out") out.outPath = argv[++i] ?? null;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--verbose" || a === "-v") out.verbose = true;
    else if (a === "--help" || a === "-h") {
      printHelpAndExit(0);
    } else {
      console.error("Unknown argument: " + a);
      printHelpAndExit(2);
    }
  }

  if (!out.reportPath || !out.afterDir) {
    console.error("Missing --report and/or --after arguments.");
    printHelpAndExit(2);
  }

  return out as Args;
}

function printHelpAndExit(code: number): never {
  const msg = [
    "Usage: archlens-verify --report <md-file> --after <dir> [--out <path>] [--dry-run]",
    "",
    "Arguments:",
    "  --report <path>   Phase-3 Markdown report (`ux-audit-*.md`).",
    "  --after  <dir>    Folder of after-screenshots named `issue-N.png`.",
    "  --out    <path>   Output path (default: <report>-verified.md).",
    "  --dry-run         Skip API calls — produce canned verdicts.",
    "  --verbose, -v     Print the model's raw response per issue.",
    "  --help, -h        Show this help.",
    "",
    "Environment:",
    "  ANTHROPIC_API_KEY  required unless --dry-run",
    "  CLAUDE_MODEL       optional override (default: " + DEFAULT_MODEL + ")",
  ].join("\n");
  console.log(msg);
  process.exit(code);
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/**
 * Locate the after-screenshot for a given issue.
 *
 * Matches by EITHER the issue's index (its `Issue #N` number) OR its
 * stable id from the report's JSON appendix. This means a developer
 * who only fixed issues #1, #3, #5 can name files `issue-1.png`,
 * `issue-3.png`, `issue-5.png` without renumbering — skipped issues
 * just get `no-after`.
 *
 * Matching is case-insensitive and accepts any common image
 * extension. Accepted basenames (before the extension):
 *   - issue-N   (preferred)
 *   - issue_N
 *   - issueN
 *   - <issue-id>   (the annotation id, e.g. ann_lzv7p_x9k4mq)
 */
function findAfterScreenshot(
  afterDir: string,
  issue: ReportIssue
): string | null {
  let entries: string[];
  try {
    entries = fs.readdirSync(afterDir);
  } catch {
    return null;
  }

  const acceptedBasenames = new Set(
    [
      "issue-" + issue.index,
      "issue_" + issue.index,
      "issue" + issue.index,
      issue.id,
    ].map((s) => s.toLowerCase())
  );

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    const base = path.basename(entry, path.extname(entry)).toLowerCase();
    if (acceptedBasenames.has(base)) {
      return path.join(afterDir, entry);
    }
  }
  return null;
}

function readAsBase64(filePath: string): string {
  return fs.readFileSync(filePath).toString("base64");
}

// Claude vision rejects images larger than 5MB. We use a slightly
// lower threshold to leave headroom for the base64 + request overhead.
const MAX_IMAGE_BYTES = 4_500_000; // ~4.5 MB

/**
 * Check an after-screenshot's byte size against Claude's limit.
 * Returns a human-readable error string if it's too big, else null.
 */
function checkImageSize(filePath: string): string | null {
  let bytes: number;
  try {
    bytes = fs.statSync(filePath).size;
  } catch {
    return "could not read the after-screenshot file";
  }
  if (bytes > MAX_IMAGE_BYTES) {
    const mb = (bytes / 1_000_000).toFixed(1);
    return (
      "after-screenshot is " +
      mb +
      "MB, over Claude vision's ~5MB limit. Resize it (e.g. to about " +
      "1500px on the long edge) and re-run."
    );
  }
  return null;
}

/** Canned verdict generator for --dry-run. Cycles through verdicts. */
function dryRunVerdict(index: number): RawVerdict {
  const cycle = [
    {
      verdict: "verified" as const,
      reasoning:
        "[DRY RUN] Synthetic verdict — the AFTER image appears to address the reviewer's note.",
    },
    {
      verdict: "uncertain" as const,
      reasoning:
        "[DRY RUN] Synthetic verdict — the change is partial or hard to evaluate without context.",
    },
    {
      verdict: "rejected" as const,
      reasoning:
        "[DRY RUN] Synthetic verdict — the AFTER image does not seem to resolve the original concern.",
    },
  ];
  return cycle[(index - 1) % cycle.length]!;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Resolve paths relative to cwd so users can run from anywhere.
  const reportPath = path.resolve(args.reportPath);
  const afterDir = path.resolve(args.afterDir);
  const outPath =
    args.outPath ?? deriveOutPath(reportPath);

  if (!fs.existsSync(reportPath)) {
    fail("Report not found: " + reportPath);
  }
  if (!fs.existsSync(afterDir) || !fs.statSync(afterDir).isDirectory()) {
    fail("After-screenshots directory not found: " + afterDir);
  }

  const report = parseReport(reportPath);
  if (report.issues.length === 0) {
    console.log("Report has zero annotations — nothing to verify.");
    fs.writeFileSync(outPath, report.rawMarkdown);
    process.exit(0);
  }

  const modelName = args.dryRun ? "[dry-run]" : getModel();

  console.log("ArchLens verify");
  console.log("  Report:  " + reportPath);
  console.log("  After:   " + afterDir);
  console.log("  Model:   " + modelName);
  console.log("  Issues:  " + report.issues.length);
  console.log("");

  const verified: VerifiedIssue[] = [];
  let n = 0;
  for (const issue of report.issues) {
    n++;
    process.stdout.write(
      "[" + n + "/" + report.issues.length + "] Issue #" + issue.index + " "
    );

    const afterPath = findAfterScreenshot(afterDir, issue);
    if (!afterPath) {
      console.log("→ no after screenshot, skipping API call");
      verified.push({
        ...issue,
        verdict: "no-after",
        reasoning:
          "No after-screenshot file found in " +
          afterDir +
          " for this issue (looked for issue-" +
          issue.index +
          ".png and similar).",
        verifiedAt: new Date().toISOString(),
      });
      continue;
    }

    // Guard against oversized after-screenshots before the API call.
    // Skip the check in dry-run (no real API call is made).
    if (!args.dryRun) {
      const sizeError = checkImageSize(afterPath);
      if (sizeError) {
        console.log("→ uncertain (image too large)");
        verified.push({
          ...issue,
          verdict: "uncertain",
          reasoning: "Could not verify: " + sizeError,
          verifiedAt: new Date().toISOString(),
        });
        continue;
      }
    }

    try {
      const result = args.dryRun
        ? dryRunVerdict(issue.index)
        : await verifyIssue(issue, readAsBase64(afterPath));

      console.log("→ " + result.verdict);
      if (args.verbose) {
        console.log("    reasoning: " + result.reasoning);
      }
      verified.push({
        ...issue,
        verdict: result.verdict,
        reasoning: result.reasoning,
        verifiedAt: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log("→ uncertain (error)");
      verified.push({
        ...issue,
        verdict: "uncertain",
        reasoning: "Verification failed: " + msg,
        verifiedAt: new Date().toISOString(),
      });
    }
  }

  const updated = buildVerifiedMarkdown(report, verified, modelName);
  fs.writeFileSync(outPath, updated);

  console.log("");
  console.log("Wrote: " + outPath);
  console.log("");
  printSummary(verified);

  // Exit code reflects worst verdict so this can be wired into CI.
  const hasRejected = verified.some((v) => v.verdict === "rejected");
  process.exit(hasRejected ? 1 : 0);
}

function printSummary(verified: VerifiedIssue[]): void {
  const counts = { verified: 0, rejected: 0, uncertain: 0, "no-after": 0 };
  for (const v of verified) counts[v.verdict] += 1;

  console.log("Summary:");
  console.log("  ✅ verified:   " + counts.verified);
  console.log("  ❌ rejected:   " + counts.rejected);
  console.log("  ⚠️  uncertain:  " + counts.uncertain);
  console.log("  ➖ no-after:   " + counts["no-after"]);
}

function deriveOutPath(reportPath: string): string {
  const dir = path.dirname(reportPath);
  const base = path.basename(reportPath, path.extname(reportPath));
  return path.join(dir, base + "-verified.md");
}

function fail(message: string): never {
  console.error("Error: " + message);
  process.exit(2);
}

void main().catch((err) => {
  console.error("Unexpected error:");
  console.error(err);
  process.exit(2);
});
