import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { getMockStore, isMockMode } from "@/lib/mock-store";

/**
 * HR-style leaderboard — top recipients of MOTM/Leader-of-month.
 * Public-readable so the same data can power the public hero badge ("× N times").
 *
 * Query params:
 *   - limit (default 10)
 *   - role  (optional: "member" | "leader" — filter to one award type)
 */
export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 10)));
  const role = url.searchParams.get("role") as "member" | "leader" | null;

  if (isMockMode()) {
    const store = getMockStore();
    const counts = new Map<number, { member: number; leader: number; last: string }>();
    for (const h of store.motmHistory) {
      if (role && h.role !== role) continue;
      const cur = counts.get(h.memberId) || { member: 0, leader: 0, last: "" };
      if (h.role === "member") cur.member++;
      else cur.leader++;
      if (h.awardedAt > cur.last) cur.last = h.awardedAt;
      counts.set(h.memberId, cur);
    }
    const rows = [...counts.entries()].map(([memberId, c]) => {
      const m = store.members.find((x) => x.memberId === memberId);
      return {
        memberId,
        fullName: m?.fullName ?? "Unknown",
        fullNameAr: m?.fullNameAr ?? null,
        avatarUrl: m?.avatarUrl ?? null,
        departmentSlug: m?.departmentSlug ?? null,
        departmentName: m?.departmentName ?? null,
        memberCount: c.member,
        leaderCount: c.leader,
        totalCount: c.member + c.leader,
        lastAwardedAt: c.last,
      };
    });
    rows.sort((a, b) => b.totalCount - a.totalCount || b.lastAwardedAt.localeCompare(a.lastAwardedAt));
    return ok(rows.slice(0, limit));
  }

  const { rows } = await query(
    `SELECT member_id        AS "memberId",
            full_name        AS "fullName",
            full_name_ar     AS "fullNameAr",
            avatar_url       AS "avatarUrl",
            department_slug  AS "departmentSlug",
            department_name  AS "departmentName",
            motm_member_count AS "memberCount",
            motm_leader_count AS "leaderCount",
            motm_total_count  AS "totalCount",
            last_awarded_at   AS "lastAwardedAt"
       FROM motm_leaderboard
       ${role ? `WHERE ${role === "leader" ? "motm_leader_count" : "motm_member_count"} > 0` : ""}
      ORDER BY "totalCount" DESC, "lastAwardedAt" DESC
      LIMIT $1`,
    [limit],
  );
  return ok(rows);
});
