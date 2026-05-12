import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  if (isMockMode()) {
    const event = getMockStore().events.find((item) => item.eventId === Number(id));
    if (!event) return err(404, "Not found");
    return ok(event);
  }
  const ev = await queryOne(`SELECT * FROM events WHERE event_id = $1`, [id]);
  if (!ev) return err(404, "Not found");
  return ok(ev);
});

const Patch = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  type: z.enum(["workshop", "competition", "meetup", "general"]).optional(),
  category: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  seatsAvailable: z.number().int().optional(),
  maxTeamSize: z.number().int().optional(),
  requirements: z.string().optional(),
  isPublished: z.boolean().optional(),
  creditHours: z.number().nonnegative().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, Patch);

  const isAdmin = session.position === "president" || session.position === "vice_president";
  const isMediaLead =
    (session.position === "dept_leader" || session.position === "dept_vice_leader") &&
    session.departmentSlug === "media";
  const isAnyDeptLead = session.position === "dept_leader" || session.position === "dept_vice_leader";

  // Publishing remains gated to media leadership + admins — media owns the
  // public-events surface and the editorial standard for what goes live.
  if (b.isPublished === true && !isAdmin && !isMediaLead) {
    return err(403, "Only the media team can publish events.");
  }

  // Editing (excluding publishing) is open to admins, media, or any
  // department's leadership so each committee can fix up events they own
  // (Innovation projects/events, Madarat sessions, PR partner events …).
  // Plain members still can't edit events they don't own.
  if (!isAdmin && !isMediaLead && !isAnyDeptLead) {
    // Fall back to creator ownership — useful for sub-leaders who created
    // the event themselves.
    if (!isMockMode()) {
      const owner = await queryOne<{ createdBy: number | null }>(
        `SELECT created_by AS "createdBy" FROM events WHERE event_id = $1`,
        [id],
      );
      if (!owner) return err(404, "Not found");
      if (owner.createdBy !== session.memberId) return err(403, "Forbidden");
    } else {
      // Mock store doesn't track created_by on events; deny non-leaders.
      return err(403, "Forbidden");
    }
  }

  if (isMockMode()) {
    const store = getMockStore();
    const event = store.events.find((item) => item.eventId === Number(id));
    if (!event) return err(404, "Not found");
    if (b.title !== undefined) event.title = b.title;
    if (b.description !== undefined) event.description = b.description ?? null;
    if (b.imageUrl !== undefined) event.imageUrl = b.imageUrl ?? null;
    if (b.type !== undefined) event.type = b.type;
    if (b.category !== undefined) event.category = b.category ?? null;
    if (b.startTime !== undefined) event.startTime = b.startTime;
    if (b.endTime !== undefined) event.endTime = b.endTime ?? null;
    if (b.location !== undefined) event.location = b.location ?? null;
    if (b.seatsAvailable !== undefined) event.seatsAvailable = b.seatsAvailable ?? null;
    if (b.requirements !== undefined) void b.requirements;
    if (b.isPublished !== undefined) event.isPublished = b.isPublished;
    if (b.creditHours !== undefined) event.creditHours = b.creditHours;
    return ok({ success: true });
  }
  const map: Record<string, string> = {
    title: "title", description: "description", imageUrl: "image_url", category: "category",
    startTime: "start_time", endTime: "end_time", location: "location",
    seatsAvailable: "seats_available", maxTeamSize: "max_team_size",
    requirements: "requirements", isPublished: "is_published", creditHours: "credit_hours",
  };
  const sets: string[] = [];
  const params: unknown[] = [id];
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    if (k === "type") { params.push(v); sets.push(`type = $${params.length}::event_type`); }
    else if (map[k]) { params.push(v); sets.push(`${map[k]} = $${params.length}`); }
  }
  if (!sets.length) return ok({ success: true });
  await query(`UPDATE events SET ${sets.join(", ")} WHERE event_id = $1`, params);
  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  // CRITICAL: auth check must run BEFORE the mock-mode branch so a misconfigured
  // mock-mode deploy can never serve an unauthenticated delete. Event deletion
  // is restricted to club admins and media leadership (same gate as publishing).
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isMediaLead =
    (s.position === "dept_leader" || s.position === "dept_vice_leader") &&
    s.departmentSlug === "media";
  if (!isAdmin && !isMediaLead) {
    return err(403, "Only the media team can delete events.");
  }
  const { id } = await ctx.params;
  if (isMockMode()) {
    const store = getMockStore();
    const eventId = Number(id);
    store.events = store.events.filter((item) => item.eventId !== eventId);
    store.volunteerHours = store.volunteerHours.filter((hour) => !(hour.sourceType === "event_credit" && hour.sourceId === eventId));
    return ok({ success: true });
  }
  await query(`DELETE FROM events WHERE event_id = $1`, [id]);
  return ok({ success: true });
});
