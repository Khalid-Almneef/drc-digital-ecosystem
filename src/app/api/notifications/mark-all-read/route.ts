import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

export const runtime = "nodejs";

export const POST = handle(async () => {
  const session = await requireSession();

  if (isMockMode()) {
    const now = new Date().toISOString();
    const store = getMockStore();
    let count = 0;
    for (const n of store.notifications) {
      if (n.recipientId === session.memberId && !n.isRead) {
        n.isRead = true;
        n.readAt = now;
        count += 1;
      }
    }
    return ok({ markedCount: count });
  }

  const result = await query(
    `UPDATE notifications
        SET is_read = TRUE,
            read_at = NOW()
      WHERE recipient_id = $1
        AND is_read = FALSE`,
    [session.memberId],
  );
  return ok({ markedCount: result.rowCount ?? 0 });
});
