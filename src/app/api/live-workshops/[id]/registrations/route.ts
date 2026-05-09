import { handle, ok, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

function canManage(s: { position: string; departmentSlug: string | null }) {
  if (s.position === "president" || s.position === "vice_president") return true;
  return (
    (s.position === "dept_leader" || s.position === "dept_vice_leader") &&
    s.departmentSlug === "development"
  );
}

// GET /api/live-workshops/[id]/registrations — dev leaders only
export const GET = handle(async (_req, ctx) => {
  const s = await requireSession();
  if (!canManage(s)) return err(403, "Forbidden");
  const { id } = await ctx.params;
  if (isMockMode()) {
    const rows = getMockStore().liveWorkshopRegistrations
      .filter((r) => r.liveWorkshopId === Number(id))
      .map((r) => ({
        registrationId: r.registrationId,
        fullName: r.fullName,
        email: r.email,
        universityId: r.universityId,
        phone: r.phone,
        department: r.department,
        notes: r.notes,
        registeredAt: r.registeredAt,
      }));
    return ok(rows);
  }

  const { rows } = await query(
    `SELECT
       registration_id   AS "registrationId",
       full_name         AS "fullName",
       email,
       university_id     AS "universityId",
       phone,
       department,
       notes,
       registered_at     AS "registeredAt"
     FROM live_workshop_registrations
     WHERE live_workshop_id = $1
     ORDER BY registered_at ASC`,
    [id],
  );
  return ok(rows);
});
