# AGENT.md

Guidance for coding agents (Claude Code, Cursor, Codex CLI, GitHub
Copilot Agent, etc.) working in this repository.

If you are an AI assistant reading this, read it fully before making
changes. If you are a human, this file documents the same project
conventions used throughout the codebase.

---

## What this repo is

ArchLens is a two-mode architectural / UX evaluation toolkit for
React Native projects:

- **archlens-statik** — static code analyzer (Node + TypeScript +
  Babel) with a React + Vite + Tailwind web UI
- **archlens-runtime** — a React Native library + companion CLI that
  captures live UX issues and verifies fixes with Claude vision

The repo is an **npm workspaces monorepo** with the following
packages under `packages/`:

| Package | Stack | Role |
|---|---|---|
| `@archlens/ai-client` | TS, Anthropic SDK | Single Claude client shared by statik + runtime |
| `@archlens/statik-backend` | Node + TS + Express + Babel + Madge | AST analyzer, 8 rules, scoring, HTTP API |
| `@archlens/statik-frontend` | Vite + React + Tailwind (JSX) | Upload UI + report viewer |
| `@archlens/runtime` | React Native + TS | `<ArchLensProvider>`, FAB, capture, export |
| `@archlens/verify` | Node + TS CLI | Reads exported Markdown, calls Claude vision, writes verdicts |
| `@archlens/runtime-demo` | Expo SDK 54 + RN 0.81 + React 19 | Sample app for testing the runtime library |

Plus `tests/` (three sample RN projects: `good-app`, `bad-app`,
`unusual-layout-app`) and `demo/` (curated end-to-end fixtures).

---

## Working principles in this codebase

These are not preferences — they are decisions that have shaped the
whole project. Please honor them when contributing.

### 1. AI never decides. AI explains and verifies.

All architectural violations and UX issue detections are produced by
**deterministic code** (the 8 rules, the runtime annotation
mechanism). Claude is only used as an **explainer** (turning rule
output into natural language) and a **verifier** (comparing
before/after screenshots).

If you find yourself adding an AI call that determines *whether*
something is a violation, you have probably stepped outside the
project's design.

### 2. The two modes are independent but share one AI client

`@archlens/ai-client` is the only package that imports the Anthropic
SDK. Both `statik-backend` and `runtime-verify` go through it. Do
not add a second Anthropic SDK dependency anywhere.

### 3. Determinism is enforced at the data layer

The statik report (`Report` type) and the runtime export
(`archlens-runtime-export@1` schema) are **stable, machine-parseable
formats**. They define the contract between modules. Do not change
their shape without bumping the schema version and updating every
downstream consumer.

### 4. Privacy of API keys

The Anthropic API key lives in `.env` at the workspace root, which is
git-ignored. Never commit it. Never paste it into chat. Never log it.
`.env.example` is the template — it stays in the repo with blank
values.

### 5. Strict TypeScript everywhere

