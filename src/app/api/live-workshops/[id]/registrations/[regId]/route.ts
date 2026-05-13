import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";
import { emitNotification } from "@/lib/notifications";

function canManage(s: { position: string; departmentSlug: string | null }) {
  if (s.position === "president" || s.position === "vice_president") return true;
  return (
    (s.position === "dept_leader" || s.position === "dept_vice_leader") &&
    s.departmentSlug === "development"
  );
}

const Patch = z.object({
  status: z.enum(["accepted", "rejected"]),
});

// PATCH /api/live-workshops/[id]/registrations/[regId] — dev leadership only.
// Accept or reject a pending workshop registration. Emits a notification to
// the registrant if they have a member account (email match in `users`).
export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  if (!canManage(s)) return err(403, "Forbidden");
  const { id, regId } = await ctx.params;
  const body = await parseBody(req, Patch);
  const workshopId = Number(id);
  const registrationId = Number(regId);

  if (isMockMode()) {
    const store = getMockStore();
    const reg = store.liveWorkshopRegistrations.find(
      (r) => r.registrationId === registrationId && r.liveWorkshopId === workshopId,
    );
    if (!reg) return err(404, "Registration not found");
    reg.status = body.status;
    const workshop = store.liveWorkshops.find((w) => w.liveWorkshopId === workshopId);
    const recipient = store.members.find(
      (m) => m.email?.toLowerCase() === reg.email.toLowerCase(),
    );
    if (recipient) {
      await emitNotification({
        recipientId: recipient.memberId,
        category: "workshop_registration_decision",
        title:
          body.status === "accepted"
            ? "Your workshop registration was accepted"
            : "Your workshop registration was rejected",
        body: workshop?.title ?? null,
        linkUrl: "/workshops",
        sourceType: "live_workshop_registration",
        sourceId: registrationId,
      });
    }
    return ok({ success: true, status: body.status });
  }

  const reg = await queryOne<{
    registrationId: number;
    email: string;
    workshopTitle: string;
  }>(
    `SELECT r.registration_id AS "registrationId",
            r.email,
            lw.title           AS "workshopTitle"
       FROM live_workshop_registrations r
       JOIN live_workshops lw ON lw.live_workshop_id = r.live_workshop_id
      WHERE r.registration_id = $1 AND r.live_workshop_id = $2`,
    [registrationId, workshopId],
  );
  if (!reg) return err(404, "Registration not found");

  await query(
    `UPDATE live_workshop_registrations
        SET status = $1
      WHERE registration_id = $2`,
    [body.status, registrationId],
  );

  // Notify the registrant only if they have a member account (email match).
  const user = await queryOne<{ memberId: number }>(
    `SELECT member_id AS "memberId"
       FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1`,
    [reg.email],
  );
  if (user) {
    await emitNotification({
      recipientId: user.memberId,
      category: "workshop_registration_decision",
      title:
        body.status === "accepted"
          ? "Your workshop registration was accepted"
          : "Your workshop registration was rejected",
      body: reg.workshopTitle,
      linkUrl: "/workshops",
      sourceType: "live_workshop_registration",
      sourceId: registrationId,
    });
  }

  return ok({ success: true, status: body.status });
});
