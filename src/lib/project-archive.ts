export type ArchiveSectionKey = "projects" | "events" | "competitions";

export interface ArchiveConfig {
  order: Record<ArchiveSectionKey, number[]>;
  galleries: Record<ArchiveSectionKey, Record<string, string[]>>;
}

export const DEFAULT_ARCHIVE_CONFIG: ArchiveConfig = {
  order: {
    projects: [],
    events: [],
    competitions: [],
  },
  galleries: {
    projects: {},
    events: {},
    competitions: {},
  },
};

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isGalleryRecord(value: unknown): value is Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => Array.isArray(entry) && entry.every((url) => typeof url === "string"));
}

export function normalizeArchiveConfig(value: unknown): ArchiveConfig {
  const config = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<ArchiveConfig> : {};
  return {
    order: {
      projects: isNumberArray(config.order?.projects) ? config.order.projects : [],
      events: isNumberArray(config.order?.events) ? config.order.events : [],
      competitions: isNumberArray(config.order?.competitions) ? config.order.competitions : [],
    },
    galleries: {
      projects: isGalleryRecord(config.galleries?.projects) ? config.galleries.projects : {},
      events: isGalleryRecord(config.galleries?.events) ? config.galleries.events : {},
      competitions: isGalleryRecord(config.galleries?.competitions) ? config.galleries.competitions : {},
    },
  };
}

export function sortArchiveItems<T extends { id: number }>(
  items: T[],
  preferredOrder: number[],
  fallbackSort?: (a: T, b: T) => number,
) {
  const orderMap = new Map(preferredOrder.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const left = orderMap.get(a.id);
    const right = orderMap.get(b.id);
    if (left !== undefined && right !== undefined) return left - right;
    if (left !== undefined) return -1;
    if (right !== undefined) return 1;
    return fallbackSort ? fallbackSort(a, b) : 0;
  });
}

export function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex < 0 || fromIndex >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return copy;
}

export function archiveStateFromProjectStatus(status: string): "upcoming" | "live" | "completed" {
  if (status === "completed") return "completed";
  if (status === "planning") return "upcoming";
  return "live";
}

export function archiveStateFromEventDates(startTime: string, endTime: string | null): "upcoming" | "live" | "completed" {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : start;
  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "completed";
}

export function eventArchiveSection(type: string): ArchiveSectionKey {
  return type === "competition" ? "competitions" : "events";
}

export function uniqueStrings(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.filter((item): item is string => Boolean(item))));
}

export function galleryForItem(config: ArchiveConfig, section: ArchiveSectionKey, id: number, coverImage?: string | null) {
  return uniqueStrings([coverImage ?? null, ...(config.galleries[section][String(id)] ?? [])]);
}
