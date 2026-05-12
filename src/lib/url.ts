// Normalize a user-pasted URL for safe use in <a href>. Adds https:// when no
// scheme is present (so "linkedin.com/in/x" doesn't become a relative path),
// while leaving internal paths ("/uploads/..."), anchors, and other schemes
// (mailto:, tel:, https:, etc.) untouched.
export function toExternalUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("?")) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed}`;
}
