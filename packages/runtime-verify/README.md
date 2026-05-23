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

## Full workflow (start to finish)

This is the complete loop, from a reviewer finding issues to the AI
confirming the fixes. Only step 1 needs a phone; everything else
happens on the developer's laptop.

1. **Reviewer annotates** (on the phone, using `@archlens/runtime`).
   They tap UI problems, add notes, and tap **Export & Share**. This
   produces `ux-audit-<timestamp>.md` — a Markdown report that
   already contains the **before** screenshots embedded inside it.
   Save that file to the laptop.

2. **Developer reads the report** and fixes the flagged code. Each
   issue lists the screen, the component, and the source file/line.

3. **Developer takes "after" screenshots.** After re-running the app,
   take a fresh screenshot of each screen that was fixed — using the
   phone's normal screenshot button, a simulator screenshot, etc.

4. **Developer names and saves the after-screenshots into a folder.**
   The filenames must match each issue's number:

   ```
   my-project/
   ├── ux-audit-2026-05-23.md        ← exported in step 1
   └── after-screenshots/            ← developer creates this
       ├── issue-1.png               ← the fix for issue #1
       ├── issue-2.png               ← the fix for issue #2
       └── issue-3.png
   ```

   (Issue numbers match the `Issue #N` headings in the report.)

5. **Developer runs the verify CLI:**

   ```bash
   npx archlens-verify \
     --report ux-audit-2026-05-23.md \
     --after  ./after-screenshots/
   ```

6. **The CLI produces `ux-audit-2026-05-23-verified.md`** — the same
   report with an AI verdict written under each issue, plus a summary
   table. The reviewer never has to open the app again.

> **No after-screenshot for an issue?** That's fine — issues without
> a matching file are marked `no-after` and skipped (no API call).
> You can verify a subset of issues and run again later.

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

### What the verdicts mean

| Verdict | Meaning |
|---|---|
| ✅ `verified` | Claude is confident the after-screenshot resolves the issue described in the reviewer's note. |
| ❌ `rejected` | The fix does not appear to resolve the issue — the problem is still visible. |
| ⚠️ `uncertain` | Claude can't tell (ambiguous change, unclear image, or an error). The prompt deliberately biases toward this rather than a false `verified`. Treat it as "needs a human to look." |
| ➖ `no-after` | No matching after-screenshot file was found for this issue. No API call was made. |

### Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `→ no after screenshot, skipping` | No `issue-N.png` in the `--after` folder for that issue. Check the filename matches the issue number. |
| `→ uncertain (image too large)` | The after-screenshot exceeds Claude's ~5MB limit. Resize it to about 1500px on the long edge and re-run. |
| `→ uncertain (error)` | The API call failed (bad/missing key, network, or rate limit). Check `ANTHROPIC_API_KEY` in `.env`, or use `--dry-run` to test the pipeline without the API. |
| `Report has zero annotations` | The Markdown report's JSON appendix has no annotations. Make sure you exported a session that actually has captures. |
| Everything comes back `uncertain` | Often a sign the API key is missing — verify it loads, or run `--dry-run` to confirm the rest of the pipeline works. |

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
