import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

export const GET = handle(async (req) => {
  const s = await requireSession();
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");       // "all" → HR/admin only
  const statusFilter = url.searchParams.get("status"); // pending | approved | rejected | all
  const memberIdParam = url.searchParams.get("memberId");

  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isHr = (s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "hr";
  if (isMockMode()) {
    const store = getMockStore();
    let rows = store.volunteerHours.slice();
    if (scope === "all") {
      if (!isAdmin && !isHr) return err(403, "Forbidden");
      if (statusFilter && statusFilter !== "all") rows = rows.filter((h) => h.approvalStatus === statusFilter);
    } else {
      const target = memberIdParam ? Number(memberIdParam) : s.memberId;
      if (target !== s.memberId && !isAdmin && !isHr) return err(403, "Forbidden");
      rows = rows.filter((h) => h.memberId === target);
      if (statusFilter && statusFilter !== "all") rows = rows.filter((h) => h.approvalStatus === statusFilter);
    }
    return ok(rows.map((h) => ({
      ...h,
      memberName: findMockMember(h.memberId)?.fullName ?? "Unknown member",
    })));
  }

  if (scope === "all") {
    if (!isAdmin && !isHr) return err(403, "Forbidden");

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (statusFilter && statusFilter !== "all") {
      params.push(statusFilter);
      conditions.push(`vh.approval_status = $${params.length}::approval_status`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT vh.volunthr_id   AS "id",
              vh.member_id     AS "memberId",
              pr.full_name     AS "memberName",
              vh.hours,
              vh.title,
              vh.description,
              vh.participation_date AS "participationDate",
              vh.approval_status::text  AS "approvalStatus",
              vh.approved_at   AS "approvedAt",
              vh.source_type   AS "sourceType",
              vh.source_id     AS "sourceId"
         FROM volunteer_hours vh
         LEFT JOIN profiles pr ON pr.member_id = vh.member_id
         ${where}
         ORDER BY vh.participation_date DESC`,
      params,
    );
    return ok(rows);
  }

  // Self or specific member query
  const target = memberIdParam ? Number(memberIdParam) : s.memberId;
  if (target !== s.memberId && !isAdmin && !isHr) return err(403, "Forbidden");

  const conditions: string[] = [`vh.member_id = $1`];
  const params: unknown[] = [target];

  if (statusFilter && statusFilter !== "all") {
    params.push(statusFilter);
    conditions.push(`vh.approval_status = $${params.length}::approval_status`);
  }

  const { rows } = await query(
    `SELECT vh.volunthr_id   AS "id",
            vh.member_id     AS "memberId",
            pr.full_name     AS "memberName",
            vh.hours,
            vh.title,
            vh.description,
            vh.participation_date AS "participationDate",
            vh.approval_status::text  AS "approvalStatus",
            vh.approved_at   AS "approvedAt",
            vh.source_type   AS "sourceType",
            vh.source_id     AS "sourceId"
       FROM volunteer_hours vh
       LEFT JOIN profiles pr ON pr.member_id = vh.member_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY vh.participation_date DESC`,
    params,
  );
  return ok(rows);
});

const Post = z.object({
  hours: z.number().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  participationDate: z.string(),
});

export const POST = handle(async (req) => {
  const s = await requireSession();
  const b = await parseBody(req, Post);
  if (isMockMode()) {
    const id = nextMockId("volunteerHour");
    getMockStore().volunteerHours.unshift({
      id,
      memberId: s.memberId,
      hours: b.hours,
      title: b.title,
      description: b.description ?? null,
      participationDate: b.participationDate,
      approvalStatus: "pending",
      approvedAt: null,
      approvedBy: null,
      sourceType: "self_logged",
      sourceId: null,
    });
    return ok({ id }, { status: 201 });
  }
  const { rows } = await query<{ volunthr_id: number }>(
    `INSERT INTO volunteer_hours (member_id, hours, title, description, participation_date)
     VALUES ($1,$2,$3,$4,$5) RETURNING volunthr_id`,
    [s.memberId, b.hours, b.title, b.description ?? null, b.participationDate],
  );
  return ok({ id: rows[0].volunthr_id }, { status: 201 });
});
