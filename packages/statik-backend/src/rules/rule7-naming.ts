/**
 * Rule 7 — Naming Conventions
 *
 * In React / React Native, naming is load-bearing — not just style:
 *   - JSX only treats a function as a component if its name starts
 *     with a capital letter; lowercase names render as raw HTML tags.
 *   - The official ESLint plugin only treats a function as a hook
 *     (and runs the Rules-of-Hooks check) if its name starts with `use`.
 * So enforcing PascalCase / camelCase / `useXxx` isn't bikeshedding;
 * it's the contract those tools depend on.
 *
 * Conventions enforced:
 *
 *   - screen / component → file PascalCase, default export PascalCase
 *   - hook               → file `useXxx` (camelCase starting with `use`),
 *                          default export same shape
 *   - service            → file camelCase (e.g. authService, apiClient)
 *
 * Files we deliberately skip:
 *   - index.{ts,tsx,js,jsx}           — name comes from the folder
 *   - any file whose basename contains a `.` (e.g. Foo.test, Foo.styles)
 *
 * Severity is "minor" — bad names don't break the build, but they
 * hurt readability and quietly disable React/RN tooling.
 *
 * Weight: 5 / 100
 */

import { Layer, Project, RuleResult, Violation } from "../types";
import { Rule } from "./types";
import { combineWithClassification } from "./confidence";

export const RULE_ID = "RULE_7_NAMING";
export const WEIGHT = 5;

interface NameCheck {
  basenamePattern: RegExp;
  basenameDescription: string;
  exportPattern: RegExp;
  exportDescription: string;
}

const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const HOOK = /^use[A-Z][A-Za-z0-9]*$/;
const CAMEL = /^[a-z][A-Za-z0-9]*$/;

const CHECKS: Partial<Record<Layer, NameCheck>> = {
  screen: {
    basenamePattern: PASCAL,
    basenameDescription: "PascalCase (e.g. LoginScreen)",
    exportPattern: PASCAL,
    exportDescription: "PascalCase (e.g. LoginScreen)",
  },
  component: {
    basenamePattern: PASCAL,
    basenameDescription: "PascalCase (e.g. PrimaryButton)",
    exportPattern: PASCAL,
    exportDescription: "PascalCase",
  },
  hook: {
    basenamePattern: HOOK,
    basenameDescription: "camelCase starting with 'use' (e.g. useUserData)",
    exportPattern: HOOK,
    exportDescription: "camelCase starting with 'use'",
  },
  service: {
    basenamePattern: CAMEL,
    basenameDescription: "camelCase (e.g. authService, apiClient)",
    exportPattern: CAMEL,
    exportDescription: "camelCase",
  },
};

export const rule7Naming: Rule = (project: Project): RuleResult => {
  const violations: Violation[] = [];
  const affected = new Set<string>();
  const inspected: typeof project.files = [];

  for (const f of project.files) {
    const check = CHECKS[f.layer];
    if (!check) continue;

    const facts = project.astFactsByPath.get(f.path);
    if (!facts) continue;

    const basename = facts.basename;

    // Skip files where the basename isn't representative of intent.
    if (basename === "index") continue;
    if (basename.includes(".")) continue; // Foo.test, Foo.styles, Foo.types, etc.

    inspected.push(f);

    if (!check.basenamePattern.test(basename)) {
      violations.push({
        file: f.path,
        severity: "minor",
        message:
          `${f.layer} file '${basename}' does not follow the expected naming convention. ` +
          `Use ${check.basenameDescription}.`,
      });
      affected.add(f.path);
    }

    const exportName = facts.defaultExportName;
    if (exportName && !check.exportPattern.test(exportName)) {
      violations.push({
        file: f.path,
        severity: "minor",
        message:
          `${f.layer} default export '${exportName}' does not follow the expected naming convention. ` +
          `Use ${check.exportDescription}.`,
      });
      affected.add(f.path);
    }
  }

  if (inspected.length === 0) {
    return {
      ruleId: RULE_ID,
      name: "Naming conventions",
      description:
        "Components and screens use PascalCase; hooks use 'useXxx'; services use camelCase. Both file names and default exports must comply.",
      status: "not_applicable",
      confidence: "low",
      violationCount: 0,
      violations: [],
      affectedFiles: [],
      explanation:
        "No screen, component, hook or service files were found — this rule cannot be evaluated.",
      weight: WEIGHT,
      score: 100,
    };
  }

  const cleanFiles = inspected.length - affected.size;
  const score = Math.round((cleanFiles / inspected.length) * 100);

  return {
    ruleId: RULE_ID,
    name: "Naming conventions",
    description:
      "Components and screens use PascalCase; hooks use 'useXxx'; services use camelCase. Both file names and default exports must comply.",
    status: violations.length === 0 ? "pass" : "fail",
    confidence: combineWithClassification("high", inspected),
    violationCount: violations.length,
    violations,
    affectedFiles: [...affected].sort(),
    explanation:
      violations.length === 0
        ? `Checked ${inspected.length} file(s) across screens, components, hooks and services — all follow the expected naming convention.`
        : `${violations.length} naming convention violation(s) across ${affected.size} of ${inspected.length} file(s). ` +
          `Bad names quietly disable React/RN tooling — JSX won't treat lowercase functions as components, and the Rules-of-Hooks linter only fires on names starting with 'use'.`,
    weight: WEIGHT,
    score,
  };
};
