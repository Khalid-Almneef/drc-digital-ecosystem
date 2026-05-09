import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { getMockStore, isMockMode } from "@/lib/mock-store";

/** Public team page feed: returns leadership + members toggled public. */
export const GET = handle(async () => {
  if (isMockMode()) {
    const store = getMockStore();
    const active = store.members
      .filter((m) => m.isActive)
      .filter((m) => ["president", "vice_president", "dept_leader", "dept_vice_leader", "sub_leader"].includes(m.position) || m.isPublicOnTeam)
      .filter((m) => m.profileStatus !== "alumni")
      // Hide dev-login fixtures (placeholder accounts on @drc.club used only
      // for local mock-mode auth) so the real roster is what visitors see.
      .filter((m) => !(m.email?.endsWith("@drc.club") && m.isPublicOnTeam === false))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((m) => {
        const isLeader = ["president", "vice_president", "dept_leader", "dept_vice_leader", "sub_leader"].includes(m.position);
        // Per-field privacy: leaders default to "public", regular members
        // default to opt-in for email/phone, opt-out only when explicitly set.
        const showEmail    = m.isEmailPublic    ?? isLeader;
        const showLinkedin = m.isLinkedinPublic ?? true;
        const showPhone    = m.isPhonePublic    ?? false;
        const showGithub   = m.isGithubPublic   ?? true;
        return {
          memberId: m.memberId,
          position: m.position,
          departmentSlug: m.departmentSlug,
          departmentName: m.departmentName,
          departmentNameAr: m.departmentNameAr,
          fullName: m.fullName,
          fullNameAr: m.fullNameAr,
          avatarUrl: m.avatarUrl,
          bio: m.bio,
          major: m.major,
          gender: m.gender,
          linkedinUrl: showLinkedin ? m.linkedinUrl : null,
          githubUrl:   showGithub   ? m.githubUrl   : null,
          phoneNumber: showPhone    ? m.phoneNumber : null,
          email:       showEmail    ? m.email       : null,
          customRole:   m.customRole   ?? null,
          customRoleAr: m.customRoleAr ?? null,
          profileStatus: m.profileStatus,
        };
      });
    const alumni = store.members
      .filter((m) => m.profileStatus === "alumni")
      .map((m) => ({
        memberId: m.memberId,
        fullName: m.fullName,
        fullNameAr: m.fullNameAr,
        avatarUrl: m.avatarUrl,
        bio: m.bio,
        quote: m.quote,
        quoteAr: m.quoteAr,
        major: m.major,
        gender: m.gender,
        departmentName: m.departmentName,
      }));
    return ok({ active, alumni });
  }
  const { rows } = await query(
    `SELECT u.member_id AS "memberId", u.position::text AS position,
            d.slug::text AS "departmentSlug", d.name AS "departmentName", d.name_ar AS "departmentNameAr",
            p.full_name AS "fullName", p.full_name_ar AS "fullNameAr",
            p.avatar_url AS "avatarUrl", p.bio, p.major, p.gender,
            CASE WHEN COALESCE(p.is_linkedin_public, TRUE) THEN p.linkedin_url ELSE NULL END AS "linkedinUrl",
            CASE WHEN COALESCE(p.is_github_public,   TRUE) THEN p.github_url   ELSE NULL END AS "githubUrl",
            CASE WHEN COALESCE(p.is_phone_public,    FALSE) THEN p.phone_number ELSE NULL END AS "phoneNumber",
            CASE WHEN COALESCE(p.is_email_public, FALSE)
                   OR u.position IN ('president','vice_president','dept_leader','dept_vice_leader','sub_leader')
                 THEN u.email ELSE NULL END AS "email",
            p.status AS "profileStatus"
       FROM users u
       JOIN profiles p ON p.member_id = u.member_id
       LEFT JOIN departments d ON d.department_id = u.department_id
      WHERE u.is_active = TRUE
        AND (u.position IN ('president','vice_president','dept_leader','dept_vice_leader','sub_leader')
             OR p.is_public_on_team = TRUE)
      ORDER BY
        CASE u.position
          WHEN 'president' THEN 1 WHEN 'vice_president' THEN 2
          WHEN 'dept_leader' THEN 3 WHEN 'dept_vice_leader' THEN 4
          WHEN 'sub_leader' THEN 5 ELSE 6 END,
        d.name, p.full_name`,
  );
  const alumni = await query(
    `SELECT u.member_id AS "memberId", p.full_name AS "fullName", p.full_name_ar AS "fullNameAr",
            p.avatar_url AS "avatarUrl", p.bio, p.major, p.gender, d.name AS "departmentName"
       FROM users u
       JOIN profiles p ON p.member_id = u.member_id
       LEFT JOIN departments d ON d.department_id = u.department_id
      WHERE p.status = 'alumni'
      ORDER BY p.full_name`,
  );
  return ok({ active: rows, alumni: alumni.rows });
});
