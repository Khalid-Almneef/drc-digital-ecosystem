import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

const RegisterSchema = z.object({
  fullName: z.string().min(2).max(255),
  email: z.string().email(),
  universityId: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

// POST /api/live-workshops/[id]/register — public, no auth required
export const POST = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const b = await parseBody(req, RegisterSchema);
  if (isMockMode()) {
    const store = getMockStore();
    const workshop = store.liveWorkshops.find((w) => w.liveWorkshopId === Number(id) && w.isPublished);
    if (!workshop) return err(404, "Workshop not found");
    if (!workshop.registrationOpen) return err(409, "Registration is currently closed for this workshop");
    const existing = store.liveWorkshopRegistrations.find((r) => r.liveWorkshopId === Number(id) && r.email.toLowerCase() === b.email.toLowerCase());
    if (existing) return err(409, "You are already registered for this workshop");
    if (workshop.maxRegistrants !== null) {
      const count = store.liveWorkshopRegistrations.filter((r) => r.liveWorkshopId === Number(id)).length;
      if (count >= workshop.maxRegistrants) return err(409, "This workshop is fully booked");
    }
    store.liveWorkshopRegistrations.push({
      registrationId: nextMockId("liveWorkshopRegistration"),
      liveWorkshopId: Number(id),
      fullName: b.fullName,
      email: b.email.toLowerCase(),
      universityId: b.universityId ?? null,
      phone: b.phone ?? null,
      department: b.department ?? null,
      notes: b.notes ?? null,
      registeredAt: new Date().toISOString(),
    });
    return ok({ success: true, message: "Registration successful" }, { status: 201 });
  }

  // Load workshop — must be published and registration open
  const workshop = await queryOne<{
    live_workshop_id: number;
    registration_open: boolean;
    max_registrants: number | null;
    title: string;
    scheduled_at: string;
  }>(
    `SELECT live_workshop_id, registration_open, max_registrants, title, scheduled_at
       FROM live_workshops WHERE live_workshop_id = $1 AND is_published = TRUE`,
    [id],
  );

  if (!workshop) return err(404, "Workshop not found");
  if (!workshop.registration_open) return err(409, "Registration is currently closed for this workshop");

  // Check capacity if capped
  if (workshop.max_registrants !== null) {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM live_workshop_registrations WHERE live_workshop_id = $1`,
      [id],
    );
    if (parseInt(rows[0]?.count ?? "0", 10) >= workshop.max_registrants) {
      return err(409, "This workshop is fully booked");
    }
  }

  // Insert (UNIQUE on live_workshop_id + email handles duplicates)
  try {
    await query(
      `INSERT INTO live_workshop_registrations
         (live_workshop_id, full_name, email, university_id, phone, department, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id, b.fullName, b.email.toLowerCase(),
        b.universityId ?? null, b.phone ?? null,
        b.department ?? null, b.notes ?? null,
      ],
    );
  } catch (e: unknown) {
    // Postgres unique violation code 23505
    if ((e as { code?: string }).code === "23505") {
      return err(409, "You are already registered for this workshop");
    }
    throw e;
  }

  return ok({ success: true, message: "Registration successful" }, { status: 201 });
});
