import { queryOne } from "@/lib/db";
import { isMockMode, siteContentValue, upsertSiteContent } from "@/lib/mock-store";

export const MEMBER_PREFERENCES_KEY = "members.preferences";

export type PreferenceLanguage = "en" | "ar";
export type PreferenceTheme = "dark" | "light";

export interface MemberPalettePreference {
  primary: string;
  secondary: string;
  accent: string;
}

export interface MemberPreferenceRecord {
  language?: PreferenceLanguage;
  theme?: PreferenceTheme;
  palette?: MemberPalettePreference | null;
  /** Cursor / touch glow overlay. Default off for all members. */
  glowEnabled?: boolean;
  updatedAt: string;
}

interface MemberPreferencesPayload {
  version: 1;
  byMemberId: Record<string, MemberPreferenceRecord>;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function emptyPayload(): MemberPreferencesPayload {
  return {
    version: 1,
    byMemberId: {},
  };
}

export function isValidPalette(value: unknown): value is MemberPalettePreference {
  if (!value || typeof value !== "object") return false;
  const palette = value as Partial<MemberPalettePreference>;
  return (
    typeof palette.primary === "string" &&
    typeof palette.secondary === "string" &&
    typeof palette.accent === "string" &&
    HEX_COLOR.test(palette.primary) &&
    HEX_COLOR.test(palette.secondary) &&
    HEX_COLOR.test(palette.accent)
  );
}

function sanitizePreferenceRecord(value: unknown): MemberPreferenceRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<MemberPreferenceRecord>;
  const next: MemberPreferenceRecord = {
    updatedAt: typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : new Date().toISOString(),
  };

  if (raw.language === "ar" || raw.language === "en") next.language = raw.language;
  if (raw.theme === "dark" || raw.theme === "light") next.theme = raw.theme;
  if (raw.palette === null) {
    next.palette = null;
  } else if (isValidPalette(raw.palette)) {
    next.palette = raw.palette;
  }
  if (typeof raw.glowEnabled === "boolean") next.glowEnabled = raw.glowEnabled;

  return next;
}

export async function loadMemberPreferences(): Promise<MemberPreferencesPayload> {
  if (isMockMode()) {
    const raw = siteContentValue(MEMBER_PREFERENCES_KEY)?.json;
    if (!raw || typeof raw !== "object") return emptyPayload();
    const payload = raw as Partial<MemberPreferencesPayload>;
    const byMemberId: Record<string, MemberPreferenceRecord> = {};

    for (const [memberId, value] of Object.entries(payload.byMemberId ?? {})) {
      const record = sanitizePreferenceRecord(value);
      if (record) byMemberId[memberId] = record;
    }

    return { version: 1, byMemberId };
  }

  const row = await queryOne<{ json: unknown }>(
    `SELECT value_json AS "json"
       FROM site_content
      WHERE content_key = $1`,
    [MEMBER_PREFERENCES_KEY],
  );

  const raw = row?.json;
  if (!raw || typeof raw !== "object") return emptyPayload();
  const payload = raw as Partial<MemberPreferencesPayload>;
  const byMemberId: Record<string, MemberPreferenceRecord> = {};

  for (const [memberId, value] of Object.entries(payload.byMemberId ?? {})) {
    const record = sanitizePreferenceRecord(value);
    if (record) byMemberId[memberId] = record;
  }

  return { version: 1, byMemberId };
}

export async function getMemberPreferences(memberId: number) {
  const payload = await loadMemberPreferences();
  return payload.byMemberId[String(memberId)] ?? null;
}

export async function patchMemberPreferences(
  memberId: number,
  patch: {
    language?: PreferenceLanguage;
    theme?: PreferenceTheme;
    palette?: MemberPalettePreference | null;
    glowEnabled?: boolean;
  },
  updatedBy: number,
) {
  const payload = await loadMemberPreferences();
  const key = String(memberId);
  const current = payload.byMemberId[key] ?? { updatedAt: new Date().toISOString() };
  const next: MemberPreferenceRecord = {
    ...current,
    updatedAt: new Date().toISOString(),
  };

  if (patch.language !== undefined) next.language = patch.language;
  if (patch.theme !== undefined) next.theme = patch.theme;
  if (patch.palette !== undefined) next.palette = patch.palette;
  if (patch.glowEnabled !== undefined) next.glowEnabled = patch.glowEnabled;

  payload.byMemberId[key] = next;

  if (isMockMode()) {
    upsertSiteContent(MEMBER_PREFERENCES_KEY, { json: payload });
    return next;
  }

  await queryOne(
    `INSERT INTO site_content (content_key, value_json, updated_by)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (content_key)
     DO UPDATE SET value_json = EXCLUDED.value_json, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [MEMBER_PREFERENCES_KEY, payload, updatedBy],
  );

  return next;
}
