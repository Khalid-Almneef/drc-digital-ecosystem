import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { queryOne, withTx } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { departmentById, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

const Body = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  fullName: z.string().min(1).max(255),
  fullNameAr: z.string().max(255).optional(),
  departmentId: z.number().int(),
  position: z.enum(["member", "sub_leader", "dept_vice_leader", "dept_leader"]).default("member"),
  major: z.string().max(255).optional(),
  phoneNumber: z.string().max(40).optional(),
  gender: z.enum(["male", "female"]).optional(),
});

function canRegisterMembers(session: { position: string; departmentSlug: string | null }) {
  if (session.position === "president" || session.position === "vice_president") return true;
  if (session.departmentSlug !== "hr") return false;
  return ["dept_leader", "dept_vice_leader"].includes(session.position);
}

/**
 * Creates a member account with no password set. The user must trigger their own
 * setup email by attempting to log in (the login route detects NULL password_hash
 * and emails a setup link). HR can also share /forgot-password with the member.
 */
export const POST = handle(async (req) => {
  const session = await requireSession();
  if (!canRegisterMembers(session)) {
    return err(403, "Only HR leaders can register members", "forbidden");
  }
  const body = await parseBody(req, Body);

  if (isMockMode()) {
    const store = getMockStore();
    const existing = store.members.find((m) => m.email.toLowerCase() === body.email);
    if (existing) return err(409, "A member with this email already exists", "duplicate_email");
    const dept = departmentById(body.departmentId);
    if (!dept) return err(400, "Department not found");
    const memberId = nextMockId("application") + 100;
    store.members.push({
      memberId,
      fullName: body.fullName,
      fullNameAr: body.fullNameAr ?? body.fullName,
      email: body.email,
      position: body.position,
      departmentId: dept.id,
      departmentSlug: dept.slug,
      departmentName: dept.name,
      departmentNameAr: dept.nameAr,
      avatarUrl: null,
      bio: null,
      quote: null,
      quoteAr: null,
      major: body.major ?? null,
      phoneNumber: body.phoneNumber ?? null,
      linkedinUrl: null,
      githubUrl: null,
      graduationYear: null,
      gender: body.gender ?? "male",
      isActive: true,
      isPublicOnTeam: false,
      profileStatus: "active",
      passwordSet: false,
    });
    return ok({ memberId, requiresSetup: true });
  }

  const existing = await queryOne<{ member_id: number }>(
    `SELECT member_id FROM users WHERE email = $1`,
    [body.email],
  );
  if (existing) return err(409, "A member with this email already exists", "duplicate_email");

  const memberId = await withTx(async (c) => {
    const u = await c.query<{ member_id: number }>(
      `INSERT INTO users (email, password_hash, position, department_id, is_active)
       VALUES ($1, NULL, $2::user_position, $3, TRUE) RETURNING member_id`,
      [body.email, body.position, body.departmentId],
    );
    const mid = u.rows[0].member_id;
    await c.query(
      `INSERT INTO profiles (member_id, full_name, full_name_ar, major, phone_number, gender, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [mid, body.fullName, body.fullNameAr ?? null, body.major ?? null, body.phoneNumber ?? null, body.gender ?? null],
    );
    return mid;
  });

  return ok({ memberId, requiresSetup: true });
});
