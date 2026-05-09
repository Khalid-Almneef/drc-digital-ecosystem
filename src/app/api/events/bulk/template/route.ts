import { handle, err } from "@/lib/api";
import { requireSession } from "@/lib/auth";

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * GET /api/events/bulk/template
 *
 * CSV template for bulk-importing past or scheduled events. Fills three example
 * rows so the committee knows the expected format. Available to any leader.
 */
export const GET = handle(async () => {
  const s = await requireSession();
  const isLeader = ["president", "vice_president", "dept_leader", "dept_vice_leader"].includes(s.position);
  if (!isLeader) return err(403, "Only leaders can download bulk templates.");

  const headers = [
    "title",
    "description",
    "type",            // workshop | competition | meetup | general
    "category",
    "start_time",      // ISO 8601, e.g. 2026-04-15T17:00:00Z
    "end_time",        // optional
    "location",
    "seats_available", // integer or empty
    "credit_hours",    // number, default 0
    "is_published",    // TRUE | FALSE
    "image_url",       // optional /uploads/... path
  ];

  const examples = [
    [
      "Trilogy 1 — Tools & growth",
      "Workshop on must-have tools every member should know.",
      "workshop",
      "Knowledge sharing",
      "2025-11-13T16:45:00Z",
      "2025-11-13T18:30:00Z",
      "King Saud University",
      "",
      "2",
      "TRUE",
      "/uploads/scraped/example.jpg",
    ],
    [
      "Industry visit — Elm Applied Research",
      "Tour of the robotics lab and chat with a DRC alumnus working there.",
      "meetup",
      "Industry visit",
      "2025-10-15T17:00:00Z",
      "",
      "Elm HQ, Riyadh",
      "30",
      "3",
      "TRUE",
      "",
    ],
    [
      "BINGO BOT v2 Championship",
      "Internal competition — building autonomous bots that play bingo.",
      "competition",
      "Robotics",
      "2025-10-13T10:00:00Z",
      "2025-10-13T15:00:00Z",
      "Innovation Lab",
      "",
      "5",
      "FALSE",
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
      "Content-Disposition": `attachment; filename="events-bulk-template.csv"`,
    },
  });
});
