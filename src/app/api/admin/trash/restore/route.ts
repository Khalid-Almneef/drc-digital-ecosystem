import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isClubLead } from "@/lib/authz";
import { getMockStore, isMockMode } from "@/lib/mock-store";

const Entity = z.enum([
  "task",
  "project",
  "volunteer_hour_task",
  "workshop",
  "live_workshop",
  "madarat_session",
  "event",
  "announcement",
  "announcement_request",
]);

const Body = z.object({
  entity: Entity,
  id: z.number().int(),
});

// Per-entity SQL table + PK column mapping. Both restore and "purge" hard-delete
// share this map — only restore is exposed for now (purge would need an extra
// confirmation flow).
const TABLES: Record<z.infer<typeof Entity>, { table: string; pk: string }> = {
  task:                 { table: "tasks",                 pk: "task_id" },
  project:              { table: "projects",              pk: "project_id" },
  volunteer_hour_task:  { table: "volunteer_hour_tasks",  pk: "opportunity_id" },
  workshop:             { table: "workshops",             pk: "workshop_id" },
  live_workshop:        { table: "live_workshops",        pk: "live_workshop_id" },
  madarat_session:      { table: "madarat_sessions",      pk: "session_id" },
  event:                { table: "events",                pk: "event_id" },
  announcement:         { table: "announcements",         pk: "announcement_id" },
  announcement_request: { table: "announcement_requests", pk: "request_id" },
};

export const POST = handle(async (req) => {
  const session = await requireSession();
  if (!isClubLead(session)) return err(403, "Only club leads can restore deleted items");
  const body = await parseBody(req, Body);

  if (isMockMode()) {
    const store = getMockStore();
    switch (body.entity) {
      case "task": {
        const t = store.tasks.find((row) => row.taskId === body.id);
        if (!t) return err(404, "Not found");
        t.isDeleted = false;
        // Restoring a parent does not auto-restore its subtasks — that would
        // be surprising. A leader can restore each subtask individually.
        return ok({ success: true });
      }
      case "project": {
        const p = store.projects.find((row) => row.projectId === body.id);
        if (!p) return err(404, "Not found");
        p.isDeleted = false;
        return ok({ success: true });
      }
      case "volunteer_hour_task": {
        const h = store.volunteerHourTasks.find((row) => row.opportunityId === body.id);
        if (!h) return err(404, "Not found");
        h.isDeleted = false;
        return ok({ success: true });
      }
      case "workshop": {
        const w = store.workshops.find((row) => row.workshopId === body.id);
        if (!w) return err(404, "Not found");
        w.isDeleted = false;
        return ok({ success: true });
      }
      case "live_workshop": {
        const w = store.liveWorkshops.find((row) => row.liveWorkshopId === body.id);
        if (!w) return err(404, "Not found");
        w.isDeleted = false;
        return ok({ success: true });
      }
      case "madarat_session": {
        const s = store.madaratSessions.find((row) => row.sessionId === body.id);
        if (!s) return err(404, "Not found");
        s.isDeleted = false;
        return ok({ success: true });
      }
      case "event": {
        const e = store.events.find((row) => row.eventId === body.id);
        if (!e) return err(404, "Not found");
        e.isDeleted = false;
        return ok({ success: true });
      }
      case "announcement": {
        const a = store.announcements.find((row) => row.announcementId === body.id);
        if (!a) return err(404, "Not found");
        a.isDeleted = false;
        return ok({ success: true });
      }
      case "announcement_request": {
        const a = store.announcementRequests.find((row) => row.requestId === body.id);
        if (!a) return err(404, "Not found");
        a.isDeleted = false;
        return ok({ success: true });
      }
    }
  }

  const { table, pk } = TABLES[body.entity];
  // table and pk come from a fixed map, not user input — safe to interpolate.
  const result = await query(
    `UPDATE ${table}
        SET is_deleted = FALSE,
            deleted_at = NULL,
            deleted_by = NULL
      WHERE ${pk} = $1 AND is_deleted = TRUE`,
    [body.id],
  );
  if (result.rowCount === 0) return err(404, "Not found or not deleted");
  return ok({ success: true });
});
