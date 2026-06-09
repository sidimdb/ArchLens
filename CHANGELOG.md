# Changelog

All notable changes to ArchLens are listed here. Format follows
[Keep a Changelog](https://keepachangelog.com).

---

## [0.4.0] — June 2026
### Added
- Triage dashboard (`dashboard-web`): React + Vite + Tailwind inbox
  where developers filter, change status, and drill into each
  reported UX issue.
- Supabase storage policies, project-key validation, admin-delete RPC,
  device fingerprint integration.
- YouTube walkthrough video for the runtime UX audit, linked from
  the README.
- Documentation: `docs/` now holds the project text, slides, poster,
  and idea brief.
- `AGENTS.md` rewritten to cover the new cloud + dashboard packages,
  Supabase key isolation rule, and updated dev cheatsheet.

### Changed
- README rewritten around the new architecture (statik + runtime
  cloud + dashboard); added demo videos and statik screenshots.
- Final polish pass on the runtime SDK (annotation modal redesign,
  category chips, AsyncStorage size warnings, dev-staging opt-out).

---

## [0.3.0] — May 2026
### Added
- **Runtime UX audit module begins.** `@archlens/runtime`:
  `<ArchLensProvider>`, floating button, element inspector via React
  fiber tree, screenshot capture, annotation flow with reviewer note
  + category.
- `@archlens/cloud-api` (Fastify + Supabase): receives annotations
  from the runtime SDK, stores screenshots in Supabase Storage and
  issue metadata in Postgres.
- `@archlens/runtime-demo` — Expo SDK 54 sample app for testing the
  runtime library on a real device.
- Legacy `runtime-verify` CLI kept for the original markdown-export
  → Claude-vision verify flow.

### Changed
- Element detection rewritten with a 5-pass priority pick so the
  inspector grabs the right component, not the whole screen.

---

## [0.2.0] — April 2026
### Added
- **Static analyzer is feature-complete.** Eight architectural
  rules (service layer, circular deps, file size, layer separation,
  Rules of Hooks, inline styles, naming, native APIs in UI) with
  weighted scoring and an A–F grade.
- React + Vite + Tailwind upload UI (`statik-frontend`): drag-and-
  drop ZIP, public GitHub URL, private GitHub URL with token.
- AI-written explanations for failed rules via Claude (Anthropic
  SDK) — fully optional, system works offline.
- Three test apps under `tests/` (`good-app`, `bad-app`,
  `unusual-layout-app`) verified against ground truth.
- Unit tests for all 8 rules (32 tests across 8 suites, passing).
- Confidence downgrading explanations in the report UI when
  classifier signals are weak.

### Changed
- Sample-projects folder renamed to `tests/` per advisor request.

---

## [0.1.0] — March 2026
### Added
- Initial monorepo scaffold (npm workspaces).
- `@archlens/ai-client` — shared Claude client.
- First version of the statik backend: file scanner, Babel AST
  analyzer, multi-signal layer classifier.
- Initial rule engine with the first two rules wired up
  (service layer, circular deps).

---

— Last updated: June 2026
