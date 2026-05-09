import { z } from "zod";
import { err, handle, ok, parseBody, parseQuery } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { type MockDepartmentSlug, type MockServiceRequest, findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";
import { canCreateServiceRequest, type ServiceRequestRow, type ServiceRequestTarget, type ServiceRequestType } from "@/lib/service-requests";
import { toFinanceDepartmentSlug, type FinanceDepartmentSlug } from "@/lib/finance";

const GetQuery = z.object({
  scope: z.enum(["inbox", "outbox", "related", "all"]).optional(),
  requestType: z.enum(["design", "workshop", "project_media", "company_visit"]).optional(),
  targetDepartment: z.enum(["media", "development", "pr"]).optional(),
});

const PostBody = z.object({
  requestType: z.enum(["design", "workshop", "project_media", "company_visit"]),
  targetDepartmentSlug: z.enum(["media", "development", "pr"]),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  attachmentUrls: z.array(z.string().min(1)).default([]),
});

function isLeader(position: string) {
  return position === "president" || position === "vice_president" || position === "dept_leader" || position === "dept_vice_leader";
}

function departmentNameBySlug(slug: MockDepartmentSlug | null) {
  if (!slug) return null;
  return getMockStore().departments.find((department) => department.slug === slug)?.name ?? null;
}

function resolveMockRow(row: MockServiceRequest): ServiceRequestRow {
  const requestedBy = findMockMember(row.requestedBy);
  const assignee = row.assigneeId ? findMockMember(row.assigneeId) : null;
  return {
    ...row,
    sourceDepartmentName: departmentNameBySlug(row.sourceDepartmentSlug),
    targetDepartmentName: departmentNameBySlug(row.targetDepartmentSlug),
    requestedByName: requestedBy?.fullName ?? null,
    assigneeName: assignee?.fullName ?? null,
  };
}

function filterRows(
  rows: ServiceRequestRow[],
  departmentSlug: FinanceDepartmentSlug | null,
  scope: "inbox" | "outbox" | "related" | "all",
  requestType?: ServiceRequestType,
  targetDepartment?: ServiceRequestTarget,
) {
  return rows
    .filter((row) => !requestType || row.requestType === requestType)
    .filter((row) => !targetDepartment || row.targetDepartmentSlug === targetDepartment)
    .filter((row) => {
      if (scope === "all") return true;
      if (!departmentSlug) return false;
      if (scope === "inbox") return row.targetDepartmentSlug === departmentSlug;
      if (scope === "outbox") return row.sourceDepartmentSlug === departmentSlug;
      return row.targetDepartmentSlug === departmentSlug || row.sourceDepartmentSlug === departmentSlug;
    })
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export const GET = handle(async (req) => {
  const session = await requireSession();
  if (!isLeader(session.position)) return err(403, "Forbidden");

  const q = parseQuery(new URL(req.url), GetQuery);
  const scope = q.scope ?? "related";
  const ownDepartment = toFinanceDepartmentSlug(session.departmentSlug);
  const isAdmin = session.position === "president" || session.position === "vice_president";

  if (scope === "all" && !isAdmin) return err(403, "Forbidden");

  if (isMockMode()) {
    const rows = getMockStore().serviceRequests.map(resolveMockRow);
    return ok(filterRows(rows, ownDepartment, scope, q.requestType, q.targetDepartment));
  }

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!isAdmin || scope !== "all") {
    if (!ownDepartment) return err(403, "Department context required");
    params.push(ownDepartment);
    const departmentParam = `$${params.length}`;
    if (scope === "inbox") conditions.push(`sr.target_department_slug = ${departmentParam}`);
    else if (scope === "outbox") conditions.push(`sr.source_department_slug = ${departmentParam}`);
    else conditions.push(`(sr.source_department_slug = ${departmentParam} OR sr.target_department_slug = ${departmentParam})`);
  }

  if (q.requestType) {
    params.push(q.requestType);
    conditions.push(`sr.request_type = $${params.length}`);
  }

  if (q.targetDepartment) {
    params.push(q.targetDepartment);
    conditions.push(`sr.target_department_slug = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await query<ServiceRequestRow>(
    `SELECT sr.request_id AS "requestId",
            sr.request_type AS "requestType",
            sr.title,
            sr.description,
            sr.priority,
            sr.status,
            sr.source_department_slug AS "sourceDepartmentSlug",
            sd.name AS "sourceDepartmentName",
            sr.target_department_slug AS "targetDepartmentSlug",
            td.name AS "targetDepartmentName",
            sr.requested_by AS "requestedBy",
            rp.full_name AS "requestedByName",
            sr.assignee_id AS "assigneeId",
            ap.full_name AS "assigneeName",
            sr.assignee_note AS "assigneeNote",
            sr.attachment_urls AS "attachmentUrls",
            sr.requested_at AS "requestedAt",
            sr.updated_at AS "updatedAt",
            sr.resolved_at AS "resolvedAt"
       FROM department_service_requests sr
       LEFT JOIN departments sd ON sd.slug::text = sr.source_department_slug
       LEFT JOIN departments td ON td.slug::text = sr.target_department_slug
       LEFT JOIN profiles rp ON rp.member_id = sr.requested_by
       LEFT JOIN profiles ap ON ap.member_id = sr.assignee_id
       ${where}
      ORDER BY sr.requested_at DESC`,
    params,
  );
  return ok(rows);
});

export const POST = handle(async (req) => {
  const session = await requireSession();
  if (!isLeader(session.position)) return err(403, "Forbidden");
  const body = await parseBody(req, PostBody);

  const sourceDepartmentSlug = toFinanceDepartmentSlug(session.departmentSlug);
  if (!sourceDepartmentSlug) return err(403, "Department context required");
  if (!canCreateServiceRequest(sourceDepartmentSlug, body.requestType, body.targetDepartmentSlug)) {
    return err(400, "This department cannot create that request.");
  }

  if (isMockMode()) {
    const requestId = nextMockId("serviceRequest");
    getMockStore().serviceRequests.unshift({
      requestId,
      requestType: body.requestType,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      priority: body.priority,
      status: "pending",
      sourceDepartmentSlug,
      targetDepartmentSlug: body.targetDepartmentSlug,
      requestedBy: session.memberId,
      assigneeId: null,
      assigneeNote: null,
      attachmentUrls: body.attachmentUrls,
      requestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
    });
    return ok({ requestId }, { status: 201 });
  }

  const { rows } = await query<{ request_id: number }>(
    `INSERT INTO department_service_requests
       (request_type, title, description, priority, source_department_slug, target_department_slug, requested_by, attachment_urls)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[])
     RETURNING request_id`,
    [
      body.requestType,
      body.title.trim(),
      body.description?.trim() || null,
      body.priority,
      sourceDepartmentSlug,
      body.targetDepartmentSlug,
      session.memberId,
      body.attachmentUrls,
    ],
  );
  return ok({ requestId: rows[0].request_id }, { status: 201 });
});
