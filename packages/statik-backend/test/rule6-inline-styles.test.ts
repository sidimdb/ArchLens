/**
 * Rule 6 — Inline Styles vs StyleSheet.
 *
 * Consumes pre-computed `facts.inlineStyleLines`. Only screen/component
 * files are inspected; each inline-style line is one minor violation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { rule6InlineStyles } from "../src/rules/rule6-inline-styles";
import { makeProject } from "./helpers";

describe("Rule 6 — Inline Styles vs StyleSheet", () => {
  it("passes when no UI file uses inline styles", () => {
    const project = makeProject([
      {
        path: "src/components/Card.tsx",
        layer: "component",
        facts: { inlineStyleLines: [] },
      },
    ]);

    const result = rule6InlineStyles(project);

    assert.equal(result.status, "pass");
    assert.equal(result.violationCount, 0);
    assert.equal(result.score, 100);
  });

  it("emits one minor violation per inline-style line", () => {
    const project = makeProject([
      {
        path: "src/screens/HomeScreen.tsx",
        layer: "screen",
        facts: { inlineStyleLines: [12, 18, 25] },
      },
    ]);

    const result = rule6InlineStyles(project);

    assert.equal(result.status, "fail");
    assert.equal(result.violationCount, 3);
    assert.ok(result.violations.every((v) => v.severity === "minor"));
    assert.equal(result.violations[0]!.line, 12);
  });

  it("ignores inline styles in non-UI files", () => {
    const project = makeProject([
      {
        path: "src/services/api.ts",
        layer: "service",
        facts: { inlineStyleLines: [3, 4] },
      },
    ]);

    const result = rule6InlineStyles(project);
    assert.equal(result.status, "not_applicable");
  });

  it("scores by the fraction of clean UI files", () => {
    const project = makeProject([
      {
        path: "src/components/Clean.tsx",
        layer: "component",
        facts: { inlineStyleLines: [] },
      },
      {
        path: "src/components/Dirty.tsx",
        layer: "component",
        facts: { inlineStyleLines: [5] },
      },
    ]);

    const result = rule6InlineStyles(project);
    assert.equal(result.score, 50); // 1 of 2 files clean
  });
});
