import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const GET = handle(async () => {
  await requireSession();
  const { rows } = await query(
    `SELECT e.equipment_id AS "equipmentId", e.name, e.description, e.category,
            e.status::text AS status, e.serial_number AS "serialNumber", e.location,
            e.current_user_id AS "currentUserId", p.full_name AS "currentUserName"
       FROM equipment e
       LEFT JOIN profiles p ON p.member_id = e.current_user_id
      ORDER BY e.name`,
  );
  return ok(rows);
});

const Post = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
});

export const POST = handle(async (req) => {
  await requireSession();
  const b = await parseBody(req, Post);
  const { rows } = await query<{ equipment_id: number }>(
    `INSERT INTO equipment (name, description, category, serial_number, location)
     VALUES ($1,$2,$3,$4,$5) RETURNING equipment_id`,
    [b.name, b.description ?? null, b.category ?? null, b.serialNumber ?? null, b.location ?? null],
  );
  return ok({ equipmentId: rows[0].equipment_id }, { status: 201 });
});
