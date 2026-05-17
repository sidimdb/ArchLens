/**
 * AI rule-explanation enrichment.
 *
 * Takes a finished Report and asks Claude (via the shared
 * @archlens/ai-client) for a plain-language, project-specific
 * explanation of each FAILED rule. The deterministic `explanation`
 * field stays untouched — we only fill in `aiExplanation` so the
 * report can be rendered with or without AI seamlessly.
 *
 * Design choices:
 *   - Only failed rules go to the model. Passed rules don't need
 *     extra commentary, and skipping them keeps the cost down.
 *   - We ground the prompt in real data: rule name, description,
 *     deterministic explanation, violation count, and up to 5
 *     example violation messages with their file paths. That stops
 *     the model from generalising into vague advice.
 *   - Strict output cap (≈ 150 tokens / 3 sentences). Long-winded
 *     AI explanations clutter the report.
 *   - Errors are swallowed per-rule. A network blip on rule 4
 *     shouldn't lose the verdict of the other 7.
 *
 * Cost: each enrichment is ~600 input + ~150 output tokens. With
 * 8 rules and only ~half failing in a typical project, expect
 * roughly $0.01 per analysis.
 */

import { callText } from "@archlens/ai-client";
import type { Report, RuleResult } from "../types";

export interface EnrichOptions {
  projectName: string;
  /**
   * Per-rule timeout in milliseconds. Defaults to 20s — Claude
   * Sonnet usually responds inside 5s, but a long tail does happen.
   */
  perRuleTimeoutMs?: number;
}

const SYSTEM_PROMPT =
  "You are a senior React Native architecture reviewer. You explain " +
  "static-analysis rule violations to a developer in plain, concrete " +
  "language. You read like a thoughtful colleague at a code review, " +
  "not a marketing brochure.\n\n" +
  "RULES:\n" +
  "- Stay under 3 sentences (≈ 60 words).\n" +
  "- Focus on WHY this is a problem in this specific project, " +
  "given the violations the analyzer found.\n" +
  "- End with one concrete, actionable refactoring direction.\n" +
  "- Plain prose, no bullet lists, no Markdown headings, no emoji.\n" +
  "- Do not restate the rule name. Do not greet the user.";

const MAX_VIOLATIONS_IN_PROMPT = 5;

/**
 * Mutates the rules in-place by setting `aiExplanation` on each
 * failed rule. Returns the same Report for caller convenience.
 *
 * Runs the per-rule AI calls in PARALLEL via Promise.allSettled —
 * with 4 failed rules that drops total latency from ~20s to ~5s.
 * Each call has its own timeout + retry inside ai-client, so a
 * single rule failing never blocks the rest.
 */
export async function enrichRulesWithAi(
  report: Report,
  options: EnrichOptions
): Promise<Report> {
  const failed = report.rules.filter((r) => r.status === "fail");
  if (failed.length === 0) return report;

  await Promise.allSettled(
    failed.map(async (rule) => {
      try {
        rule.aiExplanation = await explainOne(rule, options);
      } catch {
        // Per-rule failure must not block the report. Leave the
        // aiExplanation undefined; frontend renders the deterministic
        // explanation alone.
      }
    })
  );

  return report;
}

async function explainOne(
  rule: RuleResult,
  options: EnrichOptions
): Promise<string> {
  const sampleViolations = rule.violations
    .slice(0, MAX_VIOLATIONS_IN_PROMPT)
    .map((v, i) => {
      const where = v.line ? v.file + ":" + v.line : v.file;
      return i + 1 + ". [" + v.severity + "] " + where + " — " + v.message;
    })
    .join("\n");

  const moreNote =
    rule.violations.length > MAX_VIOLATIONS_IN_PROMPT
      ? "\n…and " +
        (rule.violations.length - MAX_VIOLATIONS_IN_PROMPT) +
        " more violations not shown."
      : "";

  const userPrompt =
    "Project: " +
    options.projectName +
    "\n" +
    "Rule: " +
    rule.name +
    "\n" +
    "Description: " +
    rule.description +
    "\n" +
    "Score: " +
    Math.round(rule.score) +
    "/100 (status: " +
    rule.status +
    ", confidence: " +
    rule.confidence +
    ")\n\n" +
    "What the analyzer found:\n" +
    rule.explanation +
    "\n\n" +
    "Sample violations:\n" +
    sampleViolations +
    moreNote +
    "\n\n" +
    "Explain in 2–3 sentences why this matters in THIS project and " +
    "what direction the developer should take to fix it.";

  return callText({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 220,
    temperature: 0.3,
  });
}
