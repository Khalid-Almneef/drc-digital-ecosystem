import { handle, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

// CSV escape: wrap in quotes if it contains a comma, quote, or newline; double internal quotes.
function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// GET /api/volunteer-hours/bulk/template
//   → text/csv with one row per active member: full_name + total_hours.
//   HR fills the `total_hours` column with the member's total credit hours
//   for the period and re-uploads. The import endpoint records that total as
//   a single approved entry per member.
//
//   The previous template asked for hours / title / date / description per
//   row, which was overkill for the way HR actually batches credit hours.
//   See the 2026-05-19 HR sweep (request #5).
export const GET = handle(async () => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isHr = (s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "hr";
  if (!isAdmin && !isHr) return err(403, "Forbidden");

  const today = new Date().toISOString().slice(0, 10);
  const headers = ["member_id", "full_name", "total_hours"];

  let rows: Array<{ memberId: number; fullName: string }> = [];

  if (isMockMode()) {
    const store = getMockStore();
    rows = store.members
      .filter((m) => m.isActive)
      .map((m) => ({ memberId: m.memberId, fullName: m.fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  } else {
    const result = await query<{
      memberId: number; fullName: string | null; fullNameAr: string | null; email: string;
    }>(
      `SELECT u.member_id      AS "memberId",
              u.email,
              p.full_name      AS "fullName",
              p.full_name_ar   AS "fullNameAr"
         FROM users u
         LEFT JOIN profiles p ON p.member_id = u.member_id
        WHERE u.is_active = TRUE
          AND COALESCE(p.status, 'active') <> 'alumni'
        ORDER BY p.full_name ASC NULLS LAST, u.email ASC`,
    );
    rows = result.rows.map((r) => ({
      memberId: r.memberId,
      fullName: r.fullName ?? r.fullNameAr ?? r.email,
    }));
  }

  const lines = [headers.join(",")];
  for (const m of rows) {
    lines.push([csvCell(m.memberId), csvCell(m.fullName), ""].join(","));
  }
  // UTF-8 BOM so Excel renders Arabic names correctly.
  const body = "﻿" + lines.join("\r\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="drc-credit-hours-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
