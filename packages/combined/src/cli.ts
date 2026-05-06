#!/usr/bin/env node
/**
 * @archlens/combined CLI.
 *
 * Merges archlens-statik (architectural rules) and archlens-runtime
 * (UX audit) outputs into a single project-health document.
 *
 * Usage:
 *   archlens-combined
 *     [--statik  path/to/statik-report.json]
 *     [--runtime path/to/ux-audit-verified.md]
 *     [--out     path/to/combined.md]
 *     [--project "Display name"]
 *
 * At least one of --statik / --runtime must be supplied; the other
 * section is rendered as "not yet captured" if missing. This
 * lets the same CLI work mid-development before both modes have
 * been run.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { parseRuntimeReport, parseStatikReport } from "./parse";
import { buildCombinedReport } from "./render";

interface Args {
  statikPath: string | null;
  runtimePath: string | null;
  outPath: string | null;
  projectName: string | null;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    statikPath: null,
    runtimePath: null,
    outPath: null,
    projectName: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--statik") out.statikPath = argv[++i] ?? null;
    else if (a === "--runtime") out.runtimePath = argv[++i] ?? null;
    else if (a === "--out") out.outPath = argv[++i] ?? null;
    else if (a === "--project") out.projectName = argv[++i] ?? null;
    else if (a === "--help" || a === "-h") printHelpAndExit(0);
    else {
      console.error("Unknown argument: " + a);
      printHelpAndExit(2);
    }
  }

  if (!out.statikPath && !out.runtimePath) {
    console.error("Must supply at least one of --statik or --runtime.");
    printHelpAndExit(2);
  }

  return out;
}

function printHelpAndExit(code: number): never {
  console.log(
    [
      "Usage: archlens-combined [options]",
      "",
      "  --statik  <path>   Statik report JSON (from archlens-statik analyze).",
      "  --runtime <path>   Verified UX audit Markdown (from archlens-verify).",
      "  --out     <path>   Output path (default: combined-report.md in cwd).",
      "  --project <name>   Display name. Defaults to the statik or runtime project name.",
      "  --help, -h         Show this help.",
      "",
      "At least one input is required.",
    ].join("\n")
  );
  process.exit(code);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const statik = args.statikPath
    ? parseStatikReport(path.resolve(args.statikPath))
    : null;
  const runtime = args.runtimePath
    ? parseRuntimeReport(path.resolve(args.runtimePath))
    : null;

  const projectName =
    args.projectName ??
    statik?.project?.name ??
    runtime?.projectName ??
    "Untitled project";

  const md = buildCombinedReport({ projectName, statik, runtime });

  const outPath = path.resolve(args.outPath ?? "combined-report.md");
  fs.writeFileSync(outPath, md);

  console.log("ArchLens combined report");
  console.log("  Statik:  " + (args.statikPath ?? "(omitted)"));
  console.log("  Runtime: " + (args.runtimePath ?? "(omitted)"));
  console.log("  Wrote:   " + outPath);
}

try {
  main();
} catch (err) {
  console.error("Error:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
}
