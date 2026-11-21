# Handoff — DRC Digital Ecosystem

This is the one document to read first. It explains every outside service this
project depends on, in plain language, and what needs to happen to each one so
you end up as the sole admin. For the technical deploy/migration steps, see
[`DEPLOY.md`](./DEPLOY.md). For architecture and local setup, see
[`README.md`](./README.md).

The app is live and in real use — the member roster, dashboards, and content
are real club data, not demo data. Treat the services below as production.

---

## 1. The services, in plain English

| Service | What it actually is | What it's used for here |
|---|---|---|
| **GitHub** | Where the code lives (version history, source of truth). | This repo: `github.com/Khalid-Almneef/drc-digital-ecosystem` (public). |
| **Vercel** | The host that builds and serves the site. | Runs the Next.js app, serves the live domain, stores env vars. |
| **Neon** | A managed Postgres database. | Holds every real row: members, projects, events, finance, attendance. |
| **Vercel Blob** | File storage attached to the Vercel project. | Stores uploaded images/files (avatars, media assets). |
| **Resend** | A transactional email API. | Sends account-setup links and password resets to members. |
| **JWT_SECRET** | Not a service — a random secret string. | Signs login session cookies. Anyone with it can forge sessions, so it gets rotated, not inherited. |

Everything else in `.env` (`YOUTUBE_API_KEY`, `INSTAGRAM_ACCESS_TOKEN`,
`TWITTER_BEARER_TOKEN`) is optional — only needed if the social-feed sections
on the public site should pull live content. Safe to leave blank.

---

## 2. What's being handed to you directly

These three are being moved off Khalid's accounts so he's fully out of the loop
and you're the real admin:

- **GitHub** — you're added as a collaborator on the existing repo (push/admin
  rights, no need to re-clone from anywhere else). Nothing about the repo
  changes; you just start committing to it.
- **Vercel project** — ownership transfers to your Vercel account via
  Project Settings → Transfer. This carries the live deployment, the domain,
  all env vars, and Vercel Blob storage with it — you don't need to recreate
  any of that.
- **Neon project** — ownership transfers to your Neon account via
  Project Settings → Transfer. This is the real production database; transferring
  it means you inherit the actual data (members, events, etc.) with nothing to
  re-import.

Khalid will trigger both transfers from his side; you'll get an email to accept
each one. Nothing for you to set up here beyond clicking Accept.

## 3. What you set up yourself (new accounts, on purpose)

- **Resend** — create your own account at resend.com, verify the sending
  domain (same DNS instructions as any Resend setup — see `DEPLOY.md` §4),
  and generate your own `RESEND_API_KEY`. Email sending moves to your account
  so Khalid's Resend key stops being used.
- **JWT_SECRET** — generate a fresh one (`openssl rand -hex 32`) once you have
  the Vercel project. Rotating this instantly invalidates all existing login
  sessions, so do it once, right after the Vercel transfer, not repeatedly.

Set both as env vars on the (now yours) Vercel project — see `DEPLOY.md` §6
for the full variable list.

---

## 4. Known issue to pick up

**The dataset doesn't refresh reliably** — flagged during review but not yet
diagnosed. Worth investigating early since it affects whether dashboards show
current data. Start by checking the client-side data-fetching hooks (`useEffect
+ fetch` pattern, ~48 call sites per `DEPLOY.md` §10) for missing cache-busting
or revalidation.

---

## 5. Repo note

The repo previously had leftover scratch files from AI coding-assistant
sessions (`.planning/`, `.superpowers/`, duplicate agent-instruction files,
stray log files). Those have been removed and gitignored — what's left is just
the app, `README.md`, `DEPLOY.md`, this file, and `AGENTS.md` (a short note
for AI coding tools about this Next.js version's quirks — ignore it if you're
not using one).
