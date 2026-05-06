# Jury Demo — Narration Script (~5 minutes)

The whole demo is ~5 minutes. You can run it from a laptop, no
phone needed (though the live phone demo lands harder if it works).

## Setup before the room sees you

```bash
cd "implementation-v2"
npm install                      # if you haven't already
npm run statik:backend:build
npm run runtime:verify:build
npm run combined:build
```

Have these tabs / windows open:

1. The repo file tree (VS Code / file explorer)
2. `demo/combined-demo.md` rendered as Markdown
3. `demo/ux-audit-demo-verified.md` rendered as Markdown
4. (Optional) the running Expo demo on your phone or simulator

---

## Beat 1 — "What is ArchLens?" (60s)

> "ArchLens is a graduation project that turns 'is this React Native
> codebase well-architected?' from a subjective opinion into a
> measurable score. It has two modes that work together:
>
> - **archlens-statik** runs over the source code. Eight rules. One
>   number out of 100. Like a linter, but for architecture.
> - **archlens-runtime** runs against a live app. A reviewer taps
>   problems, AI verifies the fixes. Like a UX-audit pair-programmer
>   that closes its own loop."

Open the GitHub repo. Show the two `packages/statik-*` and
`packages/runtime-*` folders.

## Beat 2 — Static analysis (60s)

Open `demo/statik-demo.json` (or run `archlens-statik` against any
React Native repo if you have one).

> "This is a JSON output for a real RN project. Eight rules, each
> with a weight and a per-rule score. Pass / fail / not-applicable.
> The score formula is weighted with renormalization — rules that
> don't apply (like Rules of Hooks in a project with no hooks) don't
> inflate the total."

Show the eight rules. Mention one or two you find interesting:
- **Rules of Hooks compliance** — same checks the official ESLint
  plugin does, but our static analyzer can run on any codebase
  without installing anything in it.
- **Native APIs in UI** — flags `AsyncStorage`, `Platform`,
  `NativeModules` accessed from screens or components instead of
  through hooks/services.

## Beat 3 — UX audit annotation (90s)

Either run the live demo on a phone (if Expo cooperates), or open
`demo/ux-audit-demo.md` to show what a captured session looks like.

> "When a developer wraps their app in `<ArchLensProvider>`, in dev
> mode they get a floating button. Tap it → annotation mode. Tap any
> UI element → we capture a screenshot, the screen route, the
> component name, and the source file and line number — pulled from
> React's internal fiber metadata."

Show one issue in the Markdown:
- A real screenshot (embedded base64)
- A reviewer note in Turkish
- Component path: `src/components/SaveButton.jsx:42`

> "The export is a single Markdown file plus a JSON sidecar. The
> Markdown is for humans — open it in any Markdown viewer. The JSON
> is for the next step."

## Beat 4 — AI verification (90s)

Run the verify CLI in dry-run mode (it produces canned alternating
verdicts, perfect for a demo):

```bash
npx archlens-verify \
  --report demo/ux-audit-demo.md \
  --after  demo/after/ \
  --out    demo/ux-audit-demo-verified.md \
  --dry-run --verbose
```

> "After the developer applies fixes, they take after-screenshots
> and drop them in a folder. The verify CLI sends each (before,
> after, reviewer note) triple to Claude vision and asks a single
> question: 'is this issue resolved?'
>
> The response is strict JSON: `{ verdict, reasoning }`. Verified,
> rejected, or uncertain. We bias the prompt toward `uncertain` when
> the change is ambiguous — false positives mislead developers,
> uncertain just escalates back to a human."

Open the verified Markdown. Show:
- The status block on each issue replaced with verdict + reasoning
- The Verification Summary table at the bottom

> "This is the closure of the loop. The teacher's brief was: 'human
> annotates once, AI handles the rest.' The verify CLI is that
> 'rest.'"

## Beat 5 — Combined audit (60s)

```bash
npx archlens-combined \
  --statik  demo/statik-demo.json \
  --runtime demo/ux-audit-demo-verified.md \
  --out     demo/combined-demo.md \
  --project "FitTrack (demo)"
```

Open `demo/combined-demo.md`.

> "Finally, both reports merged into a single project-health
> document. Architectural score on top, UX audit underneath, and a
> recommendations section that cherry-picks the lowest-scoring rule
> and any rejected fixes from either side.
>
> Two modes, one document. That's ArchLens."

## If asked: defensible technical choices

- **Why static analysis at all?** Determinism. Same input → same
  output. Repeatable, testable, no model variance.
- **Why Claude Sonnet for verify?** Per Emirhan's recommendation —
  Turkish quality is good, mid-tier pricing, vision support, single
  model keeps the demo answer simple.
- **Why a private `_debugSource` import?** That's how RN's own
  Element Inspector finds component sources. We wrap it in
  try/catch with a coordinates-only fallback so we degrade
  gracefully on older RN versions.
- **Why a JSON appendix in the Markdown?** So downstream tools
  (verify, combined) can parse without scraping. The JSON is the
  source of truth; the Markdown is the rendering.

## If something breaks

- Live Expo Go fails → switch to the demo Markdowns. Same flow.
- `archlens-verify` fails with API error → use `--dry-run`. Same
  output structure.
- `archlens-combined` fails → open the verified Markdown directly.
  Still tells the whole story.
