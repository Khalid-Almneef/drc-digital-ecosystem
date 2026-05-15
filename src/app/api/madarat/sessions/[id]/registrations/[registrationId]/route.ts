import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { requireDeptLeaderOf } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getMockStore, isMockMode } from "@/lib/mock-store";

const PatchBody = z.object({
  attended: z.boolean(),
});

export const PATCH = handle(async (req, ctx) => {
  await requireDeptLeaderOf(["madarat"]);
  const { id, registrationId } = await ctx.params;
  const sessionId = Number(id);
  const regId = Number(registrationId);
  if (!Number.isFinite(sessionId) || !Number.isFinite(regId)) {
    return err(400, "Invalid id");
  }

  const body = await parseBody(req, PatchBody);

  if (isMockMode()) {
    const target = getMockStore().madaratRegistrations.find(
      (registration) => registration.registrationId === regId && registration.sessionId === sessionId,
    );
    if (!target) return err(404, "Registration not found");
    target.attended = body.attended;
    return ok({ success: true });
  }

  const existing = await queryOne<{ registrationId: number }>(
    `SELECT registration_id AS "registrationId"
       FROM madarat_session_registrations
      WHERE registration_id = $1 AND session_id = $2`,
    [regId, sessionId],
  );
  if (!existing) return err(404, "Registration not found");

  await query(
    `UPDATE madarat_session_registrations SET attended = $1 WHERE registration_id = $2`,
    [body.attended, regId],
  );
  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  await requireDeptLeaderOf(["madarat"]);
  const { id, registrationId } = await ctx.params;
  const sessionId = Number(id);
  const regId = Number(registrationId);
  if (!Number.isFinite(sessionId) || !Number.isFinite(regId)) {
    return err(400, "Invalid id");
  }

  if (isMockMode()) {
    const store = getMockStore();
    const target = store.madaratRegistrations.find(
      (registration) => registration.registrationId === regId && registration.sessionId === sessionId,
    );
    if (!target) return err(404, "Registration not found");
    store.madaratRegistrations = store.madaratRegistrations.filter(
      (registration) => registration.registrationId !== regId,
    );
    return ok({ success: true });
  }

  const existing = await queryOne<{ registrationId: number }>(
    `SELECT registration_id AS "registrationId"
       FROM madarat_session_registrations
      WHERE registration_id = $1 AND session_id = $2`,
    [regId, sessionId],
  );
  if (!existing) return err(404, "Registration not found");

  await query(
    `DELETE FROM madarat_session_registrations WHERE registration_id = $1`,
    [regId],
  );
  return ok({ success: true });
});
