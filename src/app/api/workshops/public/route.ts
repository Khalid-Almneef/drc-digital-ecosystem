import { handle, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getMockStore, isMockMode, type MockWorkshop } from "@/lib/mock-store";

function withSessionFallback(workshop: MockWorkshop) {
  return {
    ...workshop,
    membersOnly: workshop.membersOnly ?? false,
    googleDriveFolderUrl: workshop.googleDriveFolderUrl ?? workshop.videoUrl,
    sessions: (workshop.sessions ?? []).sort((a, b) => a.orderIndex - b.orderIndex),
  };
}

// GET /api/workshops/public — published recorded workshops.
// members_only=TRUE workshops are hidden from logged-out viewers.
export const GET = handle(async () => {
  const session = await getSession();
  const isAuthenticated = session !== null;

  if (isMockMode()) {
    return ok(
      getMockStore().workshops
        .filter((w) => w.isPublished)
        .filter((w) => isAuthenticated || !(w.membersOnly ?? false))
        .map(withSessionFallback),
    );
  }
  const { rows } = await query(
    `SELECT w.workshop_id AS "workshopId", w.title, w.title_ar AS "titleAr",
            w.description, w.description_ar AS "descriptionAr", w.category, w.presenter,
            w.duration_min AS "durationMin", w.video_url AS "videoUrl",
            w.google_drive_folder_url AS "googleDriveFolderUrl",
            w.thumbnail_url AS "thumbnailUrl", w.recorded_date AS "recordedDate",
            w.members_only AS "membersOnly",
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'sessionId', ws.session_id,
                  'workshopId', ws.workshop_id,
                  'title', ws.title,
                  'titleAr', ws.title_ar,
                  'description', ws.description,
                  'durationMin', ws.duration_min,
                  'googleDriveUrl', ws.google_drive_url,
                  'orderIndex', ws.order_index
                )
                ORDER BY ws.order_index ASC, ws.session_id ASC
              ) FILTER (WHERE ws.session_id IS NOT NULL),
              '[]'::jsonb
            ) AS sessions
       FROM workshops w
       LEFT JOIN workshop_sessions ws ON ws.workshop_id = w.workshop_id
      WHERE w.is_published = TRUE
        AND ($1::boolean = TRUE OR w.members_only = FALSE)
      GROUP BY w.workshop_id
      ORDER BY w.recorded_date DESC NULLS LAST`,
    [isAuthenticated],
  );
  return ok(rows);
});
