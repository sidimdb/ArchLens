/**
 * Rule 1 — Service Layer Usage (network boundary).
 *
 * Detects fetch / axios / aliased HTTP calls anywhere outside files
 * classified as `service`.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { rule1ServiceLayer } from "../src/rules/rule1-service-layer";
import { makeProject } from "./helpers";

describe("Rule 1 — Service Layer Usage", () => {
  it("passes when all network calls live in a service file", () => {
    const project = makeProject([
      {
        path: "src/services/userService.ts",
        layer: "service",
        facts: {
          networkCalls: [{ line: 7, callee: "axios.get" }],
        },
      },
      {
        path: "src/screens/HomeScreen.tsx",
        layer: "screen",
        facts: { networkCalls: [] },
      },
    ]);

    const result = rule1ServiceLayer(project);

    assert.equal(result.status, "pass");
    assert.equal(result.violationCount, 0);
    assert.equal(result.score, 100);
  });

  it("fails when a component performs a direct fetch", () => {
    const project = makeProject([
      {
        path: "src/components/UserCard.tsx",
        layer: "component",
        facts: {
          networkCalls: [{ line: 11, callee: "fetch" }],
        },
      },
    ]);

    const result = rule1ServiceLayer(project);

    assert.equal(result.status, "fail");
    assert.equal(result.violationCount, 1);
    assert.ok(result.violations[0]!.message.toLowerCase().includes("network"));
  });

  it("treats screen-level axios calls as violations", () => {
    const project = makeProject([
      {
        path: "src/screens/ProfileScreen.tsx",
        layer: "screen",
        facts: {
          networkCalls: [
            { line: 4, callee: "axios.get" },
            { line: 9, callee: "axios.post" },
          ],
        },
      },
    ]);

    const result = rule1ServiceLayer(project);
    assert.equal(result.status, "fail");
    assert.equal(result.violationCount, 2);
  });

  it("is not_applicable when the project has zero network calls", () => {
    const project = makeProject([
      {
        path: "src/screens/HomeScreen.tsx",
        layer: "screen",
        facts: { networkCalls: [] },
      },
    ]);

    const result = rule1ServiceLayer(project);
    assert.equal(result.status, "not_applicable");
  });
});
