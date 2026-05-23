# ArchLens — TODO

Outstanding work, grouped by priority. Items are de-duplicated against
already-shipped features; everything here is genuinely not done yet.

> **Convention:** `[ ]` = open, `[x]` = done, `[~]` = in progress.

---

## 🔴 Must do — real gaps before jury defense

These are the items that, if a careful reviewer pokes at the project,
they would notice. None of them are optional polish.

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
  persist to AsyncStorage. _Needs on-device verification._

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

- [ ] **Real runtime UX audit screenshots in the README** — once the
  runtime module is polished, capture 1–2 screenshots showing the
  annotation modal in action and add them under
  `docs/screenshots/`. README already references them. **~15 min
  after the module is final.**

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

— Last updated: 2026
