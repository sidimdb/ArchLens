-- Org admins can delete issues. Used to remove spam, duplicates, or
-- test data. The reviewer's *content* (note, screenshot, bounds) is
-- still immutable thanks to the BEFORE UPDATE trigger from the init
-- migration — admins can DELETE the whole record, never silently edit
-- one. Non-admin members and viewers cannot delete.

drop policy if exists issues_delete on issues;
create policy issues_delete on issues
  for delete
  using (
    exists (
      select 1 from projects p
      where p.id = issues.project_id
        and is_org_admin(p.org_id)
    )
  );
