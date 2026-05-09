import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";
import {
  getChangeRequestHandler,
  notifyRequesterDecision,
  type ChangeRequestType,
} from "@/lib/change-requests";
// Side-effect: registers all known apply handlers. Adding a new handler? Edit
// src/lib/change-request-handlers.ts.
import "@/lib/change-request-handlers";

const PatchBody = z.object({
  decision: z.enum(["approved", "rejected"]),
});

// PATCH /api/change-requests/[id]
//   Leader of the responsible department approves or rejects.
//   Approval triggers the registered apply handler; on success the request
//   transitions pending → approved → applied. Failure marks 'apply_failed'
//   and notifies the requester accordingly.
export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const requestId = Number(id);
  if (!Number.isFinite(requestId) || requestId <= 0) return err(400, "Invalid id");

  const body = await parseBody(req, PatchBody);
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isLeader = s.position === "dept_leader" || s.position === "dept_vice_leader";
  if (!isAdmin && !isLeader) return err(403, "Forbidden");

  // Look up the request
  let request: {
    requestId: number;
    requestType: string;
    departmentId: number;
    requesterId: number;
    targetId: number | null;
    payload: Record<string, unknown>;
    summary: string;
    status: string;
  } | null = null;

  if (isMockMode()) {
    const store = getMockStore();
    const found = store.changeRequests.find((r) => r.requestId === requestId);
    if (found) request = {
      requestId: found.requestId,
      requestType: found.requestType,
      departmentId: found.departmentId,
      requesterId: found.requesterId,
      targetId: found.targetId,
      payload: found.payload,
      summary: found.summary,
      status: found.status,
    };
  } else {
    request = await queryOne(
      `SELECT request_id    AS "requestId",
              request_type  AS "requestType",
              department_id AS "departmentId",
              requester_id  AS "requesterId",
              target_id     AS "targetId",
              payload, summary, status
         FROM change_requests
        WHERE request_id = $1`,
      [requestId],
    );
  }

  if (!request) return err(404, "Request not found");

  // Only the responsible department's leadership (or club leaders) can decide.
  if (!isAdmin && request.departmentId !== s.departmentId) return err(403, "Forbidden");
  if (request.status !== "pending") return err(409, "Already decided");

  const decidedAt = new Date().toISOString();

  if (body.decision === "rejected") {
    await persistDecision(requestId, "rejected", s.memberId, decidedAt);
    await notifyRequesterDecision(request.requesterId, requestId, request.summary, "rejected");
    return ok({ status: "rejected" });
  }

  // Approve → mark approved, then attempt to apply.
  await persistDecision(requestId, "approved", s.memberId, decidedAt);

  const handler = getChangeRequestHandler(request.requestType as ChangeRequestType);
  if (!handler) {
    await persistApplyFailure(requestId, "No handler registered for this request type");
    await notifyRequesterDecision(request.requesterId, requestId, request.summary, "apply_failed");
    return err(500, "No handler registered for this request type");
  }

  try {
    await handler({
      payload: request.payload,
      targetId: request.targetId,
      requesterId: request.requesterId,
      decidedById: s.memberId,
    });
    await persistAppliedAt(requestId);
    await notifyRequesterDecision(request.requesterId, requestId, request.summary, "approved");
    return ok({ status: "applied" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Apply failed";
    await persistApplyFailure(requestId, message);
    await notifyRequesterDecision(request.requesterId, requestId, request.summary, "apply_failed");
    return err(500, `Approved, but apply failed: ${message}`);
  }
});

async function persistDecision(
  requestId: number,
  status: "approved" | "rejected",
  decidedById: number,
  decidedAt: string,
): Promise<void> {
  if (isMockMode()) {
    const store = getMockStore();
    const row = store.changeRequests.find((r) => r.requestId === requestId);
    if (row) {
      row.status = status;
      row.decidedBy = decidedById;
      row.decidedAt = decidedAt;
    }
    return;
  }
  await query(
    `UPDATE change_requests
        SET status = $1, decided_by = $2, decided_at = $3
      WHERE request_id = $4`,
    [status, decidedById, decidedAt, requestId],
  );
}

async function persistAppliedAt(requestId: number): Promise<void> {
  if (isMockMode()) {
    const store = getMockStore();
    const row = store.changeRequests.find((r) => r.requestId === requestId);
    if (row) {
      row.status = "applied";
      row.appliedAt = new Date().toISOString();
    }
    return;
  }
  await query(
    `UPDATE change_requests SET status = 'applied', applied_at = NOW() WHERE request_id = $1`,
    [requestId],
  );
}

async function persistApplyFailure(requestId: number, message: string): Promise<void> {
  if (isMockMode()) {
    const store = getMockStore();
    const row = store.changeRequests.find((r) => r.requestId === requestId);
    if (row) {
      row.status = "apply_failed";
      row.applyError = message;
    }
    return;
  }
  await query(
    `UPDATE change_requests SET status = 'apply_failed', apply_error = $1 WHERE request_id = $2`,
    [message, requestId],
  );
}
