import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireAdmin, requireSession } from "@/lib/auth";
import { departmentById, findMockMember, isMockMode } from "@/lib/mock-store";

export const GET = handle(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  if (isMockMode()) {
    const member = findMockMember(Number(id));
    if (!member) return err(404, "Not found");
    return ok({
      memberId: member.memberId,
      email: member.email,
      position: member.position,
      isActive: member.isActive,
      departmentSlug: member.departmentSlug,
      departmentId: member.departmentId,
      fullName: member.fullName,
      fullNameAr: member.fullNameAr,
      avatarUrl: member.avatarUrl,
      bio: member.bio,
      major: member.major,
      phoneNumber: member.phoneNumber,
      linkedinUrl: member.linkedinUrl,
      githubUrl: member.githubUrl,
      graduationYear: member.graduationYear,
      gender: member.gender,
      profileStatus: member.profileStatus,
      customRole: member.customRole ?? null,
      customRoleAr: member.customRoleAr ?? null,
      isPublicOnTeam: member.isPublicOnTeam,
      isEmailPublic: member.isEmailPublic ?? false,
      isLinkedinPublic: member.isLinkedinPublic ?? true,
      isPhonePublic: member.isPhonePublic ?? false,
      isGithubPublic: member.isGithubPublic ?? true,
    });
  }
  const row = await queryOne(
    `SELECT u.member_id AS "memberId", u.email, u.position::text AS position,
            u.is_active AS "isActive", d.slug::text AS "departmentSlug",
            u.department_id AS "departmentId",
            p.full_name AS "fullName", p.full_name_ar AS "fullNameAr",
            p.avatar_url AS "avatarUrl", p.bio, p.major, p.phone_number AS "phoneNumber",
            p.linkedin_url AS "linkedinUrl", p.github_url AS "githubUrl",
            p.graduation_year AS "graduationYear", p.gender,
            p.status AS "profileStatus",
            p.custom_role    AS "customRole",
            p.custom_role_ar AS "customRoleAr",
            p.is_public_on_team AS "isPublicOnTeam",
            COALESCE(p.is_email_public,    FALSE) AS "isEmailPublic",
            COALESCE(p.is_linkedin_public, TRUE)  AS "isLinkedinPublic",
            COALESCE(p.is_phone_public,    FALSE) AS "isPhonePublic",
            COALESCE(p.is_github_public,   TRUE)  AS "isGithubPublic"
       FROM users u
       LEFT JOIN departments d ON d.department_id = u.department_id
       LEFT JOIN profiles p    ON p.member_id     = u.member_id
      WHERE u.member_id = $1`,
    [id],
  );
  if (!row) return err(404, "Not found");
  return ok(row);
});

