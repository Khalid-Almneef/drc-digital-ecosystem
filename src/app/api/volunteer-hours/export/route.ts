import { handle } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode, findMockMember } from "@/lib/mock-store";

const HEADERS = [
  "volunthr_id",
  "member_email",
  "member_name",
  "department_slug",
  "hours",
  "title",
  "description",
  "participation_date",
  "approval_status",
  "approved_at",
];

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isHrLeader(s: { position: string; departmentSlug: string | null }): boolean {
  if (s.position === "president" || s.position === "vice_president") return true;
  if (s.departmentSlug !== "hr") return false;
  return ["dept_leader", "dept_vice_leader", "sub_leader"].includes(s.position);
}

export const GET = handle(async () => {
  const session = await requireSession();
  if (!isHrLeader(session)) {
    return new Response("Forbidden", { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const filename = `drc-credit-hours-${today}.csv`;

  let rows: unknown[][];
  if (isMockMode()) {
    rows = getMockStore().volunteerHours.map((h) => {
      const member = findMockMember(h.memberId);
      return [
        h.id,
        member?.email ?? "",
        member?.fullName ?? "",
        member?.departmentSlug ?? "",
        h.hours,
        h.title,
        h.description ?? "",
        h.participationDate,
        h.approvalStatus,
        h.approvedAt ?? "",
      ];
    });
  } else {
    const result = await query<{
      volunthr_id: number; email: string; full_name: string | null;
      department_slug: string | null; hours: string;
      title: string; description: string | null;
      participation_date: string; approval_status: string; approved_at: string | null;
    }>(
      `SELECT vh.volunthr_id, u.email, p.full_name,
              d.slug::text AS department_slug,
              vh.hours, vh.title, vh.description, vh.participation_date,
              vh.approval_status::text AS approval_status,
              vh.approved_at
         FROM volunteer_hours vh
         JOIN users u ON u.member_id = vh.member_id
         LEFT JOIN profiles p ON p.member_id = u.member_id
         LEFT JOIN departments d ON d.department_id = u.department_id
        ORDER BY vh.participation_date DESC, vh.volunthr_id DESC`,
    );
    rows = result.rows.map((r) => [
      r.volunthr_id, r.email, r.full_name ?? "", r.department_slug ?? "",
      r.hours, r.title, r.description ?? "",
      r.participation_date, r.approval_status, r.approved_at ?? "",
    ]);
  }

  const csv = [HEADERS, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
