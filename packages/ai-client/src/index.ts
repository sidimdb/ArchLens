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
 * Defaults to a 30-second timeout and a single retry on transient
 * errors (5xx / 529 overloaded / network failures). Verify mode
 * (callVision below) inherits the same robustness.
 */
export interface TextCallOptions {
  system: string;
  user: string;
  /** Cap output length. Defaults to 1024 tokens (plenty for explanations). */
  maxTokens?: number;
  /** 0 = deterministic, 1 = creative. Default 0.2 — facts over flair. */
  temperature?: number;
  /** Per-request timeout in ms. Defaults to 30,000 (30s). */
  timeoutMs?: number;
  /**
   * Number of additional attempts on transient errors. Default 1
   * (so up to 2 total attempts). Set to 0 to disable retry.
   */
  maxRetries?: number;
}

export async function callText(options: TextCallOptions): Promise<string> {
  return withRetry(options.maxRetries ?? 1, async () => {
    const client = getClient();
    const model = getModel();

    const response = await withTimeout(
      client.messages.create({
        model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.2,
        system: options.system,
        messages: [{ role: "user", content: options.user }],
      }),
      options.timeoutMs ?? 30_000
    );

    // The Messages API returns a content array; for text-only responses
    // we concatenate every text block we got back.
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return text.trim();
  });
}

/* ----------------------------------------------------------------
 * Internal helpers: timeout + retry wrappers.
 * ---------------------------------------------------------------- */

/** Race a promise against a timeout. Rejects with a clear error. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(
        new Error(
          "Claude API call timed out after " +
            ms +
            "ms. The model may be overloaded; try again."
        )
      );
    }, ms);

    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      }
    );
  });
}

/**
 * Retry a function on transient errors (5xx, 529 overloaded, network
 * issues). Throws immediately on permanent errors (4xx, auth, etc.)
 * so we don't burn through retries when the request is plain wrong.
 */
async function withRetry<T>(
  maxRetries: number,
  fn: () => Promise<T>
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === maxRetries) throw err;
      // Linear backoff: 1s, 2s, 3s, ... Keeps things bounded.
      await new Promise((r) => setTimeout(r, 1_000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; code?: string; name?: string };

  // 5xx server errors + 529 (Anthropic overloaded) are retryable.
  if (typeof e.status === "number" && (e.status >= 500 || e.status === 529))
    return true;

  // Node network errors.
  if (
    e.code === "ECONNRESET" ||
    e.code === "ETIMEDOUT" ||
    e.code === "ENOTFOUND" ||
    e.code === "EAI_AGAIN"
  )
    return true;

  // Our own timeout (thrown above) is retryable.
  if (e.name === "Error" && (err as Error).message?.includes("timed out"))
    return true;

  return false;
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
  /** Per-request timeout in ms. Defaults to 45,000 (vision is slower). */
  timeoutMs?: number;
  /** Extra attempts on transient errors. Default 1. */
  maxRetries?: number;
}

/**
 * One-shot vision completion. Returns the model's text response.
 * Wrapped in the same timeout + retry policy as `callText`.
 */
export async function callVision(options: VisionCallOptions): Promise<string> {
  return withRetry(options.maxRetries ?? 1, async () => {
    const client = getClient();
    const model = getModel();

    // The SDK accepts a heterogeneous array of TextBlockParam |
    // ImageBlockParam | tool blocks — we only emit text + image so
    // we type the array loosely (matching what messages.create
    // accepts) and let the SDK validate.
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

    const response = await withTimeout(
      client.messages.create({
        model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0,
        system: options.system,
        messages: [{ role: "user", content }],
      }),
      options.timeoutMs ?? 45_000
    );

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return text.trim();
  });
}

/** Re-export the SDK's namespace so callers can use its types directly. */
export type { Anthropic };
