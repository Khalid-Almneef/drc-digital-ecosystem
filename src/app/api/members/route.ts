import { z } from "zod";
import { handle, ok, parseQuery } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

const Query = z.object({
  department: z.string().optional(),
  position: z.string().optional(),
  status: z.string().optional(),
});

export const GET = handle(async (req) => {
  await requireSession();
  const url = new URL(req.url);
  const q = parseQuery(url, Query);
  if (isMockMode()) {
    const rows = getMockStore().members
      .filter((m) => !q.department || m.departmentSlug === q.department)
      .filter((m) => !q.position || m.position === q.position)
      .filter((m) => !q.status || m.profileStatus === q.status)
      .map((m) => ({
        memberId: m.memberId,
        email: m.email,
        position: m.position,
        isActive: m.isActive,
        departmentSlug: m.departmentSlug,
        departmentName: m.departmentName,
        departmentNameAr: m.departmentNameAr,
        fullName: m.fullName,
        fullNameAr: m.fullNameAr,
        avatarUrl: m.avatarUrl,
        bio: m.bio,
        major: m.major,
        linkedinUrl: m.linkedinUrl,
        githubUrl: m.githubUrl,
        gender: m.gender,
        profileStatus: m.profileStatus,
        customRole: m.customRole ?? null,
        customRoleAr: m.customRoleAr ?? null,
        isPublicOnTeam: m.isPublicOnTeam,
      }));
    return ok(rows);
  }
  const where: string[] = [];
  const params: unknown[] = [];
  if (q.department) { params.push(q.department); where.push(`d.slug = $${params.length}`); }
  if (q.position)   { params.push(q.position);   where.push(`u.position = $${params.length}::user_position`); }
  if (q.status)     { params.push(q.status);     where.push(`p.status = $${params.length}`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT u.member_id AS "memberId", u.email, u.position::text AS position,
            u.is_active AS "isActive",
            d.slug::text AS "departmentSlug", d.name AS "departmentName", d.name_ar AS "departmentNameAr",
            p.full_name AS "fullName", p.full_name_ar AS "fullNameAr",
            p.avatar_url AS "avatarUrl", p.bio, p.major,
            p.linkedin_url AS "linkedinUrl", p.github_url AS "githubUrl",
            p.gender,
            p.custom_role    AS "customRole",
            p.custom_role_ar AS "customRoleAr",
            p.status AS "profileStatus", p.is_public_on_team AS "isPublicOnTeam"
       FROM users u
       LEFT JOIN departments d ON d.department_id = u.department_id
       LEFT JOIN profiles p    ON p.member_id     = u.member_id
       ${clause}
      ORDER BY u.position, p.full_name`,
    params,
  );
  return ok(rows);
});
