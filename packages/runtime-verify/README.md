# @archlens/verify

Command-line tool that closes the UX audit loop.

After a reviewer has annotated UX issues with `@archlens/runtime`
and a developer has applied fixes, this CLI takes:

- the original Markdown report (with embedded **before** screenshots
  and a JSON appendix), and
- a folder of **after** screenshots provided by the developer,

then asks Claude vision whether each issue was actually resolved
and writes verdicts back into a new Markdown file.

The reviewer never has to look at the app again.

## Status

**Phase 4 — implemented.** Real API calls work. Dry-run mode also
available for testing without an Anthropic API key.

## Usage

```bash
# Real run (requires ANTHROPIC_API_KEY in env or .env)
npx archlens-verify \
  --report ux-audit-2026-05-04_14-22-31.md \
  --after  ./screenshots-after/

# Dry run (no API call — produces canned verdicts to test the rewrite)
npx archlens-verify \
  --report ux-audit.md \
  --after  ./screenshots-after/ \
  --dry-run
```

The output is a new file `<report>-verified.md` next to the input
(override with `--out`). Each issue's `**Status:** unverified` line
is replaced with the AI's verdict, reasoning, and timestamp; a
**Verification Summary** section is inserted before the JSON
appendix.

### After-screenshot naming

Place after-screenshots in the directory passed to `--after` named:

```
issue-1.png
issue-2.png
issue-3.png
...
```

Variants accepted: `.jpg`, `.jpeg`, `issue_N.png`, or
`<issue-id>.png` (where `<issue-id>` is the id from the JSON
appendix).

### Exit codes

| Code | Meaning |
|---|---|
| `0` | All issues verified or uncertain — no rejections |
| `1` | At least one issue was **rejected** |
| `2` | CLI / parsing error |

Useful for wiring the loop into CI: a regression suite that runs
`archlens-verify` and treats `1` as a build failure.

## Configuration

| Variable | Required | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes (unless `--dry-run`) | — |
| `CLAUDE_MODEL` | no | `claude-sonnet-4-5-20250929` |

Get a key at <https://console.anthropic.com/>. Place it in `.env`
at the workspace root (we already provide `.env.example`).

## How it works

1. Reads the Markdown report.
2. Parses the JSON appendix (`archlens-runtime-export@1` schema)
   for structured metadata.
3. Extracts each inline `data:image/png;base64,...` screenshot.
4. Pairs each issue with the matching after-screenshot file.
5. Sends `(reviewer note + component context + BEFORE image + AFTER image)`
   to Claude vision with a strict-JSON prompt.
6. Parses the response into `{ verdict, reasoning }`.
7. Rewrites the Markdown with verdicts and a summary section.
