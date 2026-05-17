/**
 * Filesystem scanner.
 *
 * Walks an extracted project directory, skips non-source directories
 * (node_modules, native platform folders, build artifacts, embedded
 * backend folders), reads JS/TS source files into memory, and
 * extracts package.json.
 *
 * Backend-skip strategy (two layers):
 *
 *   1. Name-based skip: well-known backend folder names like
 *      `backend/`, `server/`, `api/` etc. are skipped on sight.
 *      Catches the most common full-stack RN project layouts.
 *
 *   2. Content-based skip: any subdirectory that has its OWN
 *      package.json declaring a backend framework (Express,
 *      Fastify, NestJS, Koa, ...) AND no react-native / expo gets
 *      skipped regardless of name. Catches the cases where the
 *      backend lives in a folder named something unusual like
 *      `my-server/`, `core-api/`, etc.
 *
 * Skipped folders are recorded so the report can surface them —
 * silent omission would be worse than not skipping at all.
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
  "api",
  "functions",
]);

/**
 * Server-side framework names. If a sub-folder's own package.json
 * declares any of these (and is not an RN/Expo project itself), we
 * treat it as a backend and skip it.
 */
const BACKEND_FRAMEWORK_DEPS = new Set([
  "express",
  "fastify",
  "koa",
  "@koa/router",
  "hapi",
  "@hapi/hapi",
  "hono",
  "restify",
  "@nestjs/core",
  "@nestjs/common",
  "apollo-server",
  "@apollo/server",
  "graphql-yoga",
  "mercurius",
]);

const SOURCE_EXTS: SourceExt[] = [".js", ".jsx", ".ts", ".tsx"];
const MAX_FILE_BYTES = 500_000;

export interface SkippedSubproject {
  /** Relative path from the project root. */
  path: string;
  /** Human-readable reason this folder was skipped. */
  reason: string;
}

export interface ScanResult {
  files: ScannedFile[]; // layer is filled in by classifier
  packageJson?: Record<string, unknown>;
  /** Folders that looked like backend sub-projects and were skipped. */
  skippedSubprojects: SkippedSubproject[];
}

export async function scanProject(rootPath: string): Promise<ScanResult> {
  const files: ScannedFile[] = [];
  const skippedSubprojects: SkippedSubproject[] = [];
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

  await walk(rootPath, rootPath, files, skippedSubprojects);
  return { files, packageJson, skippedSubprojects };
}

async function walk(
  rootPath: string,
  currentPath: string,
  out: ScannedFile[],
  skipped: SkippedSubproject[]
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
      // Name-based skip (covers common cases instantly)
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith(".")) {
        if (isLikelyBackendName(entry.name)) {
          skipped.push({
            path: relativePath(rootPath, entryPath),
            reason: "folder named '" + entry.name + "'",
          });
        }
        continue;
      }

      // Content-based skip: peek at a nested package.json to see if
      // this is a backend sub-project living in an unusual folder.
      // Skip the root itself — that's the RN project we want to analyze.
      if (entryPath !== rootPath) {
        const verdict = await shouldSkipAsBackend(entryPath);
        if (verdict) {
          skipped.push({
            path: relativePath(rootPath, entryPath),
            reason: verdict,
          });
          continue;
        }
      }

      await walk(rootPath, entryPath, out, skipped);
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

    out.push({
      path: relativePath(rootPath, entryPath),
      absolutePath: entryPath,
      content,
      ext,
      loc: content.split(/\r?\n/).length,
    });
  }
}

/* ---------- backend detection helpers ---------- */

/**
 * Examine a sub-directory's own package.json (if any). If it
 * declares a backend framework and no React Native / Expo, return
 * a reason string. Otherwise return null.
 */
async function shouldSkipAsBackend(dirPath: string): Promise<string | null> {
  const pkgPath = path.join(dirPath, "package.json");
  if (!fs.existsSync(pkgPath)) return null;

  try {
    const raw = await fs.promises.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const deps = {
      ...(coerceStringRecord(pkg.dependencies)),
      ...(coerceStringRecord(pkg.devDependencies)),
    };

    // If this sub-folder is itself an RN app (rare but possible in
    // workspaces), do NOT skip — we'd lose the actual mobile code.
    if (deps["react-native"] || deps["expo"]) return null;

    for (const fw of BACKEND_FRAMEWORK_DEPS) {
      if (deps[fw]) {
        return (
          "sub-folder has its own package.json declaring a backend " +
          "framework ('" +
          fw +
          "') — treated as a separate server, not part of the RN app"
        );
      }
    }
  } catch {
    return null;
  }
  return null;
}

function isLikelyBackendName(name: string): boolean {
  return name === "backend" || name === "server" || name === "api" || name === "functions";
}

function coerceStringRecord(v: unknown): Record<string, string> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, string>;
  }
  return {};
}

function relativePath(rootPath: string, entryPath: string): string {
  return path
    .relative(rootPath, entryPath)
    .split(path.sep)
    .join("/");
}
