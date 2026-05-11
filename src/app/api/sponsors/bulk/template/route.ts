import { handle, err } from "@/lib/api";
import { requireSession } from "@/lib/auth";

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * GET /api/sponsors/bulk/template
 *
 * CSV template for bulk-importing sponsors. Mirrors the field set on
 * POST /api/sponsors. Only leaders may download (so non-leaders don't see
 * the proposal columns surface area).
 */
export const GET = handle(async () => {
  const s = await requireSession();
  const isLeader = ["president", "vice_president", "dept_leader", "dept_vice_leader"].includes(s.position);
  if (!isLeader) return err(403, "Only leaders can download bulk templates.");

  const headers = [
    "name",              // required
    "tier",              // platinum | gold | silver | bronze (default bronze)
    "status",            // wanting_to_contact | contacted | in_process | valid | failed
    "amount",            // number or empty
    "currency",          // default SAR
    "website_url",
    "logo_url",
    "contact_name",
    "contact_email",
    "next_action",
    "last_contacted_at", // ISO 8601 timestamp or empty
    "notes",
    "proposal_title",
    "proposal_body",
    "proposal_pdf_url",
  ];

  const examples = [
    [
      "STC Group",
      "platinum",
      "in_process",
      "50000",
      "SAR",
      "https://stc.com.sa",
      "",
      "Sarah Al-Anazi",
      "sarah@example.com",
      "Schedule follow-up call",
      "2026-04-12T10:00:00Z",
      "Strong interest after first pitch — wants final deck by next week.",
      "DRC × STC Sponsorship Proposal",
      "",
      "",
    ],
    [
      "Aramco",
      "gold",
      "valid",
      "25000",
      "SAR",
      "https://aramco.com",
      "",
      "Khalid Al-Otaibi",
      "",
      "",
      "",
      "Renewal signed for 2026 season.",
      "",
      "",
      "",
    ],
    [
      "Elm Applied Research",
      "silver",
      "contacted",
      "",
      "SAR",
      "https://elm.sa",
      "",
      "",
      "",
      "Send initial deck",
      "",
      "",
      "",
      "",
      "",
    ],
  ];

  const lines = [headers.join(",")];
  for (const row of examples) lines.push(row.map(csvCell).join(","));

  const csv = lines.join("\n");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sponsors-bulk-template.csv"`,
    },
  });
});
