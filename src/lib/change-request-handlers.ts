// Apply handlers for change_requests.
//
// This module's import has the side effect of registering every handler the
// API knows about. Add a new approval-gated mutation here:
//
// 1. Define the handler — it must accept the saved payload and run the
//    underlying mutation as if the leader had originated the call.
// 2. Call registerChangeRequestHandler(<type>, handler).
// 3. Add the type to ChangeRequestType in src/lib/change-requests.ts.
// 4. In the original endpoint (e.g. POST /api/announcements), gate on
//    position; if the caller isn't a leader, call submitChangeRequest()
//    instead of the mutation. See announcements/route.ts for the canonical
//    example.

import { query } from "./db";
import { findMockMember, getMockStore, isMockMode, nextMockId, upsertSiteContent } from "./mock-store";
import { registerChangeRequestHandler } from "./change-requests";
import { emitNotifications } from "./notifications";
import { updateFinanceAllocation, type FinanceDepartmentSlug } from "./finance";

// ── post_announcement ──────────────────────────────────────────────────────
//
// Payload shape mirrors the body of POST /api/announcements:
//   { title, body?, imageUrl?, priority, targetPosition?, targetDepartmentId?,
//     isPinned, expiresAt? }
// Plus an internal `originalAuthorId` we set when submitting so the announcement
// can be attributed to the original requester (not the leader who approved).

interface PostAnnouncementPayload {
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  priority: "low" | "medium" | "high" | "critical";
  targetPosition?: string | null;
  targetDepartmentId?: number | null;
  isPinned: boolean;
  expiresAt?: string | null;
  originalAuthorId: number;
}

registerChangeRequestHandler("post_announcement", async ({ payload, decidedById }) => {
  const data = payload as unknown as PostAnnouncementPayload;
  // We attribute the announcement to the original author (the requester),
  // since the leader is just signing off — not authoring. The audit trail
  // (decided_by on change_requests) preserves who approved.
  void decidedById;
  const authorId = data.originalAuthorId;

  let announcementId: number;
  if (isMockMode()) {
    const store = getMockStore();
    announcementId = nextMockId("announcement");
    store.announcements.unshift({
      announcementId,
      title: data.title,
      body: data.body ?? null,
      imageUrl: data.imageUrl ?? null,
      priority: data.priority,
      isPinned: data.isPinned,
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt ?? null,
      authorId,
    });
  } else {
    const result = await query<{ announcement_id: number }>(
      `INSERT INTO announcements (title, body, image_url, link_url, priority, target_position, target_department_id, is_pinned, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5::announcement_priority, $6, $7, $8, $9, $10) RETURNING announcement_id`,
      [
        data.title,
        data.body ?? null,
        data.imageUrl ?? null,
        data.linkUrl ?? null,
        data.priority,
        data.targetPosition ?? null,
        data.targetDepartmentId ?? null,
        data.isPinned,
        data.expiresAt ?? null,
        authorId,
      ],
    );
    announcementId = result.rows[0].announcement_id;
  }

  // Replicate the targeted-fanout behavior of the original POST handler.
  void announcementId; // referenced via the recipients fanout below
  if (!isMockMode() && (data.targetDepartmentId || data.targetPosition)) {
    const conditions: string[] = ["is_active = TRUE", "member_id <> $1"];
    const params: unknown[] = [authorId];
    if (data.targetDepartmentId) {
      params.push(data.targetDepartmentId);
      conditions.push(`department_id = $${params.length}`);
    }
    if (data.targetPosition) {
      params.push(data.targetPosition);
      conditions.push(`position = $${params.length}::user_position`);
    }
    const recipients = await query<{ member_id: number }>(
      `SELECT member_id FROM users WHERE ${conditions.join(" AND ")}`,
      params,
    );
    void emitNotifications(
      recipients.rows.map((r) => ({
        recipientId: r.member_id,
        category: "announcement_published" as const,
        title: `New announcement: ${data.title}`,
        body: data.body ? data.body.slice(0, 200) : null,
        linkUrl: "/dashboard",
        sourceType: "announcement",
        sourceId: announcementId,
      })),
    );
  }
});

