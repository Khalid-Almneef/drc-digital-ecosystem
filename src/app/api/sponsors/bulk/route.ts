import { handle, ok, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

/**
 * POST /api/sponsors/bulk
 *
 * Body: text/csv (one sponsor per row, header row required). Same column names
 * as /api/sponsors/bulk/template. Returns counts: { inserted, skipped, errors }.
 *
 * Gated to PR leadership + club leadership — sponsors are PR's domain and we
 * don't want any leader to be able to seed the sponsor pipeline.
 */
export const POST = handle(async (req) => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isPrLead =
    (s.position === "dept_leader" || s.position === "dept_vice_leader") &&
    s.departmentSlug === "pr";
  if (!isAdmin && !isPrLead) return err(403, "Only PR leadership can bulk-import sponsors.");

  const csvText = await req.text();
  const rows = parseCsv(csvText);
  if (rows.length === 0) return err(400, "CSV is empty.");

  const headerRow = rows[0].map((h) => h.trim().toLowerCase());
  if (!headerRow.includes("name")) return err(400, "Missing column: name");
  const idx = (col: string) => headerRow.indexOf(col);

  const allowedTiers = new Set(["platinum", "gold", "silver", "bronze"]);
  const allowedStatuses = new Set([
    "wanting_to_contact", "contacted", "in_process", "valid", "failed",
  ]);

  const results = { inserted: 0, skipped: 0, errors: [] as string[] };

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((c) => !c.trim())) { results.skipped++; continue; }
    try {
      const get = (col: string) => {
        const i = idx(col);
        if (i < 0) return null;
        const v = row[i]?.trim();
        return v ? v : null;
      };

      const name = get("name");
      if (!name) {
        results.errors.push(`Row ${r + 1}: missing name`);
        continue;
      }

      const tierRaw = (get("tier") ?? "bronze").toLowerCase();
      const tier = allowedTiers.has(tierRaw) ? tierRaw : "bronze";
      const statusRaw = (get("status") ?? "wanting_to_contact").toLowerCase();
      const status = allowedStatuses.has(statusRaw) ? statusRaw : "wanting_to_contact";

      const amountRaw = get("amount");
      const amount = amountRaw ? Number(amountRaw) : null;
      if (amountRaw && Number.isNaN(amount as number)) {
        results.errors.push(`Row ${r + 1}: invalid amount "${amountRaw}"`);
        continue;
      }

      const currency = get("currency") ?? "SAR";
      const websiteUrl = get("website_url");
      const logoUrl = get("logo_url");
      const contactName = get("contact_name");
      const contactEmail = get("contact_email");
      const nextAction = get("next_action");
      const lastContactedAt = get("last_contacted_at");
      const notes = get("notes");
      const proposalTitle = get("proposal_title");
      const proposalBody = get("proposal_body");
      const proposalPdfUrl = get("proposal_pdf_url");
      const hasProposal = Boolean(proposalTitle || proposalBody || proposalPdfUrl);

      if (isMockMode()) {
        const now = new Date().toISOString();
        const sponsorId = nextMockId("sponsor");
        getMockStore().sponsors.unshift({
          sponsorId,
          name,
          logoUrl,
          websiteUrl,
          tier: tier as "platinum" | "gold" | "silver" | "bronze",
          amount,
          currency,
          status: status as "wanting_to_contact" | "contacted" | "in_process" | "valid" | "failed",
          contactName,
          contactEmail,
          contractStart: null,
          contractEnd: null,
          notes,
          nextAction,
          lastContactedAt,
          proposalTitle: proposalTitle ?? `${name} Sponsorship Proposal`,
          proposalBody,
          proposalPdfUrl,
          proposalUpdatedAt: hasProposal ? now : null,
          managedBy: s.memberId,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await query(
          `INSERT INTO sponsors (name, logo_url, website_url, tier, amount, currency, status,
             contact_name, contact_email, notes, next_action, last_contacted_at,
             proposal_title, proposal_body, proposal_pdf_url, proposal_updated_at, managed_by)
           VALUES ($1,$2,$3,$4::sponsor_tier,$5,$6,$7::sponsor_status,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          [
            name, logoUrl, websiteUrl, tier, amount, currency, status,
            contactName, contactEmail, notes, nextAction, lastContactedAt,
            proposalTitle, proposalBody, proposalPdfUrl,
            hasProposal ? new Date() : null, s.memberId,
          ],
        );
      }
      results.inserted++;
    } catch (e) {
      results.errors.push(`Row ${r + 1}: ${(e as Error).message}`);
    }
  }

  return ok(results);
});

// Tiny CSV parser handling double-quoted fields and escaped quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch === "\r") { /* ignore */ }
      else { cell += ch; }
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 0);
}
