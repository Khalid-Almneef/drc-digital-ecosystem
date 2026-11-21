<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Project scope and current state

DRC Digital Ecosystem is the production platform for the Drones & Robotics
Club at King Saud University: a public marketing site plus an internal member
portal with department dashboards, attendance, finance, projects, events, and
sponsor management. It's live with real club data — not a prototype, not
demo content.

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui,
PostgreSQL (Neon in production; mock-mode fallback when `DATABASE_URL` is
unset), JWT httpOnly cookie sessions, Resend for transactional email,
bilingual EN/AR with full RTL support via `LanguageContext`.

**Public routes** (`src/app/(public)/`): `/`, `/about`, `/projects`,
`/workshops`, `/events`, `/team`, `/join`, `/forms`.

**Dashboard routes** (`src/app/dashboard/`): `overview`, `hr`, `development`,
`innovation`, `media`, `pr`, `finance`, `leaders`, `content`, `profile`,
`madarat`, `requests`, `roster`, `tasks`, `trash`.

**Departments** (`department_type` enum, see `database/001_schema.sql` and
`database/047_project_management_department.sql`): executive, hr,
development, innovation, media, pr, finance, logistics, madarat,
project_management. The last two dashboard routes don't exist yet for
`logistics` or `project_management` — those departments exist in the DB with
no dedicated UI.

## Known open items — verify against current code, don't assume

- `/events/[id]` detail route doesn't exist (`src/app/(public)/events/`
  only has `page.tsx`) — event cards don't link anywhere.
- No dashboard route for `logistics` (nav item is filtered out rather than
  built).
- **Dataset doesn't refresh reliably** — flagged by the incoming developer
  during review, not yet diagnosed. Likely culprit: the ~48 hand-rolled
  `useEffect + fetch` data loaders across dashboards have no cache
  invalidation/revalidation. Worth an early look.
- As of the last full audit: SWR migration, file-size cleanup on the largest
  dashboard pages (`content` ~2.4k lines, `media` ~1.4k, `hr` ~1.2k), and
  finishing the `tr(en, ar)` → `LanguageContext` dictionary migration were
  still open. Re-check the actual files before trusting this — it may already
  be partially done.

## Where to look next

- `README.md` — quick start, local dev, scripts.
- `DEPLOY.md` — env vars, database migrations, hosting, service setup
  (Resend, Postgres).
- `database/` — numbered migrations are the real schema history; read the
  highest-numbered files first for current state, not this doc.
