import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { departmentById, findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";

export const GET = handle(async () => {
  const session = await getSession();
  if (isMockMode()) {
    const store = getMockStore();
    const rows = store.projects
      .filter((p) => !p.isDeleted && p.isPublished && p.status !== "archived" && (
        p.status === "in_progress" ||
        p.status === "completed" ||
        p.status === "testing" ||
        p.applicationsEnabled
      ))
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
      .map((p) => {
        const dept = departmentById(p.departmentId);
        const lead = p.leadMemberId ? findMockMember(p.leadMemberId) : null;
        const myApplicationRoles = session
          ? store.projectApplications
            .filter((application) =>
              application.projectId === p.projectId &&
              application.memberId === session.memberId &&
              application.status !== "rejected",
            )
            .map((application) => application.role)
          : [];
        const contributors = store.projectMembers
          .filter((pm) => pm.projectId === p.projectId)
          .map((pm) => {
            const member = findMockMember(pm.memberId);
            return {
              memberId: pm.memberId,
              role: pm.role,
              fullName: member?.fullName ?? "Unknown member",
              email: member?.email ?? "",
              avatarUrl: member?.avatarUrl ?? null,
              bio: member?.bio ?? null,
              linkedinUrl: member?.linkedinUrl ?? null,
            };
          });
        return {
          projectId: p.projectId,
          title: p.title,
          description: p.description,
          imageUrl: p.imageUrl,
          githubUrl: p.githubUrl,
          category: p.category,
          status: p.status,
          techStack: p.techStack,
          isFeatured: p.isFeatured,
          departmentSlug: dept?.slug ?? null,
          departmentName: dept?.name ?? "Club-wide",
          leadName: lead?.fullName ?? null,
          leadAvatarUrl: lead?.avatarUrl ?? null,
          contributors,
          applicationsEnabled: session ? p.applicationsEnabled : false,
          applicationRoles: session && p.applicationsEnabled ? p.applicationRoles : [],
          myApplicationRoles,
        };
      });
    return ok(rows);
  }
  const { rows } = await query<{
    projectId: number;
    title: string;
    description: string | null;
    imageUrl: string | null;
    githubUrl: string | null;
    category: string | null;
    status: string;
    techStack: string[] | null;
    isFeatured: boolean;
    departmentSlug: string | null;
    departmentName: string | null;
    leadName: string | null;
    leadAvatarUrl: string | null;
    contributors: Array<{
      memberId: number;
      role: string;
      fullName: string | null;
      email: string | null;
      avatarUrl: string | null;
      bio: string | null;
      linkedinUrl: string | null;
    }>;
    applicationsEnabled: boolean;
    applicationRoles: string[] | null;
  }>(
    `SELECT
       p.project_id   AS "projectId",
       p.title,
       p.description,
       p.image_url    AS "imageUrl",
       p.github_url   AS "githubUrl",
       p.category,
       p.status::text AS status,
       p.tech_stack   AS "techStack",
       p.is_featured  AS "isFeatured",
       p.applications_enabled AS "applicationsEnabled",
       p.application_roles AS "applicationRoles",
       d.slug::text   AS "departmentSlug",
       d.name         AS "departmentName",
       lp.full_name   AS "leadName",
       lp.avatar_url  AS "leadAvatarUrl",
       COALESCE(
         json_agg(
           json_build_object(
             'memberId',    pm.member_id,
             'role',        pm.role,
             'fullName',    mp.full_name,
             'email',       mu.email,
             'avatarUrl',   mp.avatar_url,
             'bio',         mp.bio,
             'linkedinUrl', mp.linkedin_url
           ) ORDER BY pm.joined_at ASC
         ) FILTER (WHERE pm.member_id IS NOT NULL),
         '[]'::json
       ) AS contributors
     FROM projects p
     LEFT JOIN departments    d  ON d.department_id = p.department_id
     LEFT JOIN profiles       lp ON lp.member_id    = p.lead_member_id
     LEFT JOIN project_members pm ON pm.project_id  = p.project_id
     LEFT JOIN users          mu ON mu.member_id    = pm.member_id
     LEFT JOIN profiles       mp ON mp.member_id    = pm.member_id
    WHERE p.is_published = TRUE
      AND p.is_deleted = FALSE
      AND p.status <> 'archived'
      AND (p.status IN ('in_progress','completed','testing') OR p.applications_enabled = TRUE)
    GROUP BY p.project_id, d.slug, d.name, lp.full_name, lp.avatar_url
    ORDER BY p.is_featured DESC, p.completed_date DESC NULLS LAST, p.created_at DESC`,
  );
  const myApplications = session
    ? await query<{ projectId: number; roles: string[] }>(
      `SELECT project_id AS "projectId", array_agg(role ORDER BY created_at DESC) AS roles
         FROM project_applications
        WHERE member_id = $1 AND status IN ('pending', 'accepted')
        GROUP BY project_id`,
      [session.memberId],
    )
    : null;
  const myRolesByProject = new Map<number, string[]>(
    (myApplications?.rows ?? []).map((row) => [row.projectId, row.roles ?? []]),
  );

  return ok(rows.map((row) => ({
    ...row,
    applicationsEnabled: session ? row.applicationsEnabled : false,
    applicationRoles: session && row.applicationsEnabled ? row.applicationRoles ?? [] : [],
    myApplicationRoles: session ? myRolesByProject.get(row.projectId) ?? [] : [],
  })));
});
