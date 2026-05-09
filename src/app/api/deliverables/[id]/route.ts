import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

const Patch = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  orderIndex: z.number().int().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, Patch);
  if (isMockMode()) {
    const deliverable = getMockStore().deliverables.find((d) => d.deliverableId === Number(id));
    if (!deliverable) return ok({ success: true });
    if (b.title !== undefined) deliverable.title = b.title;
    if (b.description !== undefined) deliverable.description = b.description ?? null;
    if (b.dueDate !== undefined) deliverable.dueDate = b.dueDate ?? null;
    if (b.orderIndex !== undefined) deliverable.orderIndex = b.orderIndex;
    if (b.completed !== undefined) {
      deliverable.completed = b.completed;
      deliverable.completedAt = b.completed ? new Date().toISOString() : null;
    }
    return ok({ success: true });
  }

  const map: Record<string, string> = {
    title: "title",
    description: "description",
    dueDate: "due_date",
    orderIndex: "order_index",
  };

  const sets: string[] = [];
  const params: unknown[] = [id];

  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    if (k === "completed") {
      params.push(v);
      sets.push(`completed = $${params.length}`);
      // Set / clear completed_at based on the boolean
      sets.push(v ? `completed_at = NOW()` : `completed_at = NULL`);
    } else if (map[k]) {
      params.push(v);
      sets.push(`${map[k]} = $${params.length}`);
    }
  }

  if (!sets.length) return ok({ success: true });
  await query(`UPDATE deliverables SET ${sets.join(", ")} WHERE deliverable_id = $1`, params);
  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  if (isMockMode()) {
    const store = getMockStore();
    store.deliverables = store.deliverables.filter((d) => d.deliverableId !== Number(id));
    return ok({ success: true });
  }
  await query(`DELETE FROM deliverables WHERE deliverable_id = $1`, [id]);
  return ok({ success: true });
});
