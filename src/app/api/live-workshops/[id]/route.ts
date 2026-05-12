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

// GET /api/live-workshops/[id] — full detail including meeting_url (dev leaders)
export const GET = handle(async (_req, ctx) => {
  const s = await requireSession();
  if (!canManage(s)) return err(403, "Forbidden");
  const { id } = await ctx.params;
  if (isMockMode()) {
    const store = getMockStore();
    const workshop = store.liveWorkshops.find((w) => w.liveWorkshopId === Number(id));
    if (!workshop) return err(404, "Live workshop not found");
    return ok({
      ...workshop,
      registrationCount: store.liveWorkshopRegistrations.filter((r) => r.liveWorkshopId === workshop.liveWorkshopId).length,
    });
  }

  const { rows } = await query(`
    SELECT
      lw.*,
      COUNT(r.registration_id)::int AS "registrationCount"
    FROM live_workshops lw
    LEFT JOIN live_workshop_registrations r ON r.live_workshop_id = lw.live_workshop_id
    WHERE lw.live_workshop_id = $1
    GROUP BY lw.live_workshop_id
  `, [id]);

  if (!rows[0]) return err(404, "Live workshop not found");
  return ok(rows[0]);
});

const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  presenter: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMin: z.number().int().positive().optional(),
  location: z.string().optional(),
  meetingUrl: z.string().max(2048).optional().or(z.literal("")),
  maxRegistrants: z.number().int().positive().nullable().optional(),
  registrationOpen: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

const COL: Record<string, string> = {
  title: "title", titleAr: "title_ar", description: "description",
  descriptionAr: "description_ar", presenter: "presenter",
  scheduledAt: "scheduled_at", durationMin: "duration_min",
  location: "location", meetingUrl: "meeting_url",
  maxRegistrants: "max_registrants",
  registrationOpen: "registration_open", isPublished: "is_published",
};

// PATCH /api/live-workshops/[id] — update fields (dev leaders)
export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  if (!canManage(s)) return err(403, "Forbidden");
  const { id } = await ctx.params;
  const b = await parseBody(req, PatchSchema);
  if (isMockMode()) {
    const workshop = getMockStore().liveWorkshops.find((w) => w.liveWorkshopId === Number(id));
    if (!workshop) return err(404, "Live workshop not found");
    if (b.title !== undefined) workshop.title = b.title;
    if (b.titleAr !== undefined) workshop.titleAr = b.titleAr || null;
    if (b.description !== undefined) workshop.description = b.description || null;
    if (b.descriptionAr !== undefined) workshop.descriptionAr = b.descriptionAr || null;
    if (b.presenter !== undefined) workshop.presenter = b.presenter || null;
    if (b.scheduledAt !== undefined) workshop.scheduledAt = b.scheduledAt;
    if (b.durationMin !== undefined) workshop.durationMin = b.durationMin ?? null;
    if (b.location !== undefined) workshop.location = b.location || null;
    if (b.meetingUrl !== undefined) workshop.meetingUrl = b.meetingUrl || null;
    if (b.maxRegistrants !== undefined) workshop.maxRegistrants = b.maxRegistrants ?? null;
    if (b.registrationOpen !== undefined) workshop.registrationOpen = b.registrationOpen;
    if (b.isPublished !== undefined) workshop.isPublished = b.isPublished;
    return ok({ success: true });
  }

  const sets: string[] = [];
  const params: unknown[] = [id];
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined || !COL[k]) continue;
    params.push(v === "" ? null : v);
    sets.push(`${COL[k]} = $${params.length}`);
  }
  if (!sets.length) return ok({ success: true });

  await query(
    `UPDATE live_workshops SET ${sets.join(", ")} WHERE live_workshop_id = $1`,
    params,
  );
  return ok({ success: true });
});

// DELETE /api/live-workshops/[id] — dev leaders
export const DELETE = handle(async (_req, ctx) => {
  const s = await requireSession();
  if (!canManage(s)) return err(403, "Forbidden");
  const { id } = await ctx.params;
  if (isMockMode()) {
    const store = getMockStore();
    store.liveWorkshops = store.liveWorkshops.filter((w) => w.liveWorkshopId !== Number(id));
    store.liveWorkshopRegistrations = store.liveWorkshopRegistrations.filter((r) => r.liveWorkshopId !== Number(id));
    return ok({ success: true });
  }
  await query(`DELETE FROM live_workshops WHERE live_workshop_id = $1`, [id]);
  return ok({ success: true });
});
