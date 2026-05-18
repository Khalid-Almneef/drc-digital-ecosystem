import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isClubLead, isAnyLead, canManageDept, ownsResource } from "@/lib/authz";
import { departmentById, findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";
import { submitChangeRequest } from "@/lib/change-requests";


export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  if (isMockMode()) {
    const store = getMockStore();
    const project = store.projects.find((p) => p.projectId === Number(id));
    if (!project || project.isDeleted) return err(404, "Not found");
    const dept = departmentById(project.departmentId);
    const lead = project.leadMemberId ? findMockMember(project.leadMemberId) : null;
    const members = store.projectMembers
      .filter((pm) => pm.projectId === project.projectId)
      .map((pm) => {
        const member = findMockMember(pm.memberId);
        return {
          memberId: pm.memberId,
          role: pm.role,
          fullName: member?.fullName ?? "Unknown member",
          avatarUrl: member?.avatarUrl ?? null,
        };
      });
    return ok({
      ...project,
      departmentSlug: dept?.slug ?? null,
      departmentName: dept?.name ?? "Club-wide",
      leadName: lead?.fullName ?? null,
      leadAvatarUrl: lead?.avatarUrl ?? null,
      members,
    });
  }
  const project = await queryOne(
    `SELECT p.*, d.slug::text AS "departmentSlug", d.name AS "departmentName",
            lp.full_name AS "leadName", lp.avatar_url AS "leadAvatarUrl"
       FROM projects p
       LEFT JOIN departments d ON d.department_id = p.department_id
       LEFT JOIN profiles lp   ON lp.member_id    = p.lead_member_id
      WHERE p.project_id = $1 AND p.is_deleted = FALSE`,
    [id],
  );
  if (!project) return err(404, "Not found");
  const members = await query(
    `SELECT pm.member_id AS "memberId", pm.role, pr.full_name AS "fullName",
            pr.avatar_url AS "avatarUrl"
       FROM project_members pm
       LEFT JOIN profiles pr ON pr.member_id = pm.member_id
      WHERE pm.project_id = $1
      ORDER BY pm.joined_at`,
    [id],
  );
  return ok({ ...project, members: members.rows });
});

const Patch = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["planning", "in_progress", "testing", "completed", "archived"]).optional(),
  leadMemberId: z.number().int().nullable().optional(),
  departmentId: z.number().int().nullable().optional(),
  techStack: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  completedDate: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  creditHours: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  applicationsEnabled: z.boolean().optional(),
  applicationRoles: z.array(z.string().min(1)).optional(),
}).superRefine((value, ctx) => {
  if (value.applicationsEnabled && value.applicationRoles && value.applicationRoles.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["applicationRoles"],
      message: "At least one application role is required when project applications are enabled.",
    });
  }
});

