# ArchLens — TODO

Outstanding work, grouped by priority. Items are de-duplicated against
already-shipped features.

> **Convention:** `[ ]` = open, `[x]` = done, `[~]` = in progress.

---

## Status — June 2026

**All items in this file are now shipped.**

The full pipeline — `statik` analyzer, `runtime` SDK, cloud API,
dashboard, AI enrichment, three test apps, eight architectural rules,
deterministic scoring — is in place and working end-to-end. The README
has been brought up to date with the new architecture, the demo videos,
the screenshots, and the test apps' expected scores.

Anything still on the radar — TypeScript type integration, new rule
families (accessibility, performance, security), expansion to other
frameworks (Flutter, .NET MAUI, native Android/iOS), AI-driven auto-fix
of submitted UX issues, GitHub Actions integration — lives in
[`future_work/todo.md`](future_work/todo.md). If you're picking the
project up next, that's the file to read first.

---

## 🔴 Must do — real gaps before release

These are the items that, if a careful reviewer pokes at the project,
they would notice. None of them were optional polish.

- [x] **Improve element identification** — `pickBestEntry`
  in `packages/runtime-lib/src/identify/identifyAtPoint.ts` now uses
  a 5-pass priority: (1) deepest specific non-screen user component
  with source, (2) deepest interactive host (`Pressable`, `Button`,
  `Switch`, `TextInput`, touchables), (3) deepest user component with
  source incl. screens, (4) any user component, (5) leaf. This stops
  the picker from grabbing the whole screen when a bare button is
  tapped, while still preferring custom components that carry the
  source file.

- [x] **View / edit / delete individual annotations** — the
  `SessionMenu` sheet now lists every captured annotation
  (thumbnail + screen/component + note). Tap a note to edit it
  inline, tap × to delete that single annotation. Backed by new
  `deleteAnnotation` / `updateAnnotationNote` context methods that
  persist to AsyncStorage. _Verified on device._

- [x] **After-screenshot workflow (documented)** — added a full
  step-by-step "Full workflow" section to
  `packages/runtime-verify/README.md` (annotate → fix → screenshot →
  name → run), with a folder-structure example, verdict meanings,
  and a troubleshooting table. Root README links to it. _(Replay
  mode — auto re-capture — left as future work; documentation is
  enough for now.)_

- [x] **Image size validation in `archlens-verify`** — before each
  API call the CLI checks the after-screenshot's byte size against a
  ~4.5MB threshold (Claude vision's limit is 5MB). Oversized images
  are reported as `uncertain` with a clear "resize to ~1500px and
  re-run" message instead of failing cryptically mid-batch.

- [x] **Runtime UX audit walkthrough** — addressed differently than
  originally planned. Instead of static screenshots, the runtime mode
  now has a full YouTube walkthrough video linked from the root
  README. The video shows the in-app annotation flow, the cloud sync,
  and the triage flow on the dashboard end-to-end.

---

## 🟡 Should do — polish + reliability

These improve robustness or user experience but are not deal-breakers.

- [x] **AsyncStorage size monitoring** — the provider estimates the
  session's stored byte size after each save/delete. When it crosses
  ~4.5MB (under Android's ~6MB cap) it fires a one-time popup
  ("export soon") and sets a `storageWarning` flag that drives a
  persistent amber reminder banner in the session menu. Resets on
  Clear; restored on resume if a loaded session is already large.

- [x] **Confidence downgrading explanation in the report UI** — when
  a rule's confidence is medium/low, `RuleCard` now shows a short
  italic line (with an info icon) explaining why, derived from the
  project's classification stats (e.g. *"42% of files couldn't be
  classified into a layer, so this rule's result is less reliable"*).
  High-confidence rules show no extra line.

- [x] **Verify CLI matches after-screenshots by issue ID or index** —
  `findAfterScreenshot` now scans the after folder and matches by
  either the issue number (`issue-N`) or the annotation's stable id
  (`<issue-id>`), case-insensitively, across `.png/.jpg/.jpeg/.webp`.
  A developer who fixed only issues #1, #3, #5 can name files
  accordingly without renumbering — skipped issues are `no-after`.
  Documented in the verify README.

- [x] **Production-build no-op opt-out for the runtime library** —
  `<ArchLensProvider>` now accepts a `disabled` prop. ArchLens is
  active only when `__DEV__` is true AND `disabled` is not set, so a
  dev-mode staging build can force it off (e.g.
  `disabled={process.env.APP_ENV === "staging"}`). Defaults to
  active in dev — current behavior unchanged.

- [x] **Unit tests for all 8 statik rules** — added
  `rule2/3/6/7/8` test files under `packages/statik-backend/test/`
  (rules 1, 4, 5 were already covered). Each builds Project fixtures
  via the `makeProject`/`makeFile` helpers and asserts on status,
  violation count, severity, and score. `npm run test:statik` now
  runs **32 tests across 8 suites, all passing.**

- [x] **Sample-projects smoke test + fixture refresh** — ran the
  analyzer on all three test projects against the current 8-rule
  set. Found the fixtures predated the rule changes: good-app
  accidentally failed inline-styles, and bad-app didn't exercise
  Rules of Hooks or Naming. Fixed: good-app now scores 100/100
  (passes all 8), bad-app now fails all 8 (added a conditional-hook
  violation + a lowercase component). unusual-layout-app still
  validates the classifier.

---

## How to use this file

If you're a contributor or coding agent picking up an item:

1. Move the item from `[ ]` to `[~]` while working on it.
2. Cross-reference the relevant file path in the codebase (each item
   above mentions the rough location).
3. Mark `[x]` and add a short note when it ships.
4. Keep the priority order intact — don't promote nice-to-haves into
   must-dos without reason.

For brand-new ideas that aren't in this file, see
[`future_work/todo.md`](future_work/todo.md).

— Last updated: June 2026
