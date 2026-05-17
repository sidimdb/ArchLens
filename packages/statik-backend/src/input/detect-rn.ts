/**
 * React Native project detection.
 *
 * Before we run any rules, we make sure the uploaded project is
 * actually a React Native app. Running our rule set on a plain
 * Node CLI or an Express backend produces nonsense scores
 * (e.g. "too many useState" in a project that never imports React),
 * which is worse than refusing to analyze.
 *
 * Detection signals, in order of strength:
 *
 *   STRONG (any one is enough)
 *     - "react-native" in package.json dependencies/devDependencies
 *     - "expo" in package.json dependencies/devDependencies
 *
 *   WEAK (need two together — heuristic backup when package.json
 *   is missing or unusual)
 *     - metro.config.js / metro.config.ts at project root
 *     - app.json with an `expo` or `name` field at project root
 *     - both android/ AND ios/ directories at project root
 *
 * The detector returns a confidence level so the caller can surface
 * appropriate messaging: "high" for strong matches, "medium" when
 * only weak signals agree, "low" otherwise (we refuse to analyze).
 */

import * as fs from "fs";
import * as path from "path";

export type DetectionConfidence = "high" | "medium" | "low";

export interface RnDetectionResult {
  /** True when the project should be treated as React Native. */
  isReactNative: boolean;
  /** How confident the detector is, for messaging purposes. */
  confidence: DetectionConfidence;
  /** Human-readable list of signals that fired. */
  reasons: string[];
}

export function detectReactNative(
  rootPath: string,
  packageJson?: Record<string, unknown>
): RnDetectionResult {
  const reasons: string[] = [];
  let strongHits = 0;
  let weakHits = 0;

  // ---------- STRONG signals: package.json dependencies ----------
  if (packageJson) {
    const deps = {
      ...(coerceStringRecord(packageJson.dependencies)),
      ...(coerceStringRecord(packageJson.devDependencies)),
      ...(coerceStringRecord(packageJson.peerDependencies)),
    };

    if (deps["react-native"]) {
      strongHits++;
      reasons.push("package.json declares a 'react-native' dependency");
    }
    if (deps["expo"]) {
      strongHits++;
      reasons.push("package.json declares an 'expo' dependency");
    }
  }

  // ---------- WEAK signals: project-level RN/Expo files ----------
  if (
    fileExists(rootPath, "metro.config.js") ||
    fileExists(rootPath, "metro.config.ts") ||
    fileExists(rootPath, "metro.config.cjs")
  ) {
    weakHits++;
    reasons.push("metro.config.* (Metro bundler) found at project root");
  }

  const appJsonPath = path.join(rootPath, "app.json");
  if (fs.existsSync(appJsonPath)) {
    try {
      const raw = fs.readFileSync(appJsonPath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && (parsed.expo || parsed.displayName || parsed.name)) {
        weakHits++;
        reasons.push("app.json with RN/Expo fields found at project root");
      }
    } catch {
      // malformed app.json — ignore the signal
    }
  }

  if (dirExists(rootPath, "android") && dirExists(rootPath, "ios")) {
    weakHits++;
    reasons.push("native android/ and ios/ folders found at project root");
  }

  // ---------- Verdict ----------
  // One strong signal alone is enough. Two weak signals together
  // catch valid edge cases (e.g. a freshly cloned bare RN repo
  // whose node_modules / package.json is stripped).
  const isReactNative = strongHits >= 1 || weakHits >= 2;
  const confidence: DetectionConfidence = strongHits >= 1
    ? "high"
    : weakHits >= 2
      ? "medium"
      : "low";

  return { isReactNative, confidence, reasons };
}

/* ---------- helpers ---------- */

function coerceStringRecord(v: unknown): Record<string, string> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, string>;
  }
  return {};
}

function fileExists(root: string, name: string): boolean {
  return fs.existsSync(path.join(root, name));
}

function dirExists(root: string, name: string): boolean {
  try {
    return fs.statSync(path.join(root, name)).isDirectory();
  } catch {
    return false;
  }
}
