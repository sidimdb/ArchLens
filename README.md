# ArchLens

A two-mode toolkit that turns "is this React Native codebase well-architected?" from a subjective opinion into a measurable score.

| Mode | What it does | When it runs |
|---|---|---|
| **archlens-statik** | Parses RN source code and scores it against 8 architectural rules — service layer usage, layer separation, Rules of Hooks, naming conventions, inline styles, native APIs in UI, file complexity, circular dependencies. | On the developer's machine, against source files. |
| **archlens-runtime** | A small library installed inside an RN app. A reviewer taps a floating button, taps any UI element, leaves a note. Tool captures a screenshot, the screen, and the source file/line. After fixes are applied, a CLI uses Claude vision to verify whether each issue is resolved. | On a real device or simulator, then on the developer's laptop. |

The two modes are complementary. Static analysis catches structural issues in code; runtime UX audit catches issues in how the code feels when used. The `@archlens/combined` CLI merges both outputs into a single project-health document.

## Quick start

```bash
git clone <repo-url>
cd implementation-v2
npm install
```

### Run the static analyzer

```bash
npm run statik:backend:dev          # Express API on http://localhost:3001
npm run statik:frontend:dev         # Vite UI on http://localhost:5173
```

Open the UI, upload a `.zip` of an RN project (or paste a public GitHub URL), see the architectural report.

### Run the demo UX audit (no phone required)

```bash
# Verify the pre-built demo report (dry-run — no API key needed)
node packages/runtime-verify/dist/cli.js \
  --report demo/ux-audit-demo.md \
  --after  demo/after/ \
  --out    demo/ux-audit-demo-verified.md \
  --dry-run

# Merge with the static report
node packages/combined/dist/cli.js \
  --statik  demo/statik-demo.json \
  --runtime demo/ux-audit-demo-verified.md \
  --out     demo/combined-demo.md \
  --project "FitTrack (demo)"
```

Open `demo/combined-demo.md` in any Markdown viewer.

### Run the live UX audit on your phone

```bash
cd packages/runtime-demo
npx expo start
```

Scan the QR code with Expo Go. A floating ArchLens button appears in dev mode → tap it → tap any element → leave a note → export.

## Repository layout

```
packages/
├── ai-client/             @archlens/ai-client      shared Claude SDK wrapper
├── statik-backend/        Node + TypeScript        AST analyzer + Express API
├── statik-frontend/       Vite + React             report UI
├── runtime-lib/           @archlens/runtime        in-app RN library
├── runtime-verify/        @archlens/verify         AI verify CLI
├── runtime-demo/          @archlens/runtime-demo   sample Expo app for testing
└── combined/              @archlens/combined       merge both reports → 1 doc
demo/                                               curated demo fixtures
sample-projects/                                    test RN projects for statik
```

This is an npm workspaces monorepo — `npm install` at the root sets up everything.

## Configuration

A `.env.example` lives at the workspace root. Copy it and fill in your Anthropic key once you have one:

```bash
cp .env.example .env
```

The runtime verify CLI works in `--dry-run` mode without a key, producing canned cycling verdicts so the full pipeline is demoable end-to-end with zero credentials.

## Status

| Phase | Deliverable | Status |
|---|---|---|
| 0 | Monorepo restructure + scaffolds | ✅ |
| 1 | Runtime library + Expo demo + floating button | ✅ |
| 2 | Element identification + screenshot + note input | ✅ |
| 3 | Markdown export + system share sheet | ✅ |
| 4 | Verify CLI with Claude vision | ✅ |
| 5 | Combined report + demo fixtures + jury script | ✅ |

## Background

ArchLens is a graduation project. The goal is to make React Native architectural quality and UX quality both **measurable** through deterministic static analysis and AI-assisted runtime review, instead of leaving them as subjective code-review opinions.

The runtime mode adopts the principle "human annotates once, AI handles the rest" — a reviewer marks issues on a live app, then the AI verify loop confirms whether each one was resolved after fixes are applied, removing the human from the verification step entirely.
