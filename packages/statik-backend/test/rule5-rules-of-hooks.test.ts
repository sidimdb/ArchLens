/**
 * Rule 5 — Rules of Hooks Compliance.
 *
 * Consumes pre-computed `hookViolations` from the AST analyzer.
 * Detection itself is tested through the AST analyzer's own
 * traversal in integration; here we verify the rule's *scoring*
 * and message logic given known fact sets.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { rule5RulesOfHooks } from "../src/rules/rule5-rules-of-hooks";
import { hookViolation, makeProject } from "./helpers";

describe("Rule 5 — Rules of Hooks", () => {
  it("passes when hooks are present and all comply", () => {
    const project = makeProject([
      {
        path: "src/screens/HomeScreen.tsx",
        layer: "screen",
        facts: { hookCallCount: 4, hookViolations: [] },
      },
    ]);

    const result = rule5RulesOfHooks(project);
    assert.equal(result.status, "pass");
    assert.equal(result.violationCount, 0);
    assert.equal(result.score, 100);
  });

  it("fails when a hook is called conditionally", () => {
    const project = makeProject([
      {
        path: "src/screens/HomeScreen.tsx",
        layer: "screen",
        facts: {
          hookCallCount: 2,
          hookViolations: [hookViolation("conditional", "useState", 14)],
        },
      },
    ]);

    const result = rule5RulesOfHooks(project);
    assert.equal(result.status, "fail");
    assert.equal(result.violationCount, 1);
    assert.equal(result.violations[0]!.severity, "critical");
    assert.ok(
      result.violations[0]!.message.toLowerCase().includes("conditional"),
      "expected the violation message to mention conditional"
    );
  });

  it("fails on a hook called from a non-React function", () => {
    const project = makeProject([
      {
        path: "src/utils/helper.ts",
        layer: "util",
        facts: {
          hookCallCount: 1,
          hookViolations: [hookViolation("non-hook-caller", "useEffect", 7)],
        },
      },
    ]);

    const result = rule5RulesOfHooks(project);
    assert.equal(result.status, "fail");
    assert.equal(result.violationCount, 1);
  });

  it("scores proportionally to violation rate", () => {
    // 10 hook calls in total, 2 violations → 8 clean / 10 total = 80
    const project = makeProject([
      {
        path: "src/screens/HomeScreen.tsx",
        layer: "screen",
        facts: {
          hookCallCount: 10,
          hookViolations: [
            hookViolation("conditional", "useState", 5),
            hookViolation("loop", "useEffect", 12),
          ],
        },
      },
    ]);

    const result = rule5RulesOfHooks(project);
    assert.equal(result.status, "fail");
    assert.equal(result.score, 80);
  });

  it("is not_applicable when no hook calls exist anywhere", () => {
    const project = makeProject([
      {
        path: "src/utils/format.ts",
        layer: "util",
        facts: { hookCallCount: 0, hookViolations: [] },
      },
    ]);

    const result = rule5RulesOfHooks(project);
    assert.equal(result.status, "not_applicable");
  });
});
