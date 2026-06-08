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

## Supabase Setup

Create a Supabase project, then open the Supabase SQL editor and run the SQL in `supabase/schema.sql`.

Create `.env.local` from `.env.example` and fill in your project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
```

To seed the bundled demo PM data into Supabase, add a server-only secret key to `.env.local`:

```bash
SUPABASE_SECRET_KEY=sb_secret_or_service_role_key
```

Then restart the dev server and send a POST request:

```bash
curl -X POST http://localhost:3000/api/db/seed
```

To create the default login user in Supabase Auth, keep the same `SUPABASE_SECRET_KEY`, restart the dev server, and send:

```bash
curl -X POST http://localhost:3000/api/auth/bootstrap-user
```

Default logins:

```text
reviver2505@gmail.com / 123456
werawong.p@jfav.co.th / 123456
sarawut_l@jfav.co.th / 123456
Natthawat@jfav.co.th / 123456
```

Restart the dev server after changing env values. You can test the database connection at:

```bash
http://localhost:3000/api/db/health
```

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```
