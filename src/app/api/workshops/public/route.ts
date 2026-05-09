import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { getMockStore, isMockMode, type MockWorkshop } from "@/lib/mock-store";

function withSessionFallback(workshop: MockWorkshop) {
  return {
    ...workshop,
    googleDriveFolderUrl: workshop.googleDriveFolderUrl ?? workshop.videoUrl,
    sessions: (workshop.sessions ?? []).sort((a, b) => a.orderIndex - b.orderIndex),
  };
}

export const GET = handle(async () => {
  if (isMockMode()) {
    return ok(getMockStore().workshops.filter((w) => w.isPublished).map(withSessionFallback));
  }
  const { rows } = await query(
    `SELECT workshop_id AS "workshopId", title, title_ar AS "titleAr",
            description, description_ar AS "descriptionAr", category, presenter,
            duration_min AS "durationMin", video_url AS "videoUrl",
            google_drive_folder_url AS "googleDriveFolderUrl",
            thumbnail_url AS "thumbnailUrl", recorded_date AS "recordedDate",
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
      GROUP BY w.workshop_id
      ORDER BY w.recorded_date DESC NULLS LAST`,
  );
  return ok(rows);
});
