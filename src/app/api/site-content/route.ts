import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { getMockStore, isMockMode } from "@/lib/mock-store";

/** Public: all site-content keys. */
export const GET = handle(async () => {
  if (isMockMode()) return ok(getMockStore().siteContent);
  const { rows } = await query(
    `SELECT content_key AS "key", value_en AS "en", value_ar AS "ar",
            value_json AS "json", description, updated_at AS "updatedAt"
       FROM site_content ORDER BY content_key`,
  );
  return ok(rows);
});
