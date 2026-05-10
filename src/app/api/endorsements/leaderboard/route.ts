import { handle, ok, err } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";
import { loadMemberEndorsements } from "@/lib/endorsements";

interface LeaderboardRow {
  memberId: number;
  fullName: string;
  departmentName: string;
  position: string;
  endorsementsReceived: number;
  endorsementPoints: number;
  uniqueEndorsers: number;
}

export const GET = handle(async () => {
  const session = await requireSession();
  const isAdmin = session.position === "president" || session.position === "vice_president";
  const isHr = (session.position === "dept_leader" || session.position === "dept_vice_leader") && session.departmentSlug === "hr";
  if (!isAdmin && !isHr) return err(403, "Forbidden");

  const { endorsements } = await loadMemberEndorsements();

  const aggregates = new Map<number, { count: number; points: number; endorsers: Set<number> }>();
  for (const endorsement of endorsements) {
    const entry = aggregates.get(endorsement.endorseeMemberId) ?? { count: 0, points: 0, endorsers: new Set<number>() };
    entry.count += 1;
    entry.points += endorsement.points;
    entry.endorsers.add(endorsement.endorserMemberId);
    aggregates.set(endorsement.endorseeMemberId, entry);
  }

  const memberIds = Array.from(aggregates.keys());
  if (memberIds.length === 0) return ok({ leaderboard: [] as LeaderboardRow[] });

  const directory = new Map<number, { fullName: string; departmentName: string; position: string }>();

  if (isMockMode()) {
    for (const memberId of memberIds) {
      const member = findMockMember(memberId);
      if (member) {
        directory.set(memberId, {
          fullName: member.fullName,
          departmentName: member.departmentName,
          position: member.position,
        });
      }
    }
    const store = getMockStore();
    void store; // satisfy unused-var lint if needed
  } else {
    const { rows } = await query<{ memberId: number; fullName: string; departmentName: string | null; position: string }>(
      `SELECT u.member_id AS "memberId",
              COALESCE(p.full_name, u.email) AS "fullName",
              d.name AS "departmentName",
              u.position::text AS position
         FROM users u
         LEFT JOIN profiles p ON p.member_id = u.member_id
         LEFT JOIN departments d ON d.department_id = u.department_id
        WHERE u.member_id = ANY($1::int[])`,
      [memberIds],
    );
    for (const row of rows) {
      directory.set(row.memberId, {
        fullName: row.fullName,
        departmentName: row.departmentName ?? "Club-wide",
        position: row.position,
      });
    }
  }

  const leaderboard: LeaderboardRow[] = memberIds
    .map((memberId) => {
      const aggregate = aggregates.get(memberId)!;
      const member = directory.get(memberId);
      return {
        memberId,
        fullName: member?.fullName ?? `Member #${memberId}`,
        departmentName: member?.departmentName ?? "Club-wide",
        position: member?.position ?? "member",
        endorsementsReceived: aggregate.count,
        endorsementPoints: aggregate.points,
        uniqueEndorsers: aggregate.endorsers.size,
      };
    })
    .sort((a, b) => {
      if (b.endorsementPoints !== a.endorsementPoints) return b.endorsementPoints - a.endorsementPoints;
      if (b.endorsementsReceived !== a.endorsementsReceived) return b.endorsementsReceived - a.endorsementsReceived;
      return a.fullName.localeCompare(b.fullName);
    });

  return ok({ leaderboard });
});
