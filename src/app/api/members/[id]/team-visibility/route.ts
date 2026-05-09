import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { findMockMember, isMockMode } from "@/lib/mock-store";
import { submitChangeRequest } from "@/lib/change-requests";

/** Leaders of a department toggle a member's team-page visibility. */
const Body = z.object({ isPublicOnTeam: z.boolean() });

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const body = await parseBody(req, Body);
  // Resolve target's department in both modes uniformly.
  const targetDepartmentId = isMockMode()
    ? (() => {
        const target = findMockMember(Number(id));
        return target ? target.departmentId : null;
      })()
    : (await queryOne<{ department_id: number | null }>(
        `SELECT department_id FROM users WHERE member_id = $1`,
        [id],
      ))?.department_id ?? null;

  if (targetDepartmentId === null) {
    // Either the member doesn't exist or has no department; in mock mode
    // the latter shouldn't happen for active members.
    return err(404, "Not found");
  }

  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isLeaderOfDept =
    (s.position === "dept_leader" || s.position === "dept_vice_leader") &&
    s.departmentId === targetDepartmentId;

  if (!isAdmin && !isLeaderOfDept) {
    // Members of the target's dept can request this; the request routes to
    // that dept's leadership. Outsiders still get 403.
    if (s.departmentId !== targetDepartmentId) return err(403, "Forbidden");
    const requestId = await submitChangeRequest({
      type: "set_team_visibility",
      departmentId: targetDepartmentId,
      requesterId: s.memberId,
      targetId: Number(id),
      payload: { isPublicOnTeam: body.isPublicOnTeam },
      summary: `${body.isPublicOnTeam ? "Show" : "Hide"} member #${id} on public team page`,
    });
    return ok({ requestId, requiresApproval: true }, { status: 202 });
  }

  if (isMockMode()) {
    const target = findMockMember(Number(id));
    if (!target) return err(404, "Not found");
    target.isPublicOnTeam = body.isPublicOnTeam;
    return ok({ success: true });
  }

  await query(`UPDATE profiles SET is_public_on_team = $1 WHERE member_id = $2`, [
    body.isPublicOnTeam, id,
  ]);
  return ok({ success: true });
});
