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

For server-side admin operations, add a server-only Supabase service role key:

```bash
SUPABASE_SECRET_KEY=sb_secret_or_service_role_key
```

Create users in Supabase Auth and set each user's `full_name` and `phone` metadata when needed by the app.

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
