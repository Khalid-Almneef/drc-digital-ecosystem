import { z } from "zod";
import { handle, ok, parseQuery } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";

export interface MemberStatsRow {
  memberId: number;
  fullName: string | null;
  fullNameAr: string | null;
  avatarUrl: string | null;
  departmentSlug: string | null;
  departmentName: string | null;
  position: string;
  hoursApproved: number;
  hoursPending: number;
  tasksAssigned: number;
  tasksDone: number;
  tasksInReview: number;
  lastActivity: string | null;
}

const Query = z.object({
  department: z.string().optional(),
});

export const GET = handle(async (req) => {
  const s = await requireSession();
  const q = parseQuery(new URL(req.url), Query);

  const isClubLeader = s.position === "president" || s.position === "vice_president";
  const isDeptLeader = ["dept_leader", "dept_vice_leader", "sub_leader"].includes(s.position);

  if (!isClubLeader && !isDeptLeader) {
    // Members can only view their own stats via /api/members/[id]/stats
    return ok([]);
  }

  // Dept leaders are scoped to their own department
  const scope = isClubLeader ? (q.department ?? null) : (s.departmentId ? null : null);
  const sessionDept = isDeptLeader ? s.departmentId : null;

  if (isMockMode()) {
    const store = getMockStore();
    let members = store.members.filter((m) => m.isActive);
    if (sessionDept) members = members.filter((m) => m.departmentId === sessionDept);
    if (scope) members = members.filter((m) => m.departmentSlug === scope);

    const rows: MemberStatsRow[] = members.map((m) => {
      const hours = store.volunteerHours.filter((h) => h.memberId === m.memberId);
      const tasks = store.tasks.filter((t) => t.assignedTo === m.memberId);
      const dates = [
        ...hours.map((h) => h.participationDate),
        ...tasks.map((t) => t.completedAt ?? t.submittedAt ?? t.createdAt),
      ].filter((v): v is string => Boolean(v));
      return {
        memberId: m.memberId,
        fullName: m.fullName,
        fullNameAr: m.fullNameAr,
        avatarUrl: m.avatarUrl,
        departmentSlug: m.departmentSlug,
        departmentName: m.departmentName ?? null,
        position: m.position,
        hoursApproved: hours.filter((h) => h.approvalStatus === "approved").reduce((sum, h) => sum + h.hours, 0),
        hoursPending: hours.filter((h) => h.approvalStatus === "pending").reduce((sum, h) => sum + h.hours, 0),
        tasksAssigned: tasks.length,
        tasksDone: tasks.filter((t) => t.status === "done").length,
        tasksInReview: tasks.filter((t) => t.status === "review").length,
        lastActivity: dates.length ? dates.sort().slice(-1)[0] : null,
      };
    });
    return ok(rows.sort((a, b) => (b.hoursApproved + b.tasksDone) - (a.hoursApproved + a.tasksDone)));
  }

  const conditions: string[] = ["u.is_active = TRUE"];
  const params: unknown[] = [];
  if (sessionDept) {
    params.push(sessionDept);
    conditions.push(`u.department_id = $${params.length}`);
  } else if (scope) {
    params.push(scope);
    conditions.push(`d.slug = $${params.length}`);
  }
  const where = `WHERE ${conditions.join(" AND ")}`;

  const { rows } = await query<MemberStatsRow>(
    `SELECT
       u.member_id AS "memberId",
       p.full_name AS "fullName",
       p.full_name_ar AS "fullNameAr",
       p.avatar_url AS "avatarUrl",
       d.slug::text AS "departmentSlug",
       d.name AS "departmentName",
       u.position::text AS position,
       COALESCE((SELECT SUM(hours) FROM volunteer_hours WHERE member_id = u.member_id AND approval_status = 'approved'), 0)::float AS "hoursApproved",
       COALESCE((SELECT SUM(hours) FROM volunteer_hours WHERE member_id = u.member_id AND approval_status = 'pending'), 0)::float AS "hoursPending",
       COALESCE((SELECT COUNT(*) FROM tasks WHERE assigned_to = u.member_id), 0)::int AS "tasksAssigned",
       COALESCE((SELECT COUNT(*) FROM tasks WHERE assigned_to = u.member_id AND status = 'done'), 0)::int AS "tasksDone",
       COALESCE((SELECT COUNT(*) FROM tasks WHERE assigned_to = u.member_id AND status = 'review'), 0)::int AS "tasksInReview",
       GREATEST(
         (SELECT MAX(participation_date)::text FROM volunteer_hours WHERE member_id = u.member_id),
         (SELECT GREATEST(MAX(completed_at), MAX(submitted_at), MAX(created_at))::text FROM tasks WHERE assigned_to = u.member_id)
       ) AS "lastActivity"
       FROM users u
       LEFT JOIN profiles p ON p.member_id = u.member_id
       LEFT JOIN departments d ON d.department_id = u.department_id
      ${where}
      ORDER BY "hoursApproved" DESC, "tasksDone" DESC, p.full_name ASC`,
    params,
  );
  // Suppress lint for unused; keep for future use.
  void findMockMember;
  return ok(rows);
});
