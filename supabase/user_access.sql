-- Minimal access gate: email + profile fields + Google openid (sub).
-- New Google sign-ins start as pending; approve in SQL or Supabase Table Editor.

create type public.user_access_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  openid_sub text,
  status public.user_access_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_access_email_lower_idx on public.user_access (lower(email));
create index if not exists user_access_openid_sub_idx on public.user_access (openid_sub) where openid_sub is not null;

create trigger user_access_set_updated_at
before update on public.user_access
for each row
execute function public.set_updated_at();

alter table public.user_access enable row level security;

create policy "Users can read own access"
on public.user_access
for select
to authenticated
using (auth.uid() = user_id);

-- Approve a user (run as postgres / service role in SQL editor):
-- update public.user_access set status = 'approved' where email = 'user@example.com';

-- Backfill existing accounts (run once after deploy):
-- insert into public.user_access (user_id, email, full_name, status)
-- select id, email, coalesce(raw_user_meta_data->>'full_name', ''), 'approved'::public.user_access_status
-- from auth.users
-- on conflict (user_id) do nothing;