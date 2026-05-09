import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { departmentById, findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";
import { submitChangeRequest } from "@/lib/change-requests";

export const GET = handle(async () => {
  await requireSession();
  if (isMockMode()) {
    const store = getMockStore();
    return ok(store.projects.map((p) => {
      const dept = departmentById(p.departmentId);
      const lead = p.leadMemberId ? findMockMember(p.leadMemberId) : null;
      return {
        projectId: p.projectId,
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        githubUrl: p.githubUrl,
        category: p.category,
        status: p.status,
        isFeatured: p.isFeatured,
        isPublished: p.isPublished,
        techStack: p.techStack,
        startDate: p.startDate,
        targetEndDate: p.targetEndDate,
        completedDate: p.completedDate,
        departmentSlug: dept?.slug ?? null,
        departmentName: dept?.name ?? "Club-wide",
        leadMemberId: p.leadMemberId,
        leadName: lead?.fullName ?? null,
        leadAvatarUrl: lead?.avatarUrl ?? null,
        creditHours: p.creditHours,
        cost: p.cost,
        applicationsEnabled: p.applicationsEnabled,
        applicationRoles: p.applicationRoles,
      };
    }));
  }
  const { rows } = await query(
    `SELECT p.project_id AS "projectId", p.title, p.description, p.image_url AS "imageUrl",
            p.github_url AS "githubUrl", p.category, p.status::text AS status,
            p.tech_stack AS "techStack", p.is_featured AS "isFeatured",
            p.is_published AS "isPublished",
            p.start_date AS "startDate", p.target_end_date AS "targetEndDate",
            p.completed_date AS "completedDate",
            p.applications_enabled AS "applicationsEnabled",
            p.application_roles AS "applicationRoles",
            d.slug::text AS "departmentSlug", d.name AS "departmentName",
            u.member_id AS "leadMemberId",
            lp.full_name AS "leadName", lp.avatar_url AS "leadAvatarUrl"
       FROM projects p
       LEFT JOIN departments d ON d.department_id = p.department_id
       LEFT JOIN users u       ON u.member_id      = p.lead_member_id
       LEFT JOIN profiles lp   ON lp.member_id    = u.member_id
      ORDER BY p.created_at DESC`,
  );
  return ok(rows);
});

const Post = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  category: z.string().optional(),
  status: z.enum(["planning", "in_progress", "testing", "completed", "archived"]).default("planning"),
  leadMemberId: z.number().int().optional(),
  departmentId: z.number().int().optional(),
  techStack: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  creditHours: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  applicationsEnabled: z.boolean().optional(),
  applicationRoles: z.array(z.string().min(1)).optional(),
}).superRefine((value, ctx) => {
  if (value.applicationsEnabled && (!value.applicationRoles || value.applicationRoles.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["applicationRoles"],
      message: "At least one application role is required when project applications are enabled.",
    });
  }
});

export const POST = handle(async (req) => {
  const s = await requireSession();
  const b = await parseBody(req, Post);

  // Non-leaders queue this as a change_request for their dept's leadership.
  const canDoDirectly =
    s.position === "president" || s.position === "vice_president" ||
    s.position === "dept_leader" || s.position === "dept_vice_leader";
  if (!canDoDirectly) {
    if (!s.departmentId) return err(403, "No department leadership to route to");
    const requestId = await submitChangeRequest({
      type: "create_project",
      departmentId: s.departmentId,
      requesterId: s.memberId,
      payload: { ...b, originalRequesterId: s.memberId },
      summary: `Create project: "${b.title}"`,
    });
    return ok({ requestId, requiresApproval: true }, { status: 202 });
  }

  if (isMockMode()) {
    const projectId = nextMockId("project");
    getMockStore().projects.unshift({
      projectId,
      title: b.title,
      description: b.description ?? null,
      imageUrl: b.imageUrl ?? null,
      githubUrl: b.githubUrl ?? null,
      category: b.category ?? null,
      status: b.status,
      leadMemberId: b.leadMemberId ?? null,
      departmentId: b.departmentId ?? null,
      techStack: b.techStack ?? null,
      startDate: b.startDate ?? null,
      targetEndDate: b.targetEndDate ?? null,
      completedDate: b.status === "completed" ? new Date().toISOString().slice(0, 10) : null,
      isFeatured: false,
      isPublished: false,
      creditHours: b.creditHours ?? 0,
      cost: b.cost ?? null,
      applicationsEnabled: b.applicationsEnabled ?? false,
      applicationRoles: b.applicationsEnabled ? b.applicationRoles ?? [] : [],
    });
    return ok({ projectId }, { status: 201 });
  }
  const { rows } = await query<{ project_id: number }>(
    `INSERT INTO projects (title, description, image_url, github_url, category, status,
       lead_member_id, department_id, tech_stack, start_date, target_end_date, credit_hours, cost,
       applications_enabled, application_roles)
     VALUES ($1,$2,$3,$4,$5,$6::project_status,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING project_id`,
    [
      b.title, b.description ?? null, b.imageUrl ?? null, b.githubUrl ?? null, b.category ?? null,
      b.status, b.leadMemberId ?? null, b.departmentId ?? null, b.techStack ?? null,
      b.startDate ?? null, b.targetEndDate ?? null,
      b.creditHours ?? 0, b.cost ?? null,
      b.applicationsEnabled ?? false, b.applicationsEnabled ? b.applicationRoles ?? [] : [],
    ],
  );
  return ok({ projectId: rows[0].project_id }, { status: 201 });
});
