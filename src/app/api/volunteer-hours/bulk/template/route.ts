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
//   → text/csv stream pre-populated with one row per active member.
//   HR fills `hours` / `title` / `participation_date` columns and re-uploads.
export const GET = handle(async () => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isHr = (s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "hr";
  if (!isAdmin && !isHr) return err(403, "Forbidden");

  const today = new Date().toISOString().slice(0, 10);
  const headers = [
    "member_id",
    "email",
    "full_name",
    "department",
    "hours",
    "title",
    "participation_date",
    "description",
  ];

  let rows: Array<{
    memberId: number;
    email: string;
    fullName: string;
    department: string | null;
  }> = [];

  if (isMockMode()) {
    const store = getMockStore();
    rows = store.members
      .filter((m) => m.isActive)
      .map((m) => ({
        memberId: m.memberId,
        email: m.email,
        fullName: m.fullName,
        department: m.departmentSlug ?? null,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  } else {
    const result = await query<{
      memberId: number;
      email: string;
      fullName: string | null;
      fullNameAr: string | null;
      department: string | null;
    }>(
      `SELECT u.member_id      AS "memberId",
              u.email,
              p.full_name      AS "fullName",
              p.full_name_ar   AS "fullNameAr",
              d.slug::text     AS "department"
         FROM users u
         LEFT JOIN profiles p     ON p.member_id = u.member_id
         LEFT JOIN departments d  ON d.department_id = u.department_id
        WHERE u.is_active = TRUE
          AND COALESCE(p.status, 'active') <> 'alumni'
        ORDER BY p.full_name ASC NULLS LAST, u.email ASC`,
    );
    rows = result.rows.map((r) => ({
      memberId: r.memberId,
      email: r.email,
      fullName: r.fullName ?? r.fullNameAr ?? r.email,
      department: r.department,
    }));
  }

  const lines = [headers.join(",")];
  for (const m of rows) {
    lines.push(
      [
        csvCell(m.memberId),
        csvCell(m.email),
        csvCell(m.fullName),
        csvCell(m.department),
        "", // hours — to fill
        "", // title — to fill
        csvCell(today), // default date
        "", // description — to fill
      ].join(","),
    );
  }
  // Add a UTF-8 BOM so Excel opens Arabic names correctly.
  const body = "﻿" + lines.join("\r\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="drc-credit-hours-template-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
