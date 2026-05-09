import { handle, ok, err } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { findMockMember, isMockMode } from "@/lib/mock-store";
import { getSession } from "@/lib/auth";

// Public profile endpoint — used by both /alumni/[id] and /team/[id], plus
// dashboard member-name links. Visibility tiers:
//
// 1. Alumni: always public.
// 2. Active leaders (president → sub_leader): always public — they appear on
//    the public team page by default.
// 3. Active members: public only if they've opted-in via the team-visibility
//    toggle (`profiles.is_public_on_team = TRUE`).
//
// Authenticated dashboard users see #3 even without opt-in (so internal links
// like "click member name in service request card" always work).
export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const memberId = Number(id);
  if (!Number.isFinite(memberId) || memberId <= 0) return err(400, "Invalid id");

  const session = await getSession();
  const isAuthed = !!session;

  if (isMockMode()) {
    const member = findMockMember(memberId);
    if (!member || !member.isActive && member.profileStatus !== "alumni") return err(404, "Member not found");
    const isLeader = ["president","vice_president","dept_leader","dept_vice_leader","sub_leader"].includes(member.position);
    const isAlumni = member.profileStatus === "alumni";
    const visible = isAlumni || isLeader || member.isPublicOnTeam || isAuthed;
    if (!visible) return err(404, "Member not found");
    const showLinkedin = member.isLinkedinPublic ?? true;
    const showGithub   = member.isGithubPublic   ?? true;
    const showPhone    = member.isPhonePublic    ?? false;
    const showEmail    = member.isEmailPublic    ?? isLeader;
    return ok({
      memberId: member.memberId,
      fullName: member.fullName,
      fullNameAr: member.fullNameAr,
      avatarUrl: member.avatarUrl,
      bio: member.bio,
      quote: member.quote,
      quoteAr: member.quoteAr,
      major: member.major,
      graduationYear: member.graduationYear,
      linkedinUrl: showLinkedin ? member.linkedinUrl : null,
      githubUrl:   showGithub   ? member.githubUrl   : null,
      phoneNumber: showPhone    ? member.phoneNumber : null,
      email:       showEmail    ? member.email       : null,
      departmentName: member.departmentName,
      departmentNameAr: member.departmentNameAr,
      position: member.position,
      profileStatus: member.profileStatus,
    });
  }

  const row = await queryOne<{
    memberId: number;
    fullName: string | null;
    fullNameAr: string | null;
    avatarUrl: string | null;
    bio: string | null;
    major: string | null;
    graduationYear: number | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    phoneNumber: string | null;
    email: string | null;
    departmentName: string | null;
    departmentNameAr: string | null;
    position: string;
    profileStatus: string;
    isPublicOnTeam: boolean;
  }>(
    `SELECT u.member_id    AS "memberId",
            p.full_name    AS "fullName",
            p.full_name_ar AS "fullNameAr",
            p.avatar_url   AS "avatarUrl",
            p.bio, p.major,
            p.graduation_year AS "graduationYear",
            CASE WHEN COALESCE(p.is_linkedin_public, TRUE) THEN p.linkedin_url ELSE NULL END AS "linkedinUrl",
            CASE WHEN COALESCE(p.is_github_public,   TRUE) THEN p.github_url   ELSE NULL END AS "githubUrl",
            CASE WHEN COALESCE(p.is_phone_public,   FALSE) THEN p.phone_number ELSE NULL END AS "phoneNumber",
            CASE WHEN COALESCE(p.is_email_public, FALSE)
                   OR u.position IN ('president','vice_president','dept_leader','dept_vice_leader','sub_leader')
                 THEN u.email ELSE NULL END AS "email",
            d.name         AS "departmentName",
            d.name_ar      AS "departmentNameAr",
            u.position::text AS position,
            p.status       AS "profileStatus",
            p.is_public_on_team AS "isPublicOnTeam"
       FROM users u
       JOIN profiles p ON p.member_id = u.member_id
       LEFT JOIN departments d ON d.department_id = u.department_id
      WHERE u.member_id = $1 AND (u.is_active = TRUE OR p.status = 'alumni')`,
    [memberId],
  );

  if (!row) return err(404, "Member not found");

  const isLeader = ["president","vice_president","dept_leader","dept_vice_leader","sub_leader"].includes(row.position);
  const isAlumni = row.profileStatus === "alumni";
  const visible = isAlumni || isLeader || row.isPublicOnTeam || isAuthed;
  if (!visible) return err(404, "Member not found");

  return ok({ ...row, quote: null, quoteAr: null });
});
