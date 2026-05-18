import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";

export const GET = handle(async () => {
  if (isMockMode()) {
    const rows = getMockStore().projects
      .filter((p) => !p.isDeleted && p.isFeatured && p.isPublished)
      .map((p) => ({
        projectId: p.projectId,
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        category: p.category,
        status: p.status,
        techStack: p.techStack,
        leadName: p.leadMemberId ? findMockMember(p.leadMemberId)?.fullName ?? null : null,
        leadAvatarUrl: p.leadMemberId ? findMockMember(p.leadMemberId)?.avatarUrl ?? null : null,
      }));
    return ok(rows);
  }
  const { rows } = await query(
    `SELECT p.project_id AS "projectId", p.title, p.description, p.image_url AS "imageUrl",
            p.category, p.status::text AS status, p.tech_stack AS "techStack",
            lp.full_name AS "leadName", lp.avatar_url AS "leadAvatarUrl"
       FROM projects p
       LEFT JOIN profiles lp ON lp.member_id = p.lead_member_id
      WHERE p.is_featured = TRUE AND p.is_published = TRUE AND p.is_deleted = FALSE
      ORDER BY p.updated_at DESC`,
  );
  return ok(rows);
});
