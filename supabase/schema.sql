create type public.work_status as enum ('completed', 'inProgress', 'pending', 'abnormal');

create table public.sites (
  id text primary key,
  site text not null,
  customer text not null,
  contact text not null default '',
  phone text not null default '',
  province text not null default '',
  region text not null default '',
  owner text not null default '',
  contract text not null default '',
  contract_details jsonb not null default '{}'::jsonb,
  address text not null default '',
  department text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pm_jobs (
  id text primary key,
  site_id text not null references public.sites(id) on delete cascade,
  status public.work_status not null default 'pending',
  pm_cycle text not null,
  visit_date date not null,
  visit_time time not null,
  owner text not null,
  start_time time,
  end_time time,
  result text,
  work_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pm_jobs_site_id_idx on public.pm_jobs(site_id);
create index pm_jobs_visit_date_idx on public.pm_jobs(visit_date);
create index pm_jobs_status_idx on public.pm_jobs(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sites_set_updated_at
before update on public.sites
for each row
execute function public.set_updated_at();

create trigger pm_jobs_set_updated_at
before update on public.pm_jobs
for each row
execute function public.set_updated_at();

alter table public.sites enable row level security;
alter table public.pm_jobs enable row level security;

create policy "Allow authenticated read sites"
on public.sites
for select
to authenticated
using (true);

create policy "Allow authenticated read pm jobs"
on public.pm_jobs
for select
to authenticated
using (true);

create policy "Allow authenticated writes sites"
on public.sites
for all
to authenticated
using (true)
with check (true);

create policy "Allow authenticated writes pm jobs"
on public.pm_jobs
for all
to authenticated
using (true)
with check (true);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  signature text not null default '',
  updated_at timestamptz not null default now()
);

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
