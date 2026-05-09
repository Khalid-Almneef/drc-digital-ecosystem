import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { submitChangeRequest, resolveDepartmentId } from "@/lib/change-requests";

const SponsorStatus = z.enum(["wanting_to_contact", "contacted", "in_process", "valid", "failed"]);

export const GET = handle(async () => {
  await requireSession();
  if (isMockMode()) {
    return ok([...getMockStore().sponsors].sort((a, b) => a.name.localeCompare(b.name)));
  }
  const { rows } = await query(
    `SELECT sponsor_id AS "sponsorId", name, logo_url AS "logoUrl", website_url AS "websiteUrl",
            tier::text AS tier, amount, currency, status::text AS status,
            contact_name AS "contactName", contact_email AS "contactEmail",
            contract_start AS "contractStart", contract_end AS "contractEnd", notes,
            next_action AS "nextAction", last_contacted_at AS "lastContactedAt",
            proposal_title AS "proposalTitle", proposal_body AS "proposalBody",
            proposal_pdf_url AS "proposalPdfUrl", proposal_updated_at AS "proposalUpdatedAt",
            managed_by AS "managedBy", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM sponsors ORDER BY name`,
  );
  return ok(rows);
});

const Post = z.object({
  name: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  tier: z.enum(["platinum", "gold", "silver", "bronze"]).default("bronze"),
  amount: z.number().nullable().optional(),
  currency: z.string().default("SAR"),
  status: SponsorStatus.default("wanting_to_contact"),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional(),
  nextAction: z.string().nullable().optional(),
  lastContactedAt: z.string().nullable().optional(),
  proposalTitle: z.string().nullable().optional(),
  proposalBody: z.string().nullable().optional(),
  proposalPdfUrl: z.string().nullable().optional(),
});

export const POST = handle(async (req) => {
  const s = await requireSession();
  const b = await parseBody(req, Post);

  // Sponsors are PR's domain — any club leader or PR's own leadership can
  // create directly; everyone else routes through change_requests addressed
  // to PR leadership (regardless of the requester's own department).
  const canDoDirectly =
    s.position === "president" || s.position === "vice_president" ||
    ((s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "pr");
  if (!canDoDirectly) {
    const prDeptId = await resolveDepartmentId("pr");
    if (!prDeptId) return err(500, "PR department not configured");
    const requestId = await submitChangeRequest({
      type: "create_sponsor",
      departmentId: prDeptId,
      requesterId: s.memberId,
      payload: { ...b },
      summary: `Add sponsor: "${b.name}"`,
    });
    return ok({ requestId, requiresApproval: true }, { status: 202 });
  }

  if (isMockMode()) {
    const now = new Date().toISOString();
    const sponsorId = nextMockId("sponsor");
    getMockStore().sponsors.unshift({
      sponsorId,
      name: b.name,
      logoUrl: b.logoUrl ?? null,
      websiteUrl: b.websiteUrl ?? null,
      tier: b.tier,
      amount: b.amount ?? null,
      currency: b.currency,
      status: b.status,
      contactName: b.contactName ?? null,
      contactEmail: b.contactEmail ?? null,
      contractStart: null,
      contractEnd: null,
      notes: b.notes ?? null,
      nextAction: b.nextAction ?? null,
      lastContactedAt: b.lastContactedAt ?? null,
      proposalTitle: b.proposalTitle ?? `${b.name} Sponsorship Proposal`,
      proposalBody: b.proposalBody ?? null,
      proposalPdfUrl: b.proposalPdfUrl ?? null,
      proposalUpdatedAt: b.proposalTitle || b.proposalBody || b.proposalPdfUrl ? now : null,
      managedBy: s.memberId,
      createdAt: now,
      updatedAt: now,
    });
    return ok({ sponsorId }, { status: 201 });
  }
  const { rows } = await query<{ sponsor_id: number }>(
    `INSERT INTO sponsors (name, logo_url, website_url, tier, amount, currency, status,
       contact_name, contact_email, notes, next_action, last_contacted_at,
       proposal_title, proposal_body, proposal_pdf_url, proposal_updated_at, managed_by)
     VALUES ($1,$2,$3,$4::sponsor_tier,$5,$6,$7::sponsor_status,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING sponsor_id`,
    [
      b.name, b.logoUrl ?? null, b.websiteUrl ?? null, b.tier, b.amount ?? null,
      b.currency, b.status, b.contactName ?? null, b.contactEmail ?? null, b.notes ?? null,
      b.nextAction ?? null, b.lastContactedAt ?? null, b.proposalTitle ?? null,
      b.proposalBody ?? null, b.proposalPdfUrl ?? null,
      b.proposalTitle || b.proposalBody || b.proposalPdfUrl ? new Date() : null, s.memberId,
    ],
  );
  return ok({ sponsorId: rows[0].sponsor_id }, { status: 201 });
});
