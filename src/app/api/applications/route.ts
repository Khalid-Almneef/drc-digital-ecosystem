import { z } from "zod";
import { handle, ok, parseBody, parseQuery } from "@/lib/api";
import { query, withTx } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { departmentById, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

const Post = z.object({
  applicantName: z.string().min(1),
  applicantEmail: z.string().email(),
  universityId: z.string().optional(),
  major: z.string().optional(),
  phoneNumber: z.string().optional(),
  preferredDepartmentIds: z.array(z.number().int()).min(1),
  motivation: z.string().optional(),
  skills: z.string().optional(),
});

export const POST = handle(async (req) => {
  const body = await parseBody(req, Post);
  if (isMockMode()) {
    const store = getMockStore();
    const applicationId = nextMockId("application");
    store.applications.unshift({
      applicationId,
      applicantName: body.applicantName,
      applicantEmail: body.applicantEmail.toLowerCase(),
      universityId: body.universityId ?? "",
      major: body.major ?? "",
      phoneNumber: body.phoneNumber ?? "",
      motivation: body.motivation ?? "",
      skills: body.skills ?? "",
      status: "pending",
      appliedDate: new Date().toISOString().slice(0, 10),
      preferredDepartmentIds: body.preferredDepartmentIds,
      memberId: null,
      reviewedBy: null,
    });
    return ok({ applicationId }, { status: 201 });
  }
  const id = await withTx(async (c) => {
    const { rows } = await c.query<{ application_id: number }>(
      `INSERT INTO membership_applications
        (applicant_name, applicant_email, university_id, major, phone_number,
         preferred_department_id, motivation, skills)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING application_id`,
      [
        body.applicantName,
        body.applicantEmail.toLowerCase(),
        body.universityId ?? null,
        body.major ?? null,
        body.phoneNumber ?? null,
        body.preferredDepartmentIds[0] ?? null,
        body.motivation ?? null,
        body.skills ?? null,
      ],
    );
    const applicationId = rows[0].application_id;
    for (let i = 0; i < body.preferredDepartmentIds.length; i++) {
      await c.query(
        `INSERT INTO application_department_preferences (application_id, department_id, rank)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [applicationId, body.preferredDepartmentIds[i], i + 1],
      );
    }
    return applicationId;
  });
  return ok({ applicationId: id }, { status: 201 });
});

const Query = z.object({ status: z.string().optional() });

export const GET = handle(async (req) => {
  const s = await getSession();
  if (!s) return ok([], { status: 401 });
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isHrLeader =
    (s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "hr";
  if (!isAdmin && !isHrLeader) return ok([], { status: 403 });

  const q = parseQuery(new URL(req.url), Query);
  if (isMockMode()) {
    const rows = getMockStore().applications
      .filter((a) => !q.status || a.status === q.status)
      .map((a) => ({
        applicationId: a.applicationId,
        applicantName: a.applicantName,
        applicantEmail: a.applicantEmail,
        universityId: a.universityId,
        major: a.major,
        phoneNumber: a.phoneNumber,
        motivation: a.motivation,
        skills: a.skills,
        status: a.status,
        appliedDate: a.appliedDate,
        preferredDepartments: a.preferredDepartmentIds
          .map((departmentId) => departmentById(departmentId))
          .filter((d): d is NonNullable<typeof d> => !!d)
          .map((d) => ({ id: d.id, slug: d.slug, name: d.name })),
      }));
    return ok(rows);
  }
  const params: unknown[] = [];
  const where: string[] = [];
  if (q.status) { params.push(q.status); where.push(`status = $${params.length}::application_status`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT a.application_id AS "applicationId", a.applicant_name AS "applicantName",
            a.applicant_email AS "applicantEmail", a.university_id AS "universityId",
            a.major, a.phone_number AS "phoneNumber",
            a.motivation, a.skills, a.status::text AS status,
            a.applied_date AS "appliedDate",
            COALESCE(json_agg(json_build_object('id', d.department_id, 'slug', d.slug, 'name', d.name))
                     FILTER (WHERE d.department_id IS NOT NULL), '[]') AS "preferredDepartments"
       FROM membership_applications a
       LEFT JOIN application_department_preferences adp ON adp.application_id = a.application_id
       LEFT JOIN departments d ON d.department_id = adp.department_id
       ${clause}
      GROUP BY a.application_id
      ORDER BY a.applied_date DESC`,
    params,
  );
  return ok(rows);
});
