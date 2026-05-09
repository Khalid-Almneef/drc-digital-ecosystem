import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

export const runtime = "nodejs";

const Patch = z.object({
  isRead: z.boolean(),
});

export const PATCH = handle(async (req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const notificationId = Number(id);
  const body = await parseBody(req, Patch);

  if (isMockMode()) {
    const store = getMockStore();
    const notification = store.notifications.find(
      (n) => n.notificationId === notificationId && n.recipientId === session.memberId,
    );
    if (!notification) return err(404, "Notification not found");
    notification.isRead = body.isRead;
    notification.readAt = body.isRead ? new Date().toISOString() : null;
    return ok({ success: true });
  }

  const result = await query(
    `UPDATE notifications
        SET is_read = $1,
            read_at = CASE WHEN $1 THEN NOW() ELSE NULL END
      WHERE notification_id = $2
        AND recipient_id = $3`,
    [body.isRead, notificationId, session.memberId],
  );
  if (result.rowCount === 0) return err(404, "Notification not found");
  return ok({ success: true });
});
