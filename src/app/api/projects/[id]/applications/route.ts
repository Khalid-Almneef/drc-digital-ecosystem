import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

const Post = z.object({
  role: z.string().trim().min(1),
  note: z.string().trim().max(2000).optional(),
});

export const POST = handle(async (req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const projectId = Number(id);
  const body = await parseBody(req, Post);

  if (isMockMode()) {
    const store = getMockStore();
    const project = store.projects.find((candidate) => candidate.projectId === projectId);
    if (!project) return err(404, "Project not found");
    if (!project.applicationsEnabled || project.applicationRoles.length === 0) {
      return err(400, "This project is not accepting applications.");
    }
    if (!project.applicationRoles.includes(body.role)) {
      return err(400, "Selected role is not open for applications.");
    }
    if (store.projectMembers.some((member) => member.projectId === projectId && member.memberId === session.memberId)) {
      return err(400, "You are already part of this project.");
    }
    if (
      store.projectApplications.some((application) =>
        application.projectId === projectId &&
        application.memberId === session.memberId &&
        application.role === body.role &&
        application.status !== "rejected",
      )
    ) {
      return err(409, "You already applied for this role.");
    }

    const applicationId = nextMockId("projectApplication");
    store.projectApplications.unshift({
      applicationId,
      projectId,
      memberId: session.memberId,
      role: body.role,
      note: body.note || null,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return ok({ applicationId }, { status: 201 });
  }

  const project = await queryOne<{
    applicationsEnabled: boolean;
    applicationRoles: string[] | null;
  }>(
    `SELECT applications_enabled AS "applicationsEnabled",
            application_roles AS "applicationRoles"
       FROM projects
      WHERE project_id = $1`,
    [projectId],
  );
  if (!project) return err(404, "Project not found");
  if (!project.applicationsEnabled || (project.applicationRoles?.length ?? 0) === 0) {
    return err(400, "This project is not accepting applications.");
  }
  if (!(project.applicationRoles ?? []).includes(body.role)) {
    return err(400, "Selected role is not open for applications.");
  }

  const existingMember = await queryOne(
    `SELECT 1
       FROM project_members
      WHERE project_id = $1 AND member_id = $2`,
    [projectId, session.memberId],
  );
  if (existingMember) {
    return err(400, "You are already part of this project.");
  }

  const existingApplication = await queryOne(
    `SELECT 1
       FROM project_applications
      WHERE project_id = $1
        AND member_id = $2
        AND role = $3
        AND status IN ('pending', 'accepted')`,
    [projectId, session.memberId, body.role],
  );
  if (existingApplication) {
    return err(409, "You already applied for this role.");
  }

  const inserted = await query<{ application_id: number }>(
    `INSERT INTO project_applications (project_id, member_id, role, note)
     VALUES ($1, $2, $3, $4)
     RETURNING application_id`,
    [projectId, session.memberId, body.role, body.note || null],
  );

  return ok({ applicationId: inserted.rows[0].application_id }, { status: 201 });
});
