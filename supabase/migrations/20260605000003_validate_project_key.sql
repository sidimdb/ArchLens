-- validate_project_key — RPC used by the cloud API to verify a
-- project key sent by the SDK. Returns the project + org ids on
-- success, raises on failure. The bcrypt compare happens here in SQL
-- because that's where the hash config (crypt() / gen_salt()) lives.
--
-- Called by the API service using service_role; not exposed to anon.

create or replace function validate_project_key(p_project_key text)
returns table (project_id uuid, org_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_project_id uuid;
  v_org_id     uuid;
begin
  if p_project_key is null or length(p_project_key) = 0 then
    raise exception 'invalid_key' using errcode = '42501';
  end if;

  -- Qualify with the table alias so PL/pgSQL doesn't confuse
  -- `org_id` with the RETURNS TABLE column of the same name.
  select p.id, p.org_id
    into v_project_id, v_org_id
  from projects p
  where p.key_hash = crypt(p_project_key, p.key_hash)
    and p.archived_at is null
  limit 1;

  if v_project_id is null then
    raise exception 'invalid_key' using errcode = '42501';
  end if;

  project_id := v_project_id;
  org_id     := v_org_id;
  return next;
end $$;

-- service_role bypasses grants anyway; this is defense in depth so the
-- function can be called only from privileged contexts.
revoke all on function validate_project_key(text) from public;
grant execute on function validate_project_key(text) to service_role;
