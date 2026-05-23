# ArchLens — TODO

Outstanding work, grouped by priority. Items are de-duplicated against
already-shipped features; everything here is genuinely not done yet.

> **Convention:** `[ ]` = open, `[x]` = done, `[~]` = in progress.

---

## 🔴 Must do — real gaps before jury defense

These are the items that, if a careful reviewer pokes at the project,
they would notice. None of them are optional polish.

- [x] **Improve element identification (Option B)** — `pickBestEntry`
  in `packages/runtime-lib/src/identify/identifyAtPoint.ts` now uses
  a 5-pass priority: (1) deepest specific non-screen user component
  with source, (2) deepest interactive host (`Pressable`, `Button`,
  `Switch`, `TextInput`, touchables), (3) deepest user component with
  source incl. screens, (4) any user component, (5) leaf. This stops
  the picker from grabbing the whole screen when a bare button is
  tapped, while still preferring custom components that carry the
  source file. _Needs on-device verification._

- [ ] **Long-press preview mode (Option C — optional polish on top
  of Option B)** — let the reviewer long-press the screen, see a
  translucent box follow their finger as they slide across elements,
  and release to commit. Closest mobile equivalent to the web's
  hover-highlight pattern. **~1–2 days. Higher risk; only attempt
  after Option B ships cleanly.**

- [ ] **View / edit / delete individual annotations** in the runtime
  library. Today the only option is "Clear all" — a reviewer cannot
  fix a typo, undo a wrong tap, or remove a single annotation.
  **~1–2 hours.**

- [ ] **After-screenshot workflow** — document the exact procedure for
  the developer (folder structure, naming convention), or add a
  "replay mode" that re-captures every annotated screen
  automatically. Today this is the friction point of the whole verify
  loop. **Documentation: ~30 min. Replay mode: ~1 day.**

- [ ] **Image size validation in `archlens-verify`** — Claude vision
  has a 5MB-per-image limit; real iPhone screenshots can exceed it.
  Reject or downscale oversized images with a clear message instead
  of letting the API call fail mid-batch. **~30 min.**

- [ ] **Real runtime UX audit screenshots in the README** — once the
  runtime module is polished, capture 1–2 screenshots showing the
  annotation modal in action and add them under
  `docs/screenshots/`. README already references them. **~15 min
  after the module is final.**

- [ ] **Update `idea.md`** to match what was actually built. The
  combined CLI was removed, RN-detection + backend-skip were added,
  per-violation AI suggestions are now live. Doc/code consistency
  matters at the defense. **~30 min.**

---

## 🟡 Should do — polish + reliability

These improve robustness or user experience but are not deal-breakers.

- [ ] **AsyncStorage size monitoring** — warn the reviewer when the
  session is approaching Android's ~6MB AsyncStorage limit. Beyond
  that, data is silently dropped. **~30 min.**

- [ ] **Confidence downgrading explanation in the report UI** — when
  a rule shows "LOW CONFIDENCE", the UI should explain why
  (e.g. *"30% of analyzed files could not be confidently classified
  by layer"*). Currently it's a black-box badge. **~30 min.**

- [ ] **Verify CLI matches after-screenshots by issue ID, not index** —
  more robust when a developer skips fixing some issues or reorders
  them. **~30 min.**

- [ ] **Production-build no-op opt-out for the runtime library** — add
  an explicit `disabled` prop on `<ArchLensProvider>` in addition
  to the `__DEV__` check. Defends against staging builds where
  `__DEV__` is still true. **~15 min.**

- [ ] **Sample-projects smoke test before defense** — manually run
  the analyzer against `tests/good-app`, `tests/bad-app`, and
  `tests/unusual-layout-app`, confirm scores still make sense.
  **~15 min.**

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
