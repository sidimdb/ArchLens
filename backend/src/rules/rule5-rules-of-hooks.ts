/**
 * Rule 5 — Rules of Hooks Compliance
 *
 * Enforces the two official React rules of hooks:
 *
 *   1. Hooks must be called at the top level — never inside loops,
 *      conditions, switch cases, try/catch blocks, or nested
 *      callbacks. They must run in the same order on every render.
 *   2. Hooks must be called from React function components (PascalCase)
 *      or other custom hooks (functions whose name starts with `use`).
 *      Calling a hook from a regular utility function silently breaks
 *      React's internal state tracking.
 *
 * Detection happens during AST traversal in ast-analyzer.ts; this rule
 * just consumes the pre-computed `hookViolations` list. The score is
 * the ratio of clean hook calls to total hook calls across the
 * project, so a single misplaced hook in a 100-call codebase doesn't
 * tank the score, but a project that violates the rules everywhere
 * scores near zero.
 *
 * Severity is "critical" because Rules-of-Hooks violations are not
 * style issues — they cause real, runtime-corrupted React state.
 *
 * Weight: 15 / 100
 */

import { HookViolation, Project, RuleResult, Violation } from "../types";
import { Rule } from "./types";
import { combineWithClassification } from "./confidence";

export const RULE_ID = "RULE_5_RULES_OF_HOOKS";
export const WEIGHT = 15;

function messageFor(v: HookViolation): string {
  switch (v.reason) {
    case "conditional":
      return (
        `Hook '${v.hookName}()' is called conditionally (inside an if / ternary / && / ||). ` +
        `Hooks must be called unconditionally at the top level — move the conditional logic inside the hook or restructure the component.`
      );
    case "loop":
      return (
        `Hook '${v.hookName}()' is called inside a loop. ` +
        `Hooks must run in the same order on every render — never inside for / while / map.`
      );
    case "switch":
      return (
        `Hook '${v.hookName}()' is called inside a switch case. ` +
        `Hooks must run unconditionally on every render — move it above the switch.`
      );
    case "try-catch":
      return (
        `Hook '${v.hookName}()' is called inside a try / catch block. ` +
        `Hooks cannot be wrapped in try/catch — handle errors inside the hook itself or via an error boundary.`
      );
    case "non-hook-caller":
      return (
        `Hook '${v.hookName}()' is called from a function that is neither a React component (PascalCase) nor a custom hook (useXxx). ` +
        `Move the call into a component or custom hook.`
      );
  }
}

export const rule5RulesOfHooks: Rule = (project: Project): RuleResult => {
  const violations: Violation[] = [];
  const affected = new Set<string>();
  const inspected: typeof project.files = [];
  let totalHookCalls = 0;
  let parseErrored = 0;

  for (const f of project.files) {
    const facts = project.astFactsByPath.get(f.path);
    if (!facts) continue;
    if (facts.parseError) {
      parseErrored++;
      continue;
    }
    if (facts.hookCallCount === 0) continue;

    inspected.push(f);
    totalHookCalls += facts.hookCallCount;

    for (const v of facts.hookViolations) {
      violations.push({
        file: f.path,
        line: v.line,
        severity: "critical",
        message: messageFor(v),
      });
      affected.add(f.path);
    }
  }

  if (totalHookCalls === 0) {
    return {
      ruleId: RULE_ID,
      name: "Rules of Hooks compliance",
      description:
        "Hooks must be called at the top level of components or custom hooks — never inside conditions, loops, switch cases, try/catch, or non-React functions.",
      status: "not_applicable",
      confidence: "low",
      violationCount: 0,
      violations: [],
      affectedFiles: [],
      explanation:
        "No React hook calls found anywhere in the project — this rule cannot be evaluated.",
      weight: WEIGHT,
      score: 100,
    };
  }

  const cleanCalls = totalHookCalls - violations.length;
  const score = Math.round(Math.max(0, cleanCalls / totalHookCalls) * 100);

  const ruleOwnConfidence =
    parseErrored === 0 ? "high" : parseErrored < inspected.length / 2 ? "medium" : "low";

  return {
    ruleId: RULE_ID,
    name: "Rules of Hooks compliance",
    description:
      "Hooks must be called at the top level of components or custom hooks — never inside conditions, loops, switch cases, try/catch, or non-React functions.",
    status: violations.length === 0 ? "pass" : "fail",
    confidence: combineWithClassification(ruleOwnConfidence, inspected),
    violationCount: violations.length,
    violations,
    affectedFiles: [...affected].sort(),
    explanation:
      violations.length === 0
        ? `Scanned ${totalHookCalls} hook call(s) across ${inspected.length} file(s) — all comply with the Rules of Hooks.`
        : `Found ${violations.length} Rules-of-Hooks violation(s) across ${affected.size} file(s). These are real React bugs, not style issues — fix them before shipping.`,
    weight: WEIGHT,
    score,
  };
};
