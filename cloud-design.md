# ArchLens Cloud — Technical Design

Short blueprint for the platform layer that turns ArchLens from a
file-export tool into a real product: the capture client syncs issues
to a backend, and developers review/triage them in a web dashboard.

This is the **shape we agree on before any code is written.** Anything
not listed here is explicitly out of scope for v1.

---

## 1. Goals (and non-goals)

**Goals**
- A reviewer captures UX issues in the app, **reviews them locally**,
  then **submits the whole session** to a server with one tap.
- Developers log into a **web dashboard** to read, assign, and triage
  the issues.
- Multi-tenant from day one: every customer's data is isolated at the
  database layer (not just in code).
- Capture works **offline**; the device is an outbox until the server
  confirms each issue is stored.

**Non-goals for v1** (explicitly parked, not abandoned)
- AI verification of fixes (the runtime-verify CLI's job).
- Integrations (Jira / Linear / GitHub / Slack).
- On-device PII redaction.
- Shareable public report links.
- Folding the static analyzer report into the same dashboard.

---

## 2. Architecture

```
┌────────────────────────┐                              ┌────────────────────────┐
│  RN app + capture lib  │                              │     dashboard-web      │
│  (runtime-lib)         │                              │  (React + Vite + TW)   │
│                        │   HTTPS (Supabase JS client) │                        │
│   local outbox  ───────┼─────────────────────────────►│                        │
│                        │                              │                        │
└────────────────────────┘                              └────────────────────────┘
                  │                                                │
                  └──────────────────► Supabase ◄──────────────────┘
                              Postgres + Auth + Storage + RLS
```

No custom backend service. Both clients talk to Supabase directly;
Postgres Row-Level Security is what makes that safe.

---

## 3. Data model

All tables live in the `public` schema in Postgres.

### `organizations`
The customer (a company). Top of the multi-tenant tree.

| column        | type        | notes                          |
|---------------|-------------|--------------------------------|
| `id`          | uuid PK     | `gen_random_uuid()`            |
| `name`        | text        |                                |
| `created_at`  | timestamptz | default `now()`                |

### `projects`
A single app being audited. Owns a write-only project key.

| column          | type        | notes                                       |
|-----------------|-------------|---------------------------------------------|
| `id`            | uuid PK     |                                             |
| `org_id`        | uuid FK     | → `organizations.id`                        |
| `name`          | text        | e.g. "FitTrack iOS"                         |
| `key_hash`      | text        | hashed project key (never store plaintext)  |
| `created_at`    | timestamptz |                                             |
| `archived_at`   | timestamptz | null = active                               |

### `audit_sessions`
One "capture session" — a batch of issues a reviewer submitted
together. The batch-submit unit.

| column           | type        | notes                              |
|------------------|-------------|------------------------------------|
| `id`             | uuid PK     |                                    |
| `project_id`     | uuid FK     | → `projects.id`                    |
| `device_label`   | text        | e.g. "iPhone 15 · iOS 17.5"        |
| `app_version`    | text        | from the host app                  |
| `reviewer_label` | text        | free-form ("Alex from QA")         |
| `submitted_at`   | timestamptz | when the device finished uploading |

### `issues`
The unit of work. One captured annotation.

| column            | type        | notes                                        |
|-------------------|-------------|----------------------------------------------|
| `id`              | uuid PK     |                                              |
| `session_id`      | uuid FK     | → `audit_sessions.id`                        |
| `project_id`      | uuid FK     | denormalized for query speed + RLS           |
| `client_id`       | text        | the on-device id from `runtime-lib` (idempotency) |
| `note`            | text        |                                              |
| `category`        | text        | one of UX_CATEGORIES, nullable               |
| `severity`        | text        | low / medium / high, nullable in v1          |
| `screen_name`     | text        |                                              |
| `component_name`  | text        |                                              |
| `source_file`     | text        | nullable                                     |
| `source_line`     | int         | nullable                                     |
| `bounds`          | jsonb       | `{ x, y, width, height }`                    |
| `screen_dims`     | jsonb       | `{ width, height }`                          |
| `screenshot_path` | text        | object-storage key (NOT base64)              |
| `captured_at`     | timestamptz | when it was captured on the device           |
| `status`          | text        | `open` / `in_progress` / `resolved` / `wont_fix` |
| `assignee_id`     | uuid FK     | → `users.id` (Supabase auth user)            |
| `created_at`      | timestamptz |                                              |
| `updated_at`      | timestamptz |                                              |

UNIQUE constraint on `(project_id, client_id)` so re-submits are
**idempotent** — the device can retry safely without creating duplicates.

### `issue_comments`
Threaded discussion on an issue. (Lightweight; just for triage.)

| column        | type        | notes                |
|---------------|-------------|----------------------|
| `id`          | uuid PK     |                      |
| `issue_id`    | uuid FK     | → `issues.id`        |
| `author_id`   | uuid FK     | → `users.id`         |
| `body`        | text        |                      |
| `created_at`  | timestamptz |                      |

### `org_members`
Maps Supabase auth users to organizations + roles.

| column     | type | notes                                  |
|------------|------|----------------------------------------|
| `org_id`   | uuid | → `organizations.id`                   |
| `user_id`  | uuid | → `auth.users.id` (Supabase auth)      |
| `role`     | text | `admin` / `member` / `viewer`          |

Primary key: `(org_id, user_id)`.

---

## 4. Authentication model

Two **separate** auth contexts. Don't mix them.

### Device → Supabase (write-only)
- Each project gets a **project key** at creation time (random 32-byte
  string; show once, store only its hash).
- The capture client sends it as a header on every request.
- The key can only do one thing: **insert into `audit_sessions` and
  `issues`** for the project it belongs to. It cannot read anything,
  cannot delete, cannot touch other projects.
- Keys are revocable (admin re-issues; old key stops working).

Configured in `<ArchLensProvider>`:
```tsx
<ArchLensProvider
  projectKey="archlens_pk_live_xxxxxxxx"
  apiUrl="https://<project>.supabase.co"
>
```

### Dashboard user → Supabase Auth
- Real accounts (email + password to start; OAuth/SSO later).
- A user joins an org via `org_members` and gets a role.
- They can only see/touch data inside their org (enforced by RLS,
  see below).

---

## 5. Row-Level Security (RLS) — the safety net

RLS is **on for every table**. The default is "deny everything" unless
a policy explicitly allows it. Sketches of the key policies:

**`issues` — read:** a row is visible to a user iff the user is a
member of the project's org (`org_members.user_id = auth.uid()`).

**`issues` — write from a device:** allowed only when the request
carries a valid project key that matches `issues.project_id`. (Done via
a small Postgres function the device calls with the key, which
validates the hash and inserts.)

**`issues` — update from a user:** allowed only on rows where the
user is a member of that issue's project's org, AND the update is
restricted to the **triage columns only**: `status`, `assignee_id`,
`updated_at`. Any UPDATE that touches `note`, `category`,
`screenshot_path`, `component_name`, `source_file`, `source_line`,
`screen_name`, `bounds`, `screen_dims`, `captured_at`, or `client_id`
is **rejected by the database** — the chain-of-custody rule from
section 10 enforced at the lowest level, not just in app code. A
device can never edit at all (its key is insert-only).

The same pattern applies to `audit_sessions`, `issue_comments`,
`projects`, `org_members`.

This is what makes "phone talks to Supabase directly" safe: even if
someone steals a project key, they cannot read anyone's data.

---

## 6. Screenshot storage

- A single **private Supabase Storage bucket** named `screenshots`.
- Path convention: `{project_id}/{issue_id}.png`.
- Device uploads the PNG (not base64) → gets the storage path → writes
  it into `issues.screenshot_path`.
- Dashboard reads via **short-lived signed URLs** (e.g. 5 min) — never
  exposes the bucket publicly.
- Stop using base64 in the data path entirely — it's what bloats the
  current export and trips the size limit.

---

## 7. Sync protocol

The device-side flow that replaces export.

1. **Capture** → the annotation lands in the local outbox (the same
   AsyncStorage we already use). It now has a `sync_status` field:
   `pending` / `submitting` / `synced` / `failed`.
2. **Review** in the session sheet (this is the user's review gate).
   They can edit notes, delete, change categories — everything still
   `pending`.
3. **Submit to dashboard** (new button replacing Export & Share):
   - Create one `audit_sessions` row.
   - For each pending issue:
     - Upload the screenshot PNG to Storage.
     - Insert the `issues` row with the storage path + the device's
       `client_id` (idempotency).
   - Mark each issue `synced` on success, `failed` (with retry) on error.
4. **After submit**, synced issues:
   - Stay visible in the session sheet for a short while with a "✓
     synced" badge, then can be cleared.
   - The Clear-session action only deletes *synced* issues by default,
     so an accidental clear can't lose unsubmitted work.

**Retry & idempotency:** every issue carries a stable `client_id`;
re-submitting the same `client_id` is a no-op on the server thanks to
the `UNIQUE (project_id, client_id)` constraint. Safe to retry forever.

**Offline:** capture works fully offline. Submit fails gracefully; the
button shows "N pending — try again when online."

---

## 8. Dashboard (web) — minimal v1 surface

To keep Phase 3 small:
- **Login.**
- **Inbox** — list of issues for the user's projects with filters
  (project, status, category, screen).
- **Detail view** — screenshot, note, component+source, screen, device,
  status workflow, assignee, comments.
- **Settings → Projects** — create a project, view/rotate its key.
- **Settings → Members** — invite, set role.

Visual language: reuse statik-frontend's Tailwind config + the
`RuleCard`-style component patterns so it feels like the same product
family.

---

## 9. Phased build order

1. **Phase 1 — Supabase setup**: project, schema (the tables above),
   RLS policies, `screenshots` bucket, a Postgres function for the
   device-key insert path.
2. **Phase 2 — client sync**: outbox status, batch-submit screen,
   storage upload, idempotency. Remove the export/share code path.
3. **Phase 3 — dashboard-web skeleton**: auth, inbox, detail view.
4. **Phase 4 — triage**: status workflow, assignment, comments.
5. **Phase 5 — hardening**: revocable keys, retention, rate limits,
   redact / privacy controls.

---

## 10. Locked decisions

These were settled before Phase 1 started. Future changes need a
deliberate revisit, not a drive-by edit.

1. **Hosting:** Supabase **managed cloud** to start. Portable to
   self-hosted later because the data model is plain Postgres.
2. **Project key wire format:** `archlens_pk_live_<32-byte hex>` for
   production, `archlens_pk_test_<…>` for development. Matches the
   industry convention (Stripe, Sentry).
3. **Severity field:** **not in v1.** Issues have a category only.
   Adding severity later is a non-breaking column addition.
4. **Immutability of submitted issues — the chain-of-custody rule.**
   Once submitted, an issue's **content is frozen for everyone**,
   including developers. The captured note, screenshot, category,
   component name, source file, screen name, bounds, timestamp — none
   of it can be edited by anyone, ever. This protects the reviewer
   from "the developer rewrote what I said" disputes.

   The **only** mutable fields on a submitted issue are the **triage
   metadata** that belong to the developer side of the workflow:
   - `status` (open / in_progress / resolved / wont_fix)
   - `assignee_id`
   - `issue_comments` (additive — comments are appended, never edited
     or deleted by users other than their author)

   The device, after submitting, treats the issue as locked too —
   no edit affordance shown for synced rows.

   If the reviewer needs to correct something after submit, they
   capture a new issue or post a comment; the original record stands.
