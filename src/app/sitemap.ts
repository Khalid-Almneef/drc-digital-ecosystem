import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://drc.club";

const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1.0 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/projects", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/workshops", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/events", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/team", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/join", changeFrequency: "monthly" as const, priority: 0.9 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
    alternates: {
      languages: {
        en: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
        ar: `${SITE_URL}${r.path === "/" ? "" : r.path}?lang=ar`,
      },
    },
  }));
}
