import { handle, ok, err } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";

export interface MemberStatsResponse {
  memberId: number;
  fullName: string | null;
  departmentSlug: string | null;
  hours: {
    approved: number;
    pending: number;
    rejected: number;
    total: number;
  };
  tasks: {
    assigned: number;
    inProgress: number;
    inReview: number;
    done: number;
    returned: number; // Tasks that bounced back from review at least once (best effort)
  };
  lastActivity: string | null;
}

function canViewMemberStats(
  session: { memberId: number; position: string; departmentId: number | null },
  target: { memberId: number; departmentId: number | null },
) {
  if (session.memberId === target.memberId) return true;
  if (session.position === "president" || session.position === "vice_president") return true;
  // Department leader/sub-leader can view their own dept members
  if (
    target.departmentId &&
    session.departmentId === target.departmentId &&
    ["dept_leader", "dept_vice_leader", "sub_leader"].includes(session.position)
  ) return true;
  return false;
}

export const GET = handle(async (_req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const memberId = Number(id);
  if (!Number.isFinite(memberId)) return err(400, "Invalid id");

  if (isMockMode()) {
    const target = findMockMember(memberId);
    if (!target) return err(404, "Not found");
    if (!canViewMemberStats(s, { memberId: target.memberId, departmentId: target.departmentId })) {
      return err(403, "Forbidden");
    }
    const store = getMockStore();
    const hours = store.volunteerHours.filter((h) => h.memberId === memberId);
    const approved = hours.filter((h) => h.approvalStatus === "approved").reduce((sum, h) => sum + h.hours, 0);
    const pending = hours.filter((h) => h.approvalStatus === "pending").reduce((sum, h) => sum + h.hours, 0);
    const rejected = hours.filter((h) => h.approvalStatus === "rejected").reduce((sum, h) => sum + h.hours, 0);

    const tasks = store.tasks.filter((t) => t.assignedTo === memberId);
    const assigned = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const inReview = tasks.filter((t) => t.status === "review").length;
    const done = tasks.filter((t) => t.status === "done").length;

    const lastActivityDates = [
      ...hours.map((h) => h.participationDate),
      ...tasks.map((t) => t.completedAt ?? t.submittedAt ?? t.createdAt),
    ].filter((value): value is string => Boolean(value));
    const lastActivity = lastActivityDates.length
      ? lastActivityDates.sort().slice(-1)[0]
      : null;

    const payload: MemberStatsResponse = {
      memberId,
      fullName: target.fullName,
      departmentSlug: target.departmentSlug,
      hours: { approved, pending, rejected, total: approved + pending },
      tasks: { assigned, inProgress, inReview, done, returned: 0 },
      lastActivity,
    };
    return ok(payload);
  }

  // Postgres path
  const target = await queryOne<{ memberId: number; departmentId: number | null; fullName: string | null; departmentSlug: string | null }>(
    `SELECT u.member_id AS "memberId", u.department_id AS "departmentId",
            p.full_name AS "fullName", d.slug::text AS "departmentSlug"
       FROM users u
       LEFT JOIN profiles p ON p.member_id = u.member_id
       LEFT JOIN departments d ON d.department_id = u.department_id
      WHERE u.member_id = $1`,
    [memberId],
  );
  if (!target) return err(404, "Not found");
  if (!canViewMemberStats(s, { memberId: target.memberId, departmentId: target.departmentId })) {
    return err(403, "Forbidden");
  }

  const hoursRow = await queryOne<{ approved: string; pending: string; rejected: string; lastDate: string | null }>(
    `SELECT
       COALESCE(SUM(CASE WHEN approval_status = 'approved' THEN hours END), 0)::float AS approved,
       COALESCE(SUM(CASE WHEN approval_status = 'pending' THEN hours END), 0)::float AS pending,
       COALESCE(SUM(CASE WHEN approval_status = 'rejected' THEN hours END), 0)::float AS rejected,
       MAX(participation_date)::text AS "lastDate"
     FROM volunteer_hours WHERE member_id = $1`,
    [memberId],
  );

  const taskRow = await queryOne<{
    assigned: string; inProgress: string; inReview: string; done: string; lastDate: string | null;
  }>(
    `SELECT
       COUNT(*)::int AS assigned,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS "inProgress",
       COUNT(*) FILTER (WHERE status = 'review')::int AS "inReview",
       COUNT(*) FILTER (WHERE status = 'done')::int AS done,
       GREATEST(MAX(completed_at), MAX(submitted_at), MAX(created_at))::text AS "lastDate"
     FROM tasks WHERE assigned_to = $1`,
    [memberId],
  );

  const lastDates = [hoursRow?.lastDate ?? null, taskRow?.lastDate ?? null].filter((v): v is string => Boolean(v));
  const lastActivity = lastDates.length ? lastDates.sort().slice(-1)[0] : null;

  const payload: MemberStatsResponse = {
    memberId,
    fullName: target.fullName,
    departmentSlug: target.departmentSlug,
    hours: {
      approved: Number(hoursRow?.approved ?? 0),
      pending: Number(hoursRow?.pending ?? 0),
      rejected: Number(hoursRow?.rejected ?? 0),
      total: Number(hoursRow?.approved ?? 0) + Number(hoursRow?.pending ?? 0),
    },
    tasks: {
      assigned: Number(taskRow?.assigned ?? 0),
      inProgress: Number(taskRow?.inProgress ?? 0),
      inReview: Number(taskRow?.inReview ?? 0),
      done: Number(taskRow?.done ?? 0),
      returned: 0,
    },
    lastActivity,
  };
  return ok(payload);
});
