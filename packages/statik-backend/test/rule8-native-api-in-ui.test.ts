/**
 * Rule 8 — Native APIs in UI files.
 *
 * Consumes pre-computed `facts.nativeApiUsages`. Direct native API use
 * (AsyncStorage, Platform, …) from a screen/component is a major
 * violation; hooks and services are allowed to touch the native layer.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { rule8NativeApiInUi } from "../src/rules/rule8-native-api-in-ui";
import { makeProject } from "./helpers";

describe("Rule 8 — Native APIs in UI", () => {
  it("passes when UI files don't touch native APIs", () => {
    const project = makeProject([
      {
        path: "src/components/Card.tsx",
        layer: "component",
        facts: { nativeApiUsages: [] },
      },
    ]);

    const result = rule8NativeApiInUi(project);

    assert.equal(result.status, "pass");
    assert.equal(result.violationCount, 0);
    assert.equal(result.score, 100);
  });

  it("flags direct native API use in a screen as major", () => {
    const project = makeProject([
      {
        path: "src/screens/HomeScreen.tsx",
        layer: "screen",
        facts: {
          nativeApiUsages: [
            { line: 8, name: "AsyncStorage" },
            { line: 14, name: "Platform" },
          ],
        },
      },
    ]);

    const result = rule8NativeApiInUi(project);

    assert.equal(result.status, "fail");
    assert.equal(result.violationCount, 2);
    assert.ok(result.violations.every((v) => v.severity === "major"));
  });

  it("allows native API use inside a hook (not a UI file)", () => {
    const project = makeProject([
      {
        path: "src/hooks/useStorage.ts",
        layer: "hook",
        facts: { nativeApiUsages: [{ line: 3, name: "AsyncStorage" }] },
      },
    ]);

    const result = rule8NativeApiInUi(project);
    // No UI files inspected → not applicable.
    assert.equal(result.status, "not_applicable");
  });

  it("scores by the fraction of clean UI files", () => {
    const project = makeProject([
      {
        path: "src/components/Clean.tsx",
        layer: "component",
        facts: { nativeApiUsages: [] },
      },
      {
        path: "src/components/Dirty.tsx",
        layer: "component",
        facts: { nativeApiUsages: [{ line: 2, name: "Dimensions" }] },
      },
    ]);

    const result = rule8NativeApiInUi(project);
    assert.equal(result.score, 50);
  });
});
