/**
 * Weighted scorer.
 *
 * Takes a list of per-rule results and produces the overall project
 * score (0–100) and a letter grade. Weights come from each rule's
 * own `weight` field so scoring stays local to the rule definition.
 *
 * not_applicable rules keep their 100 stub score but we *renormalize*
 * across the applicable rules, so skipping a rule doesn't inflate the
 * overall score.
 */

import { RuleResult, ReportSummary } from "../types";

export function computeOverallScore(rules: RuleResult[]): number {
  const applicable = rules.filter((r) => r.status !== "not_applicable");
  if (applicable.length === 0) return 0;

  const weightSum = applicable.reduce((s, r) => s + r.weight, 0);
  if (weightSum === 0) return 0;

  const weighted = applicable.reduce(
    (s, r) => s + (r.score / 100) * r.weight,
    0
  );
  return Math.round((weighted / weightSum) * 100 * 10) / 10; // 1 decimal
}

export function grade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function summarize(rules: RuleResult[]): ReportSummary {
  const applicable = rules.filter((r) => r.status !== "not_applicable");
  const sorted = [...applicable].sort((a, b) => b.score - a.score);
  return {
    strongest: sorted.slice(0, 2).map((r) => r.name),
    weakest: sorted.slice(-2).reverse().map((r) => r.name),
  };
}