// ── create_project ─────────────────────────────────────────────────────────
//
// Payload mirrors POST /api/projects body. Lead is the original requester
// unless explicitly set otherwise.

interface CreateProjectPayload {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  githubUrl?: string | null;
  category?: string | null;
  status: "planning" | "in_progress" | "testing" | "completed" | "archived";
  leadMemberId?: number | null;
  departmentId?: number | null;
  techStack?: string[] | null;
  startDate?: string | null;
  targetEndDate?: string | null;
  creditHours?: number | null;
  cost?: number | null;
  applicationsEnabled?: boolean;
  applicationRoles?: string[];
  originalRequesterId: number;
}

registerChangeRequestHandler("create_project", async ({ payload }) => {
  const data = payload as unknown as CreateProjectPayload;
  const leadId = data.leadMemberId ?? data.originalRequesterId;
  if (isMockMode()) {
    const projectId = nextMockId("project");
    getMockStore().projects.unshift({
      projectId,
      title: data.title,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      githubUrl: data.githubUrl ?? null,
      category: data.category ?? null,
      status: data.status,
      leadMemberId: leadId,
      departmentId: data.departmentId ?? null,
      techStack: data.techStack ?? null,
      startDate: data.startDate ?? null,
      targetEndDate: data.targetEndDate ?? null,
      completedDate: data.status === "completed" ? new Date().toISOString().slice(0, 10) : null,
      isFeatured: false,
      isPublished: false,
      creditHours: data.creditHours ?? 0,
      cost: data.cost ?? null,
      applicationsEnabled: data.applicationsEnabled ?? false,
      applicationRoles: data.applicationsEnabled ? data.applicationRoles ?? [] : [],
    });
    return;
  }
  await query(
    `INSERT INTO projects (title, description, image_url, github_url, category, status,
       lead_member_id, department_id, tech_stack, start_date, target_end_date, credit_hours, cost,
       applications_enabled, application_roles)
     VALUES ($1,$2,$3,$4,$5,$6::project_status,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      data.title, data.description ?? null, data.imageUrl ?? null, data.githubUrl ?? null,
      data.category ?? null, data.status, leadId, data.departmentId ?? null,
      data.techStack ?? null, data.startDate ?? null, data.targetEndDate ?? null,
      data.creditHours ?? 0, data.cost ?? null,
      data.applicationsEnabled ?? false, data.applicationsEnabled ? data.applicationRoles ?? [] : [],
    ],
  );
});

// ── delete_project ─────────────────────────────────────────────────────────

registerChangeRequestHandler("delete_project", async ({ targetId }) => {
  if (!targetId) throw new Error("Missing project id");
  if (isMockMode()) {
    const store = getMockStore();
    store.projects = store.projects.filter((p) => p.projectId !== targetId);
    return;
  }
  await query(`DELETE FROM projects WHERE project_id = $1`, [targetId]);
});

// ── decide_service_request ─────────────────────────────────────────────────
//
// Payload: { status, assigneeId?, assigneeNote? }. The handler runs the same
// UPDATE the original PATCH endpoint would have, minus the cross-dept role
// check (the leader has already approved by getting here).

interface DecideServiceRequestPayload {
  status: "assigned" | "in_progress" | "completed" | "rejected";
  assigneeId?: number | null;
  assigneeNote?: string | null;
}

registerChangeRequestHandler("decide_service_request", async ({ payload, targetId }) => {
  if (!targetId) throw new Error("Missing service request id");
  const data = payload as unknown as DecideServiceRequestPayload;
  if (isMockMode()) {
    const store = getMockStore();
    const sr = store.serviceRequests.find((r) => r.requestId === targetId);
    if (!sr) throw new Error("Service request not found");
    sr.status = data.status;
    if (data.assigneeId !== undefined) sr.assigneeId = data.assigneeId;
    if (data.assigneeNote !== undefined) sr.assigneeNote = data.assigneeNote;
    return;
  }
  await query(
    `UPDATE service_requests
        SET status = $1::service_request_status,
            assignee_id = COALESCE($2, assignee_id),
            assignee_note = COALESCE($3, assignee_note),
            decided_at = NOW()
      WHERE request_id = $4`,
    [data.status, data.assigneeId ?? null, data.assigneeNote ?? null, targetId],
  );
});

// ── create_sponsor / update_sponsor / delete_sponsor ───────────────────────
//
// Payload mirrors the sponsor endpoint bodies. Update/delete use targetId.

interface SponsorPayload {
  name?: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  tier?: "platinum" | "gold" | "silver" | "bronze";
  amount?: number | null;
  currency?: string;
  status?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
  nextAction?: string | null;
  lastContactedAt?: string | null;
  proposalTitle?: string | null;
  proposalBody?: string | null;
  proposalPdfUrl?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
}

registerChangeRequestHandler("create_sponsor", async ({ payload }) => {
  const d = payload as unknown as SponsorPayload;
  if (!d.name) throw new Error("Sponsor name required");
  if (isMockMode()) {
    const id = nextMockId("sponsor");
    getMockStore().sponsors.unshift({
      sponsorId: id,
      name: d.name,
      logoUrl: d.logoUrl ?? null,
      websiteUrl: d.websiteUrl ?? null,
      tier: d.tier ?? "bronze",
      amount: d.amount ?? null,
      currency: d.currency ?? "SAR",
      status: (d.status as "wanting_to_contact" | "contacted" | "in_process" | "valid" | "failed" | undefined) ?? "wanting_to_contact",
      contactName: d.contactName ?? null,
      contactEmail: d.contactEmail ?? null,
      notes: d.notes ?? null,
      nextAction: d.nextAction ?? null,
      lastContactedAt: d.lastContactedAt ?? null,
      proposalTitle: d.proposalTitle ?? null,
      proposalBody: d.proposalBody ?? null,
      proposalPdfUrl: d.proposalPdfUrl ?? null,
      proposalUpdatedAt: null,
      contractStart: d.contractStart ?? null,
      contractEnd: d.contractEnd ?? null,
      managedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  await query(
    `INSERT INTO sponsors (name, logo_url, website_url, tier, amount, currency, status,
       contact_name, contact_email, notes, next_action, last_contacted_at,
       proposal_title, proposal_body, proposal_pdf_url, contract_start, contract_end)
     VALUES ($1,$2,$3,$4::sponsor_tier,$5,$6,$7::sponsor_status,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      d.name, d.logoUrl ?? null, d.websiteUrl ?? null, d.tier ?? "bronze",
      d.amount ?? null, d.currency ?? "SAR", d.status ?? "wanting_to_contact",
      d.contactName ?? null, d.contactEmail ?? null, d.notes ?? null,
      d.nextAction ?? null, d.lastContactedAt ?? null,
      d.proposalTitle ?? null, d.proposalBody ?? null, d.proposalPdfUrl ?? null,
      d.contractStart ?? null, d.contractEnd ?? null,
    ],
  );
});

