import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

export const runtime = "nodejs";

export const GET = handle(async (req) => {
  const session = await requireSession();
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

  if (isMockMode()) {
    const rows = getMockStore().notifications
      .filter((n) => n.recipientId === session.memberId)
      .filter((n) => !unreadOnly || !n.isRead)
      .slice(0, limit);
    const unreadCount = getMockStore().notifications.filter(
      (n) => n.recipientId === session.memberId && !n.isRead,
    ).length;
    return ok({ rows, unreadCount });
  }

  const conditions = ["recipient_id = $1"];
  const params: unknown[] = [session.memberId];
  if (unreadOnly) conditions.push("is_read = FALSE");
  params.push(limit);

  const { rows } = await query(
    `SELECT notification_id  AS "notificationId",
            recipient_id     AS "recipientId",
            category,
            title,
            body,
            link_url         AS "linkUrl",
            source_type      AS "sourceType",
            source_id        AS "sourceId",
            is_read          AS "isRead",
            created_at       AS "createdAt",
            read_at          AS "readAt"
       FROM notifications
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT $${params.length}`,
    params,
  );

  const unreadResult = await query<{ unread: string }>(
    `SELECT COUNT(*)::text AS unread FROM notifications WHERE recipient_id = $1 AND is_read = FALSE`,
    [session.memberId],
  );
  const unreadCount = Number(unreadResult.rows[0]?.unread ?? 0);

  return ok({ rows, unreadCount });
});
