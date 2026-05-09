# DRC Digital Ecosystem - Compact Handoff

## Current Scope
- The work expanded beyond the earlier landing-page-only scope.
- Current verified state includes public-site polish, dashboard polish, dashboard workflow changes, and Obsidian handoff updates.

## Current Truth
- Active repo: `/Users/khalid/Documents/Vault/drc-digital-ecosystem`
- Public app routes live under `src/app/(public)/*`
- Dashboard routes live under `src/app/dashboard/*`
- Shared design system lives primarily in `src/app/globals.css`
- Theme and language state live in `src/contexts/ThemeContext.tsx` and `src/contexts/LanguageContext.tsx`

## Major Changes Landed
- Dashboard language switch now uses `AR` / `EN`
- Gender handling was reduced to `male` / `female` in the editable dashboard/member path and related mock/API validation
- Dashboard selectors were standardized toward the HR-style softer picker/control treatment
- Madarat session creation was moved off the main page into a modal flow
- `Innovation & Engineering` was renamed to `Innovation` across the dashboard, shared metadata, mock data, and key public copy
- CSV import/export/template flows were added to the main operational dashboards:
  - Madarat sessions
  - Leaders announcements
  - Innovation archive
  - Finance request reporting
- The leaders/admin page was refactored into an executive oversight board instead of homepage toggles + MOTM management
- Homepage section toggles and homepage stats are now clearly managed from the Content dashboard

## UI / UX Status
- Shared visual polish was pushed through public and dashboard shells
- Light mode was upgraded to feel more deliberate and premium instead of a weaker dark-mode fallback
- Shared card, button, field, select, picker, and tab states were strengthened in `src/app/globals.css`
- Cursor-following glow is now mounted at the shared public/dashboard layout level instead of only the homepage
- The heavier cursor-reactive spotlight pass was rolled back; current state is a simpler glow-following effect with slightly brighter light-mode visibility

## Dashboard Status Highlights
- HR: premiumized interior controls and MOTM selector treatment already in place
- Madarat: modal-based session creation, audience analytics, support-task tracking, CSV workflows
- Innovation: renamed branding, shared control styling, archive import/export/template support
- Leaders: now an executive dashboard for committee oversight, request visibility, and announcement management
- Content: homepage stats and homepage section visibility are edited here, not in Leaders

## Verification
- `npx tsc --noEmit` passes
- `npm run build` passes

## Repo Reality
- The worktree may still be dirty; do not assume older April handoffs are current
- This file is now the shortest reliable resume point for the repo state as of 2026-04-22
- If another agent continues from here, they should:
  1. treat this file and `Guides/Handoff Guide.md` as the current handoff source
  2. preserve recent dashboard workflow changes instead of restoring older admin/MOTM behavior
  3. re-verify with `npx tsc --noEmit` and `npm run build` after edits


## April 24, 2026 — Dashboard Arabic + Member Preference Memory

- Added signed-in member preference persistence through `src/app/api/members/preferences/route.ts` and `src/lib/member-preferences.ts`.
- Language preference is now saved per member account and restored automatically after sign-in.
- Theme preference is now saved per member account and restored automatically after sign-in.
- Added per-member custom palette support with 3 saved colors: `primary`, `secondary`, and `accent`.
- Theme context now derives runtime CSS variables from the saved palette, so the signed-in dashboard appearance follows the member account instead of only browser storage.
- Added profile UI for account memory / appearance preferences in `src/app/dashboard/profile/page.tsx`.
- Dashboard Arabic switching was extended beyond the sidebar: shared dashboard controls now react to language switch, including finance nav, CSV import/export toolbar, media picker, image library button, dashboard loading states, and budget panel copy.
- Main dashboard page headers / top stats were localized for HR, Development, Innovation, PR, Finance, Leaders, Madarat, Content, and Profile.
- Verification: `npx tsc --noEmit` passes and `npm run build` passes.
- Note: the biggest English bleed is fixed, but some dense inner dashboard form/body copy still needs a deeper route-by-route Arabic sweep if the goal is zero English anywhere in every subpanel.


## April 24, 2026 — Planned Next UX Refactor

Documented a planned signed-in dashboard restructure for later implementation.

Planned direction:
- `/dashboard` becomes the personal member workspace for everyone
- `/dashboard/profile` becomes profile + settings/preferences only
- leaders keep both their personal workspace and their committee dashboard

Sections planned to move from profile to main dashboard:
- assigned tasks
- task submission flow
- volunteer hours summary/history
- hour task registration
- manual hour logging
- endorsement summary/history

Full implementation notes were added to `DRC Digital Ecosystem/Guides/Handoff Guide.md`.
