# JF-Management

PM Site Management is a Next.js application for planning preventive maintenance jobs, managing sites, recording field work, and reviewing reports.

## Tech Stack

- Next.js
- React
- TypeScript
- ESLint

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Tests

After `npm install`, run unit tests and TypeScript checks:

```bash
npm test
npm run verify   # test + typecheck
npm run test:all # same as verify
```

## Supabase Setup

Create a Supabase project, then open the Supabase SQL editor and run the SQL in `supabase/schema.sql`.

Create `.env.local` from `.env.example` and fill in your project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
```

For server-side admin operations, add a server-only Supabase service role key:

```bash
SUPABASE_SECRET_KEY=sb_secret_or_service_role_key
```

Create users in Supabase Auth and set each user's `full_name` and `phone` metadata when needed by the app.

Restart the dev server after changing env values. You can test the database connection at:

```bash
http://localhost:3000/api/db/health
```

Verify required variables before building:

```bash
npm run check:env
```

## Deploy to Vercel

1. Push this repository to GitHub (`origin` is already configured).
2. Import the repo in [Vercel](https://vercel.com/new) and select the `JF-Management` project.
3. Add these **Environment Variables** for Production (and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
4. Deploy. The build runs `npm run check:env` first and fails fast if any key is missing.
5. After deploy, open `https://<your-domain>/api/db/health` — expect `"ok": true`.
6. Create users in **Supabase → Authentication → Users**, then sign in at `/login`.
7. On Render/Vercel set `NEXT_PUBLIC_APP_URL` to your public origin (e.g. `https://jf-management.onrender.com`) so Google OAuth never falls back to a wrong host from a bad build env.

### Google OAuth (Gmail login)

**Supabase → Authentication → URL Configuration**

- Site URL: your production origin (e.g. `https://jf-management.onrender.com`)
- Redirect URLs: include `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` for local dev

**Google Cloud → OAuth client → Authorized redirect URIs** — use **only**:

`https://<project-ref>.supabase.co/auth/v1/callback`

Remove bare `http://localhost:3000` from redirect URIs (keep `http://localhost:3000` under **JavaScript origins** for local dev only).

Approve first-time Google users in `user_access` (`status = approved`).

`DATABASE_URL`, `GOOGLE_*`, and `AUTH_SECRET` are **not used** by this app; only the Supabase keys above are required.

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```
