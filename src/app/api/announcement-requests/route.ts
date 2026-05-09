import { z } from "zod";
import { err, handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

const Post = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  requestType: z.enum(["general", "monthly_newsletter"]).default("general"),
  desiredPublishDate: z.string().optional(),
});

export const GET = handle(async (req) => {
  const session = await requireSession();
  const isAdmin = session.position === "president" || session.position === "vice_president";
  const isHr = (session.position === "dept_leader" || session.position === "dept_vice_leader") && session.departmentSlug === "hr";
  const isMedia = (session.position === "dept_leader" || session.position === "dept_vice_leader") && session.departmentSlug === "media";
  const scope = new URL(req.url).searchParams.get("scope");

  if (scope === "all" && !isAdmin && !isMedia) return err(403, "Forbidden");

  if (isMockMode()) {
    const store = getMockStore();
    const rows = store.announcementRequests
      .filter((request) => scope === "all" || request.requestedBy === session.memberId || (isHr && request.requestedBy === session.memberId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((request) => ({
        ...request,
        requestedByName: findMockMember(request.requestedBy)?.fullName ?? "Unknown member",
        handledByName: request.handledBy ? findMockMember(request.handledBy)?.fullName ?? null : null,
      }));
    return ok(rows);
  }

  const params: unknown[] = [];
  const where: string[] = [];
  if (scope !== "all") {
    params.push(session.memberId);
    where.push(`requested_by = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT ar.request_id AS "requestId",
            ar.title,
            ar.body,
            ar.priority::text AS priority,
            ar.request_type AS "requestType",
            ar.status,
            ar.requested_by AS "requestedBy",
            ar.handled_by AS "handledBy",
            ar.desired_publish_date AS "desiredPublishDate",
            ar.created_at AS "createdAt",
            ar.resolved_at AS "resolvedAt",
            ar.published_announcement_id AS "publishedAnnouncementId",
            rp.full_name AS "requestedByName",
            hp.full_name AS "handledByName"
       FROM announcement_requests ar
       LEFT JOIN profiles rp ON rp.member_id = ar.requested_by
       LEFT JOIN profiles hp ON hp.member_id = ar.handled_by
       ${whereSql}
      ORDER BY ar.created_at DESC`,
    params,
  );
  return ok(rows);
});

export const POST = handle(async (req) => {
  const session = await requireSession();
  const isAdmin = session.position === "president" || session.position === "vice_president";
  const isHr = (session.position === "dept_leader" || session.position === "dept_vice_leader") && session.departmentSlug === "hr";
  if (!isAdmin && !isHr) return err(403, "Forbidden");

  const body = await parseBody(req, Post);
  if (isMockMode()) {
    const requestId = nextMockId("announcementRequest");
    getMockStore().announcementRequests.unshift({
      requestId,
      title: body.title,
      body: body.body ?? null,
      priority: body.priority,
      requestType: body.requestType,
      status: "pending",
      requestedBy: session.memberId,
      handledBy: null,
      desiredPublishDate: body.desiredPublishDate ?? null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      publishedAnnouncementId: null,
    });
    return ok({ requestId }, { status: 201 });
  }

  const { rows } = await query<{ request_id: number }>(
    `INSERT INTO announcement_requests (title, body, priority, request_type, requested_by, desired_publish_date)
     VALUES ($1, $2, $3::announcement_priority, $4, $5, $6)
     RETURNING request_id`,
    [
      body.title,
      body.body ?? null,
      body.priority,
      body.requestType,
      session.memberId,
      body.desiredPublishDate ?? null,
    ],
  );
  return ok({ requestId: rows[0].request_id }, { status: 201 });
});
