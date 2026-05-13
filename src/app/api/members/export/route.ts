import { handle } from "@/lib/api";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

const HEADERS = [
  "member_id",
  "email",
  "full_name",
  "full_name_ar",
  "position",
  "department_slug",
  "custom_role",
  "custom_role_ar",
  "major",
  "phone_number",
  "gender",
  "graduation_year",
  "is_active",
  "profile_status",
];

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(values: unknown[]): string {
  return values.map(csvEscape).join(",");
}

export const GET = handle(async () => {
  await requireAdmin();

  const today = new Date().toISOString().slice(0, 10);
  const filename = `drc-roster-${today}.csv`;

  let rows: unknown[][];
  if (isMockMode()) {
    const POSITION_RANK: Record<string, number> = {
      president: 1, vice_president: 2, dept_leader: 3,
      dept_vice_leader: 4, sub_leader: 5, member: 6,
    };
    rows = getMockStore().members
      .slice()
      .sort((a, b) => {
        const r = (POSITION_RANK[a.position] ?? 99) - (POSITION_RANK[b.position] ?? 99);
        if (r !== 0) return r;
        return (a.fullName ?? "").localeCompare(b.fullName ?? "");
      })
      .map((m) => [
        m.memberId, m.email, m.fullName, m.fullNameAr ?? "",
        m.position, m.departmentSlug ?? "",
        m.customRole ?? "", m.customRoleAr ?? "",
        m.major ?? "", m.phoneNumber ?? "", m.gender ?? "",
        m.graduationYear ?? "", m.isActive ? "true" : "false", m.profileStatus,
      ]);
  } else {
    const result = await query<{
      member_id: number; email: string; full_name: string | null; full_name_ar: string | null;
      position: string; department_slug: string | null;
      custom_role: string | null; custom_role_ar: string | null;
      major: string | null; phone_number: string | null; gender: string | null;
      graduation_year: number | null; is_active: boolean; status: string;
    }>(
      `SELECT u.member_id, u.email, p.full_name, p.full_name_ar,
              u.position::text AS position,
              d.slug::text AS department_slug,
              p.custom_role, p.custom_role_ar,
              p.major, p.phone_number, p.gender, p.graduation_year,
              u.is_active, p.status
         FROM users u
         LEFT JOIN profiles p ON p.member_id = u.member_id
         LEFT JOIN departments d ON d.department_id = u.department_id
        ORDER BY
          CASE u.position
            WHEN 'president' THEN 1
            WHEN 'vice_president' THEN 2
            WHEN 'dept_leader' THEN 3
            WHEN 'dept_vice_leader' THEN 4
            WHEN 'sub_leader' THEN 5
            ELSE 6
          END,
          p.full_name`,
    );
    rows = result.rows.map((r) => [
      r.member_id, r.email, r.full_name ?? "", r.full_name_ar ?? "",
      r.position, r.department_slug ?? "",
      r.custom_role ?? "", r.custom_role_ar ?? "",
      r.major ?? "", r.phone_number ?? "", r.gender ?? "",
      r.graduation_year ?? "", r.is_active ? "true" : "false", r.status,
    ]);
  }

  const csv = [toCsvRow(HEADERS), ...rows.map(toCsvRow)].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
