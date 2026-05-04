/**
 * Confidence helpers shared across rules.
 *
 * Two inputs feed rule confidence:
 *   1. How well the rule could evaluate itself (parse errors, missing
 *      AST facts, no applicable files).
 *   2. How confident we are in the CLASSIFICATION that made those
 *      files "applicable" in the first place. A rule that fired on
 *      files the classifier only low-confidence-tagged should itself
 *      report low confidence — we don't want to claim certainty about
 *      a violation inside a file we're not sure is a screen.
 *
 * The final confidence is the minimum of the two. That keeps the
 * signal interpretable: high only when both the rule and the
 * classifier are confident.
 */

import { Confidence, SourceFile } from "../types";

const ORDER: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

export function minConfidence(a: Confidence, b: Confidence): Confidence {
  return ORDER[a] <= ORDER[b] ? a : b;
}

/**
 * Summarizes the classification confidence of a set of files into a
 * single confidence level, based on the worst-confident share.
 *
 *   - If every file is high-confidence classified -> high
 *   - If >= 30% of files are low-confidence classified -> low
 *   - Otherwise -> medium
 */
export function aggregateClassificationConfidence(
  files: SourceFile[]
): Confidence {
  if (files.length === 0) return "low";
  let low = 0;
  let medium = 0;
  for (const f of files) {
    if (f.layerConfidence === "low") low++;
    else if (f.layerConfidence === "medium") medium++;
  }
  const lowRatio = low / files.length;
  if (lowRatio >= 0.3) return "low";
  if (low > 0 || medium / files.length >= 0.5) return "medium";
  return "high";
}

/**
 * Downgrade-only combine: returns the strictest of the rule's own
 * evaluation confidence and the classification confidence of the
 * files it touched.
 */
export function combineWithClassification(
  ruleConfidence: Confidence,
  files: SourceFile[]
): Confidence {
  const classConf = aggregateClassificationConfidence(files);
  return minConfidence(ruleConfidence, classConf);
}
