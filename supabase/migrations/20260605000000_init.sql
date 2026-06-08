-- ArchLens Cloud — initial schema, security, and RPCs.
-- Spec: ../../cloud-design.md
--
-- What this migration does, in order:
--   1. Extensions (pgcrypto for bcrypt + random bytes).
--   2. Enum types (issue_status, org_role).
--   3. Tables (organizations → projects → audit_sessions → issues + comments + members).
--   4. updated_at trigger.
--   5. Helper functions (is_org_member, is_org_admin).
--   6. Trigger that makes the user who creates an org an admin.
--   7. Trigger that enforces the "submitted issues are immutable"
--      chain-of-custody rule at the DB layer (cloud-design.md §10).
--   8. Row-Level Security: on for every table, default deny, explicit
--      policies for the legitimate paths.
--   9. RPCs the clients call:
--        - create_project / rotate_project_key (admin in dashboard)
--        - device_create_session / device_submit_issue (mobile)
--  10. Privilege GRANTs for the `anon` (device) and `authenticated`
--      (dashboard user) roles. We disabled auto-expose; this is the
--      controlled, explicit replacement.
--  11. Screenshots storage bucket.
--
-- Safe to re-run: every CREATE uses IF NOT EXISTS / OR REPLACE where
-- possible; an INSERT into storage.buckets uses ON CONFLICT.

-- ─────────────────────────────────────────────────────────────
-- 1. Extensions
-- ─────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 2. Enums
-- ─────────────────────────────────────────────────────────────

do $$ begin
  create type issue_status as enum ('open','in_progress','resolved','wont_fix');
exception when duplicate_object then null; end $$;

do $$ begin
  create type org_role as enum ('admin','member','viewer');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  -- bcrypt hash of the plaintext project key (never store plaintext).
  key_hash     text not null,
  created_at   timestamptz not null default now(),
  archived_at  timestamptz
);
create index if not exists projects_org_id_idx on projects(org_id);

create table if not exists audit_sessions (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  device_label    text,
  app_version     text,
  reviewer_label  text,
  submitted_at    timestamptz not null default now()
);
create index if not exists audit_sessions_project_id_idx on audit_sessions(project_id);

create table if not exists issues (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references audit_sessions(id) on delete cascade,
  -- Denormalized for RLS speed (every issue policy checks the project).
  project_id       uuid not null references projects(id) on delete cascade,
  -- Stable on-device id so re-submits are idempotent.
  client_id        text not null,
  note             text not null default '',
  category         text,
  screen_name      text not null default 'unknown',
  component_name   text not null default 'unknown',
  source_file      text,
  source_line      int,
  bounds           jsonb not null,
  screen_dims      jsonb not null,
  -- Object-storage key, NOT a base64 blob.
  screenshot_path  text not null,
  captured_at      timestamptz not null,
  status           issue_status not null default 'open',
  assignee_id      uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (project_id, client_id)
);
create index if not exists issues_project_id_idx on issues(project_id);
create index if not exists issues_session_id_idx on issues(session_id);
create index if not exists issues_status_idx     on issues(status);
create index if not exists issues_assignee_idx   on issues(assignee_id);

