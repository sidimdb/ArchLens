/**
 * @archlens/ai-client
 *
 * Shared Anthropic / Claude client. Both archlens-statik and
 * archlens-runtime use this single module so we configure the SDK
 * exactly once.
 *
 * Why a shared package:
 *   - statik-backend uses Claude to explain rule violations in natural
 *     language and produce improvement recommendations.
 *   - runtime-verify uses Claude vision to compare before/after
 *     screenshots and decide whether a UX issue is resolved.
 *   - Both have to authenticate, pick a model, and handle errors the
 *     same way. Centralizing here removes drift between the two.
 *
 * Configuration (read from process.env at first use):
 *   - ANTHROPIC_API_KEY  — required. Get one at console.anthropic.com.
 *   - CLAUDE_MODEL       — optional. Defaults to DEFAULT_MODEL below.
 *
 * The package does NOT load .env itself — the calling process (the
 * statik backend, the verify CLI) does that with `dotenv/config`.
 * That keeps this package side-effect-free and easier to test.
 */

import Anthropic from "@anthropic-ai/sdk";

/**
 * Default Claude model used across the project.
 *
 * Per recommendation: Sonnet tier balances quality and cost for both
 * "explainer" workloads (rule violations) and vision workloads
 * (before/after verification). Override with the CLAUDE_MODEL env
 * variable if Anthropic ships a newer revision.
 *
 * Pricing (May 2026): $3 / $15 per million input/output tokens.
 */
export const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

/** All supported model IDs we currently allow. */
export type ClaudeModel = string;

/**
 * Lazy-instantiated singleton. We don't construct the client at module
 * load time so that importing this package never throws when the env
 * isn't configured (e.g. during typecheck or unit tests).
 */
let cachedClient: Anthropic | null = null;

/**
 * Returns a configured Anthropic client. Throws a clear error if
 * ANTHROPIC_API_KEY is missing, so callers get a helpful message
 * instead of an opaque 401 from the API later.
 */
export function getClient(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env at the " +
        "project root and paste your Anthropic API key. Get one at " +
        "https://console.anthropic.com/."
    );
  }

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

/** Resolves the active model — env override or DEFAULT_MODEL. */
export function getModel(): ClaudeModel {
  const override = process.env.CLAUDE_MODEL?.trim();
  return override && override.length > 0 ? override : DEFAULT_MODEL;
}

/**
 * Convenience: a one-shot text completion. Both modules use this
 * shape (system prompt + user message → text) for explanations.
 *
 * Vision-specific helpers (image input for the verify loop) will
 * land here in Phase 4 when we wire that up.
 */
export interface TextCallOptions {
  system: string;
  user: string;
  /** Cap output length. Defaults to 1024 tokens (plenty for explanations). */
  maxTokens?: number;
  /** 0 = deterministic, 1 = creative. Default 0.2 — facts over flair. */
  temperature?: number;
}

export async function callText(options: TextCallOptions): Promise<string> {
  const client = getClient();
  const model = getModel();

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.2,
    system: options.system,
    messages: [{ role: "user", content: options.user }],
  });

  // The Messages API returns a content array; for text-only responses
  // we concatenate every text block we got back.
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return text.trim();
}

/* ----------------------------------------------------------------
 * Vision support — used by @archlens/verify for the before/after
 * comparison loop.
 * ---------------------------------------------------------------- */

/** A single content block in a vision call: either text or an image. */
export type VisionBlock =
  | { kind: "text"; text: string }
  | {
      kind: "image";
      /** Raw base64, no `data:image/...;base64,` prefix. */
      base64: string;
      mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
    };

export interface VisionCallOptions {
  /** System prompt — defines the model's role. */
  system: string;
  /**
   * Ordered content blocks. Mix text and images freely; the order
   * matters because the model attends to it. For before/after
   * comparison: introduce the task in text, then the BEFORE image,
   * then a label, then the AFTER image, then the question.
   */
  blocks: VisionBlock[];
  /** Cap output. Defaults to 1024. */
  maxTokens?: number;
  /** 0 = deterministic. Default 0 — verdicts should be reproducible. */
  temperature?: number;
}

/**
 * One-shot vision completion. Returns the model's text response.
 *
 * The Anthropic SDK's image content block expects:
 *   { type: "image", source: { type: "base64", media_type, data } }
 */
export async function callVision(options: VisionCallOptions): Promise<string> {
  const client = getClient();
  const model = getModel();

  // The SDK accepts a heterogeneous array of TextBlockParam | ImageBlockParam
  // | tool blocks — we only emit text + image so we type the array loosely
  // (matching what messages.create accepts) and let the SDK validate.
  type AnthropicContent = Array<
    Anthropic.TextBlockParam | Anthropic.ImageBlockParam
  >;

  const content: AnthropicContent = options.blocks.map((b) => {
    if (b.kind === "text") {
      return { type: "text", text: b.text };
    }
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: b.mediaType,
        data: b.base64,
      },
    };
  });

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0,
    system: options.system,
    messages: [{ role: "user", content }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return text.trim();
}

/** Re-export the SDK's namespace so callers can use its types directly. */
export type { Anthropic };
