/**
 * Rule 4 — Layer Separation (import policy).
 *
 * Enforces:
 *   screen    → component, hook, service, util, config, state, navigation
 *   component → component, hook, util, config, state
 *   hook      → hook, service, util, config, state
 *   state     → service, util, config
 *   service   → service, util, config
 *
 * Critical severity for dependency inversions (lower → higher),
 * major for sideways/skip violations.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { rule4LayerSeparation } from "../src/rules/rule4-layer-separation";
import { makeProject } from "./helpers";

describe("Rule 4 — Layer Separation", () => {
  it("passes when every cross-layer import obeys policy", () => {
    const project = makeProject([
      {
        path: "src/screens/HomeScreen.tsx",
        layer: "screen",
        facts: {
          imports: [{ source: "../components/Card", line: 3 }],
        },
      },
      {
        path: "src/components/Card.tsx",
        layer: "component",
        facts: {
          imports: [{ source: "../hooks/useUser", line: 2 }],
        },
      },
      {
        path: "src/hooks/useUser.ts",
        layer: "hook",
        facts: {
          imports: [{ source: "../services/userService", line: 1 }],
        },
      },
      {
        path: "src/services/userService.ts",
        layer: "service",
        facts: { imports: [] },
      },
    ]);

    const result = rule4LayerSeparation(project);
    assert.equal(result.status, "pass");
    assert.equal(result.violationCount, 0);
  });

  it("flags a service importing a component as a critical inversion", () => {
    const project = makeProject([
      {
        path: "src/services/userService.ts",
        layer: "service",
        facts: {
          imports: [{ source: "../components/Card", line: 1 }],
        },
      },
      {
        path: "src/components/Card.tsx",
        layer: "component",
        facts: { imports: [] },
      },
    ]);

    const result = rule4LayerSeparation(project);
    assert.equal(result.status, "fail");
    assert.equal(result.violationCount, 1);
    assert.equal(result.violations[0]!.severity, "critical");
  });

  it("flags a component importing a service as a major violation", () => {
    // Components should go through hooks; calling services directly
    // skips the hook layer.
    const project = makeProject([
      {
        path: "src/components/UserCard.tsx",
        layer: "component",
        facts: {
          imports: [{ source: "../services/userService", line: 1 }],
        },
      },
      {
        path: "src/services/userService.ts",
        layer: "service",
        facts: { imports: [] },
      },
    ]);

    const result = rule4LayerSeparation(project);
    assert.equal(result.status, "fail");
    assert.equal(result.violationCount, 1);
    assert.equal(result.violations[0]!.severity, "major");
  });
});
