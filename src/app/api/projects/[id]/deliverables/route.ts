import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isClubLead, canManageDept, ownsResource } from "@/lib/authz";
import { getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

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

export const GET = handle(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  if (isMockMode()) {
    const rows = getMockStore().deliverables
      .filter((d) => d.projectId === Number(id))
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((d) => ({ ...d }));
    return ok(rows);
  }
  const { rows } = await query(
    `SELECT deliverable_id AS "deliverableId", project_id AS "projectId",
            title, description, due_date AS "dueDate",
            completed, completed_at AS "completedAt",
            order_index AS "orderIndex", created_at AS "createdAt"
       FROM deliverables
      WHERE project_id = $1
      ORDER BY order_index ASC, deliverable_id ASC`,
    [id],
  );
  return ok(rows);
});

const Post = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  orderIndex: z.number().int().optional(),
});

export const POST = handle(async (req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const gate = await gateProject(s, id);
  if (gate) return gate;
  const b = await parseBody(req, Post);
  if (isMockMode()) {
    const store = getMockStore();
    const orderIndex = b.orderIndex ?? (Math.max(-1, ...store.deliverables.filter((d) => d.projectId === Number(id)).map((d) => d.orderIndex)) + 1);
    const deliverableId = nextMockId("deliverable");
    store.deliverables.push({
      deliverableId,
      projectId: Number(id),
      title: b.title,
      description: b.description ?? null,
      dueDate: b.dueDate ?? null,
      completed: false,
      completedAt: null,
      orderIndex,
      createdAt: new Date().toISOString(),
    });
    return ok({ deliverableId }, { status: 201 });
  }

  // Auto-assign order_index after last existing item
  const { rows: last } = await query<{ maxOrder: number | null }>(
    `SELECT MAX(order_index) AS "maxOrder" FROM deliverables WHERE project_id = $1`,
    [id],
  );
  const orderIndex = b.orderIndex ?? ((last[0]?.maxOrder ?? -1) + 1);

  const { rows } = await query<{ deliverable_id: number }>(
    `INSERT INTO deliverables (project_id, title, description, due_date, order_index)
     VALUES ($1, $2, $3, $4, $5) RETURNING deliverable_id`,
    [id, b.title, b.description ?? null, b.dueDate ?? null, orderIndex],
  );
  return ok({ deliverableId: rows[0].deliverable_id }, { status: 201 });
});
