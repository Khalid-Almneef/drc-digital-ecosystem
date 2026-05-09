import { handle, ok } from "@/lib/api";
import { getSession, loadSessionUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { departmentById, findMockMember, isMockMode } from "@/lib/mock-store";

export const GET = handle(async () => {
  const s = await getSession();
  if (!s) return ok({ user: null });
  if (isMockMode()) {
    const member = findMockMember(s.memberId);
    if (!member) return ok({ user: null });
    const dept = departmentById(member.departmentId);
    return ok({
      user: {
        memberId: member.memberId,
        email: member.email,
        position: member.position,
        departmentId: member.departmentId,
        departmentSlug: member.departmentSlug,
        profileStatus: member.profileStatus,
        profile: {
          fullName: member.fullName,
          fullNameAr: member.fullNameAr,
          avatarUrl: member.avatarUrl,
          bio: member.bio,
          linkedinUrl: member.linkedinUrl,
          githubUrl: member.githubUrl,
          gender: member.gender,
          isPublicOnTeam: member.isPublicOnTeam,
        },
        departmentName: dept?.name ?? null,
      },
    });
  }
  const user = await loadSessionUser(s.memberId);
  if (!user) return ok({ user: null });
  const profile = await queryOne<{
    fullName: string | null; fullNameAr: string | null;
    avatarUrl: string | null; bio: string | null;
    linkedinUrl: string | null; githubUrl: string | null;
    gender: string | null; isPublicOnTeam: boolean;
    profileStatus: string;
  }>(
    `SELECT full_name AS "fullName", full_name_ar AS "fullNameAr", avatar_url AS "avatarUrl",
            bio, linkedin_url AS "linkedinUrl", github_url AS "githubUrl", gender,
            is_public_on_team AS "isPublicOnTeam",
            status AS "profileStatus"
       FROM profiles WHERE member_id = $1`,
    [s.memberId],
  );
  return ok({ user: { ...user, profileStatus: profile?.profileStatus ?? "active", profile } });
});