registerChangeRequestHandler("update_sponsor", async ({ payload, targetId }) => {
  if (!targetId) throw new Error("Missing sponsor id");
  const d = payload as unknown as SponsorPayload;
  if (isMockMode()) {
    const sp = getMockStore().sponsors.find((s) => s.sponsorId === targetId);
    if (!sp) throw new Error("Sponsor not found");
    Object.assign(sp, d);
    return;
  }
  // Mirror the column-by-column UPDATE that /api/sponsors/[id] PATCH does.
  // Only update fields that are present in payload.
  const fields: string[] = [];
  const values: unknown[] = [];
  const map: Record<string, string> = {
    name: "name", logoUrl: "logo_url", websiteUrl: "website_url",
    tier: "tier", amount: "amount", currency: "currency", status: "status",
    contactName: "contact_name", contactEmail: "contact_email", notes: "notes",
    nextAction: "next_action", lastContactedAt: "last_contacted_at",
    proposalTitle: "proposal_title", proposalBody: "proposal_body",
    proposalPdfUrl: "proposal_pdf_url",
    contractStart: "contract_start", contractEnd: "contract_end",
  };
  for (const [k, col] of Object.entries(map)) {
    if (k in d) {
      values.push((d as Record<string, unknown>)[k]);
      fields.push(`${col} = $${values.length}`);
    }
  }
  if (fields.length === 0) return;
  values.push(targetId);
  await query(`UPDATE sponsors SET ${fields.join(", ")} WHERE sponsor_id = $${values.length}`, values);
});

