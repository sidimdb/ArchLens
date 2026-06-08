-- Per-issue device fingerprint, so we can correlate quality problems
-- with specific hardware / OS combinations later (e.g. "highlight
-- positioning bug only on Samsung devices" or "issues spike on
-- Android 14"). Denormalized onto `issues` rather than joined from
-- `audit_sessions` so dashboard filtering doesn't need a join.

alter table issues
  add column if not exists os_name text,
  add column if not exists os_version text,
  add column if not exists device_brand text,
  add column if not exists device_model text;
