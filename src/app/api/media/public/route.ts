import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { getMockStore, isMockMode } from "@/lib/mock-store";

export const GET = handle(async () => {
  if (isMockMode()) {
    const rows = getMockStore().mediaContent
      .filter((item) => item.fileUrl && (item.status === "published" || item.status === "scheduled"))
      .slice()
      .sort((a, b) => {
        const left = a.publishedDate ?? a.scheduledDate ?? a.createdAt;
        const right = b.publishedDate ?? b.scheduledDate ?? b.createdAt;
        return right.localeCompare(left);
      })
      .map((item) => ({
        contentId: item.contentId,
        title: item.title,
        type: item.type,
        platform: item.platform,
        description: item.description,
        fileUrl: item.fileUrl,
        status: item.status,
        scheduledDate: item.scheduledDate,
        publishedDate: item.publishedDate,
        views: item.views,
        likes: item.likes,
        shares: item.shares,
      }));
    return ok(rows);
  }

  const { rows } = await query(
    `SELECT content_id AS "contentId", title, type, platform, status::text AS status,
            description, file_url AS "fileUrl",
            scheduled_date AS "scheduledDate", published_date AS "publishedDate",
            views, likes, shares
       FROM media_content
      WHERE file_url IS NOT NULL
        AND status IN ('published', 'scheduled')
      ORDER BY COALESCE(published_date, scheduled_date, created_at) DESC
      LIMIT 12`,
  );

  return ok(rows);
});
