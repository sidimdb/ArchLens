/**
 * Rule 2 — No Circular Dependencies
 *
 * Circular imports silently break module loading and make code
 * nearly impossible to test in isolation. Madge walks the resolved
 * dependency graph and returns every simple cycle.
 *
 * Threshold: 0 cycles allowed.
 * Weight:    15 / 100
 *
 * Scoring: each detected cycle costs 20 points, capped at 100 penalty.
 */

import { Project, RuleResult, Violation } from "../types";
import { Rule } from "./types";

export const RULE_ID = "RULE_2_CIRCULAR_DEPS";
export const WEIGHT = 15;
const PENALTY_PER_CYCLE = 20;

export const rule2CircularDeps: Rule = (project: Project): RuleResult => {
  const cycles = project.circularDependencies;

  // Emit one violation per file participating in a cycle, so every
  // affected file shows up as its own row in the report. The cycle
  // description is shared across all rows of the same cycle so the
  // user can see which files are coupled together.
  const violations: Violation[] = [];
  const affected = new Set<string>();
  for (const cycle of cycles) {
    const cycleDesc = `${cycle.join(" → ")} → ${cycle[0]}`;
    for (const file of cycle) {
      violations.push({
        file,
        severity: "major", // any cycle is a design failure — flat severity
        message: `This file is part of a ${cycle.length}-file dependency cycle: ${cycleDesc}`,
      });
      affected.add(file);
    }
  }

  const score = Math.max(0, 100 - cycles.length * PENALTY_PER_CYCLE);

  return {
    ruleId: RULE_ID,
    name: "No circular dependencies",
    description:
      "Modules must not import each other in a cycle, directly or transitively.",
    status: cycles.length === 0 ? "pass" : "fail",
    confidence: "high",
    violationCount: violations.length,
    violations,
    affectedFiles: [...affected].sort(),
    explanation:
      cycles.length === 0
        ? "No circular dependencies detected by madge."
        : `${cycles.length} cycle(s) found across ${affected.size} file(s). ` +
          "Break at least one import in each cycle — typically by extracting the shared code into a lower-level module.",
    weight: WEIGHT,
    score,
  };
};
