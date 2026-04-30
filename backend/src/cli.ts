/**
 * Command-line entry point.
 *
 *   npm run analyze -- ./path/to/rn-project
 *   npm run analyze -- https://github.com/owner/repo
 *   npm run analyze -- owner/repo --token=ghp_...
 *   npm run analyze -- ./app --json > report.json
 *   npm run analyze -- ./app --markdown > report.md
 */

import * as fs from "fs";
import { fromExistingDirectory, fromZipBuffer } from "./input/local-source";
import { fromGitHub } from "./input/github-source";
import { runAnalysis } from "./pipeline";

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let token: string | undefined;
  let format: "pretty" | "json" | "markdown" = "pretty";

  for (const a of argv) {
    if (a.startsWith("--token=")) token = a.slice("--token=".length);
    else if (a === "--json") format = "json";
    else if (a === "--markdown") format = "markdown";
    else positional.push(a);
  }

  return { input: positional[0], token, format };
}

async function main() {
  const { input, token, format } = parseArgs(process.argv.slice(2));
  if (!input) {
    console.error(
      "Usage: npm run analyze -- <path-or-github-url> [--token=xxx] [--json|--markdown]"
    );
    process.exit(1);
  }

  const isUrl =
    /^https?:\/\//.test(input) ||
    input.startsWith("git@") ||
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input);

  const source = isUrl
    ? await fromGitHub(input, { token })
    : input.endsWith(".zip")
    ? await fromZipBuffer(fs.readFileSync(input), input.replace(/\.zip$/i, ""))
    : fromExistingDirectory(input);

  const { report, markdown } = await runAnalysis(source);

  if (format === "json") {
    process.stdout.write(JSON.stringify(report, null, 2));
  } else if (format === "markdown") {
    process.stdout.write(markdown);
  } else {
    console.log(`\n${report.project.name} — ${report.grade} (${report.overallScore}/100)`);
    console.log(
      `${report.project.fileCount} files · ${report.project.totalLoc} LOC\n`
    );
    for (const r of report.rules) {
      const status =
        r.status === "pass" ? "✓" : r.status === "fail" ? "✗" : "−";
      console.log(
        ` ${status} [${r.score.toString().padStart(3)}] ${r.name}  ` +
          `(${r.violationCount} violation${r.violationCount === 1 ? "" : "s"}, ${r.confidence})`
      );
    }
    console.log(`\nStrongest: ${report.summary.strongest.join(", ") || "—"}`);
    console.log(`Weakest:   ${report.summary.weakest.join(", ") || "—"}`);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
