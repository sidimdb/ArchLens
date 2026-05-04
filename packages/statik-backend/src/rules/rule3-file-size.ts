/**
 * Rule 3 — File Size & Complexity Thresholds
 *
 * Large files and overly-stateful components are symptoms of poor
 * separation of concerns and make code reviews painful. We use hard
 * thresholds instead of averages so the feedback is concrete
 * ("this file is too long") rather than abstract.
 *
 * Thresholds:
 *   - component files > 200 LOC          → major (critical if > 1.5×)
 *   - screen files    > 300 LOC          → major (critical if > 1.5×)
 *   - any file with   > 5 exports        → minor
 *   - component with  > 3 useState       → minor
 *   - any file with   > 3 useEffect      → minor
 *   - JSX nested      > 5 levels deep    → minor
 *
 * Rule status:
 *   - 0 violations       → PASS
 *   - ≥ 1 violation      → FAIL
 *
 * Rule score:
 *   - clean-file ratio × 100. One bad file doesn't tank the whole
 *     rule, but any violation flips the status to FAIL.
 *
 * Weight: 10 / 100
 */

import { Project, RuleResult, Violation } from "../types";
import { Rule } from "./types";
import { combineWithClassification } from "./confidence";

export const RULE_ID = "RULE_3_FILE_SIZE";
export const WEIGHT = 10;

const COMPONENT_MAX = 200;
const SCREEN_MAX = 300;
const EXPORT_MAX = 5;
const USESTATE_MAX = 3;
const USEEFFECT_MAX = 3;
const JSX_DEPTH_MAX = 5;

export const rule3FileSize: Rule = (project: Project): RuleResult => {
  const violations: Violation[] = [];
  const affected = new Set<string>();
  let relevant = 0;
  const relevantFiles = [] as typeof project.files;

  for (const f of project.files) {
    const isUi = f.layer === "component" || f.layer === "screen";
    if (!isUi) continue;

    relevant++;
    relevantFiles.push(f);

    const facts = project.astFactsByPath.get(f.path);

    // 1. LOC threshold (major)
    const locMax = f.layer === "screen" ? SCREEN_MAX : COMPONENT_MAX;
    if (f.loc > locMax) {
      violations.push({
        file: f.path,
        severity: f.loc > locMax * 1.5 ? "critical" : "major",
        message:
          f.layer === "screen"
            ? `Screen file has ${f.loc} lines (max ${locMax}). Extract subcomponents or hooks.`
            : `Component file has ${f.loc} lines (max ${locMax}). Split into smaller components.`,
      });
      affected.add(f.path);
    }

    if (!facts || facts.parseError) continue;

    // 2. Too many exports in one file (minor) — hints the file is doing too much.
    if (facts.exportCount > EXPORT_MAX) {
      violations.push({
        file: f.path,
        severity: "minor",
        message: `File declares ${facts.exportCount} exports (max ${EXPORT_MAX}). A single UI file should expose one component plus perhaps a few helpers, not a grab-bag.`,
      });
      affected.add(f.path);
    }

    // 3. Too many useState calls inside one component (minor) — consider
    //    useReducer, a custom hook, or splitting the component.
    if (f.layer === "component" && facts.useStateCalls > USESTATE_MAX) {
      violations.push({
        file: f.path,
        severity: "minor",
        message: `Component uses ${facts.useStateCalls} useState calls (max ${USESTATE_MAX}). Consider useReducer or extracting a custom hook.`,
      });
      affected.add(f.path);
    }

    // 4. Too many useEffect calls inside one component (minor) —
    //    usually signals tangled side effects; extract a custom hook.
    if (facts.useEffectCalls > USEEFFECT_MAX) {
      violations.push({
        file: f.path,
        severity: "minor",
        message: `File contains ${facts.useEffectCalls} useEffect calls (max ${USEEFFECT_MAX}). Too many effects in one file usually mean tangled side-effects — extract a custom hook.`,
      });
      affected.add(f.path);
    }

    // 5. Excessive JSX nesting (minor) — strong signal that the
    //    component does too much visually; extract sub-components.
    if (facts.maxJsxDepth > JSX_DEPTH_MAX) {
      violations.push({
        file: f.path,
        severity: "minor",
        message: `JSX is nested ${facts.maxJsxDepth} levels deep (max ${JSX_DEPTH_MAX}). Deep JSX trees are a strong sign the component does too much — extract sub-components.`,
      });
      affected.add(f.path);
    }
  }

  if (relevant === 0) {
    return {
      ruleId: RULE_ID,
      name: "File size & complexity thresholds",
      description:
        "Components ≤ 200 LOC; screens ≤ 300 LOC; ≤ 5 exports / file; ≤ 3 useState per component; ≤ 3 useEffect per file; JSX nested ≤ 5 levels.",
      status: "not_applicable",
      confidence: "low",
      violationCount: 0,
      violations: [],
      affectedFiles: [],
      explanation: "No screen or component files found to evaluate.",
      weight: WEIGHT,
      score: 100,
    };
  }

  const cleanRatio = (relevant - affected.size) / relevant;
  const score = Math.round(cleanRatio * 100);

  return {
    ruleId: RULE_ID,
    name: "File size & complexity thresholds",
    description:
      `Components ≤ ${COMPONENT_MAX} LOC, screens ≤ ${SCREEN_MAX} LOC, ` +
      `≤ ${EXPORT_MAX} exports per file, ≤ ${USESTATE_MAX} useState per component, ` +
      `≤ ${USEEFFECT_MAX} useEffect per file, JSX nested ≤ ${JSX_DEPTH_MAX} levels.`,
    status: violations.length === 0 ? "pass" : "fail",
    confidence: combineWithClassification("high", relevantFiles),
    violationCount: violations.length,
    violations,
    affectedFiles: [...affected].sort(),
    explanation:
      violations.length === 0
        ? `All ${relevant} UI files are within the size and complexity limits.`
        : `${affected.size} of ${relevant} UI files exceed a size or complexity limit. Long or over-stateful files usually hide multiple responsibilities.`,
    weight: WEIGHT,
    score,
  };
};
