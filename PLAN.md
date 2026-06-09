# ArchLens — Plan

How the project was scoped and built, in plain language.

---

## What we set out to do

Two things, both about measuring the health of a React Native
codebase:

1. **Static analysis** — read the source, score the architecture
   against a fixed rule set, give the developer a number.
2. **Runtime UX audit** — let a reviewer point at any element in
   the running app and leave a categorized note that lands on a
   developer's triage dashboard.

In the statik module, Claude is used as an explainer — never as a
judge. Detection is fully deterministic; AI only translates the rule
output into plain language. The runtime UX audit has no AI step
today: the reviewer reports issues and the developer fixes them.

---

## Phases

### Phase 1 — March 2026 — scaffold + first half of statik
- Set up the monorepo (`npm workspaces`).
- Shared Claude client package (`@archlens/ai-client`).
- Statik backend skeleton: file scanner, Babel AST analyzer,
  multi-signal layer classifier.
- First two rules wired up (service layer, circular dependencies).

We started with the static analyzer because the AST + classifier
were the hardest technical unknown. Solving that first de-risked
the rest of the project.

### Phase 2 — April 2026 — statik shipped
- Completed all 8 rules with weighted scoring (0–100, A–F grade).
- React + Vite + Tailwind upload UI (ZIP, public GitHub, private
  GitHub).
- AI-written per-rule explanations via Claude.
- Three test apps (`good-app`, `bad-app`, `unusual-layout-app`)
  validated against a manually-prepared ground truth.
- Unit tests for all 8 rules.

End of Phase 2: the statik module is feature-complete.

### Phase 3 — May 2026 — runtime UX audit begins
- `@archlens/runtime` — React Native library with floating button,
  element inspector via React fiber tree, screenshot capture,
  annotation flow with reviewer note + category.
- `@archlens/cloud-api` — Fastify + Supabase backend that receives
  annotations and stores screenshots + issue metadata.
- `@archlens/runtime-demo` — Expo SDK 54 sample app for end-to-end
  testing.

We picked a cloud-sync architecture (instead of the original local-
file export + verify CLI) so a real review workflow works across
teams.

### Phase 4 — June 2026 — dashboard + polish
- `@archlens/dashboard-web` — triage inbox where developers filter,
  change status, and drill into each reported UX issue.
- Final polish on the runtime SDK (annotation modal redesign,
  storage warnings, dev-staging opt-out).
- Documentation: README rewritten around the new architecture,
  `AGENTS.md` updated, `docs/` populated.
- YouTube walkthrough videos for both modes.

---

## Scope decisions

### In scope
- React Native (Expo + bare workflow).
- JavaScript and TypeScript source files.
- The 8 architectural rules listed in the README.
- Cloud sync for runtime annotations through Supabase.

### Out of scope (this cycle)
- Other mobile frameworks (Flutter, native, MAUI).
- AI that fixes the reported UX issues directly — design captured
  separately in `audit-ai-fix-design.md`, implementation left for
  the next cycle.
- Web or backend code analysis — ArchLens is mobile-specific.
- Real-time multi-user collaboration on the dashboard.

---

## Key architectural choices

- **Monorepo with npm workspaces.** Both modes share types, a Claude
  client, and tooling; a polyrepo would have meant copy-paste.
- **Statik uses deterministic detection + AI only as explainer.**
  Keeps scores reproducible and the tool trustworthy. The AI step
  is always optional — the statik tool works fully offline without
  it.
- **Supabase for the runtime cloud.** Auth, Postgres, Storage, and
  row-level security all in one managed service. Service-role key
  is isolated inside `cloud-api`; the runtime SDK and dashboard
  never see it.
- **Babel for static analysis.** Mature, JSX and TypeScript support
  built in, large plugin ecosystem.
