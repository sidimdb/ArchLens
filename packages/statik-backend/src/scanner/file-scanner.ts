/**
 * Filesystem scanner.
 *
 * Walks an extracted project directory, skips non-source directories
 * (node_modules, native platform folders, build artifacts), reads
 * JS/TS source files into memory, and extracts package.json.
 *
 * This is the only stage that touches the filesystem for source code.
 */

import * as fs from "fs";
import * as path from "path";
import { ScannedFile, SourceExt } from "../types";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  ".expo-shared",
  "android",
  "ios",
  "build",
  "dist",
  "coverage",
  "__tests__",
  "__snapshots__",
  ".next",
  ".cache",
  ".turbo",
  ".yarn",
  // Project-local server folders — common in full-stack RN repos.
  // We're evaluating the RN app, not the server, so skip them by
  // default. Users can override via .evaluator.json if needed.
  "backend",
  "server",
  "functions",
]);

const SOURCE_EXTS: SourceExt[] = [".js", ".jsx", ".ts", ".tsx"];
const MAX_FILE_BYTES = 500_000;

export interface ScanResult {
  files: ScannedFile[]; // layer is filled in by classifier
  packageJson?: Record<string, unknown>;
}

export async function scanProject(rootPath: string): Promise<ScanResult> {
  const files: ScannedFile[] = [];
  // layer is filled in by the classifier downstream
  let packageJson: Record<string, unknown> | undefined;

  const pkgPath = path.join(rootPath, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = await fs.promises.readFile(pkgPath, "utf8");
      packageJson = JSON.parse(raw);
    } catch {
      // ignored — broken package.json still lets us analyze source
    }
  }

  await walk(rootPath, rootPath, files);
  return { files, packageJson };
}

async function walk(
  rootPath: string,
  currentPath: string,
  out: ScannedFile[]
): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      await walk(rootPath, entryPath, out);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase() as SourceExt;
    if (!SOURCE_EXTS.includes(ext)) continue;

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(entryPath);
    } catch {
      continue;
    }
    if (stat.size > MAX_FILE_BYTES) continue;

    let content: string;
    try {
      content = await fs.promises.readFile(entryPath, "utf8");
    } catch {
      continue;
    }

    const relPath = path
      .relative(rootPath, entryPath)
      .split(path.sep)
      .join("/");

    out.push({
      path: relPath,
      absolutePath: entryPath,
      content,
      ext,
      loc: content.split(/\r?\n/).length,
    });
  }
}
