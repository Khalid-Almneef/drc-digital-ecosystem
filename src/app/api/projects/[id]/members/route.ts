import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

const Post = z.object({
  memberId: z.number().int(),
  role: z.string().default("contributor"),
});

export const POST = handle(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, Post);
  if (isMockMode()) {
    const store = getMockStore();
    const existing = store.projectMembers.find((pm) => pm.projectId === Number(id) && pm.memberId === b.memberId);
    if (existing) existing.role = b.role;
    else store.projectMembers.push({ projectId: Number(id), memberId: b.memberId, role: b.role, joinedAt: new Date().toISOString() });
    return ok({ success: true });
  }
  await query(
    `INSERT INTO project_members (project_id, member_id, role)
     VALUES ($1, $2, $3) ON CONFLICT (project_id, member_id) DO UPDATE SET role = EXCLUDED.role`,
    [id, b.memberId, b.role],
  );
  return ok({ success: true });
});

const Del = z.object({ memberId: z.number().int() });

export const DELETE = handle(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const b = await parseBody(req, Del);
  if (isMockMode()) {
    const store = getMockStore();
    store.projectMembers = store.projectMembers.filter((pm) => !(pm.projectId === Number(id) && pm.memberId === b.memberId));
    return ok({ success: true });
  }
  await query(`DELETE FROM project_members WHERE project_id = $1 AND member_id = $2`, [
    id, b.memberId,
  ]);
  return ok({ success: true });
});
