import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";

// GET /api/members/month/schedule
//   Returns the MOTM schedule: array of { year, month, role, members:[...] }
//   sorted newest-first. Past months are records; future months are scheduled
//   nominations that auto-promote when their month arrives.
export const GET = handle(async () => {
  await requireSession();

  if (isMockMode()) {
    const store = getMockStore();
    const grouped = new Map<string, { year: number; month: number; memberIds: number[] }>();
    for (const h of store.motmHistory) {
      const key = `${h.year}-${h.month}`;
      const bucket = grouped.get(key) ?? { year: h.year, month: h.month, memberIds: [] };
      if (!bucket.memberIds.includes(h.memberId)) bucket.memberIds.push(h.memberId);
      grouped.set(key, bucket);
    }
    const entries = Array.from(grouped.values())
      .map((g) => ({
        year: g.year,
        month: g.month,
        members: g.memberIds
          .map((id) => {
            const m = findMockMember(id);
            return m ? {
              memberId: m.memberId,
              fullName: m.fullName,
              fullNameAr: m.fullNameAr,
              avatarUrl: m.avatarUrl,
              departmentName: m.departmentName,
            } : null;
          })
          .filter((m): m is NonNullable<typeof m> => m !== null),
      }))
      .sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));
    return ok(entries);
  }

  const { rows } = await query<{
    year: number;
    month: number;
    memberId: number;
    fullName: string | null;
    fullNameAr: string | null;
    avatarUrl: string | null;
    departmentName: string | null;
  }>(
    `SELECT h.year, h.month,
            h.member_id AS "memberId",
            p.full_name AS "fullName",
            p.full_name_ar AS "fullNameAr",
            p.avatar_url AS "avatarUrl",
            d.name AS "departmentName"
       FROM motm_history h
       LEFT JOIN profiles p    ON p.member_id     = h.member_id
       LEFT JOIN users u       ON u.member_id     = h.member_id
       LEFT JOIN departments d ON d.department_id = u.department_id
      ORDER BY h.year DESC, h.month DESC, p.full_name ASC`,
  );

  type Entry = { year: number; month: number; members: Array<{
    memberId: number; fullName: string | null; fullNameAr: string | null;
    avatarUrl: string | null; departmentName: string | null;
  }>; };
  const grouped = new Map<string, Entry>();
  for (const r of rows) {
    const key = `${r.year}-${r.month}`;
    const bucket = grouped.get(key) ?? { year: r.year, month: r.month, members: [] };
    if (!bucket.members.find((m) => m.memberId === r.memberId)) {
      bucket.members.push({
        memberId: r.memberId,
        fullName: r.fullName,
        fullNameAr: r.fullNameAr,
        avatarUrl: r.avatarUrl,
        departmentName: r.departmentName,
      });
    }
    grouped.set(key, bucket);
  }
  return ok(Array.from(grouped.values()));
});
