/**
 * Rule 4 — Layer Separation (Import Policy)
 *
 * Allowed imports per source layer, per the MVP policy:
 *
 *   screen    -> component, hook, service, util, config, state, navigation
 *   component -> component, hook, util, config, state
 *   hook      -> hook, service, util, config, state
 *   state     -> service, util, config
 *   service   -> service, util, config
 *
 * Screens are NOT allowed to import other screens — RN navigation
 * happens via the navigator, not direct imports. Hooks and state
 * files have explicit policies so cross-layer abuse there is caught
 * (e.g. a hook importing a screen).
 *
 * Everything else is a violation. We only check imports whose target
 * layer we can resolve back to one of ours — third-party packages
 * (no '/' prefix, not relative) are always fine.
 *
 * Confidence is downgraded to 'low' if more than 40% of source layers
 * were 'unknown' since the policy can't be applied reliably in that case.
 *
 * Weight: 20 / 100
 */

import * as path from "path";
import { Layer, Project, RuleResult, Severity, Violation } from "../types";
import { Rule } from "./types";
import { combineWithClassification } from "./confidence";

export const RULE_ID = "RULE_4_LAYER_SEPARATION";
export const WEIGHT = 20;

/**
 * Inverted-dependency pairs: a lower layer importing a higher layer.
 * These are dependency-direction violations, the worst kind, and we
 * flag them as critical. Everything else (sideways imports, layer
 * skips going downward) is treated as major.
 */
const INVERTED_PAIRS: Array<[Layer, Layer]> = [
  ["service", "component"],
  ["service", "screen"],
  ["service", "hook"],
  ["service", "state"],
  ["state", "component"],
  ["state", "screen"],
  ["state", "hook"],
  ["hook", "component"],
  ["hook", "screen"],
  ["component", "screen"],
];

function severityFor(source: Layer, target: Layer): Severity {
  return INVERTED_PAIRS.some(([s, t]) => s === source && t === target)
    ? "critical"
    : "major";
}

const ALLOWED: Partial<Record<Layer, Layer[]>> = {
  screen: ["component", "hook", "service", "util", "config", "state", "navigation"],
  component: ["component", "hook", "util", "config", "state"],
  hook: ["hook", "service", "util", "config", "state"],
  state: ["service", "util", "config"],
  service: ["service", "util", "config"],
};

function isRelative(source: string): boolean {
  return source.startsWith(".") || source.startsWith("/");
}

/**
 * Resolve an import source to a project-relative path, or return null
 * if it's a third-party package or an unresolved path. Tries the
 * common RN extensions and index files.
 */
function resolveToRelative(
  fromPath: string,
  source: string,
  knownPaths: Set<string>
): string | null {
  if (!isRelative(source)) return null;
  const fromDir = path.posix.dirname(fromPath);
  const joined = path.posix.normalize(path.posix.join(fromDir, source));

  const candidates = [
    joined,
    `${joined}.ts`,
    `${joined}.tsx`,
    `${joined}.js`,
    `${joined}.jsx`,
    `${joined}/index.ts`,
    `${joined}/index.tsx`,
    `${joined}/index.js`,
    `${joined}/index.jsx`,
  ];
  for (const c of candidates) {
    if (knownPaths.has(c)) return c;
  }
  return null;
}

export const rule4LayerSeparation: Rule = (project: Project): RuleResult => {
  const knownPaths = new Set(project.files.map((f) => f.path));
  const layerByPath = new Map(project.files.map((f) => [f.path, f.layer]));

  const violations: Violation[] = [];
  const affected = new Set<string>();

  let relevantSources = 0;
  let totalSourcesWithRules = 0;
  let unknownSources = 0;

  for (const f of project.files) {
    if (!ALLOWED[f.layer]) {
      if (f.layer === "unknown") unknownSources++;
      continue;
    }
    totalSourcesWithRules++;

    const facts = project.astFactsByPath.get(f.path);
    if (!facts || facts.parseError) continue;

    for (const imp of facts.imports) {
      const targetPath = resolveToRelative(f.path, imp.source, knownPaths);
      if (!targetPath) continue; // third-party or unresolved

      const targetLayer = layerByPath.get(targetPath) ?? "unknown";
      if (targetLayer === "unknown") continue; // can't judge what we can't classify

      relevantSources++;
      const allowed = ALLOWED[f.layer]!;
      if (!allowed.includes(targetLayer)) {
        violations.push({
          file: f.path,
          line: imp.line,
          severity: severityFor(f.layer, targetLayer),
          message: `${f.layer} '${f.path}' imports ${targetLayer} '${targetPath}' — not allowed by the layer policy.`,
        });
        affected.add(f.path);
      }
    }
  }

  if (totalSourcesWithRules === 0) {
    return {
      ruleId: RULE_ID,
      name: "Layer separation (import policy)",
      description: "Imports must respect the screen → component → service flow.",
      status: "not_applicable",
      confidence: "low",
      violationCount: 0,
      violations: [],
      affectedFiles: [],
      explanation:
        "No files were classified as screen / component / service — the policy cannot be applied.",
      weight: WEIGHT,
      score: 100,
    };
  }

  const unknownRatio = unknownSources / project.files.length;
  const ruleOwnConfidence =
    unknownRatio > 0.4 ? "low" : unknownRatio > 0.15 ? "medium" : "high";
  const sourceFiles = project.files.filter((f) => ALLOWED[f.layer]);
  const confidence = combineWithClassification(ruleOwnConfidence, sourceFiles);

  const cleanRatio =
    relevantSources === 0
      ? 1
      : (relevantSources - violations.length) / relevantSources;
  const score = Math.round(Math.max(0, cleanRatio) * 100);

  return {
    ruleId: RULE_ID,
    name: "Layer separation (import policy)",
    description:
      "screens may import components/hooks/services/utils/state/navigation (not other screens); components may import components/hooks/utils/state; hooks may import hooks/services/utils/state; state may import services/utils; services may import services/utils.",
    status: violations.length === 0 ? "pass" : "fail",
    confidence,
    violationCount: violations.length,
    violations,
    affectedFiles: [...affected].sort(),
    explanation:
      violations.length === 0
        ? `Checked ${relevantSources} cross-layer import(s) — all within policy.`
        : `${violations.length} policy violation(s) across ${affected.size} file(s). Typical fix: move shared code into a lower-level layer (util/service) that both sides can import.`,
    weight: WEIGHT,
    score,
  };
};
