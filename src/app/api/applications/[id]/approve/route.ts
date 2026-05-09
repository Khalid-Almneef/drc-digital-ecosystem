import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { queryOne, withTx } from "@/lib/db";
import { hashPassword, randomToken, requireSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { departmentById, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";
import { emitNotification } from "@/lib/notifications";

const Body = z.object({
  departmentId: z.number().int(),
  position: z.enum(["member", "sub_leader", "dept_vice_leader", "dept_leader"]).default("member"),
});

export const POST = handle(async (req, ctx) => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isHr = (s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "hr";
  if (!isAdmin && !isHr) return err(403, "Forbidden");

  const { id } = await ctx.params;
  const body = await parseBody(req, Body);
  if (isMockMode()) {
    const store = getMockStore();
    const app = store.applications.find((a) => a.applicationId === Number(id));
    if (!app) return err(404, "Application not found");
    if (app.memberId) return err(400, "Already approved");
    const dept = departmentById(body.departmentId);
    if (!dept) return err(400, "Department not found");
    const memberId = nextMockId("application") + 100;
    store.members.push({
      memberId,
      fullName: app.applicantName,
      fullNameAr: app.applicantName,
      email: app.applicantEmail,
      position: body.position,
      departmentId: dept.id,
      departmentSlug: dept.slug,
      departmentName: dept.name,
      departmentNameAr: dept.nameAr,
      avatarUrl: null,
      bio: null,
      quote: null,
      quoteAr: null,
      major: app.major || null,
      phoneNumber: app.phoneNumber || null,
      linkedinUrl: null,
      githubUrl: null,
      graduationYear: null,
      gender: "male",
      isActive: true,
      isPublicOnTeam: false,
      profileStatus: "active",
    });
    app.status = "accepted";
    app.memberId = memberId;
    app.reviewedBy = s.memberId;
    return ok({ memberId });
  }
  const app = await queryOne<{
    applicant_name: string;
    applicant_email: string;
    university_id: string | null;
    major: string | null;
    phone_number: string | null;
    member_id: number | null;
  }>(
    `SELECT applicant_name, applicant_email, university_id, major, phone_number, member_id
       FROM membership_applications WHERE application_id = $1`,
    [id],
  );
  if (!app) return err(404, "Application not found");
  if (app.member_id) return err(400, "Already approved");

  const tempPassword = randomToken(8);
  const hash = await hashPassword(tempPassword);

  const memberId = await withTx(async (c) => {
    const u = await c.query<{ member_id: number }>(
      `INSERT INTO users (email, password_hash, position, department_id)
       VALUES ($1, $2, $3::user_position, $4) RETURNING member_id`,
      [app.applicant_email, hash, body.position, body.departmentId],
    );
    const mid = u.rows[0].member_id;
    await c.query(
      `INSERT INTO profiles (member_id, full_name, university_id, major, phone_number, status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [mid, app.applicant_name, app.university_id, app.major, app.phone_number],
    );
    await c.query(
      `UPDATE membership_applications
          SET status = 'accepted', member_id = $1, reviewed_by = $2, reviewed_date = CURRENT_DATE
        WHERE application_id = $3`,
      [mid, s.memberId, id],
    );
    return mid;
  });

  await sendEmail({
    to: app.applicant_email,
    subject: "Welcome to DRC — your account is ready",
    html: `<p>Your application has been accepted.</p>
           <p>Email: <b>${app.applicant_email}</b><br/>Temporary password: <code>${tempPassword}</code></p>
           <p>Please log in and change your password immediately.</p>`,
    text: `Welcome. Email: ${app.applicant_email} Temp password: ${tempPassword}`,
  });
  void emitNotification({
    recipientId: memberId,
    category: "membership_approved",
    title: "Welcome to DRC!",
    body: "Your membership has been approved. Complete your profile to get started.",
    linkUrl: "/dashboard/profile",
    sourceType: "application",
    sourceId: Number(id),
  });
  return ok({ memberId });
});
