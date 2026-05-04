/**
 * Vision-prompt template for the verify loop.
 *
 * Goals:
 *   - Force a strict JSON response so the CLI can parse without LLM
 *     output drift.
 *   - Bias the model toward "uncertain" when the change isn't
 *     clearly resolving the issue. False positives ("verified" when
 *     it isn't) are far worse here than false negatives — a wrong
 *     "verified" misleads the developer; "uncertain" just kicks the
 *     decision back to a human.
 *   - Keep the prompt short. Vision tokens are expensive; we don't
 *     pad the system message with marketing copy.
 */

export const SYSTEM_PROMPT =
  "You are a UX reviewer auditing fixes to a React Native mobile app. " +
  "You will be given two screenshots of the same screen — a BEFORE image " +
  "(captured when a reviewer flagged a UX problem) and an AFTER image " +
  "(captured after a developer attempted to fix it). You will also receive " +
  "the reviewer's original note describing the problem.\n\n" +
  "Your job is to decide whether the specific issue the reviewer described " +
  "has been resolved in the AFTER image. Be conservative — if the change " +
  "is unclear, ambiguous, or only partially addresses the note, return " +
  '"uncertain". Reserve "verified" for cases where the fix clearly and ' +
  "fully resolves the original concern.\n\n" +
  "Respond ONLY with a single JSON object, no surrounding prose, no " +
  "Markdown fencing. Use this exact shape:\n" +
  '{"verdict": "verified" | "rejected" | "uncertain", "reasoning": "<one to three sentences>"}';

export interface UserPromptInput {
  note: string;
  componentName: string;
  source?: string;
  screenName: string;
}

/**
 * The text portion of the user message that accompanies the two
 * images. The images themselves are attached as separate content
 * blocks by the caller.
 */
export function buildUserPromptText(input: UserPromptInput): string {
  const lines: string[] = [];
  lines.push("Reviewer note:");
  lines.push('"""');
  lines.push(input.note || "(no note provided)");
  lines.push('"""');
  lines.push("");
  lines.push("Element context:");
  lines.push("- Screen: " + input.screenName);
  lines.push("- Component: <" + input.componentName + ">");
  if (input.source) lines.push("- Source: " + input.source);
  lines.push("");
  lines.push(
    "Decide whether the issue described above is resolved between the " +
      "BEFORE and AFTER screenshots that follow. Respond as JSON only."
  );
  return lines.join("\n");
}
