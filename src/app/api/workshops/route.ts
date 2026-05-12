import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query, withTx } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode, nextMockId, type MockWorkshop } from "@/lib/mock-store";

function sortSessions(workshop: MockWorkshop) {
  return {
    ...workshop,
    googleDriveFolderUrl: workshop.googleDriveFolderUrl ?? workshop.videoUrl,
    sessions: (workshop.sessions ?? []).sort((a, b) => a.orderIndex - b.orderIndex),
  };
}

export const GET = handle(async () => {
  await requireSession();
  if (isMockMode()) {
    return ok(getMockStore().workshops.map(sortSessions));
  }
  const { rows } = await query(
    `SELECT w.workshop_id AS "workshopId", w.title, w.title_ar AS "titleAr",
            w.description, w.description_ar AS "descriptionAr", w.category, w.presenter,
            w.duration_min AS "durationMin", w.video_url AS "videoUrl",
            w.google_drive_folder_url AS "googleDriveFolderUrl",
            w.thumbnail_url AS "thumbnailUrl", w.recorded_date AS "recordedDate",
            w.is_published AS "isPublished",
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
      GROUP BY w.workshop_id
      ORDER BY w.recorded_date DESC NULLS LAST, w.created_at DESC`,
  );
  return ok(rows);
});

const SessionPost = z.object({
  title: z.string().min(1),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  durationMin: z.number().int().optional(),
  googleDriveUrl: z.string().min(1),
});

const Post = z.object({
  title: z.string().min(1),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  category: z.string().optional(),
  presenter: z.string().optional(),
  durationMin: z.number().int().optional(),
  videoUrl: z.string().optional(),
  googleDriveFolderUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  recordedDate: z.string().optional(),
  isPublished: z.boolean().default(false),
  membersOnly: z.boolean().default(false),
  sessions: z.array(SessionPost).default([]),
});

function canManageWorkshops(s: { position: string; departmentSlug: string | null }) {
  if (s.position === "president" || s.position === "vice_president") return true;
  return (
    (s.position === "dept_leader" || s.position === "dept_vice_leader") &&
    s.departmentSlug === "development"
  );
}

export const POST = handle(async (req) => {
  const s = await requireSession();
  if (!canManageWorkshops(s)) return err(403, "Only development leaders can create workshops");
  const b = await parseBody(req, Post);

  if (isMockMode()) {
    const workshopId = nextMockId("workshop");
    const sessionBase = Date.now();
    getMockStore().workshops.unshift({
      workshopId,
      title: b.title,
      titleAr: b.titleAr ?? null,
      description: b.description ?? null,
      descriptionAr: b.descriptionAr ?? null,
      category: b.category ?? null,
      presenter: b.presenter ?? null,
      durationMin: b.durationMin ?? null,
      videoUrl: b.videoUrl ?? b.googleDriveFolderUrl ?? null,
      googleDriveFolderUrl: b.googleDriveFolderUrl ?? b.videoUrl ?? null,
      thumbnailUrl: b.thumbnailUrl ?? null,
      recordedDate: b.recordedDate ?? null,
      isPublished: b.isPublished,
      membersOnly: b.membersOnly,
      sessions: b.sessions.map((session, index) => ({
        sessionId: sessionBase + index,
        workshopId,
        title: session.title,
        titleAr: session.titleAr ?? null,
        description: session.description ?? null,
        durationMin: session.durationMin ?? null,
        googleDriveUrl: session.googleDriveUrl,
        orderIndex: index + 1,
      })),
    });
    return ok({ workshopId }, { status: 201 });
  }

  const workshopId = await withTx(async (client) => {
    const { rows } = await client.query<{ workshop_id: number }>(
      `INSERT INTO workshops (title, title_ar, description, description_ar, category, presenter,
         duration_min, video_url, google_drive_folder_url, thumbnail_url, recorded_date, is_published, members_only, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING workshop_id`,
      [
        b.title, b.titleAr ?? null, b.description ?? null, b.descriptionAr ?? null,
        b.category ?? null, b.presenter ?? null, b.durationMin ?? null,
        b.videoUrl ?? b.googleDriveFolderUrl ?? null, b.googleDriveFolderUrl ?? b.videoUrl ?? null,
        b.thumbnailUrl ?? null, b.recordedDate ?? null, b.isPublished, b.membersOnly, s.memberId,
      ],
    );
    const workshopId = rows[0].workshop_id;
    for (const [index, session] of b.sessions.entries()) {
      await client.query(
        `INSERT INTO workshop_sessions
           (workshop_id, title, title_ar, description, duration_min, google_drive_url, order_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          workshopId,
          session.title,
          session.titleAr ?? null,
          session.description ?? null,
          session.durationMin ?? null,
          session.googleDriveUrl,
          index + 1,
        ],
      );
    }
    return workshopId;
  });
  return ok({ workshopId }, { status: 201 });
});
