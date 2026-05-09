import { handle, ok, err } from "@/lib/api";
import { query } from "@/lib/db";
import { getMockStore, isMockMode } from "@/lib/mock-store";

/**
 * Public — MOTM history + counts for a single member.
 * Returns: { memberCount, leaderCount, totalCount, lastAwardedAt, history: [{year,month,role,awardedAt}] }
 */
export const GET = handle(async (_req, ctx) => {
  const params = await ctx.params;
  const id = Number((params as { id: string }).id);
  if (!Number.isFinite(id)) return err(400, "Invalid member id");

  if (isMockMode()) {
    const store = getMockStore();
    const rows = store.motmHistory
      .filter((h) => h.memberId === id)
      .sort((a, b) => (b.year - a.year) || (b.month - a.month));
    const memberCount = rows.filter((r) => r.role === "member").length;
    const leaderCount = rows.filter((r) => r.role === "leader").length;
    return ok({
      memberCount,
      leaderCount,
      totalCount: memberCount + leaderCount,
      lastAwardedAt: rows[0]?.awardedAt ?? null,
      history: rows.map((r) => ({
        year: r.year,
        month: r.month,
        role: r.role,
        awardedAt: r.awardedAt,
      })),
    });
  }

  const { rows } = await query(
    `SELECT year, month, role, awarded_at AS "awardedAt"
       FROM motm_history
      WHERE member_id = $1
      ORDER BY year DESC, month DESC`,
    [id],
  );
  const memberCount = rows.filter((r) => r.role === "member").length;
  const leaderCount = rows.filter((r) => r.role === "leader").length;
  return ok({
    memberCount,
    leaderCount,
    totalCount: memberCount + leaderCount,
    lastAwardedAt: rows[0]?.awardedAt ?? null,
    history: rows,
  });
});
