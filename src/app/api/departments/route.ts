import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { getMockStore, isMockMode } from "@/lib/mock-store";

export const GET = handle(async () => {
  if (isMockMode()) return ok(getMockStore().departments);
  const { rows } = await query(
    `SELECT department_id AS "id", slug::text AS slug, name, name_ar AS "nameAr", description
       FROM departments ORDER BY name`,
  );
  return ok(rows);
});
