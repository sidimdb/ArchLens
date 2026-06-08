-- Storage RLS policies for the screenshots bucket.
-- Path convention: `<project_id>/<issue_id>.png`.

drop policy if exists "device can upload screenshots" on storage.objects;
drop policy if exists "members can read screenshots" on storage.objects;

-- Devices upload into the screenshots bucket. We don't restrict by
-- role because the effective role on storage uploads varies between
-- Supabase versions / auth paths; the bucket_id check is the gate.
-- The bucket is private and an orphan upload without a matching issue
-- row (which requires a valid project key) is just disk waste.
create policy "device can upload screenshots"
  on storage.objects for insert
  with check (bucket_id = 'screenshots');

-- Dashboard users (authenticated) can read screenshots only for
-- projects in an org they belong to. The path's first segment is the
-- project_id, which we check against the projects table.
create policy "members can read screenshots"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'screenshots'
    and exists (
      select 1 from projects p
      where p.id::text = split_part(name, '/', 1)
        and is_org_member(p.org_id)
    )
  );

-- Be explicit about table-level privileges; Supabase usually does
-- this, but being explicit prevents "policy passes but GRANT denies".
grant select, insert on storage.objects to anon, authenticated;