export const PATCH = handle(async (req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, Patch);

  // Publishing (isPublished -> true) is gated to media leadership + admins.
  if (b.isPublished === true) {
    const isAdmin = session.position === "president" || session.position === "vice_president";
    const isMediaLead =
      (session.position === "dept_leader" || session.position === "dept_vice_leader") &&
      session.departmentSlug === "media";
    if (!isAdmin && !isMediaLead) {
      return err(403, "Only the media team can publish projects.");
    }
  }

  // All other project mutations require club admin, the owning department's
  // leadership, or the project lead. This closes the C-02 IDOR where any
  // signed-in member could rewrite project title/status/leadMemberId or
  // mark a project completed (auto-crediting volunteer hours).
  if (!isClubLead(session)) {
    if (!isAnyLead(session)) {
      // Project leads (plain members) may still edit their own project. Look
      // up the row to check ownership before refusing.
      if (!isMockMode()) {
        const owner = await queryOne<{ leadMemberId: number | null; departmentId: number | null }>(
          `SELECT lead_member_id AS "leadMemberId", department_id AS "departmentId" FROM projects WHERE project_id = $1`,
          [id],
        );
        if (!owner) return err(404, "Not found");
        if (!ownsResource(session, owner.leadMemberId)) return err(403, "Forbidden");
      } else {
        const project = getMockStore().projects.find((p) => p.projectId === Number(id));
        if (!project) return err(404, "Not found");
        if (project.leadMemberId !== session.memberId) return err(403, "Forbidden");
      }
    } else {
      // dept_leader / dept_vice_leader: must lead the project's department.
      const owner = isMockMode()
        ? (() => {
            const p = getMockStore().projects.find((p) => p.projectId === Number(id));
            return p ? { departmentId: p.departmentId, leadMemberId: p.leadMemberId } : null;
          })()
        : await queryOne<{ departmentId: number | null; leadMemberId: number | null }>(
            `SELECT department_id AS "departmentId", lead_member_id AS "leadMemberId" FROM projects WHERE project_id = $1`,
            [id],
          );
      if (!owner) return err(404, "Not found");
      if (!canManageDept(session, owner.departmentId) && !ownsResource(session, owner.leadMemberId)) {
        return err(403, "Forbidden");
      }
    }
  }

  if (isMockMode()) {
    const store = getMockStore();
    const project = store.projects.find((p) => p.projectId === Number(id));
    if (!project) return err(404, "Not found");
    if (b.title !== undefined) project.title = b.title;
    if (b.description !== undefined) project.description = b.description;
    if (b.imageUrl !== undefined) project.imageUrl = b.imageUrl || null;
    if (b.githubUrl !== undefined) project.githubUrl = b.githubUrl || null;
    if (b.category !== undefined) project.category = b.category || null;
    if (b.status !== undefined) {
      project.status = b.status;
      if (b.status === "completed") project.completedDate = new Date().toISOString().slice(0, 10);
    }
    if (b.leadMemberId !== undefined) project.leadMemberId = b.leadMemberId;
    if (b.departmentId !== undefined) project.departmentId = b.departmentId;
    if (b.techStack !== undefined) project.techStack = b.techStack;
    if (b.startDate !== undefined) project.startDate = b.startDate;
    if (b.targetEndDate !== undefined) project.targetEndDate = b.targetEndDate;
    if (b.completedDate !== undefined) project.completedDate = b.completedDate;
    if (b.isFeatured !== undefined) project.isFeatured = b.isFeatured;
    if (b.isPublished !== undefined) project.isPublished = b.isPublished;
    if (b.creditHours !== undefined) project.creditHours = b.creditHours;
    if (b.cost !== undefined) project.cost = b.cost;
    if (b.applicationsEnabled !== undefined) project.applicationsEnabled = b.applicationsEnabled;
    if (b.applicationRoles !== undefined) project.applicationRoles = b.applicationRoles;
    if (project.applicationsEnabled === false) project.applicationRoles = [];
    if (b.status === "completed" && project.creditHours > 0) {
      for (const pm of store.projectMembers.filter((pm) => pm.projectId === project.projectId)) {
        const exists = store.volunteerHours.find((h) => h.memberId === pm.memberId && h.sourceType === "project_credit" && h.sourceId === project.projectId);
        if (!exists) {
          store.volunteerHours.unshift({
            id: nextMockId("volunteerHour"),
            memberId: pm.memberId,
            hours: project.creditHours,
            title: `Credit for project: ${project.title}`,
            description: "Automatically credited on project completion.",
            participationDate: new Date().toISOString().slice(0, 10),
            approvalStatus: "pending",
            approvedAt: null,
            approvedBy: null,
            sourceType: "project_credit",
            sourceId: project.projectId,
          });
        }
      }
    }
    return ok({ success: true });
  }
  const map: Record<string, string> = {
    title: "title", description: "description", imageUrl: "image_url", githubUrl: "github_url",
    category: "category", leadMemberId: "lead_member_id", departmentId: "department_id",
    techStack: "tech_stack", startDate: "start_date", targetEndDate: "target_end_date",
    completedDate: "completed_date", isFeatured: "is_featured", isPublished: "is_published",
    creditHours: "credit_hours", cost: "cost",
    applicationsEnabled: "applications_enabled", applicationRoles: "application_roles",
  };
  const sets: string[] = [];
  const params: unknown[] = [id];
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    if (k === "status") { params.push(v); sets.push(`status = $${params.length}::project_status`); }
    else if (map[k]) { params.push(v); sets.push(`${map[k]} = $${params.length}`); }
  }
  if (!sets.length) return ok({ success: true });
  await query(`UPDATE projects SET ${sets.join(", ")} WHERE project_id = $1`, params);

  // Auto-credit: when project is marked completed, grant credit hours to all members
  if (b.status === "completed") {
    const project = await queryOne<{ creditHours: string; title: string }>(
      `SELECT credit_hours AS "creditHours", title FROM projects WHERE project_id = $1`,
      [id],
    );
    if (project && Number(project.creditHours) > 0) {
      await query(
        `INSERT INTO volunteer_hours
           (member_id, hours, title, description, participation_date,
            approval_status, source_type, source_id)
         SELECT pm.member_id, $2, $3, $4, CURRENT_DATE, 'pending', 'project_credit', $1
           FROM project_members pm
          WHERE pm.project_id = $1
         ON CONFLICT (member_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING`,
        [
          id,
          Number(project.creditHours),
          `Credit for project: ${project.title}`,
          "Automatically credited on project completion.",
        ],
      );
    }
  }

  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const projectId = Number(id);

  // Non-leaders queue this as a change_request.
  const canDoDirectly =
    s.position === "president" || s.position === "vice_president" ||
    s.position === "dept_leader" || s.position === "dept_vice_leader";
  if (!canDoDirectly) {
    if (!s.departmentId) return err(403, "No department leadership to route to");
    const requestId = await submitChangeRequest({
      type: "delete_project",
      departmentId: s.departmentId,
      requesterId: s.memberId,
      targetId: projectId,
      payload: { projectId },
      summary: `Delete project #${projectId}`,
    });
    return ok({ requestId, requiresApproval: true }, { status: 202 });
  }

  // Soft-delete. We don't cascade to tasks/members/applications/deliverables —
  // the row just disappears from the UI while the related history stays
  // intact for the audit ledger (volunteer hours, MOTM, etc.).
  if (isMockMode()) {
    const store = getMockStore();
    const target = store.projects.find((p) => p.projectId === projectId);
    if (!target) return err(404, "Not found");
    target.isDeleted = true;
    // Hide subordinate tasks from the UI too, so the deleted project's
    // tasks don't bleed into other views.
    for (const t of store.tasks) {
      if (t.projectId === projectId) t.isDeleted = true;
    }
    return ok({ success: true });
  }
  await query(
    `UPDATE projects
        SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2
      WHERE project_id = $1 AND is_deleted = FALSE`,
    [id, s.memberId],
  );
  await query(
    `UPDATE tasks
        SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2
      WHERE project_id = $1 AND is_deleted = FALSE`,
    [id, s.memberId],
  );
  return ok({ success: true });
});
