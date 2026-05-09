import { handle, ok } from "@/lib/api";
import { requireDeptLeaderOf } from "@/lib/auth";
import { query } from "@/lib/db";
import { getMockStore, isMockMode } from "@/lib/mock-store";

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
    `SELECT registration_id AS "registrationId",
            session_id AS "sessionId",
            full_name AS "fullName",
            email,
            preg.gender,
            university_id AS "universityId",
            phone,
            department,
            notes,
            registered_at AS "registeredAt"
       FROM madarat_session_registrations
       LEFT JOIN users ureg ON LOWER(ureg.email) = LOWER(madarat_session_registrations.email)
       LEFT JOIN profiles preg ON preg.member_id = ureg.member_id
      WHERE session_id = $1
      ORDER BY registered_at ASC`,
    [sessionId],
  );
  return ok(rows);
});
