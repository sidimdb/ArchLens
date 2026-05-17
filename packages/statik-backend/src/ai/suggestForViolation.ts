/**
 * Per-violation AI suggestion.
 *
 * Called lazily from the frontend when a user opens the
 * ViolationDetailPanel. Asks Claude (via @archlens/ai-client) for a
 * concrete, action-focused suggestion grounded in the specific
 * violation's file path, line number, severity, and rule context.
 *
 * Why lazy:
 *   - A typical report has 10–30 violations. Generating suggestions
 *     for all of them up-front during analysis would cost ~$0.05–0.15
 *     per report and add real latency.
 *   - Most reviewers only click into a handful of violations.
 *   - Generating on demand keeps cost predictable (≈ one cent per
 *     opened panel) and the analyzer pipeline fast.
 *
 * Honors the idea.md §4.4 promise that AI "iyileştirme önerileri
 * üretir" (generates improvement suggestions) — the rule-level
 * aiExplanation covers "açıklama" and "neden-sonuç ilişkisi", and
 * this covers the per-violation "iyileştirme önerileri" half.
 */

import { callText } from "@archlens/ai-client";

export interface ViolationSuggestionInput {
  projectName: string;
  ruleId: string;
  ruleName: string;
  ruleDescription: string;
  violation: {
    file: string;
    line?: number;
    severity: string;
    message: string;
  };
}

const SYSTEM_PROMPT =
  "You are a senior React Native architecture reviewer. You write " +
  "concrete, actionable fix suggestions for static-analysis " +
  "violations. You speak like a thoughtful code-review partner — " +
  "specific, not generic.\n\n" +
  "RULES:\n" +
  "- Stay under 3 sentences (≈ 60 words).\n" +
  "- Reference the exact file (and line if given) when it sharpens " +
  "the advice.\n" +
  "- End with a clear next step the developer can take in the next " +
  "10 minutes.\n" +
  "- Plain prose, no bullet lists, no Markdown headings, no emoji.\n" +
  "- Do not restate the rule. Do not greet the user.";

export async function suggestForViolation(
  input: ViolationSuggestionInput
): Promise<string> {
  const where = input.violation.line
    ? input.violation.file + ":" + input.violation.line
    : input.violation.file;

  const userPrompt =
    "Project: " +
    input.projectName +
    "\n" +
    "Rule: " +
    input.ruleName +
    "\n" +
    "Rule description: " +
    input.ruleDescription +
    "\n\n" +
    "Specific violation:\n" +
    "- Location: " +
    where +
    "\n" +
    "- Severity: " +
    input.violation.severity +
    "\n" +
    "- Detector message: " +
    input.violation.message +
    "\n\n" +
    "Write a 2–3 sentence suggestion that tells the developer exactly " +
    "what to change in this specific file to resolve this violation.";

  return callText({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 220,
    temperature: 0.3,
  });
}
