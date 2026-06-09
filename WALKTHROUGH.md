# ArchLens — Walkthrough

A step-by-step story of using ArchLens end to end. Two parts: one
for each mode.

If you want reference docs (commands, packages, setup), use
[`README.md`](README.md) instead. This file is the narrative.

---

## Part 1: Getting an architectural score (statik mode)

**Scene:** You're a developer working on a React Native project.
You've heard the codebase is getting messy and you want a number you
can show your team.

### 1. Start the backend
```bash
npm run statik:backend:dev
```
The Express server boots on `http://localhost:8000`.

### 2. Start the web UI
```bash
npm run statik:frontend:dev
```
Vite spins up on `http://localhost:5173`. Open it in your browser.

### 3. Submit your project
You have three options on the landing page:

- **ZIP Upload** — drag and drop a zipped copy of your project.
- **Public Repo** — paste a GitHub URL.
- **Private Repo** — paste a GitHub URL + a personal access token.

Pick one and click **Start Analysis**.

### 4. Wait for the report
ArchLens scans every JS/TS file, builds an AST for each, classifies
files into layers (UI, screen, service, hook, context, util), checks
for circular dependencies, and runs the 8 architectural rules.

### 5. Read the report
You see:

- **A single number** from 0 to 100 — the overall architectural
  health score.
- **A letter grade** from A to F.
- **A per-rule breakdown** — green for passed, red for failed, yellow
  for low-confidence.
- **Plain-language explanations** for each failed rule, written by
  Claude. Each explanation cites specific files in your project.

### 6. Fix what failed
Open the relevant files and address each violation. Re-upload to see
the score go up.

---

## Part 2: Capturing UX issues (runtime mode)

**Scene:** You're a UX reviewer or designer. You're playing with the
mobile app and you see something off — a button that feels wrong, a
screen that's too cramped. You want to tell the developer exactly
what's wrong, with proof.

### 1. The developer has installed the runtime library
Inside the React Native app, the developer wrapped the root component
in `<ArchLensProvider>`. In dev mode, a small floating button (FAB)
appears on every screen.

### 2. The developer starts the cloud API and dashboard
```bash
npm run cloud:dev        # Fastify on :8787
npm run dashboard:dev    # Dashboard on :5174
```
You — the reviewer — don't need to know about this. The phone just
talks to the cloud, and the developer watches the dashboard.

### 3. You open the app on a phone
Run `npx expo start` in the demo app (or in the developer's own app)
and scan the QR with Expo Go. The floating ArchLens button appears
in the corner.

### 4. You tap the button
The app enters annotation mode. Every UI element on the screen
becomes tappable.

### 5. You tap the problem element
ArchLens highlights the exact element and opens a sheet showing:

- A small screenshot of the element.
- The component name and the screen name.
- A field where you write your note.
- A list of categories (e.g. `clarity`, `consistency`, `accessibility`).

### 6. You write a note, pick a category, and save
The annotation flies to the cloud API. The API stores the screenshot
in Supabase Storage and the issue metadata in Postgres.

### 7. The developer opens the dashboard
On `localhost:5174`, the developer sees the new issue in the inbox:

- The screenshot.
- The component name, the screen, the source file (where to look).
- Your note and category.
- A status field they can change (`open`, `in progress`, `fixed`).

### 8. The developer fixes it
They open the source file at the right line, change the code, deploy,
and mark the issue **fixed** in the dashboard. The audit history
stays as a record.

---

## What's NOT in the loop yet

In the runtime UX audit mode today, there is **no AI step**. The
reviewer reports the issue, the developer fixes the code. Closing
that loop with AI (so ArchLens proposes the fix automatically) is on
the roadmap — see [`future_work/todo.md`](future_work/todo.md).

The statik mode does use AI, but only as an **explainer** for failed
rules — never to decide what's a violation.

---

— Last updated: June 2026
