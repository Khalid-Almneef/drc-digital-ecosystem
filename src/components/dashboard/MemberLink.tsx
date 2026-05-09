"use client";

import Link from "next/link";

// Reusable: turns a member name into a link to /team/[id].
// Falls back to plain text when memberId is null/undefined so callers can
// drop it in without conditionally rendering. Server-side endpoint at
// /api/members/[id]/public handles visibility — private profiles 404
// gracefully (the page renders "Profile unavailable").
export function MemberLink({
  memberId,
  name,
  className = "",
  underline = true,
}: {
  memberId: number | null | undefined;
  name: string;
  className?: string;
  /** Show an underline-on-hover affordance. Disable for compact lists. */
  underline?: boolean;
}) {
  if (!memberId) return <span className={className}>{name}</span>;
  return (
    <Link
      href={`/team/${memberId}`}
      className={`${underline ? "hover:underline underline-offset-4 decoration-primary/40" : ""} hover:text-primary transition-colors ${className}`}
    >
      {name}
    </Link>
  );
}
