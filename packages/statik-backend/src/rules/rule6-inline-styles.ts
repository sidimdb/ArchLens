/**
 * Rule 6 — Inline Styles vs StyleSheet
 *
 * In React Native, every inline `style={{ ... }}` creates a fresh
 * object literal on every render. That:
 *   - bypasses RN's StyleSheet.create optimization (which interns
 *     style objects and ships them across the bridge as numeric IDs),
 *   - causes shallow-equality checks in memoized components to fail,
 *     producing avoidable re-renders,
 *   - scatters styling logic through JSX, hurting readability.
 *
 * The recommended pattern is to declare styles once at module scope:
 *
 *     const styles = StyleSheet.create({ row: { flexDirection: 'row' } });
 *     return <View style={styles.row} />;
 *
 * Detection happens in ast-analyzer.ts; this rule consumes the
 * pre-computed list of inline-style lines per file. Only UI files
 * (screens + components) are evaluated — utility / config files
 * never render JSX.
 *
 * Severity is "minor" because each individual occurrence is a
 * performance hint rather than a correctness bug; the score is the
 * fraction of UI files that are entirely inline-style-free.
 *
 * Weight: 5 / 100
 */

import { Project, RuleResult, Violation } from "../types";
import { Rule } from "./types";
import { combineWithClassification } from "./confidence";

export const RULE_ID = "RULE_6_INLINE_STYLES";
export const WEIGHT = 5;

export const rule6InlineStyles: Rule = (project: Project): RuleResult => {
  const violations: Violation[] = [];
  const affected = new Set<string>();
  const inspected: typeof project.files = [];
  let totalInline = 0;

  for (const f of project.files) {
    const isUi = f.layer === "screen" || f.layer === "component";
    if (!isUi) continue;

    const facts = project.astFactsByPath.get(f.path);
    if (!facts || facts.parseError) continue;

    inspected.push(f);

    if (facts.inlineStyleLines.length === 0) continue;

    totalInline += facts.inlineStyleLines.length;

    for (const line of facts.inlineStyleLines) {
      violations.push({
        file: f.path,
        line,
        severity: "minor",
        message:
          `Inline style object on a JSX element. ` +
          `This allocates a new object on every render — extract it into a ` +
          `StyleSheet.create() block (or any stable reference) outside the component.`,
      });
    }
    affected.add(f.path);
  }

  if (inspected.length === 0) {
    return {
      ruleId: RULE_ID,
      name: "Inline styles vs StyleSheet",
      description:
        "Avoid inline style objects in JSX — declare styles once with StyleSheet.create() and reference them by key.",
      status: "not_applicable",
      confidence: "low",
      violationCount: 0,
      violations: [],
      affectedFiles: [],
      explanation:
        "No screen or component files were found — this rule cannot be evaluated.",
      weight: WEIGHT,
      score: 100,
    };
  }

  const cleanFiles = inspected.length - affected.size;
  const score = Math.round((cleanFiles / inspected.length) * 100);

  return {
    ruleId: RULE_ID,
    name: "Inline styles vs StyleSheet",
    description:
      "Avoid inline style objects in JSX — declare styles once with StyleSheet.create() and reference them by key.",
    status: violations.length === 0 ? "pass" : "fail",
    confidence: combineWithClassification("high", inspected),
    violationCount: violations.length,
    violations,
    affectedFiles: [...affected].sort(),
    explanation:
      violations.length === 0
        ? `Scanned ${inspected.length} UI file(s) — none use inline style object literals.`
        : `Found ${totalInline} inline style object(s) across ${affected.size} of ${inspected.length} UI file(s). ` +
          `Each inline object re-allocates on every render; move them into a StyleSheet.create() block.`,
    weight: WEIGHT,
    score,
  };
};
