import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode, findMockMember } from "@/lib/mock-store";
import { submitChangeRequest, type ChangeRequestType } from "@/lib/change-requests";

// GET /api/change-requests
//   ?scope=mine     → requests I submitted (any status)
//   ?scope=inbox    → pending requests for my dept's leadership (default for leaders)
//   ?status=...     → filter by status
//
// Visibility:
// - Members can always see their own requests.
// - Dept leaders/vice-leaders see the inbox for their department.
// - Club leaders see all inboxes.
export const GET = handle(async (req) => {
  const s = await requireSession();
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? (
    s.position === "dept_leader" || s.position === "dept_vice_leader" ||
    s.position === "president" || s.position === "vice_president"
      ? "inbox"
      : "mine"
  );
  const statusFilter = url.searchParams.get("status");

  if (isMockMode()) {
    const store = getMockStore();
    let rows = store.changeRequests.slice();
    if (scope === "mine") {
      rows = rows.filter((r) => r.requesterId === s.memberId);
    } else if (scope === "inbox") {
      const isAdmin = s.position === "president" || s.position === "vice_president";
      const isLeader = s.position === "dept_leader" || s.position === "dept_vice_leader";
      if (!isAdmin && !isLeader) return err(403, "Forbidden");
      if (!isAdmin) rows = rows.filter((r) => r.departmentId === s.departmentId);
    } else {
      return err(400, "Unknown scope");
    }
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    return ok(rows.map((r) => ({
      ...r,
      requesterName: findMockMember(r.requesterId)?.fullName ?? null,
    })));
  }

  if (scope === "mine") {
    const result = await query(
      `SELECT cr.request_id    AS "requestId",
              cr.request_type  AS "requestType",
              cr.department_id AS "departmentId",
              cr.requester_id  AS "requesterId",
              p.full_name      AS "requesterName",
              cr.target_id     AS "targetId",
              cr.payload, cr.summary, cr.status,
              cr.decided_by    AS "decidedBy",
              cr.decided_at    AS "decidedAt",
              cr.applied_at    AS "appliedAt",
              cr.apply_error   AS "applyError",
              cr.created_at    AS "createdAt"
         FROM change_requests cr
         LEFT JOIN profiles p ON p.member_id = cr.requester_id
        WHERE cr.requester_id = $1
          ${statusFilter ? "AND cr.status = $2" : ""}
        ORDER BY cr.created_at DESC`,
      statusFilter ? [s.memberId, statusFilter] : [s.memberId],
    );
    return ok(result.rows);
  }

  // inbox
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isLeader = s.position === "dept_leader" || s.position === "dept_vice_leader";
  if (!isAdmin && !isLeader) return err(403, "Forbidden");
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (!isAdmin) {
    params.push(s.departmentId);
    conditions.push(`cr.department_id = $${params.length}`);
  }
  if (statusFilter) {
    params.push(statusFilter);
    conditions.push(`cr.status = $${params.length}`);
  } else {
    conditions.push(`cr.status = 'pending'`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await query(
    `SELECT cr.request_id    AS "requestId",
            cr.request_type  AS "requestType",
            cr.department_id AS "departmentId",
            cr.requester_id  AS "requesterId",
            p.full_name      AS "requesterName",
            cr.target_id     AS "targetId",
            cr.payload, cr.summary, cr.status,
            cr.decided_by    AS "decidedBy",
            cr.decided_at    AS "decidedAt",
            cr.applied_at    AS "appliedAt",
            cr.apply_error   AS "applyError",
            cr.created_at    AS "createdAt"
       FROM change_requests cr
       LEFT JOIN profiles p ON p.member_id = cr.requester_id
       ${where}
       ORDER BY cr.created_at DESC`,
    params,
  );
  return ok(result.rows);
});

const PostBody = z.object({
  type: z.string().min(1).max(60),
  departmentId: z.number().int().positive(),
  targetId: z.number().int().positive().nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
  summary: z.string().min(1).max(500),
});

// POST /api/change-requests
//   Members use this to propose a mutation. Most callers will instead hit the
//   original endpoint (which auto-creates a change_request when the caller
//   isn't a leader). This direct endpoint exists for the rare case the
//   frontend wants to submit a request without going through a typed route.
export const POST = handle(async (req) => {
  const s = await requireSession();
  const body = await parseBody(req, PostBody);
  const requestId = await submitChangeRequest({
    type: body.type as ChangeRequestType,
    departmentId: body.departmentId,
    requesterId: s.memberId,
    targetId: body.targetId ?? null,
    payload: body.payload,
    summary: body.summary,
  });
  return ok({ requestId }, { status: 201 });
});
