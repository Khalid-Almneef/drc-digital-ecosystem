import { query } from "@/lib/db";
import { getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

export type NotificationCategory =
  | "task_assigned"
  | "task_returned"
  | "task_approved"
  | "hours_approved"
  | "hours_rejected"
  | "application_decision"
  | "project_application_decision"
  | "service_request_update"
  | "announcement_request_update"
  | "announcement_published"
  | "expense_decision"
  | "membership_approved"
  | "system";

export interface NotificationInput {
  recipientId: number;
  category: NotificationCategory;
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  sourceType?: string | null;
  sourceId?: number | null;
}

/**
 * Insert a single notification. Safe to await but errors are swallowed —
 * notification failures must never block the actual API write.
 */
export async function emitNotification(input: NotificationInput): Promise<void> {
  try {
    if (isMockMode()) {
      const store = getMockStore();
      store.notifications.unshift({
        notificationId: nextMockId("notification"),
        recipientId: input.recipientId,
        category: input.category,
        title: input.title,
        body: input.body ?? null,
        linkUrl: input.linkUrl ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        isRead: false,
        createdAt: new Date().toISOString(),
        readAt: null,
      });
      return;
    }
    await query(
      `INSERT INTO notifications
         (recipient_id, category, title, body, link_url, source_type, source_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.recipientId,
        input.category,
        input.title,
        input.body ?? null,
        input.linkUrl ?? null,
        input.sourceType ?? null,
        input.sourceId ?? null,
      ],
    );
  } catch (err) {
    console.error("[notifications] emit failed", err);
  }
}

/** Fan-out to many recipients (e.g. all department leaders). */
export async function emitNotifications(inputs: NotificationInput[]): Promise<void> {
  await Promise.all(inputs.map((input) => emitNotification(input)));
}
