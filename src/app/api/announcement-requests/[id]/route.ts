import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

const Patch = z.object({
  status: z.enum(["published", "rejected"]),
});

export const PATCH = handle(async (req, ctx) => {
  const session = await requireSession();
  const isAdmin = session.position === "president" || session.position === "vice_president";
  const isMedia = (session.position === "dept_leader" || session.position === "dept_vice_leader") && session.departmentSlug === "media";
  if (!isAdmin && !isMedia) return err(403, "Forbidden");

  const { id } = await ctx.params;
  const body = await parseBody(req, Patch);
  const requestId = Number(id);

  if (isMockMode()) {
    const store = getMockStore();
    const request = store.announcementRequests.find((item) => item.requestId === requestId);
    if (!request) return err(404, "Request not found");
    if (request.status !== "pending") return err(400, "Only pending requests can be updated.");

    request.status = body.status;
    request.handledBy = session.memberId;
    request.resolvedAt = new Date().toISOString();

    if (body.status === "published") {
      const announcementId = nextMockId("announcement");
      store.announcements.unshift({
        announcementId,
        title: request.title,
        body: request.body,
        imageUrl: null,
        priority: request.priority,
        isPinned: false,
        createdAt: new Date().toISOString(),
        expiresAt: null,
        authorId: session.memberId,
      });
      request.publishedAnnouncementId = announcementId;
    }

    return ok({ success: true });
  }

  const publishedAnnouncement = body.status === "published"
    ? await query<{ announcement_id: number }>(
      `WITH request_data AS (
         SELECT title, body, priority
           FROM announcement_requests
          WHERE request_id = $1 AND status = 'pending'
       )
       INSERT INTO announcements (title, body, priority, created_by, is_pinned)
       SELECT title, body, priority::announcement_priority, $2, FALSE
         FROM request_data
       RETURNING announcement_id`,
      [requestId, session.memberId],
    )
    : null;

  await query(
    `UPDATE announcement_requests
        SET status = $1,
            handled_by = $2,
            resolved_at = NOW(),
            published_announcement_id = COALESCE($3, published_announcement_id)
      WHERE request_id = $4 AND status = 'pending'`,
    [
      body.status,
      session.memberId,
      publishedAnnouncement?.rows[0]?.announcement_id ?? null,
      requestId,
    ],
  );
  return ok({ success: true });
});