const Patch = z.object({
  fullName: z.string().min(1).optional(),
  fullNameAr: z.string().optional(),
  bio: z.string().optional(),
  major: z.string().optional(),
  phoneNumber: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  avatarUrl: z.string().optional(),
  graduationYear: z.number().int().optional(),
  gender: z.enum(["male", "female"]).optional(),
  status: z.enum(["active", "inactive", "alumni", "suspended"]).optional(),
  isActive: z.boolean().optional(),
  departmentId: z.number().int().nullable().optional(),
  // Admin-set role label shown on the public team page (e.g. "Quality &
  // Assurance Lead", "Media Advisor"). Falls back to the position-derived
  // label when blank.
  customRole: z.string().optional().or(z.literal("")),
  customRoleAr: z.string().optional().or(z.literal("")),
  // Per-field privacy toggles
  isPublicOnTeam: z.boolean().optional(),
  isEmailPublic: z.boolean().optional(),
  isLinkedinPublic: z.boolean().optional(),
  isPhonePublic: z.boolean().optional(),
  isGithubPublic: z.boolean().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  const { id } = await ctx.params;
  const targetId = Number(id);
  const isSelf = s.memberId === targetId;
  const isAdmin = s.position === "president" || s.position === "vice_president";
  if (!isSelf && !isAdmin) return err(403, "Forbidden");

  const body = await parseBody(req, Patch);
  if (isMockMode()) {
    const target = findMockMember(targetId);
    if (!target) return err(404, "Not found");
    if (body.fullName !== undefined) target.fullName = body.fullName;
    if (body.fullNameAr !== undefined) target.fullNameAr = body.fullNameAr;
    if (body.bio !== undefined) target.bio = body.bio || null;
    if (body.major !== undefined) target.major = body.major || null;
    if (body.phoneNumber !== undefined) target.phoneNumber = body.phoneNumber || null;
    if (body.linkedinUrl !== undefined) target.linkedinUrl = body.linkedinUrl || null;
    if (body.githubUrl !== undefined) target.githubUrl = body.githubUrl || null;
    if (body.avatarUrl !== undefined) target.avatarUrl = body.avatarUrl || null;
    if (body.graduationYear !== undefined) target.graduationYear = body.graduationYear;
    if (body.gender !== undefined) target.gender = body.gender;
    if (body.status !== undefined) target.profileStatus = body.status;
    if (body.customRole !== undefined) target.customRole = body.customRole || null;
    if (body.customRoleAr !== undefined) target.customRoleAr = body.customRoleAr || null;
    if (body.isPublicOnTeam !== undefined) target.isPublicOnTeam = body.isPublicOnTeam;
    if (body.isEmailPublic !== undefined) target.isEmailPublic = body.isEmailPublic;
    if (body.isLinkedinPublic !== undefined) target.isLinkedinPublic = body.isLinkedinPublic;
    if (body.isPhonePublic !== undefined) target.isPhonePublic = body.isPhonePublic;
    if (body.isGithubPublic !== undefined) target.isGithubPublic = body.isGithubPublic;
    if (isAdmin && body.isActive !== undefined) target.isActive = body.isActive;
    if (isAdmin && body.departmentId !== undefined) {
      const dept = departmentById(body.departmentId ?? null);
      target.departmentId = dept?.id ?? null;
      target.departmentSlug = dept?.slug ?? null;
      target.departmentName = dept?.name ?? "Club-wide";
      target.departmentNameAr = dept?.nameAr ?? "عام";
    }
    return ok({ success: true });
  }
  if (!isAdmin && (body.status || body.isActive !== undefined || body.departmentId !== undefined))
    return err(403, "Only admins can change status/department");

  const profileFields: Record<string, unknown> = {};
  for (const k of [
    "fullName", "fullNameAr", "bio", "major", "phoneNumber",
    "linkedinUrl", "githubUrl", "avatarUrl", "graduationYear", "gender", "status",
    "customRole", "customRoleAr",
    "isPublicOnTeam", "isEmailPublic", "isLinkedinPublic", "isPhonePublic", "isGithubPublic",
  ] as const) {
    if (body[k] !== undefined) profileFields[k] = body[k] === "" ? null : body[k];
  }
  const map: Record<string, string> = {
    fullName: "full_name", fullNameAr: "full_name_ar", bio: "bio", major: "major",
    phoneNumber: "phone_number", linkedinUrl: "linkedin_url", githubUrl: "github_url",
    avatarUrl: "avatar_url", graduationYear: "graduation_year", gender: "gender", status: "status",
    customRole: "custom_role",
    customRoleAr: "custom_role_ar",
    isPublicOnTeam: "is_public_on_team",
    isEmailPublic: "is_email_public",
    isLinkedinPublic: "is_linkedin_public",
    isPhonePublic: "is_phone_public",
    isGithubPublic: "is_github_public",
  };
  const sets = Object.keys(profileFields).map((k, i) => `${map[k]} = $${i + 2}`);
  if (sets.length) {
    await query(
      `UPDATE profiles SET ${sets.join(", ")} WHERE member_id = $1`,
      [targetId, ...Object.values(profileFields)],
    );
  }
  if (isAdmin) {
    if (body.isActive !== undefined)
      await query(`UPDATE users SET is_active = $1 WHERE member_id = $2`, [body.isActive, targetId]);
    if (body.departmentId !== undefined)
      await query(`UPDATE users SET department_id = $1 WHERE member_id = $2`, [body.departmentId, targetId]);
  }
  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  if (isMockMode()) {
    const { id } = await ctx.params;
    const member = findMockMember(Number(id));
    if (!member) return err(404, "Not found");
    member.isActive = false;
    return ok({ success: true });
  }
  await requireAdmin();
  const { id } = await ctx.params;
  await query(`UPDATE users SET is_active = FALSE WHERE member_id = $1`, [id]);
  return ok({ success: true });
});
