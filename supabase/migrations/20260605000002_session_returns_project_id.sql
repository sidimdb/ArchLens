-- device_create_session now also returns the project_id, so the
-- client can use it as the folder name when uploading screenshots
-- (path convention: <project_id>/<issue_id>.png).

drop function if exists device_create_session(text, text, text, text);

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

grant execute on function device_create_session(text, text, text, text) to anon;