registerChangeRequestHandler("delete_sponsor", async ({ targetId }) => {
  if (!targetId) throw new Error("Missing sponsor id");
  if (isMockMode()) {
    const store = getMockStore();
    store.sponsors = store.sponsors.filter((s) => s.sponsorId !== targetId);
    return;
  }
  await query(`DELETE FROM sponsors WHERE sponsor_id = $1`, [targetId]);
});

// ── set_team_visibility ────────────────────────────────────────────────────

interface SetTeamVisibilityPayload {
  isPublicOnTeam: boolean;
}

registerChangeRequestHandler("set_team_visibility", async ({ payload, targetId }) => {
  if (!targetId) throw new Error("Missing member id");
  const d = payload as unknown as SetTeamVisibilityPayload;
  if (isMockMode()) {
    const m = findMockMember(targetId);
    if (!m) throw new Error("Member not found");
    m.isPublicOnTeam = d.isPublicOnTeam;
    return;
  }
  await query(`UPDATE profiles SET is_public_on_team = $1 WHERE member_id = $2`, [
    d.isPublicOnTeam, targetId,
  ]);
});

// ── decide_expense ─────────────────────────────────────────────────────────

interface DecideExpensePayload {
  status: "approved" | "rejected";
}

registerChangeRequestHandler("decide_expense", async ({ payload, targetId, decidedById }) => {
  if (!targetId) throw new Error("Missing expense id");
  const d = payload as unknown as DecideExpensePayload;
  if (isMockMode()) {
    // Mock store doesn't model expenses today; no-op so the request still
    // marks 'applied' rather than failing.
    return;
  }
  await query(
    `UPDATE expenses SET approval_status = $1::approval_status, approved_by = $2, approved_at = NOW()
       WHERE expense_id = $3`,
    [d.status, decidedById, targetId],
  );
});

// ── set_motm ───────────────────────────────────────────────────────────────

interface SetMotmPayload {
  memberIds: number[];
}

registerChangeRequestHandler("set_motm", async ({ payload }) => {
  const d = payload as unknown as SetMotmPayload;
  const ids = Array.isArray(d.memberIds) ? d.memberIds : [];
  if (isMockMode()) {
    upsertSiteContent("members_of_month", { json: ids });
    return;
  }
  await query(
    `INSERT INTO site_content (content_key, value_json) VALUES ('members_of_month', $1::jsonb)
     ON CONFLICT (content_key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()`,
    [JSON.stringify(ids)],
  );
});

// ── update_budget_allocation ──────────────────────────────────────────────

interface UpdateBudgetAllocationPayload {
  departmentSlug: FinanceDepartmentSlug;
  allocated: number;
  note?: string | null;
}

registerChangeRequestHandler("update_budget_allocation", async ({ payload, decidedById }) => {
  const d = payload as unknown as UpdateBudgetAllocationPayload;
  await updateFinanceAllocation(d.departmentSlug, d.allocated, d.note ?? null, decidedById);
});
