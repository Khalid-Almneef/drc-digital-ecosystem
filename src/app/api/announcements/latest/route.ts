import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { getMockStore, isMockMode } from "@/lib/mock-store";

export const GET = handle(async () => {
  if (isMockMode()) {
    return ok(getMockStore().announcements.filter((a) => !a.isDeleted).slice(0, 5));
  }
  const { rows } = await query(
    `SELECT announcement_id AS "announcementId", title, body, image_url AS "imageUrl",
            priority::text AS priority, is_pinned AS "isPinned",
            created_at AS "createdAt"
       FROM announcements
      WHERE is_deleted = FALSE
        AND target_position IS NULL AND target_department_id IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY is_pinned DESC, created_at DESC
      LIMIT 5`,
  );
  return ok(rows);
});
