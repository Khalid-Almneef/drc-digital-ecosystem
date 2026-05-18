import { handle, ok, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isClubLead } from "@/lib/authz";
import { departmentById, findMockMember, getMockStore, isMockMode } from "@/lib/mock-store";

// Each entity returns the same shape: { entity, id, title, deletedAt, deletedBy, deletedByName, departmentName }
// Entity slugs match the keys the restore endpoint understands.
export type DeletedItem = {
  entity:
    | "task"
    | "project"
    | "volunteer_hour_task"
    | "workshop"
    | "live_workshop"
    | "madarat_session"
    | "event"
    | "announcement"
    | "announcement_request";
  id: number;
  title: string;
  deletedAt: string | null;
  deletedBy: number | null;
  deletedByName: string | null;
  departmentName: string | null;
};

export const GET = handle(async () => {
  const session = await requireSession();
  if (!isClubLead(session)) return err(403, "Only club leads can view trash");

  if (isMockMode()) {
    const store = getMockStore();
    const items: DeletedItem[] = [];

    const nameOf = (memberId: number | null | undefined) =>
      memberId ? findMockMember(memberId)?.fullName ?? null : null;

    for (const t of store.tasks) {
      if (!t.isDeleted) continue;
      items.push({
        entity: "task",
        id: t.taskId,
        title: t.title,
        deletedAt: null,
        deletedBy: null,
        deletedByName: null,
        departmentName: departmentById(t.departmentId)?.name ?? null,
      });
    }
    for (const p of store.projects) {
      if (!p.isDeleted) continue;
      items.push({
        entity: "project",
        id: p.projectId,
        title: p.title,
        deletedAt: null,
        deletedBy: null,
        deletedByName: nameOf(p.leadMemberId),
        departmentName: departmentById(p.departmentId)?.name ?? null,
      });
    }
    for (const h of store.volunteerHourTasks) {
      if (!h.isDeleted) continue;
      items.push({
        entity: "volunteer_hour_task",
        id: h.opportunityId,
        title: h.title,
        deletedAt: null,
        deletedBy: null,
        deletedByName: nameOf(h.createdBy),
        departmentName: departmentById(h.assignedDepartmentId)?.name ?? null,
      });
    }
    for (const w of store.workshops) {
      if (!w.isDeleted) continue;
      items.push({
        entity: "workshop",
        id: w.workshopId,
        title: w.title,
        deletedAt: null,
        deletedBy: null,
        deletedByName: null,
        departmentName: null,
      });
    }
    for (const w of store.liveWorkshops) {
      if (!w.isDeleted) continue;
      items.push({
        entity: "live_workshop",
        id: w.liveWorkshopId,
        title: w.title,
        deletedAt: null,
        deletedBy: null,
        deletedByName: null,
        departmentName: null,
      });
    }
    for (const s of store.madaratSessions) {
      if (!s.isDeleted) continue;
      items.push({
        entity: "madarat_session",
        id: s.sessionId,
        title: s.title,
        deletedAt: null,
        deletedBy: null,
        deletedByName: nameOf(s.createdBy),
        departmentName: "Madarat",
      });
    }
    for (const e of store.events) {
      if (!e.isDeleted) continue;
      items.push({
        entity: "event",
        id: e.eventId,
        title: e.title,
        deletedAt: null,
        deletedBy: null,
        deletedByName: null,
        departmentName: null,
      });
    }
    for (const a of store.announcements) {
      if (!a.isDeleted) continue;
      items.push({
        entity: "announcement",
        id: a.announcementId,
        title: a.title,
        deletedAt: null,
        deletedBy: null,
        deletedByName: nameOf(a.authorId),
        departmentName: null,
      });
    }
    for (const a of store.announcementRequests) {
      if (!a.isDeleted) continue;
      items.push({
        entity: "announcement_request",
        id: a.requestId,
        title: a.title,
        deletedAt: null,
        deletedBy: null,
        deletedByName: nameOf(a.requestedBy),
        departmentName: null,
      });
    }

    return ok(items);
  }

  // One SQL UNION ALL across all soft-deleted tables. The view-as-trash query
  // is rare enough that we don't bother with a materialized view.
  const { rows } = await query<DeletedItem>(
    `WITH del AS (
       SELECT 'task'::text AS entity, t.task_id AS id, t.title,
              t.deleted_at AS "deletedAt", t.deleted_by AS "deletedBy",
              d.name AS "departmentName"
         FROM tasks t LEFT JOIN departments d ON d.department_id = t.department_id
        WHERE t.is_deleted = TRUE
       UNION ALL
       SELECT 'project', p.project_id, p.title,
              p.deleted_at, p.deleted_by, d.name
         FROM projects p LEFT JOIN departments d ON d.department_id = p.department_id
        WHERE p.is_deleted = TRUE
       UNION ALL
       SELECT 'volunteer_hour_task', v.opportunity_id, v.title,
              v.deleted_at, v.deleted_by, d.name
         FROM volunteer_hour_tasks v LEFT JOIN departments d ON d.department_id = v.assigned_department_id
        WHERE v.is_deleted = TRUE
       UNION ALL
       SELECT 'workshop', w.workshop_id, w.title,
              w.deleted_at, w.deleted_by, NULL
         FROM workshops w
        WHERE w.is_deleted = TRUE
       UNION ALL
       SELECT 'live_workshop', lw.live_workshop_id, lw.title,
              lw.deleted_at, lw.deleted_by, NULL
         FROM live_workshops lw
        WHERE lw.is_deleted = TRUE
       UNION ALL
       SELECT 'madarat_session', ms.session_id, ms.title,
              ms.deleted_at, ms.deleted_by, 'Madarat'
         FROM madarat_sessions ms
        WHERE ms.is_deleted = TRUE
       UNION ALL
       SELECT 'event', e.event_id, e.title,
              e.deleted_at, e.deleted_by, NULL
         FROM events e
        WHERE e.is_deleted = TRUE
       UNION ALL
       SELECT 'announcement', a.announcement_id, a.title,
              a.deleted_at, a.deleted_by, NULL
         FROM announcements a
        WHERE a.is_deleted = TRUE
       UNION ALL
       SELECT 'announcement_request', ar.request_id, ar.title,
              ar.deleted_at, ar.deleted_by, NULL
         FROM announcement_requests ar
        WHERE ar.is_deleted = TRUE
     )
     SELECT del.*, p.full_name AS "deletedByName"
       FROM del
       LEFT JOIN profiles p ON p.member_id = del."deletedBy"
      ORDER BY del."deletedAt" DESC NULLS LAST`,
  );
  return ok(rows);
});
