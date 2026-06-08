# @archlens/dashboard-web

The ArchLens UX-audit dashboard — a React + Vite + Tailwind app where
the developer logs in and triages issues reviewers submitted from the
runtime SDK.

Visual language matches `@archlens/statik-frontend` exactly (same
tokens, fonts, spacing) so the two surfaces feel like one product.

## Architecture

```
[ dashboard-web (this app) ]  ──Supabase JS, user JWT──►  [ Supabase ]
                                                                ▲
[ runtime SDK ] ──HTTPS, project key──► [ cloud-api ] ─service_role─┘
```

The dashboard talks to Supabase **directly** (via Supabase Auth + RLS)
for reads. Writes from the device side go through the cloud-api. This
split is intentional: dashboard users are the kind of users Supabase
Auth was built for; device clients aren't.

## Run it locally

```bash
# from the repo root
npm install

cd packages/dashboard-web
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env

npm run dev
# → http://localhost:5174
```

## v1 surface

- **Login** (email + password via Supabase Auth).
- **Issue inbox** — list of every issue across every project the user
  belongs to, with status filters.
- **Issue detail** — screenshot with the element-highlight overlay
  drawn from the stored `bounds` + `screen_dims`, full metadata, and a
  status workflow (open / in-progress / resolved / won't-fix).

## Coming next (not in v1)

- Comments thread per issue.
- Assignee picker.
- Project settings (create project, rotate project key).
- Org members management.
