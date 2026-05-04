# @archlens/verify

Command-line tool that closes the UX audit loop.

After a reviewer has annotated UX issues with `@archlens/runtime` and a
developer has applied fixes, this CLI takes the original Markdown report
plus the new "after" screenshots, asks Claude vision whether each issue
was actually resolved, and writes verdicts back into the report.

The reviewer never has to look at the app again.

## Status

**Phase 0 scaffold.** Implementation begins in Phase 4.

## Planned usage

```bash
npx archlens-verify \
  --report ux-audit-2026-05-04.md \
  --after  ./screenshots-after/
```

Requires the `ANTHROPIC_API_KEY` environment variable.