All TS packages use `"strict": true`. Avoid `any`. When you must
escape the type system (e.g. RN's private inspector API), localize
the cast with a comment explaining why.

---

## Run / build / typecheck cheatsheet

From the workspace root:

```bash
npm install                                # set up everything

# Static analyzer
npm run statik:backend:build               # compile
npm run statik:backend:dev                 # dev server on :8000
npm run statik:frontend:dev                # Vite UI on :5173
npm run test:statik                        # unit tests for the 8 rules

# Runtime
cd packages/runtime-demo && npx expo start # Expo dev menu + QR code

# Verify CLI
npm run runtime:verify:build
node packages/runtime-verify/dist/cli.js --help

# Typecheck everything
npm run typecheck
```

To run any single package's typecheck: `cd packages/<name> && npx tsc --noEmit`.

---

## The 8 architectural rules (statik)

When extending or modifying rules, read the existing rule files in
`packages/statik-backend/src/rules/` first — they share a common
pattern: a `Rule` function takes a `Project` and returns a
`RuleResult`. Severities are `critical | major | minor`.

| ID | Name | Weight |
|---|---|---|
| RULE_1_SERVICE_LAYER | Service layer usage | 20 |
| RULE_2_CIRCULAR_DEPS | No circular dependencies | 15 |
| RULE_3_FILE_SIZE | File size & complexity | 10 |
| RULE_4_LAYER_SEPARATION | Layer separation (imports) | 20 |
| RULE_5_RULES_OF_HOOKS | Rules of Hooks compliance | 15 |
| RULE_6_INLINE_STYLES | Inline styles vs StyleSheet | 5 |
| RULE_7_NAMING | Naming conventions | 5 |
| RULE_8_NATIVE_API_IN_UI | Native APIs in UI | 10 |

Weights sum to 100. The scorer renormalizes over applicable rules so
not-applicable rules don't inflate the total.

---

## React Native runtime — sharp edges

The runtime library uses private React Native APIs that are not part
of the public surface. Specifically:

- `react-native/src/private/devsupport/devmenu/elementinspector/getInspectorDataForViewAtPoint`
  (RN 0.79+) or `react-native/Libraries/Inspector/getInspectorDataForViewAtPoint` (≤0.78).
  Wrapped in `packages/runtime-lib/src/identify/identifyAtPoint.ts`.
- React fiber `_debugSource` metadata, injected by
  `@babel/plugin-transform-react-jsx-source` in dev builds only.

These APIs may break on RN minor version bumps. The library has
fallback paths (returns `componentName: "unknown"` if the API isn't
available) and dev-mode warnings.

**Production builds must remain a no-op.** `<ArchLensProvider>`
returns `<>{children}</>` when `__DEV__` is false OR when the
`disabled` prop is set. The `disabled` prop is an explicit opt-out
for dev-mode "staging" builds. Do not break this contract.

---

## Conventions

- **Comments**: explain *why*, not *what*. Code shows what.
- **File length**: keep files under ~300 LOC; if growing past that,
  consider splitting (the rules module does this well).
- **Imports**: use the package-named aliases (`@archlens/ai-client`)
  rather than relative paths across packages.
- **Errors**: throw early with descriptive messages; the server's
  central error handler maps `Invalid` and similar keywords to HTTP
  400.
- **Tests**: when fixing a rule, add a test in
  `packages/statik-backend/test/rule*.test.ts` covering the fix.
- **AI prompts**: prefer strict JSON output formats with conservative
  bias (lean toward `uncertain` rather than false `verified`). See
  `packages/runtime-verify/src/prompt.ts` for the canonical pattern.
- **No emojis in committed code or comments** unless they convey
  semantic meaning (the status dots use ✅ ❌ ⚠️ deliberately;
  decorative emojis don't belong).

---

## What not to do

- ❌ Do not pin to the latest cutting-edge React Native or Expo
  release without verifying Expo Go on the public stores supports it.
  See the Expo SDK 54 / RN 0.81 / React 19.1 pairing in
  `packages/runtime-demo/package.json`.
- ❌ Do not commit `node_modules/`, `dist/`, `.env`, `.expo/`, or any
  `*-real-verified.md` artifacts. The `.gitignore` covers these.
- ❌ Do not add an Anthropic SDK dependency outside
  `@archlens/ai-client`.
- ❌ Do not change the `archlens-runtime-export@1` schema without
  bumping the version.
- ❌ Do not introduce blue (`#235C8D`) anywhere in the UI — the
  project's monochrome paper aesthetic deliberately avoids it.

---

## Outstanding work (TODO list)

See [`TODO.md`](./TODO.md) at the repo root for the current task
list. It groups items by priority (must-do / should-do / nice-to-have
/ out-of-scope) and points to the rough file paths that change for
each one. When you pick up an item from there, follow the convention
documented at the bottom of that file (mark `[~]` while working,
`[x]` when shipped).

---

## Getting help

If you're an agent and a task here is ambiguous, **prefer asking the
human one clarifying question over guessing**. The codebase has
opinions and silent assumptions; getting them right matters more
than moving fast.

If you're a human reviewing an agent's PR, this file is the rubric.

— Last updated: 2026
