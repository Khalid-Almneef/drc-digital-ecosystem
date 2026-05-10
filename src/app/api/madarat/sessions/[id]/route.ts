import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { requireDeptLeaderOf } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { departmentById, findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";

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
  meetingUrl: z.string().max(2048).optional().or(z.literal("")),
  maxRegistrants: z.number().int().positive().nullable().optional(),
  registrationOpen: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  visibility: z.enum(["public", "club_only"]).optional(),
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
    meetingUrl: "meeting_url",
    maxRegistrants: "max_registrants",
    registrationOpen: "registration_open",
    isPublished: "is_published",
    visibility: "visibility",
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
    if (!target) return err(404, "Session not found");
    if (target.createdBy && departmentById(findMockMember(target.createdBy)?.departmentId ?? null)?.slug !== "madarat" && target.createdBy !== session.memberId) {
      return err(403, "Forbidden");
    }
    store.madaratSessions = store.madaratSessions.filter((item) => item.sessionId !== sessionId);
    store.madaratRegistrations = store.madaratRegistrations.filter((item) => item.sessionId !== sessionId);
    return ok({ success: true });
  }

  const allowed = await assertAllowed(sessionId, session.memberId);
  if (!allowed) return err(404, "Session not found");
  await query(`DELETE FROM madarat_sessions WHERE session_id = $1`, [sessionId]);
  return ok({ success: true });
});
