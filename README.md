# DRC Digital Ecosystem

Internal platform for the **Drones & Robotics Club** at King Saud University — public site, member dashboards, committee tooling, attendance, projects, events, sponsors, finance, alumni, and more.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS** · **framer-motion** · **lucide-react**
- **Postgres** (Neon in production) · **JWT cookie sessions**
- **Vercel Blob** for uploads · **Resend** for transactional email

## Quick start (local)

```bash
npm install
npm run dev          # http://localhost:3000 — runs in mock-mode if DATABASE_URL is unset
```

Mock-mode seeds 100+ members and demo content in memory so the whole app is browsable without a database. Sign in with any seeded email at `/login`.

## Production deploy

See [`DEPLOY.md`](./DEPLOY.md) for the full Vercel + Neon + Resend setup. Required env:

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | Random 32+ byte secret for session cookies |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for file uploads |
| `RESEND_API_KEY` | Email sender (optional in mock-mode) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for SEO/OG |

Database setup: run every file in `database/` in numeric order against `DATABASE_URL`, skipping `002_migrate_from_old_schema.sql` (one-time legacy migration).

## Repo layout

```
src/app                Next.js App Router pages + /api routes
src/components         Reusable UI (dashboard cards, forms, …)
src/lib                db, auth, api helpers, mock-store
database/              Numbered .sql migrations + seeds
public/                Static assets
DEPLOY.md              Production deployment runbook
```

## Scripts

```bash
npm run dev            # local dev server
npm run build          # production build
npm run start          # serve built app
npx tsc --noEmit       # type check
```
