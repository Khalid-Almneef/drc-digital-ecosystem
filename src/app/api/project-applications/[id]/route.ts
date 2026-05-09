import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";
import { emitNotification } from "@/lib/notifications";

export const runtime = "nodejs";

const Patch = z.object({
  status: z.enum(["accepted", "rejected"]),
  note: z.string().max(2000).optional(),
});

export const PATCH = handle(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const applicationId = Number(id);
  const body = await parseBody(req, Patch);

  if (isMockMode()) {
    const store = getMockStore();
    const application = store.projectApplications.find((a) => a.applicationId === applicationId);
    if (!application) return err(404, "Application not found");
    application.status = body.status;
    if (body.status === "accepted") {
      const exists = store.projectMembers.find(
        (pm) => pm.projectId === application.projectId && pm.memberId === application.memberId,
      );
      if (!exists) {
        store.projectMembers.push({
          projectId: application.projectId,
          memberId: application.memberId,
          role: application.role,
          joinedAt: new Date().toISOString(),
        });
      }
    }
    const project = store.projects.find((p) => p.projectId === application.projectId);
    await emitNotification({
      recipientId: application.memberId,
      category: "project_application_decision",
      title: body.status === "accepted"
        ? `Your application for ${project?.title ?? "the project"} was accepted`
        : `Your application for ${project?.title ?? "the project"} was not accepted`,
      body: body.note ?? null,
      linkUrl: `/dashboard/innovation/projects/${application.projectId}`,
      sourceType: "project_application",
      sourceId: applicationId,
    });
    return ok({ success: true });
  }

  const application = await queryOne<{ projectId: number; memberId: number; role: string; projectTitle: string }>(
    `SELECT a.project_id AS "projectId",
            a.member_id  AS "memberId",
            a.role,
            p.title      AS "projectTitle"
       FROM project_applications a
       JOIN projects p ON p.project_id = a.project_id
      WHERE a.application_id = $1`,
    [applicationId],
  );
  if (!application) return err(404, "Application not found");

  await query(
    `UPDATE project_applications SET status = $1, updated_at = NOW() WHERE application_id = $2`,
    [body.status, applicationId],
  );

  if (body.status === "accepted") {
    await query(
      `INSERT INTO project_members (project_id, member_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, member_id) DO UPDATE SET role = EXCLUDED.role`,
      [application.projectId, application.memberId, application.role],
    );
  }

  await emitNotification({
    recipientId: application.memberId,
    category: "project_application_decision",
    title: body.status === "accepted"
      ? `Your application for ${application.projectTitle} was accepted`
      : `Your application for ${application.projectTitle} was not accepted`,
    body: body.note ?? null,
    linkUrl: `/dashboard/innovation/projects/${application.projectId}`,
    sourceType: "project_application",
    sourceId: applicationId,
  });

  return ok({ success: true });
});
