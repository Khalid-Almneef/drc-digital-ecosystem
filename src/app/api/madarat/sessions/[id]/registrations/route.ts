import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { getSession, requireDeptLeaderOf } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const GET = handle(async (_req, ctx) => {
  await requireDeptLeaderOf(["madarat"]);
  const { id } = await ctx.params;
  const sessionId = Number(id);

  if (isMockMode()) {
    return ok(
      getMockStore().madaratRegistrations
        .filter((registration) => registration.sessionId === sessionId)
        .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))
        .map((registration) => ({
          ...registration,
          gender: getMockStore().members.find((member) => member.email.toLowerCase() === registration.email.toLowerCase())?.gender ?? null,
        })),
    );
  }

  const { rows } = await query(
    `SELECT msr.registration_id AS "registrationId",
            msr.session_id AS "sessionId",
            msr.full_name AS "fullName",
            msr.email AS "email",
            preg.gender,
            msr.university_id AS "universityId",
            msr.phone,
            msr.department,
            msr.notes,
            msr.registered_at AS "registeredAt",
            msr.attended AS "attended"
       FROM madarat_session_registrations msr
       LEFT JOIN users ureg ON LOWER(ureg.email) = LOWER(msr.email)
       LEFT JOIN profiles preg ON preg.member_id = ureg.member_id
      WHERE msr.session_id = $1
      ORDER BY msr.registered_at ASC`,
    [sessionId],
  );
  return ok(rows);
});

const RegisterBody = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  universityId: z.string().trim().max(50).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const POST = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) return err(400, "Invalid session id");

  const body = await parseBody(req, RegisterBody);

  if (isMockMode()) {
    const store = getMockStore();
    const target = store.madaratSessions.find((s) => s.sessionId === sessionId);
    if (!target || !target.isPublished) return err(404, "Session not found");
    if (!target.registrationOpen) return err(400, "Registration is closed for this session.");
    const visibility = (target as { visibility?: string }).visibility ?? "public";
    const userSession = await getSession();
    if (visibility === "club_only" && !userSession) {
      return err(401, "Sign in with your club account to register for this session.");
    }
    const already = store.madaratRegistrations.find((r) => r.sessionId === sessionId && r.email.toLowerCase() === body.email.toLowerCase());
    if (already) return err(409, "You are already registered for this session.");
    const count = store.madaratRegistrations.filter((r) => r.sessionId === sessionId).length;
    if (target.maxRegistrants != null && count >= target.maxRegistrants) return err(409, "This session is full.");
    store.madaratRegistrations.push({
      registrationId: nextMockId("madaratRegistration"),
      sessionId,
      fullName: body.fullName,
      email: body.email,
      universityId: body.universityId || null,
      phone: body.phone || null,
      department: body.department || null,
      notes: body.notes || null,
      registeredAt: new Date().toISOString(),
      attended: false,
    });
    return ok({ success: true }, { status: 201 });
  }

  const sessionRow = await queryOne<{ isPublished: boolean; registrationOpen: boolean; visibility: string; maxRegistrants: number | null }>(
    `SELECT is_published AS "isPublished", registration_open AS "registrationOpen",
            visibility, max_registrants AS "maxRegistrants"
       FROM madarat_sessions WHERE session_id = $1`,
    [sessionId],
  );
  if (!sessionRow || !sessionRow.isPublished) return err(404, "Session not found");
  if (!sessionRow.registrationOpen) return err(400, "Registration is closed for this session.");

  if (sessionRow.visibility === "club_only") {
    const userSession = await getSession();
    if (!userSession) return err(401, "Sign in with your club account to register for this session.");
  }

  const ip = clientIp(req);
  if (!rateLimit(`madarat:register:ip:${ip}`, 10, 60 * 60 * 1000).allowed) {
    return err(429, "Too many registrations from this network. Please try again later.");
  }
  if (!rateLimit(`madarat:register:email:${body.email.toLowerCase()}`, 5, 60 * 60 * 1000).allowed) {
    return err(429, "Too many registration attempts for this email. Please try again later.");
  }

  if (sessionRow.maxRegistrants != null) {
    const countRow = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM madarat_session_registrations WHERE session_id = $1`,
      [sessionId],
    );
    if ((countRow?.count ?? 0) >= sessionRow.maxRegistrants) {
      return err(409, "This session is full.");
    }
  }

  const duplicate = await queryOne<{ registrationId: number }>(
    `SELECT registration_id AS "registrationId"
       FROM madarat_session_registrations
      WHERE session_id = $1 AND LOWER(email) = LOWER($2)
      LIMIT 1`,
    [sessionId, body.email],
  );
  if (duplicate) return err(409, "You are already registered for this session.");

  await query(
    `INSERT INTO madarat_session_registrations
       (session_id, full_name, email, university_id, phone, department, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      sessionId,
      body.fullName,
      body.email,
      body.universityId || null,
      body.phone || null,
      body.department || null,
      body.notes || null,
    ],
  );

  return ok({ success: true }, { status: 201 });
});
