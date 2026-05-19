import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode, siteContentValue, upsertSiteContent } from "@/lib/mock-store";

/**
 * Public: returns this month's featured members.
 *
 * Order of resolution:
 * 1. motm_history rows whose (year, month) match the current calendar month —
 *    this is what makes scheduled picks "auto-promote" on the 1st.
 * 2. Fallback to the legacy site_content blob so months that pre-date the
 *    scheduling feature still render.
 */
export const GET = handle(async () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  if (isMockMode()) {
    const store = getMockStore();
    let ids: number[] = store.motmHistory
      .filter((h) => h.year === year && h.month === month)
      .map((h) => h.memberId);
    if (ids.length === 0) {
      ids = Array.isArray(siteContentValue("members_of_month")?.json)
        ? (siteContentValue("members_of_month")?.json as number[])
        : [];
    }
    const rows = store.members
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
  const scheduled = await query<{ memberId: number }>(
    `SELECT member_id AS "memberId" FROM motm_history WHERE year = $1 AND month = $2`,
    [year, month],
  );
  let ids: number[] = scheduled.rows.map((r) => r.memberId);
  if (ids.length === 0) {
    const sc = await queryOne(
      `SELECT value_json FROM site_content WHERE content_key = 'members_of_month'`,
      [],
    );
    ids = Array.isArray(sc?.value_json) ? (sc.value_json as number[]) : [];
  }
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

// year/month optional. When provided, the PATCH writes to motm_history for
// that target month (future or past) and only mirrors to site_content if it
// matches the current calendar month — so scheduling future MOTM picks
// doesn't immediately swap out who's shown on the dashboard.
const Body = z.object({
  memberIds: z.array(z.number()),
  year: z.number().int().min(2024).max(2099).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

/** HR leaders and admins (president / vice-president) can set members of the month. */
export const PATCH = handle(async (req) => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isHR    = (s.position === "dept_leader" || s.position === "dept_vice_leader")
                  && s.departmentSlug === "hr";

  const body = await parseBody(req, Body);
  const memberIds = body.memberIds;

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
  // Target year/month: caller-supplied (for scheduling future or backfilling
  // past) or default to the current calendar month. site_content
  // members_of_month stays in sync only when the target is the *current*
  // month — otherwise a future schedule would prematurely change who shows
  // on the dashboard.
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const year = body.year ?? currentYear;
  const month = body.month ?? currentMonth;
  const isCurrentMonth = year === currentYear && month === currentMonth;

  if (isMockMode()) {
    if (isCurrentMonth) upsertSiteContent("members_of_month", { json: memberIds });
    const store = getMockStore();
    // Replace-set semantics: drop existing rows for this (year, month) so HR
    // can re-nominate without leaving stale entries.
    store.motmHistory = store.motmHistory.filter(
      (h) => !(h.year === year && h.month === month),
    );
    for (const id of memberIds) {
      const member = store.members.find((m) => m.memberId === id);
      const role: "member" | "leader" =
        member && ["president", "vice_president", "dept_leader", "dept_vice_leader", "sub_leader"].includes(member.position)
          ? "leader"
          : "member";
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
    return ok({ success: true });
  }
  if (isCurrentMonth) {
    await query(
      `INSERT INTO site_content (content_key, value_json, updated_by)
       VALUES ('members_of_month', $1::jsonb, $2)
       ON CONFLICT (content_key)
       DO UPDATE SET value_json = $1::jsonb, updated_by = $2, updated_at = NOW()`,
      [JSON.stringify(memberIds), s.memberId],
    );
  }
  // Replace-set for the target month so HR can re-nominate.
  await query(
    `DELETE FROM motm_history WHERE year = $1 AND month = $2`,
    [year, month],
  );
  if (memberIds.length > 0) {
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
  }
  return ok({ success: true });
});
