import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

const Patch = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "in_review", "scheduled", "published", "archived"]).optional(),
  scheduledDate: z.string().nullable().optional(),
  views: z.number().int().optional(),
  likes: z.number().int().optional(),
  shares: z.number().int().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, Patch);
  if (isMockMode()) {
    const item = getMockStore().mediaContent.find((entry) => entry.contentId === Number(id));
    if (!item) return ok({ success: true });
    if (b.title !== undefined) item.title = b.title;
    if (b.description !== undefined) item.description = b.description ?? null;
    if (b.status !== undefined) {
      item.status = b.status;
      if (b.status === "published") item.publishedDate = new Date().toISOString();
    }
    if (b.scheduledDate !== undefined) item.scheduledDate = b.scheduledDate ?? null;
    if (b.views !== undefined) item.views = b.views;
    if (b.likes !== undefined) item.likes = b.likes;
    if (b.shares !== undefined) item.shares = b.shares;
    return ok({ success: true });
  }
  const map: Record<string, string> = {
    title: "title", description: "description", scheduledDate: "scheduled_date",
    views: "views", likes: "likes", shares: "shares",
  };
  const sets: string[] = []; const params: unknown[] = [id];
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    if (k === "status") { params.push(v); sets.push(`status = $${params.length}::content_status`); }
    else if (map[k]) { params.push(v); sets.push(`${map[k]} = $${params.length}`); }
  }
  if (!sets.length) return ok({ success: true });
  await query(`UPDATE media_content SET ${sets.join(", ")} WHERE content_id = $1`, params);
  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  if (isMockMode()) {
    const store = getMockStore();
    store.mediaContent = store.mediaContent.filter((entry) => entry.contentId !== Number(id));
    return ok({ success: true });
  }
  await query(`DELETE FROM media_content WHERE content_id = $1`, [id]);
  return ok({ success: true });
});
