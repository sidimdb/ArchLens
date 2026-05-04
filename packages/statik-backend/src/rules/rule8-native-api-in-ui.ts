/**
 * Rule 8 — Native APIs in UI files
 *
 * React Native's platform / device APIs (AsyncStorage, Platform,
 * NativeModules, Linking, PermissionsAndroid, BackHandler, Dimensions,
 * AppState, NetInfo, …) are global side-effecting boundaries. When a
 * screen or component reaches for them directly, three things go wrong:
 *
 *   1. The component becomes hard to test — you can no longer render it
 *      without a real device or a sea of mocks.
 *   2. Platform branching (`Platform.OS === 'ios' ? … : …`) leaks into
 *      view code that should be declarative.
 *   3. Storage / permission / linking concerns get scattered across the
 *      UI tree instead of living behind one abstraction that the rest of
 *      the app can swap, mock, or instrument.
 *
 * The fix is conventional: wrap the native API in a hook
 * (`useAsyncStorage`, `usePlatform`) or a service module, and let the
 * UI consume the wrapper. Hooks and services are explicitly allowed to
 * touch the native API — they're the abstraction layer.
 *
 * Detection happens in ast-analyzer.ts (which tracks import bindings
 * from `react-native` and known standalone packages, then records every
 * non-import reference to those bindings). This rule only inspects
 * screen + component files — a hook calling `AsyncStorage.getItem` is
 * fine, that's its whole job.
 *
 * Severity is "major" because this is an architectural concern: the
 * fix is a refactor, not a one-line change. Score is the fraction of
 * UI files free of direct native API access.
 *
 * Weight: 10 / 100
 */

import { Project, RuleResult, Violation } from "../types";
import { Rule } from "./types";
import { combineWithClassification } from "./confidence";

export const RULE_ID = "RULE_8_NATIVE_API_IN_UI";
export const WEIGHT = 10;

export const rule8NativeApiInUi: Rule = (project: Project): RuleResult => {
  const violations: Violation[] = [];
  const affected = new Set<string>();
  const inspected: typeof project.files = [];
  let totalUsages = 0;

  for (const f of project.files) {
    const isUi = f.layer === "screen" || f.layer === "component";
    if (!isUi) continue;

    const facts = project.astFactsByPath.get(f.path);
    if (!facts || facts.parseError) continue;

    inspected.push(f);

    if (facts.nativeApiUsages.length === 0) continue;

    totalUsages += facts.nativeApiUsages.length;

    for (const u of facts.nativeApiUsages) {
      violations.push({
        file: f.path,
        line: u.line,
        severity: "major",
        message:
          `Direct use of native API \`${u.name}\` from a ${f.layer} file. ` +
          `Wrap it in a hook (e.g. use${u.name}) or a service module so the UI ` +
          `stays declarative and the native boundary lives in one place.`,
      });
    }
    affected.add(f.path);
  }

  if (inspected.length === 0) {
    return {
      ruleId: RULE_ID,
      name: "Native APIs in UI",
      description:
        "Screens and components must not call React Native platform / device APIs directly — go through a hook or service.",
      status: "not_applicable",
      confidence: "low",
      violationCount: 0,
      violations: [],
      affectedFiles: [],
      explanation:
        "No screen or component files were found — this rule cannot be evaluated.",
      weight: WEIGHT,
      score: 100,
    };
  }

  const cleanFiles = inspected.length - affected.size;
  const score = Math.round((cleanFiles / inspected.length) * 100);

  return {
    ruleId: RULE_ID,
    name: "Native APIs in UI",
    description:
      "Screens and components must not call React Native platform / device APIs directly — go through a hook or service.",
    status: violations.length === 0 ? "pass" : "fail",
    confidence: combineWithClassification("high", inspected),
    violationCount: violations.length,
    violations,
    affectedFiles: [...affected].sort(),
    explanation:
      violations.length === 0
        ? `Scanned ${inspected.length} UI file(s) — none reach into native APIs directly.`
        : `Found ${totalUsages} direct native API usage(s) across ${affected.size} of ${inspected.length} UI file(s). ` +
          `Move them behind a hook or service so the UI doesn't depend on the native boundary directly.`,
    weight: WEIGHT,
    score,
  };
};
