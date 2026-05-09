import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";
import { submitChangeRequest, resolveDepartmentId } from "@/lib/change-requests";

async function gateOrSubmitSponsor(
  s: { position: string; departmentSlug: string | null; memberId: number },
  type: "update_sponsor" | "delete_sponsor",
  targetId: number,
  payload: Record<string, unknown>,
  summary: string,
): Promise<{ requestId: number } | null> {
  const canDoDirectly =
    s.position === "president" || s.position === "vice_president" ||
    ((s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "pr");
  if (canDoDirectly) return null;
  const prDeptId = await resolveDepartmentId("pr");
  if (!prDeptId) throw new Error("PR department not configured");
  const requestId = await submitChangeRequest({
    type,
    departmentId: prDeptId,
    requesterId: s.memberId,
    targetId,
    payload,
    summary,
  });
  return { requestId };
}

const Patch = z.object({
  name: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  tier: z.enum(["platinum", "gold", "silver", "bronze"]).optional(),
  status: z.enum(["wanting_to_contact", "contacted", "in_process", "valid", "failed"]).optional(),
  amount: z.number().nullable().optional(),
  currency: z.string().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional(),
  nextAction: z.string().nullable().optional(),
  lastContactedAt: z.string().nullable().optional(),
  proposalTitle: z.string().nullable().optional(),
  proposalBody: z.string().nullable().optional(),
  proposalPdfUrl: z.string().nullable().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, Patch);
  const queued = await gateOrSubmitSponsor(s, "update_sponsor", Number(id), { ...b }, `Update sponsor #${id}`);
  if (queued) return ok({ requestId: queued.requestId, requiresApproval: true }, { status: 202 });
  if (isMockMode()) {
    const sponsor = getMockStore().sponsors.find((item) => item.sponsorId === Number(id));
    if (!sponsor) return ok({ success: true });
    const now = new Date().toISOString();
    Object.assign(sponsor, {
      ...b,
      updatedAt: now,
      proposalUpdatedAt:
        b.proposalTitle !== undefined || b.proposalBody !== undefined || b.proposalPdfUrl !== undefined
          ? now
          : sponsor.proposalUpdatedAt,
    });
    return ok({ success: true });
  }
  const map: Record<string, string> = {
    name: "name", logoUrl: "logo_url", websiteUrl: "website_url", amount: "amount",
    currency: "currency", contactName: "contact_name", contactEmail: "contact_email",
    notes: "notes", nextAction: "next_action", lastContactedAt: "last_contacted_at",
    proposalTitle: "proposal_title", proposalBody: "proposal_body", proposalPdfUrl: "proposal_pdf_url",
  };
  const sets: string[] = []; const params: unknown[] = [id];
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    if (k === "tier") { params.push(v); sets.push(`tier = $${params.length}::sponsor_tier`); }
    else if (k === "status") { params.push(v); sets.push(`status = $${params.length}::sponsor_status`); }
    else if (map[k]) { params.push(v); sets.push(`${map[k]} = $${params.length}`); }
  }
  if (b.proposalTitle !== undefined || b.proposalBody !== undefined || b.proposalPdfUrl !== undefined) {
    sets.push(`proposal_updated_at = NOW()`);
  }
  if (!sets.length) return ok({ success: true });
  await query(`UPDATE sponsors SET ${sets.join(", ")} WHERE sponsor_id = $1`, params);
  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const queued = await gateOrSubmitSponsor(s, "delete_sponsor", Number(id), { sponsorId: Number(id) }, `Delete sponsor #${id}`);
  if (queued) return ok({ requestId: queued.requestId, requiresApproval: true }, { status: 202 });
  if (isMockMode()) {
    const store = getMockStore();
    store.sponsors = store.sponsors.filter((item) => item.sponsorId !== Number(id));
    return ok({ success: true });
  }
  await query(`DELETE FROM sponsors WHERE sponsor_id = $1`, [id]);
  return ok({ success: true });
});
