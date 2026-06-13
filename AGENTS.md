# AGENTS.md

## Cursor Cloud specific instructions

This is a Next.js 16 (App Router, Turbopack) + Supabase application. The single service is the
Next.js dev server, which depends on a Supabase backend (Postgres + Auth) for all meaningful
functionality (login, dashboard, sites, PM jobs, reports). Standard commands live in `README.md`
and `package.json` (`npm run dev | lint | typecheck | build`).

The dev environment uses a **local** Supabase stack (Docker + Supabase CLI) instead of a hosted
project, so no external secrets are required. Docker, the Supabase CLI, and the pulled Supabase
images are baked into the VM snapshot; `npm install` is handled by the startup update script.

### Starting the services (not handled by the update script)

These are service-startup steps, so they are intentionally NOT in the update script. Run them once
at the start of a session:

1. Start the Docker daemon (no systemd in this VM, so run it manually and leave it running):
   - `sudo dockerd > /tmp/dockerd.log 2>&1 &` (or use a tmux session)
   - Then make the socket usable without sudo: `sudo chmod 666 /var/run/docker.sock`
2. Start Supabase from the repo root: `supabase start` (first run pulls images; subsequent runs are fast).
3. Start the app: `npm run dev` (serves on `http://localhost:3000`).

### Environment variables

`.env.local` is gitignored but preserved in the snapshot. If it is missing, recreate it from the
**local** Supabase values printed by `supabase status` (these are well-known local dev defaults, not
real secrets). Map them as:

```
NEXT_PUBLIC_SUPABASE_URL=<API URL, e.g. http://127.0.0.1:54321>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<"Publishable key" from `supabase status`>
SUPABASE_SECRET_KEY=<"Secret key" from `supabase status`>
```

### Test user

A confirmed test user is seeded for login: `tech@example.com` / `password123`. If the local DB is
reset, recreate it via the auth admin API using the secret key from `.env.local` / `supabase status`:

```
SECRET="$(grep SUPABASE_SECRET_KEY .env.local | cut -d= -f2)"
curl -s -X POST "http://127.0.0.1:54321/auth/v1/admin/users" \
  -H "apikey: $SECRET" -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email":"tech@example.com","password":"password123","email_confirm":true,"user_metadata":{"full_name":"Field Technician","phone":"0812345678"}}'
```

### Non-obvious gotchas

- The DB schema is applied automatically by `supabase start` via `supabase/migrations/`, which
  mirrors `supabase/schema.sql` (the hosted-setup script referenced in `README.md`).
- RLS only grants table access to the `authenticated` role. `GET /api/db/health` is a public route
  but its query still runs as `anon`, so it returns `{ ok: false }` until you have a logged-in
  session — this is expected, not a misconfiguration. Verify the DB through the authenticated UI.
- The middleware file is `proxy.ts` (Next.js 16 renamed `middleware` to `proxy`); it redirects
  unauthenticated users to `/login` and `/` to `/dashboard`.
