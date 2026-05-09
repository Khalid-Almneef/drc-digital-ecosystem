# DRC Digital Ecosystem — Deployment Guide

This is the manual checklist you run **once** before going live, plus the commands you re-run for each redeploy.

---

## 1. Provision PostgreSQL (one-time)

You need a Postgres 14+ instance. Three good options:

| Option | Where | Notes |
|---|---|---|
| **Vercel Postgres** | dashboard → Storage → Create | Easiest if hosting on Vercel. |
| **Supabase** | supabase.com → New project | Free tier, includes built-in auth (we don't use theirs). |
| **Neon** | neon.tech → New project | Generous free tier, fast cold starts. |

After creating the database, copy the connection string. It looks like:

```
postgresql://user:pass@host:5432/dbname?sslmode=require
```

---

## 2. Run migrations (one-time)

From a machine with `psql` installed and the `DATABASE_URL` env var set:

```bash
export DATABASE_URL='postgresql://...'

# Order matters. Run in sequence:
psql "$DATABASE_URL" -f database/001_schema.sql
psql "$DATABASE_URL" -f database/003_security.sql
psql "$DATABASE_URL" -f database/004_additions.sql
psql "$DATABASE_URL" -f database/005_live_workshops.sql
psql "$DATABASE_URL" -f database/006_dashboards_phase.sql
psql "$DATABASE_URL" -f database/007_announcements_images.sql
psql "$DATABASE_URL" -f database/008_finance_workflow.sql
psql "$DATABASE_URL" -f database/009_project_applications.sql
psql "$DATABASE_URL" -f database/010_event_hours_and_announcement_requests.sql
psql "$DATABASE_URL" -f database/011_volunteer_hour_tasks.sql
psql "$DATABASE_URL" -f database/012_madarat_dashboard.sql
psql "$DATABASE_URL" -f database/013_service_requests_profile_gender_and_madarat.sql
psql "$DATABASE_URL" -f database/014_project_media_requests.sql
psql "$DATABASE_URL" -f database/015_google_drive_workshop_sessions_and_company_visits.sql
psql "$DATABASE_URL" -f database/016_contact_email_seed.sql
psql "$DATABASE_URL" -f database/019_account_setup.sql
# 017 + 018 live in database/migrations/ — run them too:
psql "$DATABASE_URL" -f database/migrations/017_pr_sponsor_pipeline_and_proposals.sql
psql "$DATABASE_URL" -f database/migrations/018_notifications.sql

# Seed the real club roster (Sem 2 1447 backup):
psql "$DATABASE_URL" -f database/020_seed_team_roster.sql

# Change-requests pipeline (leader approval for big member actions):
psql "$DATABASE_URL" -f database/021_change_requests.sql

# MOTM / Leader-of-the-month history + leaderboard view:
psql "$DATABASE_URL" -f database/022_motm_history.sql

# Project publish flag (drafts until media publishes):
psql "$DATABASE_URL" -f database/023_project_publish.sql

# Per-field privacy toggles on member profiles:
psql "$DATABASE_URL" -f database/024_profile_privacy.sql
```

> Skip `002_migrate_from_old.sql` — that was a one-shot migration from a now-defunct legacy schema. You don't have the source data for it.

Verify:

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"     # → 140
psql "$DATABASE_URL" -c "SELECT position, COUNT(*) FROM users GROUP BY position;"
# Expected: president 1, vice_president 2, dept_leader 15, dept_vice_leader 5, member 117
psql "$DATABASE_URL" -c "SELECT slug, COUNT(*) FROM users u JOIN departments d ON u.department_id = d.department_id GROUP BY slug;"
# Expected: innovation 57, media 29, pr 16, logistics 16, development 9, hr 9, executive 3, finance 1
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM profiles WHERE status = 'alumni';"  # → 12
```

---

## 3. Verify leader assignments

Leaders are auto-assigned by migration 020 from the **القادة** sheet (16 leaders + 7 vice-leaders + 1 president + 2 vice-presidents = 25 leadership positions). Verify it landed correctly:

```sql
-- Show every leader the seed created
SELECT u.email, u.position::text, d.slug AS department, p.full_name, p.full_name_ar
  FROM users u
  LEFT JOIN departments d ON u.department_id = d.department_id
  LEFT JOIN profiles p ON p.member_id = u.member_id
 WHERE u.position <> 'member'
 ORDER BY u.position, d.slug;
```

If a leadership row is wrong (re-org happened, person stepped down), patch it:

```sql
UPDATE users SET position = 'dept_leader' WHERE email = 'new_leader@example.com';
UPDATE users SET position = 'member'      WHERE email = 'former_leader@example.com';
```

The login flow auto-emails a password setup link the first time each member tries to log in (token expires in 24h). They click it → set a password → they're in.

---

## 4. Email (Resend)

The app uses [Resend](https://resend.com) for transactional emails (account setup, password reset).

1. Create a Resend account.
2. Verify your sending domain (or use `onboarding@resend.dev` for testing).
3. Get an API key from the dashboard.
4. Set env vars (see §6).

If `RESEND_API_KEY` is unset, emails are silently dropped (the app keeps working, but no setup links go out — fine for local dev, **not** for production).

---

## 5. Hosting

The app is a stock Next.js 16 project. **Vercel** is the path of least resistance:

```bash
# From the project root
npx vercel --prod
```

- Connect your GitHub repo or upload directly.
- During import, Vercel auto-detects Next.js. Build command: `next build`. Output: `.next`.
- Add env vars in Project Settings → Environment Variables (see §6).

Other working hosts: Netlify (with Next.js plugin), Railway, Fly.io, a self-hosted Docker container with `node server.js`.

---

## 6. Required environment variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `DATABASE_URL` | **yes** | `postgresql://...?sslmode=require` | If unset, app runs in mock-mode (demo data only). |
| `JWT_SECRET` | **yes** | random 64-char hex | Generate with `openssl rand -hex 32`. |
| `NEXT_PUBLIC_SITE_URL` | **yes** | `https://drc.club` | Used for SEO, sitemap, OG tags, password-reset links. |
| `NEXT_PUBLIC_APP_URL` | **yes** | same as above | Used inside email templates. |
| `RESEND_API_KEY` | **yes (prod)** | `re_xxx` | Without this, no emails go out. |
| `EMAIL_FROM` | recommended | `DRC <noreply@drc.club>` | Must match your verified Resend domain. |
| `UPLOAD_MAX_IMAGE_MB` | optional | `15` (default) | |
| `UPLOAD_MAX_VIDEO_MB` | optional | `100` (default) | |
| `NODE_ENV` | auto | `production` | Set automatically by Vercel/Netlify. |

---

## 7. Pre-flight checklist

Before announcing the URL to members:

- [ ] All migrations ran successfully (`SELECT COUNT(*) FROM users` returns 103).
- [ ] Leader promotions applied (§3).
- [ ] Resend domain verified, test email landed in inbox (not spam).
- [ ] `NEXT_PUBLIC_SITE_URL` matches the live domain.
- [ ] HTTPS enforced (Vercel does this automatically; self-hosted needs a cert).
- [ ] Try logging in as a real member email → confirm setup email arrives.
- [ ] Smoke test: open the public site EN + AR, register for a workshop, submit a join application.
- [ ] Replace placeholder OG image at `public/og-image.png` (currently the favicon — see §8).
- [ ] Replace placeholder `partnerships@drc.club` contact email via the Content dashboard (`/dashboard/content`).
- [ ] Verify team page shows real members after seed.

---

## 8. Known placeholders to replace

These are visible to end users. Update via the Content dashboard or by editing the file/asset:

| Where | What | How |
|---|---|---|
| Public site contact email | `partnerships@drc.club` | `/dashboard/content` → Contact key |
| OG image | `public/og-image.png` | Replace with 1200×630 branded image |
| Workshop seed data | 4 hardcoded "Coming soon" workshops in `src/app/(public)/events/page.tsx:80-129` | Will hide automatically once `/api/events/public` returns real events from the DB |

---

## 9. Backups

Once live, schedule daily backups:

- **Vercel Postgres / Supabase / Neon**: managed providers do automatic point-in-time recovery — confirm it's enabled in your dashboard.
- **Self-hosted**: `pg_dump "$DATABASE_URL" > backup-$(date +%F).sql` via cron.

---

## 10. What's NOT in this release

These were on the roadmap but de-scoped for first deploy. Track them as Tier-2 follow-ups:

- Per-event public detail page (`/events/[id]`). Cards show but don't drill in.
- Logistics dashboard (`/dashboard/logistics`). The dept exists in the DB; nav item is hidden until the page is built.
- SWR migration of the 48 hand-rolled `useEffect + fetch` loaders.
- File-size cleanup on `dashboard/content` (~2.4k lines), `media` (~1.4k), `hr` (~1.2k).

None of these block deployment — the app is feature-complete for the launch scope.
