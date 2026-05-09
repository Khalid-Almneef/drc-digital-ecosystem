import { queryOne } from "@/lib/db";
import { isMockMode, siteContentValue, upsertSiteContent } from "@/lib/mock-store";

export const MEMBER_ENDORSEMENTS_KEY = "members.endorsements";

export type EndorsementContextType = "worked_together" | "project_together";

export interface MemberEndorsementRecord {
  endorsementId: string;
  endorserMemberId: number;
  endorseeMemberId: number;
  contextType: EndorsementContextType;
  projectId: number | null;
  note: string | null;
  points: number;
  createdAt: string;
}

interface MemberEndorsementsPayload {
  version: 1;
  endorsements: MemberEndorsementRecord[];
}

const emptyPayload = (): MemberEndorsementsPayload => ({
  version: 1,
  endorsements: [],
});

export async function loadMemberEndorsements(): Promise<MemberEndorsementsPayload> {
  if (isMockMode()) {
    const raw = siteContentValue(MEMBER_ENDORSEMENTS_KEY)?.json;
    if (!raw || typeof raw !== "object") return emptyPayload();
    const payload = raw as Partial<MemberEndorsementsPayload>;
    return {
      version: 1,
      endorsements: Array.isArray(payload.endorsements) ? payload.endorsements : [],
    };
  }

  const row = await queryOne<{ json: unknown }>(
    `SELECT value_json AS "json"
       FROM site_content
      WHERE content_key = $1`,
    [MEMBER_ENDORSEMENTS_KEY],
  );
  const raw = row?.json;
  if (!raw || typeof raw !== "object") return emptyPayload();
  const payload = raw as Partial<MemberEndorsementsPayload>;
  return {
    version: 1,
    endorsements: Array.isArray(payload.endorsements) ? payload.endorsements : [],
  };
}

export async function saveMemberEndorsements(
  endorsements: MemberEndorsementRecord[],
  updatedBy: number,
) {
  const payload: MemberEndorsementsPayload = {
    version: 1,
    endorsements,
  };

  if (isMockMode()) {
    upsertSiteContent(MEMBER_ENDORSEMENTS_KEY, { json: payload });
    return;
  }

  await queryOne(
    `INSERT INTO site_content (content_key, value_json, updated_by)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (content_key)
     DO UPDATE SET value_json = EXCLUDED.value_json, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [MEMBER_ENDORSEMENTS_KEY, payload, updatedBy],
  );
}
