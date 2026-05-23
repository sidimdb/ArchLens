/**
 * Rule 7 — Naming Conventions.
 *
 * Screens/components → PascalCase; hooks → useXxx; services → camelCase.
 * Both the file basename and the default export name must comply.
 * index.* and dotted basenames (Foo.test) are skipped.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { rule7Naming } from "../src/rules/rule7-naming";
import { makeProject } from "./helpers";

describe("Rule 7 — Naming Conventions", () => {
  it("passes when names follow their layer convention", () => {
    const project = makeProject([
      {
        path: "src/screens/LoginScreen.tsx",
        layer: "screen",
        facts: { defaultExportName: "LoginScreen" },
      },
      {
        path: "src/hooks/useUserData.ts",
        layer: "hook",
        facts: { defaultExportName: "useUserData" },
      },
      {
        path: "src/services/authService.ts",
        layer: "service",
        facts: { defaultExportName: "authService" },
      },
    ]);

    const result = rule7Naming(project);

    assert.equal(result.status, "pass");
    assert.equal(result.violationCount, 0);
  });

  it("flags a lowercase component file and export", () => {
    const project = makeProject([
      {
        path: "src/components/messycard.jsx",
        layer: "component",
        facts: { defaultExportName: "messycard" },
      },
    ]);

    const result = rule7Naming(project);

    assert.equal(result.status, "fail");
    assert.equal(result.violationCount, 2); // basename + export
    assert.ok(result.violations.every((v) => v.severity === "minor"));
  });

  it("flags a hook that doesn't start with 'use'", () => {
    const project = makeProject([
      {
        path: "src/hooks/fetchData.ts",
        layer: "hook",
        facts: { defaultExportName: "fetchData" },
      },
    ]);

    const result = rule7Naming(project);
    assert.equal(result.status, "fail");
  });

  it("skips index files", () => {
    const project = makeProject([
      {
        path: "src/components/index.ts",
        layer: "component",
        facts: { defaultExportName: null },
      },
    ]);

    const result = rule7Naming(project);
    assert.equal(result.status, "not_applicable");
  });
});
