-- Local-dev only: replicate the table privileges that hosted Supabase grants to the
-- anon / authenticated / service_role roles by default.
--
-- The application's schema (supabase/schema.sql) is written for the hosted Supabase SQL
-- editor, where these CRUD grants already exist via default privileges, so it only ships
-- RLS policies. The local Postgres image does not grant SELECT/INSERT/UPDATE/DELETE to
-- these roles automatically, so without this the API returns "permission denied for table".
-- Row visibility is still controlled by the RLS policies defined in the init migration.
grant select, insert, update, delete on table public.sites to anon, authenticated, service_role;
grant select, insert, update, delete on table public.pm_jobs to anon, authenticated, service_role;
