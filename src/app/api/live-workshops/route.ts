import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

function canManage(s: { position: string; departmentSlug: string | null }) {
  if (s.position === "president" || s.position === "vice_president") return true;
  return (
    (s.position === "dept_leader" || s.position === "dept_vice_leader") &&
    s.departmentSlug === "development"
  );
}

// GET /api/live-workshops — dev leaders: all workshops with registration counts
export const GET = handle(async () => {
  const s = await requireSession();
  if (!canManage(s)) return err(403, "Only development leaders can view all live workshops");
  if (isMockMode()) {
    const store = getMockStore();
    const rows = store.liveWorkshops.map((w) => ({
      liveWorkshopId: w.liveWorkshopId,
      title: w.title,
      titleAr: w.titleAr,
      description: w.description,
      presenter: w.presenter,
      scheduledAt: w.scheduledAt,
      durationMin: w.durationMin,
      location: w.location,
      meetingUrl: w.meetingUrl,
      maxRegistrants: w.maxRegistrants,
      registrationOpen: w.registrationOpen,
      isPublished: w.isPublished,
      createdAt: w.createdAt,
      registrationCount: store.liveWorkshopRegistrations.filter((r) => r.liveWorkshopId === w.liveWorkshopId).length,
    }));
    return ok(rows);
  }

  const { rows } = await query(`
    SELECT
      lw.live_workshop_id   AS "liveWorkshopId",
      lw.title,
      lw.title_ar           AS "titleAr",
      lw.description,
      lw.presenter,
      lw.scheduled_at       AS "scheduledAt",
      lw.duration_min       AS "durationMin",
      lw.location,
      lw.meeting_url        AS "meetingUrl",
      lw.max_registrants    AS "maxRegistrants",
      lw.registration_open  AS "registrationOpen",
      lw.is_published       AS "isPublished",
      lw.created_at         AS "createdAt",
      COUNT(r.registration_id)::int AS "registrationCount"
    FROM live_workshops lw
    LEFT JOIN live_workshop_registrations r ON r.live_workshop_id = lw.live_workshop_id
    GROUP BY lw.live_workshop_id
    ORDER BY lw.scheduled_at ASC
  `);
  return ok(rows);
});

const PostSchema = z.object({
  title: z.string().min(1),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  presenter: z.string().optional(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().positive().optional(),
  location: z.string().optional(),
  meetingUrl: z.string().max(2048).optional().or(z.literal("")),
  maxRegistrants: z.number().int().positive().optional(),
  registrationOpen: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

// POST /api/live-workshops — create (dev leaders)
export const POST = handle(async (req) => {
  const s = await requireSession();
  if (!canManage(s)) return err(403, "Only development leaders can create live workshops");

  const b = await parseBody(req, PostSchema);
  if (isMockMode()) {
    const store = getMockStore();
    const liveWorkshopId = Math.max(0, ...store.liveWorkshops.map((w) => w.liveWorkshopId)) + 1;
    store.liveWorkshops.push({
      liveWorkshopId,
      title: b.title,
      titleAr: b.titleAr ?? null,
      description: b.description ?? null,
      descriptionAr: b.descriptionAr ?? null,
      presenter: b.presenter ?? null,
      scheduledAt: b.scheduledAt,
      durationMin: b.durationMin ?? null,
      location: b.location ?? null,
      meetingUrl: b.meetingUrl || null,
      maxRegistrants: b.maxRegistrants ?? null,
      registrationOpen: b.registrationOpen,
      isPublished: b.isPublished,
      createdAt: new Date().toISOString(),
    });
    return ok({ liveWorkshopId }, { status: 201 });
  }
  const { rows } = await query<{ live_workshop_id: number }>(
    `INSERT INTO live_workshops
       (title, title_ar, description, description_ar, presenter, scheduled_at,
        duration_min, location, meeting_url, max_registrants, registration_open, is_published, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING live_workshop_id`,
    [
      b.title, b.titleAr ?? null, b.description ?? null, b.descriptionAr ?? null,
      b.presenter ?? null, b.scheduledAt,
      b.durationMin ?? null, b.location ?? null, b.meetingUrl || null,
      b.maxRegistrants ?? null, b.registrationOpen, b.isPublished, s.memberId,
    ],
  );
  return ok({ liveWorkshopId: rows[0].live_workshop_id }, { status: 201 });
});
