# JF-Management

## Login

Email + password or Google — user must exist in `app_users`. No forgot-password UI; reset via:

```bash
node scripts/create-user.mjs user@jfav.co.th "Full Name" new-password
```

## Local development

```bash
npm install
npm run db:init
node scripts/create-user.mjs visarut@jfav.co.th "Visarut" Zero1234
npm run dev
```

## Docker

```bash
npm run docker:up
npm run docker:seed
```

App: http://localhost:3001 (or `APP_PORT` in `.env.docker`)

## Deploy on Render (https://jf-management.onrender.com)

1. Push repo to GitHub and connect in [Render](https://render.com).
2. Use `render.yaml` (Blueprint) or create a **Web Service**:
   - **Build:** `npm ci && npm run build`
   - **Start:** `npm start`
   - **Health check:** `/api/db/health`
3. Add **PostgreSQL** (or external `DATABASE_URL`).
4. Environment variables (see `.env.render.example`):
   - `APP_URL=https://jf-management.onrender.com`
   - `AUTH_SECRET` (long random string)
   - `DATABASE_URL`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI=https://jf-management.onrender.com/api/auth/google/callback`
5. Google Cloud Console → OAuth client → add **Authorized redirect URI** above.
6. After first deploy, run `npm run db:init` against production `DATABASE_URL` (local shell) and `create-user.mjs` for accounts.

```bash
DATABASE_URL="postgresql://..." npm run db:init
DATABASE_URL="postgresql://..." node scripts/create-user.mjs werawong.p@jfav.co.th "Werawong" 0123456789
```
