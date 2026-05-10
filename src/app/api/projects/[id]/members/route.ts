import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isClubLead, canManageDept, ownsResource } from "@/lib/authz";
import { getMockStore, isMockMode } from "@/lib/mock-store";

async function gateProject(
  s: Awaited<ReturnType<typeof requireSession>>,
  projectId: string,
): Promise<Response | null> {
  if (isClubLead(s)) return null;
  if (isMockMode()) {
    const project = getMockStore().projects.find((p) => p.projectId === Number(projectId));
    if (!project) return err(404, "Not found");
    if (canManageDept(s, project.departmentId) || ownsResource(s, project.leadMemberId)) return null;
    return err(403, "Forbidden");
  }
  const row = await queryOne<{ departmentId: number | null; leadMemberId: number | null }>(
    `SELECT department_id AS "departmentId", lead_member_id AS "leadMemberId" FROM projects WHERE project_id = $1`,
    [projectId],
  );
  if (!row) return err(404, "Not found");
  if (canManageDept(s, row.departmentId) || ownsResource(s, row.leadMemberId)) return null;
  return err(403, "Forbidden");
}

const Post = z.object({
  memberId: z.number().int(),
  role: z.string().default("contributor"),
});

export const POST = handle(async (req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const gate = await gateProject(s, id);
  if (gate) return gate;
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
  const s = await requireSession();
  const { id } = await ctx.params;
  const gate = await gateProject(s, id);
  if (gate) return gate;
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
