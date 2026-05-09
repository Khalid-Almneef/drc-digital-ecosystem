import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

export const GET = handle(async () => {
  await requireSession();
  if (isMockMode()) {
    const rows = getMockStore().mediaContent
      .slice()
      .sort((a, b) => {
        const left = a.scheduledDate ?? a.createdAt;
        const right = b.scheduledDate ?? b.createdAt;
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
        assignedTo: item.assignedTo,
        assignedToName: item.assignedTo ? findMockMember(item.assignedTo)?.fullName ?? null : null,
      }));
    return ok(rows);
  }
  const { rows } = await query(
    `SELECT content_id AS "contentId", title, type, platform, status::text AS status,
            description, file_url AS "fileUrl", assigned_to AS "assignedTo",
            p.full_name AS "assignedToName",
            scheduled_date AS "scheduledDate", published_date AS "publishedDate",
            views, likes, shares
       FROM media_content mc
       LEFT JOIN profiles p ON p.member_id = mc.assigned_to
      ORDER BY COALESCE(scheduled_date, created_at) DESC`,
  );
  return ok(rows);
});

const Post = z.object({
  title: z.string().min(1),
  type: z.enum(["post", "story", "reel", "video", "photo", "article"]),
  platform: z.enum(["instagram", "twitter", "linkedin", "youtube", "website", "other"]).optional(),
  description: z.string().optional(),
  fileUrl: z.string().optional(),
  scheduledDate: z.string().optional(),
  status: z.enum(["draft", "in_review", "scheduled", "published", "archived"]).default("draft"),
  assignedTo: z.number().int().optional(),
});

export const POST = handle(async (req) => {
  const s = await requireSession();
  const b = await parseBody(req, Post);
  if (isMockMode()) {
    const contentId = nextMockId("mediaContent");
    getMockStore().mediaContent.unshift({
      contentId,
      title: b.title,
      type: b.type,
      platform: b.platform ?? null,
      description: b.description ?? null,
      fileUrl: b.fileUrl ?? null,
      scheduledDate: b.scheduledDate ?? null,
      publishedDate: b.status === "published" ? new Date().toISOString() : null,
      status: b.status,
      views: 0,
      likes: 0,
      shares: 0,
      assignedTo: b.assignedTo ?? null,
      createdBy: s.memberId,
      createdAt: new Date().toISOString(),
    });
    return ok({ contentId }, { status: 201 });
  }
  const { rows } = await query<{ content_id: number }>(
    `INSERT INTO media_content (title, type, platform, description, file_url,
       scheduled_date, status, assigned_to, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7::content_status,$8,$9) RETURNING content_id`,
    [
      b.title, b.type, b.platform ?? null, b.description ?? null, b.fileUrl ?? null,
      b.scheduledDate ?? null, b.status, b.assignedTo ?? null, s.memberId,
    ],
  );
  return ok({ contentId: rows[0].content_id }, { status: 201 });
});
