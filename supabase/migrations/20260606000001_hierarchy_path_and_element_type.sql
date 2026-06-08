-- Add two columns to issues that give developers more context when
-- triaging:
--
--   hierarchy_path  text[]   — the ancestor chain from the screen
--                              down to the selected element. Shown
--                              as a breadcrumb in the dashboard.
--   element_type    text     — the underlying kind of the tapped
--                              element (text / button / image /
--                              input / etc.) derived from the host
--                              primitives in the chain. Useful for
--                              filtering and at-a-glance scanning.
--
-- Both default to empty/null so existing rows keep working.

alter table issues
  add column if not exists hierarchy_path text[] default array[]::text[],
  add column if not exists element_type text;
