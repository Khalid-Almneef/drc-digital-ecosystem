import { handle, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";

// GET /api/live-workshops/public — published live workshops with registration counts.
// Does NOT expose meeting_url (internal only).
// members_only=TRUE workshops are hidden from logged-out viewers.
// If the caller is signed in, each workshop row also includes
// `myRegistrationStatus` (one of "pending" | "accepted" | "rejected" | null)
// — the *caller's own* registration status, looked up by their account email.
// We never surface other people's status.
export const GET = handle(async () => {
  const session = await getSession();
  const isAuthenticated = session !== null;

  let viewerEmail: string | null = null;
  if (session) {
    if (isMockMode()) {
      viewerEmail = findMockMember(session.memberId)?.email?.toLowerCase() ?? null;
    } else {
      const u = await queryOne<{ email: string }>(
        `SELECT email FROM users WHERE member_id = $1`,
        [session.memberId],
      );
      viewerEmail = u?.email.toLowerCase() ?? null;
    }
  }

  if (isMockMode()) {
    const store = getMockStore();
    const rows = store.liveWorkshops
      .filter((w) => w.isPublished)
      .filter((w) => isAuthenticated || !(w.membersOnly ?? false))
      .map((w) => {
        let myRegistrationStatus: "pending" | "accepted" | "rejected" | null = null;
        if (viewerEmail) {
          const mine = store.liveWorkshopRegistrations.find(
            (r) =>
              r.liveWorkshopId === w.liveWorkshopId &&
              r.email.toLowerCase() === viewerEmail,
          );
          myRegistrationStatus = mine?.status ?? null;
        }
        return {
          liveWorkshopId: w.liveWorkshopId,
          title: w.title,
          titleAr: w.titleAr,
          description: w.description,
          descriptionAr: w.descriptionAr,
          presenter: w.presenter,
          scheduledAt: w.scheduledAt,
          durationMin: w.durationMin,
          location: w.location,
          maxRegistrants: w.maxRegistrants,
          registrationOpen: w.registrationOpen,
          membersOnly: w.membersOnly ?? false,
          registrationCount: store.liveWorkshopRegistrations.filter((r) => r.liveWorkshopId === w.liveWorkshopId).length,
          myRegistrationStatus,
        };
      });
    return ok(rows);
  }
  const { rows } = await query(`
    SELECT
      lw.live_workshop_id   AS "liveWorkshopId",
      lw.title,
      lw.title_ar           AS "titleAr",
      lw.description,
      lw.description_ar     AS "descriptionAr",
      lw.presenter,
      lw.scheduled_at       AS "scheduledAt",
      lw.duration_min       AS "durationMin",
      lw.location,
      lw.max_registrants    AS "maxRegistrants",
      lw.registration_open  AS "registrationOpen",
      lw.members_only       AS "membersOnly",
      COUNT(r.registration_id)::int AS "registrationCount",
      (
        SELECT mr.status
          FROM live_workshop_registrations mr
         WHERE mr.live_workshop_id = lw.live_workshop_id
           AND $2::text IS NOT NULL
           AND LOWER(mr.email) = $2::text
         LIMIT 1
      ) AS "myRegistrationStatus"
    FROM live_workshops lw
    LEFT JOIN live_workshop_registrations r ON r.live_workshop_id = lw.live_workshop_id
    WHERE lw.is_published = TRUE
      AND ($1::boolean = TRUE OR lw.members_only = FALSE)
    GROUP BY lw.live_workshop_id
    ORDER BY lw.scheduled_at ASC
  `, [isAuthenticated, viewerEmail]);
  return ok(rows);
});
