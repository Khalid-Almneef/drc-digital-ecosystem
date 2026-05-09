import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";
import { toServiceRequestSlug } from "@/lib/service-requests";
import { emitNotification } from "@/lib/notifications";
import { submitChangeRequest, resolveDepartmentId } from "@/lib/change-requests";

function statusSummary(status: string, requestType: string) {
  const action =
    status === "rejected" ? "rejected"
      : status === "completed" ? "marked complete"
      : status === "in_progress" ? "started"
      : status === "assigned" ? "accepted"
      : "updated";
  const subject = requestType.replace(/_/g, " ");
  return `Your ${subject} request was ${action}`;
}

function statusLink(requestType: string) {
  if (requestType === "company_visit") return "/dashboard/development";
  if (requestType === "workshop") return "/dashboard/development";
  return "/dashboard";
}

const PatchBody = z.object({
  status: z.enum(["pending", "assigned", "in_progress", "completed", "rejected"]).optional(),
  assigneeId: z.number().int().nullable().optional(),
  assigneeNote: z.string().optional(),
}).refine((value) => Object.values(value).some((entry) => entry !== undefined), {
  message: "At least one field is required.",
});

function isLeader(position: string) {
  return position === "president" || position === "vice_president" || position === "dept_leader" || position === "dept_vice_leader";
}

export const PATCH = handle(async (req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const requestId = Number(id);
  const body = await parseBody(req, PatchBody);
  const ownDepartment = toServiceRequestSlug(session.departmentSlug);
  const isAdmin = session.position === "president" || session.position === "vice_president";

  // Non-leader members of the target department can propose a decision; it
  // routes to the target department's leadership for approval. Members of
  // other departments are blocked outright (no business deciding for a dept
  // they don't belong to).
  if (!isLeader(session.position)) {
    let targetSlug: string | null = null;
    if (isMockMode()) {
      const store = getMockStore();
      targetSlug = store.serviceRequests.find((r) => r.requestId === requestId)?.targetDepartmentSlug ?? null;
    } else {
      const row = await queryOne<{ targetDepartmentSlug: string }>(
        `SELECT target_department_slug AS "targetDepartmentSlug" FROM service_requests WHERE request_id = $1`,
        [requestId],
      );
      targetSlug = row?.targetDepartmentSlug ?? null;
    }
    if (!targetSlug) return err(404, "Request not found");
    if (session.departmentSlug !== targetSlug) return err(403, "Forbidden");

    const targetDeptId = await resolveDepartmentId(targetSlug);
    if (!targetDeptId) return err(500, "Department not configured");
    const newRequestId = await submitChangeRequest({
      type: "decide_service_request",
      departmentId: targetDeptId,
      requesterId: session.memberId,
      targetId: requestId,
      payload: {
        status: body.status,
        assigneeId: body.assigneeId ?? null,
        assigneeNote: body.assigneeNote ?? null,
      },
      summary: `${body.status === "rejected" ? "Reject" : body.status === "assigned" ? "Accept" : "Update"} service request #${requestId}`,
    });
    return ok({ requestId: newRequestId, requiresApproval: true }, { status: 202 });
  }

  if (isMockMode()) {
    const store = getMockStore();
    const request = store.serviceRequests.find((row) => row.requestId === requestId);
    if (!request) return err(404, "Request not found");
    if (!isAdmin && ownDepartment !== request.targetDepartmentSlug) return err(403, "Forbidden");

    if (body.assigneeId !== undefined && body.assigneeId !== null) {
      const assignee = findMockMember(body.assigneeId);
      if (!assignee || assignee.departmentSlug !== request.targetDepartmentSlug) {
        return err(400, "Assignee must belong to the target department.");
      }
    }

    const previousStatus = request.status;
    if (body.status !== undefined) request.status = body.status;
    if (body.assigneeId !== undefined) request.assigneeId = body.assigneeId ?? null;
    if (body.assigneeNote !== undefined) request.assigneeNote = body.assigneeNote.trim() || null;
    request.updatedAt = new Date().toISOString();
    request.resolvedAt = request.status === "completed" || request.status === "rejected" ? new Date().toISOString() : null;
    if (body.status !== undefined && body.status !== previousStatus) {
      await emitNotification({
        recipientId: request.requestedBy,
        category: "service_request_update",
        title: statusSummary(body.status, request.requestType),
        body: request.assigneeNote ?? null,
        linkUrl: statusLink(request.requestType),
        sourceType: `service_request:${request.requestType}`,
        sourceId: request.requestId,
      });
    }
    return ok({ success: true });
  }

  const existing = await queryOne<{
    targetDepartmentSlug: string;
    assigneeId: number | null;
    requestedBy: number;
    requestType: string;
    status: string;
  }>(
    `SELECT target_department_slug AS "targetDepartmentSlug",
            assignee_id            AS "assigneeId",
            requested_by           AS "requestedBy",
            request_type::text     AS "requestType",
            status                 AS "status"
       FROM department_service_requests
      WHERE request_id = $1`,
    [requestId],
  );
  if (!existing) return err(404, "Request not found");
  if (!isAdmin && ownDepartment !== existing.targetDepartmentSlug) return err(403, "Forbidden");

  if (body.assigneeId !== undefined && body.assigneeId !== null) {
    const assignee = await queryOne<{ departmentSlug: string | null }>(
      `SELECT d.slug::text AS "departmentSlug"
         FROM users u
         LEFT JOIN departments d ON d.department_id = u.department_id
        WHERE u.member_id = $1`,
      [body.assigneeId],
    );
    if (!assignee?.departmentSlug || assignee.departmentSlug !== existing.targetDepartmentSlug) {
      return err(400, "Assignee must belong to the target department.");
    }
  }

  const sets: string[] = [];
  const params: unknown[] = [requestId];

  if (body.status !== undefined) {
    params.push(body.status);
    sets.push(`status = $${params.length}`);
    params.push(body.status === "completed" || body.status === "rejected" ? new Date().toISOString() : null);
    sets.push(`resolved_at = $${params.length}`);
  }

  if (body.assigneeId !== undefined) {
    params.push(body.assigneeId ?? null);
    sets.push(`assignee_id = $${params.length}`);
  }

  if (body.assigneeNote !== undefined) {
    params.push(body.assigneeNote.trim() || null);
    sets.push(`assignee_note = $${params.length}`);
  }

  await query(
    `UPDATE department_service_requests
        SET ${sets.join(", ")}, updated_at = NOW()
      WHERE request_id = $1`,
    params,
  );

  if (body.status !== undefined && body.status !== existing.status) {
    await emitNotification({
      recipientId: existing.requestedBy,
      category: "service_request_update",
      title: statusSummary(body.status, existing.requestType),
      body: body.assigneeNote ?? null,
      linkUrl: statusLink(existing.requestType),
      sourceType: `service_request:${existing.requestType}`,
      sourceId: requestId,
    });
  }

  return ok({ success: true });
});
