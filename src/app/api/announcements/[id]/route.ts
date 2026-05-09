import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

const Patch = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  isPinned: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, Patch);
  if (isMockMode()) {
    const item = getMockStore().announcements.find((a) => a.announcementId === Number(id));
    if (!item) return ok({ success: true });
    if (b.title !== undefined) item.title = b.title;
    if (b.body !== undefined) item.body = b.body ?? null;
    if (b.imageUrl !== undefined) item.imageUrl = b.imageUrl ?? null;
    if (b.priority !== undefined) item.priority = b.priority;
    if (b.isPinned !== undefined) item.isPinned = b.isPinned;
    if (b.expiresAt !== undefined) item.expiresAt = b.expiresAt ?? null;
    return ok({ success: true });
  }
  const map: Record<string, string> = {
    title: "title", body: "body", imageUrl: "image_url", isPinned: "is_pinned", expiresAt: "expires_at",
  };
  const sets: string[] = [];
  const params: unknown[] = [id];
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    if (k === "priority") { params.push(v); sets.push(`priority = $${params.length}::announcement_priority`); }
    else if (map[k]) { params.push(v); sets.push(`${map[k]} = $${params.length}`); }
  }
  if (!sets.length) return ok({ success: true });
  await query(`UPDATE announcements SET ${sets.join(", ")} WHERE announcement_id = $1`, params);
  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  if (isMockMode()) {
    const store = getMockStore();
    store.announcements = store.announcements.filter((a) => a.announcementId !== Number(id));
    return ok({ success: true });
  }
  await query(`DELETE FROM announcements WHERE announcement_id = $1`, [id]);
  return ok({ success: true });
});
