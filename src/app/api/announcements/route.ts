import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";
import { emitNotifications } from "@/lib/notifications";
import { submitChangeRequest } from "@/lib/change-requests";

export const GET = handle(async () => {
  const s = await requireSession();
  if (isMockMode()) {
    const rows = getMockStore().announcements
      .filter((a) => !a.isDeleted)
      .filter((a) => !a.expiresAt || a.expiresAt > new Date().toISOString())
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .map((a) => ({
        announcementId: a.announcementId,
        title: a.title,
        body: a.body,
        imageUrl: a.imageUrl,
        priority: a.priority,
        targetPosition: null,
        targetDepartmentId: null,
        isPinned: a.isPinned,
        expiresAt: a.expiresAt,
        createdAt: a.createdAt,
        authorId: a.authorId ?? null,
        authorName: a.authorId ? findMockMember(a.authorId)?.fullName ?? null : null,
      }));
    return ok(rows);
  }
  const { rows } = await query(
    `SELECT a.announcement_id AS "announcementId", a.title, a.body, a.image_url AS "imageUrl",
            a.link_url AS "linkUrl",
            a.priority::text AS priority, a.target_position::text AS "targetPosition",
            a.target_department_id AS "targetDepartmentId", a.is_pinned AS "isPinned",
            a.expires_at AS "expiresAt", a.created_at AS "createdAt",
            a.created_by AS "authorId",
            p.full_name AS "authorName"
       FROM announcements a
       LEFT JOIN profiles p ON p.member_id = a.created_by
      WHERE a.is_deleted = FALSE
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
        AND (a.target_position IS NULL OR a.target_position = $1::user_position)
        AND (a.target_department_id IS NULL OR a.target_department_id = $2)
      ORDER BY a.is_pinned DESC, a.created_at DESC`,
    [s.position, s.departmentId],
  );
  return ok(rows);
});

const Post = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  imageUrl: z.string().optional(),
  linkUrl: z.string().max(2048).optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  targetPosition: z
    .enum(["president", "vice_president", "dept_leader", "dept_vice_leader", "sub_leader", "member"])
    .nullable()
    .optional(),
  targetDepartmentId: z.number().int().nullable().optional(),
  isPinned: z.boolean().default(false),
  expiresAt: z.string().optional(),
});

export const POST = handle(async (req) => {
  const s = await requireSession();
  const b = await parseBody(req, Post);

  // Gate: only club leaders and dept leaders/vice-leaders can publish directly.
  // Regular members get their post queued as a change_request, decided by
  // their dept's leadership. The post then runs server-side on approval —
  // see src/lib/change-request-handlers.ts (post_announcement).
  const canPublishDirectly =
    s.position === "president" ||
    s.position === "vice_president" ||
    s.position === "dept_leader" ||
    s.position === "dept_vice_leader";

  if (!canPublishDirectly) {
    if (!s.departmentId) return err(403, "No department leadership to route to");
    const requestId = await submitChangeRequest({
      type: "post_announcement",
      departmentId: s.departmentId,
      requesterId: s.memberId,
      payload: { ...b, originalAuthorId: s.memberId },
      summary: `Post announcement: "${b.title}"`,
    });
    return ok({ requestId, requiresApproval: true }, { status: 202 });
  }

  if (isMockMode()) {
    const announcementId = nextMockId("announcement");
    getMockStore().announcements.unshift({
      announcementId,
      title: b.title,
      body: b.body ?? null,
      imageUrl: b.imageUrl ?? null,
      priority: b.priority,
      isPinned: b.isPinned,
      createdAt: new Date().toISOString(),
      expiresAt: b.expiresAt ?? null,
      authorId: s.memberId,
    });
    return ok({ announcementId }, { status: 201 });
  }
  const { rows } = await query<{ announcement_id: number }>(
    `INSERT INTO announcements (title, body, image_url, link_url, priority, target_position, target_department_id, is_pinned, expires_at, created_by)
     VALUES ($1,$2,$3,$4,$5::announcement_priority,$6,$7,$8,$9,$10) RETURNING announcement_id`,
    [
      b.title, b.body ?? null, b.imageUrl ?? null, b.linkUrl || null, b.priority, b.targetPosition ?? null,
      b.targetDepartmentId ?? null, b.isPinned, b.expiresAt ?? null, s.memberId,
    ],
  );
  const announcementId = rows[0].announcement_id;

  // Fan out an inbox notification only when the announcement is *targeted*
  // (department or position). Untargeted ones already show on the home deck —
  // we don't want to spam every member on every all-hands post.
  if (b.targetDepartmentId || b.targetPosition) {
    const conditions: string[] = ["is_active = TRUE", "member_id <> $1"];
    const params: unknown[] = [s.memberId];
    if (b.targetDepartmentId) {
      params.push(b.targetDepartmentId);
      conditions.push(`department_id = $${params.length}`);
    }
    if (b.targetPosition) {
      params.push(b.targetPosition);
      conditions.push(`position = $${params.length}::user_position`);
    }
    const recipients = await query<{ member_id: number }>(
      `SELECT member_id FROM users WHERE ${conditions.join(" AND ")}`,
      params,
    );
    void emitNotifications(
      recipients.rows.map((r) => ({
        recipientId: r.member_id,
        category: "announcement_published" as const,
        title: `New announcement: ${b.title}`,
        body: b.body ? b.body.slice(0, 200) : null,
        linkUrl: "/dashboard",
        sourceType: "announcement",
        sourceId: announcementId,
      })),
    );
  }

  return ok({ announcementId }, { status: 201 });
});
