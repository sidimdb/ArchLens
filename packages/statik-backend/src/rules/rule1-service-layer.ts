/**
 * Rule 1 — Service Layer Usage (Network Boundary)
 *
 * All HTTP access in the project must be centralized in the service
 * layer. A direct fetch/axios call anywhere outside a file classified
 * as `service` is considered a violation, because it bypasses the
 * architectural boundary the service layer is meant to enforce.
 *
 * This rule is the merged successor of two earlier rules ("network
 * calls not in UI" + "service layer usage"). It applies uniformly
 * across screens, components, hooks, utils, state, etc. — the only
 * legal place for a network call is a service file.
 *
 * Threshold: 0 violations allowed.
 * Weight:    20 / 100
 */

import { Project, RuleResult, Violation } from "../types";
import { Rule } from "./types";
import { combineWithClassification } from "./confidence";

export const RULE_ID = "RULE_1_SERVICE_LAYER";
export const WEIGHT = 20;

export const rule1ServiceLayer: Rule = (project: Project): RuleResult => {
  const violations: Violation[] = [];
  const affected = new Set<string>();
  const inspected: typeof project.files = [];
  let totalCallsScanned = 0;

  for (const f of project.files) {
    const facts = project.astFactsByPath.get(f.path);
    if (!facts || facts.parseError) continue;
    if (facts.networkCalls.length === 0) continue;

    inspected.push(f);
    totalCallsScanned += facts.networkCalls.length;

    if (f.layer === "service") continue; // calls from services are allowed

    for (const call of facts.networkCalls) {
      const isUi = f.layer === "screen" || f.layer === "component";
      violations.push({
        file: f.path,
        line: call.line,
        severity: "major",
        message: isUi
          ? `Direct network call '${call.callee}()' inside ${f.layer} file. ` +
            `UI code must not perform HTTP directly — move this into a service module (and call it via a hook if needed).`
          : `Direct network call '${call.callee}()' in ${f.layer} file. ` +
            `All HTTP access must go through the service layer — move this into a service module.`,
      });
      affected.add(f.path);
    }
  }

  if (totalCallsScanned === 0) {
    return {
      ruleId: RULE_ID,
      name: "Service layer usage",
      description:
        "All network calls (fetch, axios, and aliased HTTP clients) must originate from files classified as 'service'.",
      status: "not_applicable",
      confidence: "low",
      violationCount: 0,
      violations: [],
      affectedFiles: [],
      explanation:
        "No network calls found anywhere in the project — this rule cannot be evaluated.",
      weight: WEIGHT,
      score: 100,
    };
  }

  const cleanCalls = totalCallsScanned - violations.length;
  const score = Math.round((cleanCalls / totalCallsScanned) * 100);

  return {
    ruleId: RULE_ID,
    name: "Service layer usage",
    description:
      "All network calls (fetch, axios, and aliased HTTP clients) must originate from files classified as 'service'.",
    status: violations.length === 0 ? "pass" : "fail",
    confidence: combineWithClassification("high", inspected),
    violationCount: violations.length,
    violations,
    affectedFiles: [...affected].sort(),
    explanation:
      violations.length === 0
        ? `Scanned ${totalCallsScanned} network call(s) — all originate from service files.`
        : `Found ${violations.length} network call(s) outside the service layer, across ${affected.size} file(s). Centralize HTTP access in services so the rest of the app depends on a stable interface, not on fetch/axios directly.`,
    weight: WEIGHT,
    score,
  };
};
