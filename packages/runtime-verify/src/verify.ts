/**
 * The actual verify step: send before + after + note to Claude
 * vision and turn its response into a strict { verdict, reasoning }
 * pair.
 *
 * Robustness:
 *   - Some LLMs occasionally wrap JSON in Markdown fences despite
 *     instructions. We strip ```json ... ``` defensively.
 *   - If the response isn't valid JSON or doesn't match the
 *     expected shape, we return verdict="uncertain" with the raw
 *     text as reasoning rather than crashing the whole batch.
 *   - Network/API errors bubble up — the CLI catches them and
 *     marks the issue as uncertain with the error message.
 *
 * Dry-run mode is implemented in the CLI, not here. This module
 * always makes a real API call.
 */

import { callVision, type VisionBlock } from "@archlens/ai-client";
import { SYSTEM_PROMPT, buildUserPromptText } from "./prompt";
import type { ReportIssue, Verdict } from "./types";

export interface RawVerdict {
  verdict: Verdict;
  reasoning: string;
}

const VALID_VERDICTS = new Set<Verdict>([
  "verified",
  "rejected",
  "uncertain",
]);

/**
 * Run the full verify call for one (before, after, note) triple.
 *
 * `afterBase64` is the developer's "after" screenshot, base64-encoded
 * with no `data:` prefix.
 */
export async function verifyIssue(
  issue: ReportIssue,
  afterBase64: string
): Promise<RawVerdict> {
  const blocks: VisionBlock[] = [
    {
      kind: "text",
      text: buildUserPromptText({
        note: issue.note,
        componentName: issue.componentName,
        source: issue.source,
        screenName: issue.screenName,
      }),
    },
    { kind: "text", text: "BEFORE:" },
    { kind: "image", base64: issue.beforeBase64, mediaType: "image/png" },
    { kind: "text", text: "AFTER:" },
    { kind: "image", base64: afterBase64, mediaType: "image/png" },
  ];

  const raw = await callVision({
    system: SYSTEM_PROMPT,
    blocks,
    maxTokens: 400,
    temperature: 0,
  });

  return parseVerdict(raw);
}

/**
 * Parse Claude's response into a strict shape. Tolerates fenced
 * code blocks and surrounding whitespace.
 */
export function parseVerdict(rawResponse: string): RawVerdict {
  const stripped = stripCodeFence(rawResponse).trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return {
      verdict: "uncertain",
      reasoning:
        "Model response was not valid JSON. Raw: " +
        truncate(rawResponse, 200),
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      verdict: "uncertain",
      reasoning: "Model response was not a JSON object.",
    };
  }

  const obj = parsed as Record<string, unknown>;
  const verdictCandidate =
    typeof obj.verdict === "string" ? (obj.verdict as Verdict) : undefined;
  const reasoning =
    typeof obj.reasoning === "string" ? obj.reasoning : "";

  if (!verdictCandidate || !VALID_VERDICTS.has(verdictCandidate)) {
    return {
      verdict: "uncertain",
      reasoning:
        "Model returned unexpected verdict `" +
        String(obj.verdict) +
        "`. Reasoning was: " +
        (reasoning || "(none)"),
    };
  }

  return { verdict: verdictCandidate, reasoning };
}

function stripCodeFence(s: string): string {
  // Accept ```json … ``` or ``` … ```; ignore leading/trailing text.
  const m = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(s);
  return m ? m[1]! : s;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
