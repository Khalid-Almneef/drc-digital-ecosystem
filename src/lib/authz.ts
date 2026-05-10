// Shared authorization helpers for API routes.
//
// These predicates are intentionally tiny and composable. They centralize the
// "club lead vs department lead vs resource owner" gate logic that appears
// across nearly every mutating endpoint.
//
// Conventions:
// - `s` is a SessionUser (see src/lib/auth.ts). After applyPermissionOverrides
//   has been applied (which getSession does), sub_leader is normalized to
//   dept_vice_leader for permission purposes.
// - "Club leads" are president + vice_president (full admin).
// - "Dept leads" are dept_leader + dept_vice_leader, scoped to their dept.
import type { SessionUser } from "./auth";

export function isClubLead(s: SessionUser): boolean {
  return s.position === "president" || s.position === "vice_president";
}

export function isDeptLead(s: SessionUser): boolean {
  return s.position === "dept_leader" || s.position === "dept_vice_leader";
}

/** Club admin OR (dept lead of the resource's department). */
export function canManageDept(
  s: SessionUser,
  resourceDepartmentId: number | null | undefined,
): boolean {
  if (isClubLead(s)) return true;
  if (!isDeptLead(s)) return false;
  if (resourceDepartmentId == null) return false;
  return s.departmentId === resourceDepartmentId;
}

/** Club admin OR (dept lead of the given department slug). */
export function canManageDeptBySlug(
  s: SessionUser,
  slug: string | string[],
): boolean {
  if (isClubLead(s)) return true;
  if (!isDeptLead(s)) return false;
  const allowed = Array.isArray(slug) ? slug : [slug];
  return !!s.departmentSlug && allowed.includes(s.departmentSlug);
}

/** True when the session user is the owner of the resource. */
export function ownsResource(
  s: SessionUser,
  ownerId: number | null | undefined,
): boolean {
  return ownerId != null && ownerId === s.memberId;
}

/** Owner OR club admin OR dept lead of the resource's department. */
export function canMutateDeptResource(
  s: SessionUser,
  resourceOwnerId: number | null | undefined,
  resourceDepartmentId: number | null | undefined,
): boolean {
  return (
    ownsResource(s, resourceOwnerId) ||
    canManageDept(s, resourceDepartmentId)
  );
}
