# ArchLens

A two-mode toolkit for evaluating React Native codebases.

| Module | What it does | Where it runs |
|---|---|---|
| **archlens-statik** | Static analyzer — parses an RN project's source code and scores it against 8 architectural rules (service layer usage, layer separation, Rules of Hooks, naming, inline styles, native APIs in UI, file complexity, circular dependencies). | On the developer's machine, against source files. |
| **archlens-runtime** | UX audit — a small library installed inside an RN app. A reviewer taps a floating button, taps any UI element, leaves a note. The tool captures a screenshot, the screen, and the source file/line of the tapped component, and exports a Markdown report. A separate CLI uses Claude vision to verify whether each issue was resolved after fixes are applied. | On a real device or simulator. |

The two modules are independent but complementary. Static analysis catches structural issues in the code; runtime UX audit catches issues in how the code feels when used.

## Repository layout

```
packages/
├── statik-backend/      Node + TypeScript analyzer + Express API
├── statik-frontend/     Vite + React report UI
├── runtime-lib/         @archlens/runtime — RN library
├── runtime-verify/      @archlens/verify — CLI for AI verification
└── runtime-demo/        Sample RN app used to test runtime-lib
```

This is an npm workspaces monorepo. From the root:

```bash
npm install                               # installs all packages
npm run statik:backend:dev                # run the static analyzer API
npm run statik:frontend:dev               # run the report UI
npm run typecheck                         # typecheck every package
```

## Status

| Phase | What | State |
|---|---|---|
| 0 | Monorepo restructure, scaffolds for runtime modules | ✅ done |
| 1 | Runtime library skeleton (provider + floating button) | upcoming |
| 2 | Element identification + screenshot capture + note input | upcoming |
| 3 | Markdown export | upcoming |
| 4 | Verify CLI (Claude vision before/after) | upcoming |
| 5 | Polish + integration + demo prep | upcoming |

## Background

ArchLens is being developed as a graduation project. The goal is to make React Native architectural quality and UX quality both **measurable** through deterministic static analysis and AI-assisted runtime review, instead of leaving them as subjective code-review opinions.
