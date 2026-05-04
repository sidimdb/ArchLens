# @archlens/ai-client

Single source of truth for the Claude / Anthropic client used across
ArchLens. Both modules (statik + runtime) depend on this package so
we configure the SDK exactly once.

## Used by

- **`@archlens/statik-backend`** — for AI-generated rule explanations
  and improvement recommendations in the architectural report.
- **`@archlens/verify`** — for the vision-based verify loop that
  compares before/after screenshots after UX fixes are applied.

## Configuration

The calling process loads environment variables (via `dotenv/config`
or however it likes); this package just reads them when first used.

| Variable | Required | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | — |
| `CLAUDE_MODEL` | no | `claude-sonnet-4-5-20250929` |

Get an API key at <https://console.anthropic.com/>.

## API

```ts
import { callText, getClient, getModel } from "@archlens/ai-client";

// One-shot text completion
const reply = await callText({
  system: "You are an architectural reviewer for React Native projects.",
  user: "Explain why circular dependencies hurt modularity in two sentences.",
});

// Or grab the raw SDK client when you need vision / streaming / tools
const client = getClient();
```

Vision helpers for the verify loop land here in Phase 4.
