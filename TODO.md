# ArchLens — TODO

Outstanding work, grouped by priority. Items are de-duplicated against
already-shipped features; everything here is genuinely not done yet.

> **Convention:** `[ ]` = open, `[x]` = done, `[~]` = in progress.

---

## 🔴 Must do — real gaps before jury defense

These are the items that, if a careful reviewer pokes at the project,
they would notice. None of them are optional polish.

- [ ] **Improve element identification (Option B)** — tune the
  `pickBestEntry` heuristic in
  `packages/runtime-lib/src/identify/identifyAtPoint.ts` to prefer
  touchable / interactive components (`Pressable`, `TouchableOpacity`,
  `Button`) over their text children. Reviewers usually mean the
  interactive element, not its inner label. **~1–2 hours.**

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

## 🟢 Nice to have — time-permitting polish

Only if there's runway after must-do and should-do are done.

- [ ] **Deployed instance** of the static analyzer (Vercel for
  frontend, Render for backend). Lets jury test from their own
  laptop. **~2–3 hours.**

- [ ] **Cost monitoring** — show "this analysis used $X.XX of AI
  credit" at the bottom of the report.

- [ ] **CI/CD pipeline** with a green build badge on the GitHub
  README. Pushes signal of professionalism.

- [ ] **More unit tests** — currently only rules 1, 4, 5 have tests.
  Add coverage for rules 2, 3, 6, 7, 8. **~2–3 hours.**

- [ ] **Type-safety cleanup** — eliminate remaining `as any` casts
  in `identifyAtPoint.ts` and Anthropic SDK glue.

---

## 🔵 Future work — out of current scope

Documented here so reviewers see the roadmap, but not committed for
this phase of the project.

- [ ] **Multi-framework support** — extend the analyzer beyond
  React Native (Flutter, Ionic). Mentioned as future direction in
  the project poster.

- [ ] **Multi-reviewer / cloud-sync of annotations** — currently
  annotations live in one phone's AsyncStorage; multi-reviewer
  workflows require manual merging of Markdown files.

- [ ] **VS Code extension** — IDE integration to run the analyzer
  on save and surface violations inline.

- [ ] **Per-language AI output** — currently Claude writes
  explanations in English. Turkish (and other) output could be
  added via a `--lang` flag.

- [ ] **Page-level analysis in the static module** — currently
  rules look at files; a future iteration could analyze whole
  user flows (login → dashboard → settings) by following routes.

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