create table if not exists issue_comments (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null references issues(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists issue_comments_issue_id_idx on issue_comments(issue_id);

create table if not exists org_members (
  org_id   uuid not null references organizations(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     org_role not null default 'member',
  primary key (org_id, user_id)
);
create index if not exists org_members_user_id_idx on org_members(user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. updated_at trigger
-- ─────────────────────────────────────────────────────────────

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists issues_set_updated_at on issues;
create trigger issues_set_updated_at
  before update on issues
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5. Helper functions (used by RLS policies)
-- ─────────────────────────────────────────────────────────────

create or replace function is_org_member(org uuid) returns boolean
language sql stable security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from org_members
    where org_id = org and user_id = auth.uid()
  );
$$;

create or replace function is_org_admin(org uuid) returns boolean
language sql stable security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from org_members
    where org_id = org and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. The user who creates an org is automatically its admin.
-- ─────────────────────────────────────────────────────────────

create or replace function ensure_org_creator_is_admin() returns trigger
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is not null then
    insert into org_members(org_id, user_id, role)
    values (new.id, auth.uid(), 'admin')
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists org_creator_admin on organizations;
create trigger org_creator_admin
  after insert on organizations
  for each row execute function ensure_org_creator_is_admin();

-- ─────────────────────────────────────────────────────────────
-- 7. Chain-of-custody: submitted issues are immutable.
--    Only triage columns (status, assignee_id, updated_at) may change.
-- ─────────────────────────────────────────────────────────────

create or replace function issues_block_content_edits() returns trigger
language plpgsql as $$
begin
  if  new.session_id      is distinct from old.session_id      or
      new.project_id      is distinct from old.project_id      or
      new.client_id       is distinct from old.client_id       or
      new.note            is distinct from old.note            or
      new.category        is distinct from old.category        or
      new.screen_name     is distinct from old.screen_name     or
      new.component_name  is distinct from old.component_name  or
      new.source_file     is distinct from old.source_file     or
      new.source_line     is distinct from old.source_line     or
      new.bounds          is distinct from old.bounds          or
      new.screen_dims     is distinct from old.screen_dims     or
      new.screenshot_path is distinct from old.screenshot_path or
      new.captured_at     is distinct from old.captured_at
  then
    raise exception
      'Issue content is immutable after submit. Only status, assignee, and comments can change.'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists issues_immutable on issues;
create trigger issues_immutable
  before update on issues
  for each row execute function issues_block_content_edits();

-- ─────────────────────────────────────────────────────────────
-- 8. Row-Level Security
-- ─────────────────────────────────────────────────────────────

alter table organizations  enable row level security;
alter table projects       enable row level security;
alter table audit_sessions enable row level security;
alter table issues         enable row level security;
alter table issue_comments enable row level security;
alter table org_members    enable row level security;

-- organizations
drop policy if exists org_select  on organizations;
drop policy if exists org_insert  on organizations;
drop policy if exists org_update  on organizations;

create policy org_select on organizations
  for select using (is_org_member(id));

-- Any authenticated user can create an org (becomes admin via trigger).
create policy org_insert on organizations
  for insert to authenticated with check (true);

create policy org_update on organizations
  for update using (is_org_admin(id)) with check (is_org_admin(id));

-- org_members
drop policy if exists om_select on org_members;
drop policy if exists om_write  on org_members;

create policy om_select on org_members
  for select using (is_org_member(org_id));

-- Only admins can add/remove/change members.
create policy om_write on org_members
  for all
  using (is_org_admin(org_id))
  with check (is_org_admin(org_id));

-- projects
drop policy if exists proj_select on projects;
drop policy if exists proj_write  on projects;

create policy proj_select on projects
  for select using (is_org_member(org_id));

-- Direct INSERT/UPDATE/DELETE on projects from the dashboard is admin-only.
-- Creation in practice goes through the create_project RPC (security definer).
create policy proj_write on projects
  for all
  using (is_org_admin(org_id))
  with check (is_org_admin(org_id));

-- audit_sessions
drop policy if exists sess_select on audit_sessions;

-- Only readable by org members. Inserts come exclusively through
-- device_create_session (security definer); no INSERT policy for users.
create policy sess_select on audit_sessions
  for select using (
    exists (
      select 1 from projects p
      where p.id = audit_sessions.project_id
        and is_org_member(p.org_id)
    )
  );

-- issues
drop policy if exists issues_select on issues;
drop policy if exists issues_update on issues;

create policy issues_select on issues
  for select using (
    exists (
      select 1 from projects p
      where p.id = issues.project_id
        and is_org_member(p.org_id)
    )
  );

-- Org members may UPDATE; the immutability trigger above restricts
-- *which columns* can actually change.
create policy issues_update on issues
  for update
  using (
    exists (select 1 from projects p
      where p.id = issues.project_id and is_org_member(p.org_id))
  )
  with check (
    exists (select 1 from projects p
      where p.id = issues.project_id and is_org_member(p.org_id))
  );

-- issue_comments
drop policy if exists ic_select on issue_comments;
drop policy if exists ic_insert on issue_comments;
drop policy if exists ic_update on issue_comments;
drop policy if exists ic_delete on issue_comments;

create policy ic_select on issue_comments
  for select using (
    exists (
      select 1 from issues i
      join projects p on p.id = i.project_id
      where i.id = issue_comments.issue_id
        and is_org_member(p.org_id)
    )
  );

create policy ic_insert on issue_comments
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from issues i
      join projects p on p.id = i.project_id
      where i.id = issue_comments.issue_id
        and is_org_member(p.org_id)
    )
  );

create policy ic_update on issue_comments
  for update using (author_id = auth.uid())
  with check  (author_id = auth.uid());

create policy ic_delete on issue_comments
  for delete using (author_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 9. RPCs
-- ─────────────────────────────────────────────────────────────

-- 9a. Admin-only: create a project, return its plaintext key ONCE.
--     Caller must already be authenticated and be an org admin.
create or replace function create_project(
  p_org_id uuid,
  p_name   text
) returns table (project_id uuid, project_key text)
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_key  text;
  v_id   uuid;
begin
  if not is_org_admin(p_org_id) then
    raise exception 'Only org admins can create projects' using errcode = '42501';
  end if;

  v_key := 'archlens_pk_live_' || encode(gen_random_bytes(32), 'hex');

  insert into projects(org_id, name, key_hash)
  values (p_org_id, p_name, crypt(v_key, gen_salt('bf')))
  returning id into v_id;

  project_id  := v_id;
  project_key := v_key;
  return next;
end $$;

-- 9b. Admin-only: rotate a project's key, return the new plaintext key.
create or replace function rotate_project_key(p_project_id uuid)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_key text;
begin
  select org_id into v_org from projects where id = p_project_id;
  if v_org is null then
    raise exception 'Project not found';
  end if;
  if not is_org_admin(v_org) then
    raise exception 'Only org admins can rotate keys' using errcode = '42501';
  end if;

  v_key := 'archlens_pk_live_' || encode(gen_random_bytes(32), 'hex');
  update projects set key_hash = crypt(v_key, gen_salt('bf'))
    where id = p_project_id;

  return v_key;
end $$;

-- 9c. Device path: open a session given a valid project key.
--     Returns both ids so the device can use project_id as the
--     folder name when uploading screenshots.
create or replace function device_create_session(
  p_project_key   text,
  p_device_label  text default null,
  p_app_version   text default null,
  p_reviewer      text default null
) returns table (session_id uuid, project_id uuid)
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_project_id uuid;
  v_session_id uuid;
begin
  select id into v_project_id
  from projects
  where key_hash = crypt(p_project_key, key_hash)
    and archived_at is null
  limit 1;

  if v_project_id is null then
    raise exception 'Invalid project key' using errcode = '42501';
  end if;

  insert into audit_sessions(project_id, device_label, app_version, reviewer_label)
  values (v_project_id, p_device_label, p_app_version, p_reviewer)
  returning id into v_session_id;

  session_id := v_session_id;
  project_id := v_project_id;
  return next;
end $$;

-- 9d. Device path: submit one issue. Idempotent on (project, client_id).
create or replace function device_submit_issue(
  p_project_key     text,
  p_session_id      uuid,
  p_client_id       text,
  p_note            text,
  p_category        text,
  p_screen_name     text,
  p_component_name  text,
  p_source_file     text,
  p_source_line     int,
  p_bounds          jsonb,
  p_screen_dims     jsonb,
  p_screenshot_path text,
  p_captured_at     timestamptz
) returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_project_id     uuid;
  v_session_owner  uuid;
  v_issue_id       uuid;
begin
  -- 1. Validate the project key.
  select id into v_project_id
  from projects
  where key_hash = crypt(p_project_key, key_hash)
    and archived_at is null
  limit 1;

  if v_project_id is null then
    raise exception 'Invalid project key' using errcode = '42501';
  end if;

  -- 2. The session must belong to the SAME project as the key.
  select project_id into v_session_owner
  from audit_sessions
  where id = p_session_id;

  if v_session_owner is null then
    raise exception 'Session not found';
  end if;

  if v_session_owner <> v_project_id then
    raise exception 'Session does not belong to this project key'
      using errcode = '42501';
  end if;

  -- 3. Idempotency: if this client_id already exists in this project,
  --    return the existing id without touching the row (immutability).
  select id into v_issue_id
  from issues
  where project_id = v_project_id and client_id = p_client_id
  limit 1;

  if v_issue_id is not null then
    return v_issue_id;
  end if;

  insert into issues(
    session_id, project_id, client_id, note, category,
    screen_name, component_name, source_file, source_line,
    bounds, screen_dims, screenshot_path, captured_at
  ) values (
    p_session_id, v_project_id, p_client_id, p_note, p_category,
    p_screen_name, p_component_name, p_source_file, p_source_line,
    p_bounds, p_screen_dims, p_screenshot_path, p_captured_at
  )
  returning id into v_issue_id;

  return v_issue_id;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 10. Privileges (replaces the auto-expose toggle we left OFF)
-- ─────────────────────────────────────────────────────────────

-- Both roles can see the schema.
grant usage on schema public to anon, authenticated;

-- Dashboard users get standard CRUD; RLS narrows it to their org.
grant select, insert, update, delete on
  organizations, projects, audit_sessions, issues, issue_comments, org_members
  to authenticated;

-- service_role is the API service's identity (used by cloud-api). It
-- bypasses RLS but still needs table-level GRANTs, otherwise we get
-- `permission denied for table …` despite the RLS bypass.
grant select, insert, update, delete on
  organizations, projects, audit_sessions, issues, issue_comments, org_members
  to service_role;

-- Devices (anon) can call only the two device RPCs — nothing else.
revoke all on function device_create_session(text, text, text, text)   from public;
revoke all on function device_submit_issue (text, uuid, text, text, text, text, text, text, int, jsonb, jsonb, text, timestamptz) from public;
grant execute on function device_create_session(text, text, text, text)  to anon;
grant execute on function device_submit_issue (text, uuid, text, text, text, text, text, text, int, jsonb, jsonb, text, timestamptz) to anon;

-- Dashboard users can call the admin RPCs (RLS-equivalent checks live
-- inside the functions).
grant execute on function create_project(uuid, text)         to authenticated;
grant execute on function rotate_project_key(uuid)           to authenticated;

-- Helper functions used by RLS policies must be executable by both roles.
grant execute on function is_org_member(uuid) to anon, authenticated;
grant execute on function is_org_admin(uuid)  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 11. Screenshots bucket
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

-- Storage RLS policies are written in a follow-up step. For now the
-- bucket is private (public = false), so nothing outside the database
-- can read screenshots without a signed URL.
