import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { requireDeptLeaderOf } from "@/lib/auth";
import { query } from "@/lib/db";
import { findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

// URL fields accept either a valid URL or an empty string (which the route
// normalizes to NULL). max(2048) caps absurd paste-bombs before .url() runs.
const urlOrEmpty = z.union([z.string().url().max(2048), z.literal("")]).optional();

const Body = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  // Past-session imports are allowed to have missing identity fields — title +
  // programType is the minimum a leader needs to record that a session happened.
  intervieweeName: z.string().optional(),
  interviewerName: z.string().optional(),
  intervieweeRole: z.string().optional(),
  programType: z.enum(["madarat", "madariya_males", "madariya_females"]).default("madarat"),
  scheduledAt: z.string().datetime().optional(),
  durationMin: z.number().int().positive().optional(),
  location: z.string().optional(),
  locationUrl: urlOrEmpty,
  meetingUrl: urlOrEmpty,
  maxRegistrants: z.number().int().positive().optional(),
  registrationOpen: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  visibility: z.enum(["public", "club_only"]).default("public"),
  imageUrl: urlOrEmpty,
  attendanceCount: z.number().int().min(0).nullable().optional(),
});

export const GET = handle(async () => {
  await requireDeptLeaderOf(["madarat"]);

  if (isMockMode()) {
    const store = getMockStore();
    return ok(
      store.madaratSessions
        .filter((session) => !session.isDeleted)
        .slice()
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
        .map((session) => ({
          ...session,
          registrationCount: store.madaratRegistrations.filter((registration) => registration.sessionId === session.sessionId).length,
          maleCount: store.madaratRegistrations.filter((registration) => registration.sessionId === session.sessionId && findMockMemberByEmail(registration.email)?.gender === "male").length,
          femaleCount: store.madaratRegistrations.filter((registration) => registration.sessionId === session.sessionId && findMockMemberByEmail(registration.email)?.gender === "female").length,
          unspecifiedCount: store.madaratRegistrations.filter((registration) => {
            if (registration.sessionId !== session.sessionId) return false;
            const gender = findMockMemberByEmail(registration.email)?.gender;
            return !gender || (gender !== "male" && gender !== "female");
          }).length,
          createdByName: session.createdBy ? findMockMember(session.createdBy)?.fullName ?? null : null,
        })),
    );
  }

  const { rows } = await query(
    `SELECT ms.session_id AS "sessionId",
            ms.title,
            ms.description,
            ms.interviewee_name AS "intervieweeName",
            ms.interviewer_name AS "interviewerName",
            ms.interviewee_role AS "intervieweeRole",
            ms.program_type AS "programType",
            ms.scheduled_at AS "scheduledAt",
            ms.duration_min AS "durationMin",
            ms.location,
            ms.location_url AS "locationUrl",
            ms.meeting_url AS "meetingUrl",
            ms.max_registrants AS "maxRegistrants",
            ms.image_url AS "imageUrl",
            ms.attendance_count AS "attendanceCount",
            ms.registration_open AS "registrationOpen",
            ms.is_published AS "isPublished",
            ms.visibility,
            ms.created_by AS "createdBy",
            ms.created_at AS "createdAt",
            p.full_name AS "createdByName",
            COUNT(r.registration_id)::int AS "registrationCount",
            COUNT(r.registration_id) FILTER (WHERE preg.gender = 'male')::int AS "maleCount",
            COUNT(r.registration_id) FILTER (WHERE preg.gender = 'female')::int AS "femaleCount",
            COUNT(r.registration_id) FILTER (WHERE r.registration_id IS NOT NULL AND (preg.gender IS NULL OR preg.gender NOT IN ('male', 'female')))::int AS "unspecifiedCount"
       FROM madarat_sessions ms
       LEFT JOIN profiles p ON p.member_id = ms.created_by
       LEFT JOIN madarat_session_registrations r ON r.session_id = ms.session_id
       LEFT JOIN users ureg ON LOWER(ureg.email) = LOWER(r.email)
       LEFT JOIN profiles preg ON preg.member_id = ureg.member_id
      WHERE ms.is_deleted = FALSE
      GROUP BY ms.session_id, p.full_name
      ORDER BY ms.scheduled_at ASC`,
  );
  return ok(rows);
});

export const POST = handle(async (req) => {
  const session = await requireDeptLeaderOf(["madarat"]);
  const body = await parseBody(req, Body);

  if (isMockMode()) {
    const sessionId = nextMockId("madaratSession");
    getMockStore().madaratSessions.push({
      sessionId,
      title: body.title,
      description: body.description ?? null,
      intervieweeName: body.intervieweeName ?? "",
      interviewerName: body.interviewerName ?? null,
      intervieweeRole: body.intervieweeRole ?? null,
      programType: body.programType,
      scheduledAt: body.scheduledAt ?? new Date().toISOString(),
      durationMin: body.durationMin ?? null,
      location: body.location ?? null,
      locationUrl: body.locationUrl || null,
      meetingUrl: body.meetingUrl || null,
      maxRegistrants: body.maxRegistrants ?? null,
      registrationOpen: body.registrationOpen,
      isPublished: body.isPublished,
      createdBy: session.memberId,
      createdAt: new Date().toISOString(),
    });
    return ok({ sessionId }, { status: 201 });
  }

  const { rows } = await query<{ session_id: number }>(
    `INSERT INTO madarat_sessions
       (title, description, interviewee_name, interviewer_name, interviewee_role, program_type, scheduled_at,
        duration_min, location, location_url, meeting_url, max_registrants, registration_open, is_published, visibility,
        image_url, attendance_count, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING session_id`,
    [
      body.title,
      body.description ?? null,
      body.intervieweeName ?? null,
      body.interviewerName ?? null,
      body.intervieweeRole ?? null,
      body.programType,
      body.scheduledAt ?? new Date().toISOString(),
      body.durationMin ?? null,
      body.location ?? null,
      body.locationUrl || null,
      body.meetingUrl || null,
      body.maxRegistrants ?? null,
      body.registrationOpen,
      body.isPublished,
      body.visibility,
      body.imageUrl || null,
      body.attendanceCount ?? null,
      session.memberId,
    ],
  );
  return ok({ sessionId: rows[0].session_id }, { status: 201 });
});

function findMockMemberByEmail(email: string) {
  return getMockStore().members.find((member) => member.email.toLowerCase() === email.toLowerCase()) ?? null;
}
