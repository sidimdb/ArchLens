/**
 * Rule 3 — File Size & Complexity Thresholds.
 *
 * Thresholds: component > 200 LOC / screen > 300 LOC (major, critical
 * if > 1.5×), > 5 exports, > 3 useState (components), > 3 useEffect,
 * JSX nested > 5 levels (all minor). Only screen/component files count.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { rule3FileSize } from "../src/rules/rule3-file-size";
import { makeProject } from "./helpers";

/** Build source content of a given line count (LOC = number of lines). */
const lines = (n: number): string => Array.from({ length: n }, () => "x").join("\n");

describe("Rule 3 — File Size & Complexity", () => {
  it("passes when all UI files are within limits", () => {
    const project = makeProject([
      {
        path: "src/components/Card.tsx",
        layer: "component",
        content: lines(120),
        facts: { exportCount: 1, useStateCalls: 2, useEffectCalls: 1, maxJsxDepth: 3 },
      },
    ]);

    const result = rule3FileSize(project);

    assert.equal(result.status, "pass");
    assert.equal(result.violationCount, 0);
    assert.equal(result.score, 100);
  });

  it("flags an oversized component as major", () => {
    const project = makeProject([
      {
        path: "src/components/Card.tsx",
        layer: "component",
        content: lines(220), // > 200, but < 300 (1.5×)
      },
    ]);

    const result = rule3FileSize(project);

    assert.equal(result.status, "fail");
    assert.equal(result.violations[0]!.severity, "major");
  });

  it("escalates to critical past 1.5× the limit", () => {
    const project = makeProject([
      {
        path: "src/screens/HugeScreen.tsx",
        layer: "screen",
        content: lines(500), // > 300 * 1.5 = 450
      },
    ]);

    const result = rule3FileSize(project);

    assert.equal(result.violations[0]!.severity, "critical");
  });

  it("flags too many exports / useState / useEffect / JSX depth as minor", () => {
    const project = makeProject([
      {
        path: "src/components/Busy.tsx",
        layer: "component",
        content: lines(50),
        facts: {
          exportCount: 6,
          useStateCalls: 4,
          useEffectCalls: 4,
          maxJsxDepth: 6,
        },
      },
    ]);

    const result = rule3FileSize(project);

    assert.equal(result.status, "fail");
    assert.equal(result.violationCount, 4);
    assert.ok(result.violations.every((v) => v.severity === "minor"));
  });

  it("is not_applicable when no UI files exist", () => {
    const project = makeProject([
      { path: "src/services/api.ts", layer: "service", content: lines(400) },
    ]);

    const result = rule3FileSize(project);
    assert.equal(result.status, "not_applicable");
  });
});
