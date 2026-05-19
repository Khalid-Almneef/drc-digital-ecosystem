import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { requireDeptLeaderOf } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { departmentById, findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";

// URL fields accept either a valid URL or an empty string. Empty becomes NULL
// in the SET loop below (params.push(value === "" ? null : value)), which lets
// users clear a previously-set URL via the form.
const urlOrEmpty = z.union([z.string().url().max(2048), z.literal("")]).optional();

const Body = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  intervieweeName: z.string().min(1).optional(),
  interviewerName: z.string().min(1).optional(),
  intervieweeRole: z.string().optional(),
  programType: z.enum(["madarat", "madariya_males", "madariya_females"]).optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMin: z.number().int().positive().nullable().optional(),
  location: z.string().optional(),
  locationUrl: urlOrEmpty,
  meetingUrl: urlOrEmpty,
  maxRegistrants: z.number().int().positive().nullable().optional(),
  registrationOpen: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  visibility: z.enum(["public", "club_only"]).optional(),
  imageUrl: urlOrEmpty,
  attendanceCount: z.number().int().min(0).nullable().optional(),
}).refine((value) => Object.values(value).some((entry) => entry !== undefined), {
  message: "At least one field is required.",
});

async function assertAllowed(sessionId: number, memberId: number) {
  const row = await queryOne<{ departmentSlug: string | null; createdBy: number | null }>(
    `SELECT d.slug::text AS "departmentSlug", ms.created_by AS "createdBy"
       FROM madarat_sessions ms
       LEFT JOIN users u ON u.member_id = ms.created_by
       LEFT JOIN departments d ON d.department_id = u.department_id
      WHERE ms.session_id = $1`,
    [sessionId],
  );
  if (!row) return false;
  return row.departmentSlug === "madarat" || row.createdBy === memberId;
}

export const PATCH = handle(async (req, ctx) => {
  const session = await requireDeptLeaderOf(["madarat"]);
  const { id } = await ctx.params;
  const sessionId = Number(id);
  const body = await parseBody(req, Body);

  if (isMockMode()) {
    const target = getMockStore().madaratSessions.find((item) => item.sessionId === sessionId);
    if (!target) return err(404, "Session not found");
    if (target.createdBy && departmentById(findMockMember(target.createdBy)?.departmentId ?? null)?.slug !== "madarat" && target.createdBy !== session.memberId) {
      return err(403, "Forbidden");
    }
    if (body.title !== undefined) target.title = body.title;
    if (body.description !== undefined) target.description = body.description ?? null;
    if (body.intervieweeName !== undefined) target.intervieweeName = body.intervieweeName;
    if (body.interviewerName !== undefined) target.interviewerName = body.interviewerName ?? null;
    if (body.intervieweeRole !== undefined) target.intervieweeRole = body.intervieweeRole ?? null;
    if (body.programType !== undefined) target.programType = body.programType;
    if (body.scheduledAt !== undefined) target.scheduledAt = body.scheduledAt;
    if (body.durationMin !== undefined) target.durationMin = body.durationMin ?? null;
    if (body.location !== undefined) target.location = body.location ?? null;
    if (body.locationUrl !== undefined) target.locationUrl = body.locationUrl || null;
    if (body.meetingUrl !== undefined) target.meetingUrl = body.meetingUrl || null;
    if (body.maxRegistrants !== undefined) target.maxRegistrants = body.maxRegistrants ?? null;
    if (body.registrationOpen !== undefined) target.registrationOpen = body.registrationOpen;
    if (body.isPublished !== undefined) target.isPublished = body.isPublished;
    return ok({ success: true });
  }

  const allowed = await assertAllowed(sessionId, session.memberId);
  if (!allowed) return err(404, "Session not found");

  const map: Record<string, string> = {
    title: "title",
    description: "description",
    intervieweeName: "interviewee_name",
    interviewerName: "interviewer_name",
    intervieweeRole: "interviewee_role",
    programType: "program_type",
    scheduledAt: "scheduled_at",
    durationMin: "duration_min",
    location: "location",
    locationUrl: "location_url",
    meetingUrl: "meeting_url",
    maxRegistrants: "max_registrants",
    registrationOpen: "registration_open",
    isPublished: "is_published",
    visibility: "visibility",
    imageUrl: "image_url",
    attendanceCount: "attendance_count",
  };
  const sets: string[] = [];
  const params: unknown[] = [sessionId];
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || !map[key]) continue;
    params.push(value === "" ? null : value);
    sets.push(`${map[key]} = $${params.length}`);
  }
  await query(`UPDATE madarat_sessions SET ${sets.join(", ")}, updated_at = NOW() WHERE session_id = $1`, params);
  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  const session = await requireDeptLeaderOf(["madarat"]);
  const { id } = await ctx.params;
  const sessionId = Number(id);

  if (isMockMode()) {
    const store = getMockStore();
    const target = store.madaratSessions.find((item) => item.sessionId === sessionId);
    if (!target || target.isDeleted) return err(404, "Session not found");
    if (target.createdBy && departmentById(findMockMember(target.createdBy)?.departmentId ?? null)?.slug !== "madarat" && target.createdBy !== session.memberId) {
      return err(403, "Forbidden");
    }
    target.isDeleted = true;
    return ok({ success: true });
  }

  const allowed = await assertAllowed(sessionId, session.memberId);
  if (!allowed) return err(404, "Session not found");
  await query(
    `UPDATE madarat_sessions
        SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2
      WHERE session_id = $1 AND is_deleted = FALSE`,
    [sessionId, session.memberId],
  );
  return ok({ success: true });
});
