// Change-request pipeline.
//
// Members of a department can submit proposed mutations that need leader
// approval. This module owns:
// - Type registry: known request_types and their apply handlers.
// - submitChangeRequest(): inserts the row, fans out notifications.
// - applyChangeRequest(): looks up the type's handler and runs it.
//
// To add a new approval-gated action:
// 1. Add the type to ChangeRequestType.
// 2. Register an apply handler in CHANGE_REQUEST_HANDLERS (this file).
// 3. In the original API route, gate on position; if not leader, call
//    submitChangeRequest() instead of executing the mutation.
// 4. Frontend: where the leader sees an action button, the member sees the
//    same button but it POSTs /api/change-requests instead.

import { query } from "./db";
import { getMockStore, isMockMode, nextMockId } from "./mock-store";
import { emitNotifications, emitNotification } from "./notifications";

export type ChangeRequestType =
  | "post_announcement"
  | "create_project"
  | "delete_project"
  | "decide_service_request"
  | "create_sponsor"
  | "update_sponsor"
  | "delete_sponsor"
  | "set_team_visibility"
  | "decide_expense"
  | "set_motm"
  | "update_budget_allocation"
  | "system";

export interface ChangeRequestRow {
  requestId: number;
  requestType: ChangeRequestType;
  departmentId: number;
  requesterId: number;
  requesterName: string | null;
  targetId: number | null;
  payload: Record<string, unknown>;
  summary: string;
  status: "pending" | "approved" | "rejected" | "applied" | "apply_failed";
  decidedBy: number | null;
  decidedAt: string | null;
  appliedAt: string | null;
  applyError: string | null;
  createdAt: string;
}

/**
 * Apply handler signature. Returns nothing on success, throws on failure.
 * The handler receives the saved payload + the deciding leader's session
 * (so audit trails reflect who approved, not who originally proposed).
 */
export type ChangeRequestApplyHandler = (input: {
  payload: Record<string, unknown>;
  targetId: number | null;
  requesterId: number;
  decidedById: number;
}) => Promise<void>;

const CHANGE_REQUEST_HANDLERS: Partial<Record<ChangeRequestType, ChangeRequestApplyHandler>> = {};

export function registerChangeRequestHandler(
  type: ChangeRequestType,
  handler: ChangeRequestApplyHandler,
): void {
  CHANGE_REQUEST_HANDLERS[type] = handler;
}

export function getChangeRequestHandler(type: ChangeRequestType): ChangeRequestApplyHandler | null {
  return CHANGE_REQUEST_HANDLERS[type] ?? null;
}

interface SubmitInput {
  type: ChangeRequestType;
  departmentId: number;
  requesterId: number;
  targetId?: number | null;
  payload: Record<string, unknown>;
  summary: string;
}

/**
 * Insert a change_request and notify every leader of the responsible
 * department. Returns the new request id. Errors propagate.
 */
export async function submitChangeRequest(input: SubmitInput): Promise<number> {
  let requestId: number;

  if (isMockMode()) {
    const store = getMockStore();
    requestId = nextMockId("changeRequest");
    store.changeRequests.unshift({
      requestId,
      requestType: input.type,
      departmentId: input.departmentId,
      requesterId: input.requesterId,
      targetId: input.targetId ?? null,
      payload: input.payload,
      summary: input.summary,
      status: "pending",
      decidedBy: null,
      decidedAt: null,
      appliedAt: null,
      applyError: null,
      createdAt: new Date().toISOString(),
    });
  } else {
    const result = await query<{ request_id: number }>(
      `INSERT INTO change_requests
         (request_type, department_id, requester_id, target_id, payload, summary)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING request_id`,
      [
        input.type,
        input.departmentId,
        input.requesterId,
        input.targetId ?? null,
        JSON.stringify(input.payload),
        input.summary,
      ],
    );
    requestId = result.rows[0].request_id;
  }

  // Notify leaders of the responsible department.
  await fanoutLeaderNotifications(input.departmentId, requestId, input.summary, input.requesterId);

  return requestId;
}

async function fanoutLeaderNotifications(
  departmentId: number,
  requestId: number,
  summary: string,
  requesterId: number,
): Promise<void> {
  if (isMockMode()) {
    const store = getMockStore();
    const leaders = store.members.filter(
      (m) =>
        m.isActive &&
        m.departmentId === departmentId &&
        (m.position === "dept_leader" || m.position === "dept_vice_leader") &&
        m.memberId !== requesterId,
    );
    void emitNotifications(
      leaders.map((leader) => ({
        recipientId: leader.memberId,
        category: "system" as const,
        title: "New change request",
        body: summary,
        linkUrl: "/dashboard",
        sourceType: "change_request",
        sourceId: requestId,
      })),
    );
    return;
  }
  const { rows } = await query<{ member_id: number }>(
    `SELECT member_id FROM users
      WHERE department_id = $1
        AND is_active = TRUE
        AND member_id <> $2
        AND position IN ('dept_leader', 'dept_vice_leader')`,
    [departmentId, requesterId],
  );
  void emitNotifications(
    rows.map((row) => ({
      recipientId: row.member_id,
      category: "system" as const,
      title: "New change request",
      body: summary,
      linkUrl: "/dashboard",
      sourceType: "change_request",
      sourceId: requestId,
    })),
  );
}

/**
 * Look up the department_id that owns a slug. Used by routes that always
 * route their requests to a specific dept's leadership (e.g. sponsor changes
 * always go to PR), regardless of who initiated the request.
 */
export async function resolveDepartmentId(slug: string): Promise<number | null> {
  if (isMockMode()) {
    return getMockStore().departments.find((d) => d.slug === slug)?.id ?? null;
  }
  const result = await query<{ department_id: number }>(
    `SELECT department_id FROM departments WHERE slug::text = $1`,
    [slug],
  );
  return result.rows[0]?.department_id ?? null;
}

/**
 * Notify the requester that their change request was decided. No reason
 * field on rejection — that's an explicit product choice.
 */
export async function notifyRequesterDecision(
  requesterId: number,
  requestId: number,
  summary: string,
  decision: "approved" | "rejected" | "apply_failed",
): Promise<void> {
  const titles: Record<typeof decision, string> = {
    approved: "Your change request was approved",
    rejected: "Your change request was rejected",
    apply_failed: "Your approved request failed to apply",
  };
  void emitNotification({
    recipientId: requesterId,
    category: "system",
    title: titles[decision],
    body: summary,
    linkUrl: "/dashboard",
    sourceType: "change_request",
    sourceId: requestId,
  });
}
