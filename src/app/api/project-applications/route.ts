import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

export const runtime = "nodejs";

export const GET = handle(async (req) => {
  await requireSession();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const departmentSlug = url.searchParams.get("department");
  const projectId = url.searchParams.get("projectId");

  if (isMockMode()) {
    const store = getMockStore();
    const targetDept = departmentSlug
      ? store.departments.find((d) => d.slug === departmentSlug) ?? null
      : null;
    const targetDeptId = targetDept?.id ?? null;
    const projectIndex = new Map(store.projects.map((p) => [p.projectId, p]));
    const memberIndex = new Map(store.members.map((m) => [m.memberId, m]));
    const rows = store.projectApplications
      .filter((a) => !status || a.status === status)
      .filter((a) => !projectId || a.projectId === Number(projectId))
      .filter((a) => {
        if (!departmentSlug) return true;
        const project = projectIndex.get(a.projectId);
        return project?.departmentId === targetDeptId;
      })
      .map((a) => {
        const project = projectIndex.get(a.projectId);
        const member = memberIndex.get(a.memberId);
        return {
          applicationId: a.applicationId,
          projectId: a.projectId,
          projectTitle: project?.title ?? "",
          memberId: a.memberId,
          memberName: member?.fullName ?? "",
          memberAvatarUrl: member?.avatarUrl ?? null,
          role: a.role,
          note: a.note,
          status: a.status,
          createdAt: a.createdAt,
        };
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return ok(rows);
  }

  const filters: string[] = [];
  const params: unknown[] = [];
  if (status) { params.push(status); filters.push(`a.status = $${params.length}`); }
  if (departmentSlug) { params.push(departmentSlug); filters.push(`d.slug = $${params.length}`); }
  if (projectId) { params.push(Number(projectId)); filters.push(`a.project_id = $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const { rows } = await query(
    `SELECT a.application_id      AS "applicationId",
            a.project_id          AS "projectId",
            p.title               AS "projectTitle",
            a.member_id           AS "memberId",
            m.full_name           AS "memberName",
            m.avatar_url          AS "memberAvatarUrl",
            a.role                AS "role",
            a.note                AS "note",
            a.status              AS "status",
            a.created_at          AS "createdAt"
       FROM project_applications a
       JOIN projects p   ON p.project_id = a.project_id
       LEFT JOIN departments d ON d.department_id = p.department_id
       LEFT JOIN profiles m ON m.member_id = a.member_id
      ${where}
      ORDER BY a.created_at DESC`,
    params,
  );
  return ok(rows);
});
