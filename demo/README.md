# ArchLens — demo fixture

This folder contains a complete, pre-built example of an ArchLens
audit so the project can be demoed end-to-end **without** having to
run the live capture pipeline. Useful when:

- The Expo simulator is uncooperative on the day of the jury defense
- You want to walk a teacher through the output before they install
  anything
- You're testing changes to the combined CLI

## Contents

```
demo/
├── README.md                       (this file)
├── SCRIPT.md                       narration for the jury walkthrough
├── ux-audit-demo.md                Phase-3 export: 6 captured issues
├── ux-audit-demo-verified.md       Phase-4 output: with AI verdicts
├── statik-demo.json                Phase-0 statik report (sample)
├── combined-demo.md                Phase-5 combined audit
└── after/                          after-screenshots used by verify
    ├── issue-1.png
    ├── ...
    └── issue-6.png
```

## Reproducing the demo from scratch

```bash
# (from the repo root)

# 1. Verify the demo UX audit (dry-run — no API key needed)
npx archlens-verify \
  --report demo/ux-audit-demo.md \
  --after  demo/after/ \
  --out    demo/ux-audit-demo-verified.md \
  --dry-run

# 2. Build the combined audit
npx archlens-combined \
  --statik  demo/statik-demo.json \
  --runtime demo/ux-audit-demo-verified.md \
  --out     demo/combined-demo.md \
  --project "FitTrack (demo)"

# 3. Open combined-demo.md in any Markdown viewer.
```

Read `SCRIPT.md` for what to say at each step.
