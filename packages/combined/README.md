# @archlens/combined

Merges the outputs of both ArchLens modes (`archlens-statik` and
`archlens-runtime`) into one project-health document.

## Why this exists

ArchLens has two independent modes:

- **statik** — analyzes source code statically against 8
  architectural rules and produces a JSON / Markdown report.
- **runtime** — captures live UX issues, AI-verifies fixes, and
  produces a Markdown report.

A reviewer (or a teacher in a jury defense) wants to see **one
page**: "How is this project doing?" — not two separate reports.
This CLI is that one page.

## Usage

```bash
npx archlens-combined \
  --statik  ./out.json \
  --runtime ./ux-audit-verified.md \
  --out     ./combined-report.md \
  --project "FitTrack"
```

Either input is optional — supply just one if the other mode hasn't
been run yet, and the missing section renders as "not yet captured."

## Output

A single Markdown document with:

1. **Header** — both scores side-by-side
2. **Architectural Health** — score, grade, per-rule pass/fail
   table, weakest rules
3. **UX Audit** — verdict counts (`verified` / `rejected` / etc.)
   and a per-issue table
4. **Recommendations** — surfaces the lowest-scoring rule and any
   rejected UX fixes

This is the file you'd commit to a repo's `docs/` folder, or send
to a teammate with one URL.
