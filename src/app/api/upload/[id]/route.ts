import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";
import { getMockStore, isMockMode } from "@/lib/mock-store";

export const runtime = "nodejs";

export const PATCH = handle(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, z.object({
    label: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  }));
  if (isMockMode()) {
    const asset = getMockStore().assets.find((a) => a.assetId === Number(id));
    if (!asset) return err(404, "Not found");
    if (b.label !== undefined) asset.label = b.label;
    if (b.tags !== undefined) asset.tags = b.tags;
    return ok({ success: true });
  }
  const sets: string[] = [];
  const params: unknown[] = [id];
  if (b.label !== undefined) { params.push(b.label); sets.push(`label = $${params.length}`); }
  if (b.tags  !== undefined) { params.push(b.tags);  sets.push(`tags = $${params.length}`); }
  if (!sets.length) return ok({ success: true });
  await query(`UPDATE media_assets SET ${sets.join(", ")} WHERE asset_id = $1`, params);
  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  if (isMockMode()) {
    const store = getMockStore();
    const asset = store.assets.find((a) => a.assetId === Number(id));
    if (!asset) return err(404, "Not found");
    store.assets = store.assets.filter((a) => a.assetId !== Number(id));
    const filePath = path.join(process.cwd(), "public", "uploads", asset.filename);
    await fs.unlink(filePath).catch(() => {});
    return ok({ success: true });
  }
  const asset = await queryOne<{ filename: string }>(
    `DELETE FROM media_assets WHERE asset_id = $1 RETURNING filename`,
    [id],
  );
  if (!asset) return err(404, "Not found");
  const filePath = path.join(process.cwd(), "public", "uploads", asset.filename);
  await fs.unlink(filePath).catch(() => {});
  return ok({ success: true });
});
