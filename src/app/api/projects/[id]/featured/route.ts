import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

const Body = z.object({ isFeatured: z.boolean() });

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isInnoLeader =
    (s.position === "dept_leader" || s.position === "dept_vice_leader") &&
    s.departmentSlug === "innovation";
  if (!isAdmin && !isInnoLeader) return err(403, "Only admins or innovation leaders");

  const { id } = await ctx.params;
  const { isFeatured } = await parseBody(req, Body);
  if (isMockMode()) {
    const project = getMockStore().projects.find((p) => p.projectId === Number(id));
    if (project) project.isFeatured = isFeatured;
    return ok({ success: true });
  }
  await query(`UPDATE projects SET is_featured = $1 WHERE project_id = $2`, [isFeatured, id]);
  return ok({ success: true });
});
