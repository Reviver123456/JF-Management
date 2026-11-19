# JF-Management

Next.js app for PM site planning, field work, sites, schedule, history, and reports.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in Supabase keys
npm run dev
```

Open **http://localhost:3000** (avoid mixing `127.0.0.1` and `localhost` during dev).

## Environment variables

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes |
| `SUPABASE_SECRET_KEY` | yes (server only) |
| `NEXT_PUBLIC_APP_URL` | production (e.g. `https://jf-management.onrender.com`) |

See `.env.example`. After changes, restart dev server. Check DB: `GET /api/db/health` → `"ok": true`.

## Supabase

1. Run `supabase/schema.sql` and `supabase/user_access.sql` in the SQL editor.
2. Create users in Authentication; set `full_name` in user metadata when needed.
3. First Google sign-in stays **pending** until you set `user_access.status = 'approved'`.

## Deploy (Render)

1. Connect repo `Reviver123456/JF-Management` on [Render](https://render.com).
2. Build: `npm install && npm run check:env && npm run build` — start: `npm start`.
3. Set the env vars above; **`NEXT_PUBLIC_APP_URL`** must match your Render URL.
4. Redeploy after env or auth changes.

### Google login

**Supabase → URL Configuration**

- Site URL: `https://jf-management.onrender.com`
- Redirect URLs: `https://jf-management.onrender.com/auth/callback`, `http://localhost:3000/auth/callback`

**Google Cloud → OAuth client**

- **JavaScript origins:** `https://jf-management.onrender.com`, `http://localhost:3000`
- **Redirect URIs (only):** `https://<project-ref>.supabase.co/auth/v1/callback` — do not list bare `http://localhost:3000` here.

## Scripts

```bash
npm run verify    # unit tests + typecheck
npm run build
npm run lint
npm run clean     # remove .next build output
npm run fresh     # clean + verify + build
```

## ล้างแคช

- **แอป:** ออกจากระบบ (ล้าง cookie / session / cache ข้อมูล)
- **เครื่อง dev:** `npm run clean` แล้วรัน `npm run dev` ใหม่
- **Production:** Incognito หรือ hard refresh หลัง deploy