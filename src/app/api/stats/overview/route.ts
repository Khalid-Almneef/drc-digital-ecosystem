import { handle, ok } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { getMockStore, isMockMode, siteContentValue } from "@/lib/mock-store";
import { getSiteContentKeyCandidates, normalizeSiteContentKey } from "@/lib/site-content";

interface StatsJson {
  members?: number; departments?: number; events?: number; projects?: number;
}

export const GET = handle(async () => {
  const statsKey = normalizeSiteContentKey("home.stats");
  if (isMockMode()) {
    const override = siteContentValue(statsKey)?.json as StatsJson | null | undefined;
    const store = getMockStore();
    const live = {
      members: store.members.filter((member) => member.isActive).length,
      departments: store.departments.length,
      events: store.events.filter((event) => event.isPublished).length,
      projects: store.projects.filter((project) => ["in_progress", "completed"].includes(project.status)).length,
    };
    return ok({
      members: override?.members ?? live.members,
      departments: override?.departments ?? live.departments,
      events: override?.events ?? live.events,
      projects: override?.projects ?? live.projects,
    });
  }
  const override = await queryOne<{ value_json: StatsJson | null }>(
    `SELECT value_json
       FROM site_content
      WHERE content_key = ANY($1::text[])
      ORDER BY CASE content_key WHEN $2 THEN 0 ELSE 1 END
      LIMIT 1`,
    [getSiteContentKeyCandidates(statsKey), statsKey],
  );
  const live = await queryOne<{
    members: number; departments: number; events: number; projects: number;
  }>(
    `SELECT
        (SELECT COUNT(*)::int FROM users WHERE is_active = TRUE)              AS members,
        (SELECT COUNT(*)::int FROM departments)                                AS departments,
        (SELECT COUNT(*)::int FROM events WHERE is_published = TRUE)           AS events,
        (SELECT COUNT(*)::int FROM projects WHERE status IN ('in_progress','completed')) AS projects`,
  );
  const o = override?.value_json ?? {};
  return ok({
    members: o.members ?? live?.members ?? 0,
    departments: o.departments ?? live?.departments ?? 0,
    events: o.events ?? live?.events ?? 0,
    projects: o.projects ?? live?.projects ?? 0,
  });
});
