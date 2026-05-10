import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { queryOne, withTx } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isMockMode, siteContentValue, upsertSiteContent } from "@/lib/mock-store";
import { getSiteContentKeyCandidates, normalizeSiteContentKey } from "@/lib/site-content";

export const GET = handle(async (_req, ctx) => {
  const { key } = await ctx.params;
  const canonicalKey = normalizeSiteContentKey(key);
  if (isMockMode()) {
    const row = siteContentValue(key);
    return ok(row ?? { key: canonicalKey, en: null, ar: null, json: null });
  }
  const row = await queryOne(
    `SELECT content_key AS "key", value_en AS "en", value_ar AS "ar", value_json AS "json"
       FROM site_content
      WHERE content_key = ANY($1::text[])
      ORDER BY CASE content_key WHEN $2 THEN 0 ELSE 1 END
      LIMIT 1`,
    [getSiteContentKeyCandidates(key), canonicalKey],
  );
  return ok(row ? { ...row, key: canonicalKey } : { key: canonicalKey, en: null, ar: null, json: null });
});

const Body = z.object({
  en: z.string().nullable().optional(),
  ar: z.string().nullable().optional(),
  json: z.unknown().optional(),
});

function canEdit(s: { position: string; departmentSlug: string | null }, key: string) {
  if (s.position === "president" || s.position === "vice_president") return true;
  // auth.* settings (e.g. auth.requireDeviceConfirm) are admin-only.
  if (key.startsWith("auth.")) return false;
  const isLeader = ["dept_leader", "dept_vice_leader", "sub_leader"].includes(s.position);
  if (!isLeader) return false;
  // Media leaders own the public site copy end-to-end — banners, hero, social,
  // every page's body content. Same scope as admins for site_content.
  if (s.departmentSlug === "media") return true;
  if ((key === "home.heroBanners" || key === "home.featureSpotlights") && s.departmentSlug === "media") return true;
  // HR leaders control join-flow keys
  if (key.startsWith("join.") && s.departmentSlug === "hr") return true;
  // Innovation leaders can edit homepage stats
  if (key.startsWith("homepage.") && s.departmentSlug === "innovation") return true;
  // Any leader can edit general content keys (home.*, about.*, site-wide copy)
  if (!key.startsWith("join.") && !key.startsWith("social.") && !key.startsWith("homepage.")) return true;
  return false;
}

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  const { key } = await ctx.params;
  const canonicalKey = normalizeSiteContentKey(key);
  if (!canEdit(s, canonicalKey)) return err(403, "Forbidden");
  const b = await parseBody(req, Body);
  if (isMockMode()) {
    upsertSiteContent(canonicalKey, { en: b.en, ar: b.ar, json: b.json });
    return ok({ success: true });
  }
  const legacyKeys = getSiteContentKeyCandidates(key).filter((candidate) => candidate !== canonicalKey);
  const sets: string[] = [];
  const params: unknown[] = [canonicalKey];
  if (b.en   !== undefined) { params.push(b.en);   sets.push(`value_en = $${params.length}`); }
  if (b.ar   !== undefined) { params.push(b.ar);   sets.push(`value_ar = $${params.length}`); }
  if (b.json !== undefined) { params.push(b.json); sets.push(`value_json = $${params.length}::jsonb`); }
  params.push(s.memberId); sets.push(`updated_by = $${params.length}`);
  await withTx(async (tx) => {
    if (legacyKeys.length > 0) {
      await tx.query(
        `DELETE FROM site_content
          WHERE content_key = ANY($1::text[])
            AND EXISTS (SELECT 1 FROM site_content WHERE content_key = $2)`,
        [legacyKeys, canonicalKey],
      );
      await tx.query(
        `UPDATE site_content
            SET content_key = $1
          WHERE content_key = ANY($2::text[])
            AND NOT EXISTS (SELECT 1 FROM site_content WHERE content_key = $1)`,
        [canonicalKey, legacyKeys],
      );
    }
    await tx.query(
      `INSERT INTO site_content (content_key, value_en, value_ar, value_json, updated_by)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (content_key) DO UPDATE SET ${sets.join(", ")}, updated_at = NOW()`,
      [canonicalKey, b.en ?? null, b.ar ?? null, b.json ?? null, s.memberId],
    );
  });
  return ok({ success: true });
});
