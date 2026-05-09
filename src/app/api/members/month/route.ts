import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode, siteContentValue, upsertSiteContent } from "@/lib/mock-store";

/** Public: returns this month's featured members set via HR/Admin dashboard. */
export const GET = handle(async () => {
  if (isMockMode()) {
    const ids = Array.isArray(siteContentValue("members_of_month")?.json)
      ? (siteContentValue("members_of_month")?.json as number[])
      : [];
    const rows = getMockStore().members
      .filter((m) => ids.includes(m.memberId))
      .map((m) => ({
        memberId: m.memberId,
        fullName: m.fullName,
        fullNameAr: m.fullNameAr,
        avatarUrl: m.avatarUrl,
        departmentSlug: m.departmentSlug,
        departmentName: m.departmentName,
        departmentNameAr: m.departmentNameAr,
      }));
    return ok(rows);
  }
  const sc = await queryOne(
    `SELECT value_json FROM site_content WHERE content_key = 'members_of_month'`,
    [],
  );
  const ids: number[] = Array.isArray(sc?.value_json) ? (sc.value_json as number[]) : [];
  if (!ids.length) return ok([]);

  const { rows } = await query(
    `SELECT u.member_id AS "memberId",
            p.full_name AS "fullName", p.full_name_ar AS "fullNameAr",
            p.avatar_url AS "avatarUrl",
            d.slug::text AS "departmentSlug", d.name AS "departmentName", d.name_ar AS "departmentNameAr"
       FROM users u
       JOIN profiles p ON p.member_id = u.member_id
       LEFT JOIN departments d ON d.department_id = u.department_id
      WHERE u.member_id = ANY($1::int[])
        AND u.is_active = TRUE
      ORDER BY p.full_name`,
    [ids],
  );
  return ok(rows);
});

const Body = z.object({ memberIds: z.array(z.number()) });

/** HR leaders and admins (president / vice-president) can set members of the month. */
export const PATCH = handle(async (req) => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isHR    = (s.position === "dept_leader" || s.position === "dept_vice_leader")
                  && s.departmentSlug === "hr";

  const { memberIds } = await parseBody(req, Body);

  // Non-HR-leaders queue MOTM nominations as a change_request to HR leadership.
  if (!isAdmin && !isHR) {
    const { resolveDepartmentId, submitChangeRequest } = await import("@/lib/change-requests");
    const hrDeptId = await resolveDepartmentId("hr");
    if (!hrDeptId) return err(500, "HR department not configured");
    const requestId = await submitChangeRequest({
      type: "set_motm",
      departmentId: hrDeptId,
      requesterId: s.memberId,
      payload: { memberIds },
      summary: `Set Members of the Month (${memberIds.length} ${memberIds.length === 1 ? "member" : "members"})`,
    });
    return ok({ requestId, requiresApproval: true }, { status: 202 });
  }
  // Determine year/month for history rows. We use the current month so that
  // running this on April 1st correctly logs an "April" award.
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1..12

  if (isMockMode()) {
    upsertSiteContent("members_of_month", { json: memberIds });
    const store = getMockStore();
    for (const id of memberIds) {
      const member = store.members.find((m) => m.memberId === id);
      const role: "member" | "leader" =
        member && ["president", "vice_president", "dept_leader", "dept_vice_leader", "sub_leader"].includes(member.position)
          ? "leader"
          : "member";
      const exists = store.motmHistory.some(
        (h) => h.memberId === id && h.year === year && h.month === month && h.role === role,
      );
      if (!exists) {
        store.counters.motmHistory += 1;
        store.motmHistory.push({
          historyId: store.counters.motmHistory + 1000,
          memberId: id,
          year,
          month,
          role,
          awardedAt: now.toISOString(),
          awardedBy: s.memberId,
          note: null,
        });
      }
    }
    return ok({ success: true });
  }
  await query(
    `INSERT INTO site_content (content_key, value_json, updated_by)
     VALUES ('members_of_month', $1::jsonb, $2)
     ON CONFLICT (content_key)
     DO UPDATE SET value_json = $1::jsonb, updated_by = $2, updated_at = NOW()`,
    [JSON.stringify(memberIds), s.memberId],
  );
  // Log to motm_history. Role is derived from each member's position.
  await query(
    `INSERT INTO motm_history (member_id, year, month, role, awarded_by)
     SELECT u.member_id, $2::int, $3::int,
            CASE WHEN u.position IN ('president','vice_president','dept_leader','dept_vice_leader','sub_leader')
                 THEN 'leader' ELSE 'member' END,
            $4
       FROM users u
      WHERE u.member_id = ANY($1::int[])
     ON CONFLICT (member_id, year, month, role) DO NOTHING`,
    [memberIds, year, month, s.memberId],
  );
  return ok({ success: true });
});
