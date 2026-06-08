# @archlens/cloud-api

The ArchLens cloud API — the HTTP service between the runtime SDK
(`@archlens/runtime`) and Supabase. The SDK on a reviewer's phone
calls this API with a project key; this API validates the key,
uploads the screenshot to Supabase Storage with `service_role`, and
inserts the issue row.

## Why this exists

Direct client-to-Supabase isn't workable for our product model
(reviewer-side SDK with only a project key, no Supabase auth). This
service is the trusted middle layer where `service_role` lives.

## Run it locally

```bash
# from the repo root
npm install

# inside packages/cloud-api/
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

npm run dev
# → "ArchLens cloud API listening on port 3000"
```

## Endpoints

### `GET /health`

Liveness probe. Returns `{ ok, service, time }`.

### `POST /v1/audit-sessions`

Batch-submit one audit session from a reviewer's device.

- Header: `X-ArchLens-Key: archlens_pk_live_…`
- Body: see `src/types.ts` (`SubmitAuditSessionRequest`).
- Returns: `{ sessionId, results[] }` — per-issue `synced` / `failed`.

Idempotent on `(project_id, clientId)`: re-submitting the same
annotation id is a no-op.

## Deployment

- Hosting candidates: Render, Fly.io, Railway (any will do).
- Required env vars in production:
  - `PORT` (host platform usually injects this).
  - `SUPABASE_URL`.
  - `SUPABASE_SERVICE_ROLE_KEY` — keep secret, never log it.
  - `ALLOWED_ORIGINS` (comma-separated; use specific origins, not `*`).
