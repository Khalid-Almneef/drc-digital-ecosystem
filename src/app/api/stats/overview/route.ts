import { handle, ok } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { getMockStore, isMockMode, siteContentValue } from "@/lib/mock-store";
import { getSiteContentKeyCandidates, normalizeSiteContentKey } from "@/lib/site-content";

// Returns live DB counts plus any manual override from site_content/home.stats.
// Manual values take priority so leadership can still pin a number when the
// auto-count under-reports (e.g. counting only published items).
interface StatsJson {
  members?: number | string;
  departments?: number | string;
  events?: number | string;
  projects?: number | string;
  competitions?: number | string;
}

function pick(override: number | string | undefined, live: number): number | string {
  if (typeof override === "number" && Number.isFinite(override)) return override;
  if (typeof override === "string" && override.trim().length > 0) return override.trim();
  return live;
}

export const GET = handle(async () => {
  const statsKey = normalizeSiteContentKey("home.stats");

  if (isMockMode()) {
    const override = (siteContentValue(statsKey)?.json as StatsJson | null | undefined) ?? {};
    const store = getMockStore();
    const live = {
      members: store.members.filter((member) => member.isActive).length,
      departments: store.departments.length,
      events: store.events.filter((event) => event.isPublished).length,
      projects: store.projects.filter((project) => ["in_progress", "completed"].includes(project.status)).length,
      competitions: store.events.filter((event) => event.isPublished && event.type === "competition").length,
    };
    return ok({
      members: pick(override.members, live.members),
      departments: pick(override.departments, live.departments),
      events: pick(override.events, live.events),
      projects: pick(override.projects, live.projects),
      competitions: pick(override.competitions, live.competitions),
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
    members: number; departments: number; events: number; projects: number; competitions: number;
  }>(
    `SELECT
        (SELECT COUNT(*)::int FROM users WHERE is_active = TRUE)                                         AS members,
        (SELECT COUNT(*)::int FROM departments)                                                           AS departments,
        (SELECT COUNT(*)::int FROM events WHERE is_published = TRUE)                                      AS events,
        (SELECT COUNT(*)::int FROM projects WHERE status IN ('in_progress','completed'))                   AS projects,
        (SELECT COUNT(*)::int FROM events WHERE is_published = TRUE AND type = 'competition')             AS competitions`,
  );
  const o = override?.value_json ?? {};
  return ok({
    members: pick(o.members, live?.members ?? 0),
    departments: pick(o.departments, live?.departments ?? 0),
    events: pick(o.events, live?.events ?? 0),
    projects: pick(o.projects, live?.projects ?? 0),
    competitions: pick(o.competitions, live?.competitions ?? 0),
  });
});
