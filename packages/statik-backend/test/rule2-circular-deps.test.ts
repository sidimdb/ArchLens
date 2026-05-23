/**
 * Rule 2 — No Circular Dependencies.
 *
 * Consumes the pre-computed `project.circularDependencies` list (madge
 * output): each cycle is an array of file paths that import each other.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { rule2CircularDeps } from "../src/rules/rule2-circular-deps";
import { makeProject } from "./helpers";

describe("Rule 2 — No Circular Dependencies", () => {
  it("passes when there are no cycles", () => {
    const project = makeProject(
      [{ path: "src/screens/HomeScreen.tsx", layer: "screen" }],
      []
    );

    const result = rule2CircularDeps(project);

    assert.equal(result.status, "pass");
    assert.equal(result.violationCount, 0);
    assert.equal(result.score, 100);
  });

  it("fails and emits one violation per file in a cycle", () => {
    const project = makeProject(
      [
        { path: "src/a.ts", layer: "util" },
        { path: "src/b.ts", layer: "util" },
      ],
      [["src/a.ts", "src/b.ts"]]
    );

    const result = rule2CircularDeps(project);

    assert.equal(result.status, "fail");
    assert.equal(result.violationCount, 2);
    assert.equal(result.violations[0]!.severity, "major");
    assert.equal(result.affectedFiles.length, 2);
    // One cycle => 20-point penalty.
    assert.equal(result.score, 80);
  });

  it("penalizes each cycle and floors the score at 0", () => {
    const cycles = Array.from({ length: 6 }, (_, i) => [
      `src/x${i}.ts`,
      `src/y${i}.ts`,
    ]);
    const project = makeProject(
      cycles.flat().map((p) => ({ path: p, layer: "util" as const })),
      cycles
    );

    const result = rule2CircularDeps(project);

    assert.equal(result.status, "fail");
    assert.equal(result.score, 0); // 6 * 20 = 120 penalty, clamped to 0
  });
});
