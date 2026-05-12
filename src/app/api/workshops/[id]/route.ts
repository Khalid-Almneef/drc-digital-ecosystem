import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

const Patch = z.object({
  title: z.string().optional(),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  category: z.string().optional(),
  presenter: z.string().optional(),
  durationMin: z.number().int().optional(),
  videoUrl: z.string().optional(),
  googleDriveFolderUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  recordedDate: z.string().optional(),
  isPublished: z.boolean().optional(),
  membersOnly: z.boolean().optional(),
});

function canManage(s: { position: string; departmentSlug: string | null }) {
  if (s.position === "president" || s.position === "vice_president") return true;
  return (
    (s.position === "dept_leader" || s.position === "dept_vice_leader") &&
    s.departmentSlug === "development"
  );
}

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  if (!canManage(s)) return err(403, "Forbidden");
  const { id } = await ctx.params;
  const b = await parseBody(req, Patch);
  if (isMockMode()) {
    const workshop = getMockStore().workshops.find((row) => row.workshopId === Number(id));
    if (!workshop) return err(404, "Workshop not found");
    if (b.title !== undefined) workshop.title = b.title;
    if (b.titleAr !== undefined) workshop.titleAr = b.titleAr || null;
    if (b.description !== undefined) workshop.description = b.description || null;
    if (b.descriptionAr !== undefined) workshop.descriptionAr = b.descriptionAr || null;
    if (b.category !== undefined) workshop.category = b.category || null;
    if (b.presenter !== undefined) workshop.presenter = b.presenter || null;
    if (b.durationMin !== undefined) workshop.durationMin = b.durationMin;
    if (b.videoUrl !== undefined) workshop.videoUrl = b.videoUrl || null;
    if (b.googleDriveFolderUrl !== undefined) workshop.googleDriveFolderUrl = b.googleDriveFolderUrl || null;
    if (b.thumbnailUrl !== undefined) workshop.thumbnailUrl = b.thumbnailUrl || null;
    if (b.recordedDate !== undefined) workshop.recordedDate = b.recordedDate || null;
    if (b.isPublished !== undefined) workshop.isPublished = b.isPublished;
    if (b.membersOnly !== undefined) workshop.membersOnly = b.membersOnly;
    return ok({ success: true });
  }
  const map: Record<string, string> = {
    title: "title", titleAr: "title_ar", description: "description", descriptionAr: "description_ar",
    category: "category", presenter: "presenter", durationMin: "duration_min",
    videoUrl: "video_url", googleDriveFolderUrl: "google_drive_folder_url",
    thumbnailUrl: "thumbnail_url", recordedDate: "recorded_date",
    isPublished: "is_published", membersOnly: "members_only",
  };
  const sets: string[] = [];
  const params: unknown[] = [id];
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    if (map[k]) { params.push(v); sets.push(`${map[k]} = $${params.length}`); }
  }
  if (!sets.length) return ok({ success: true });
  await query(`UPDATE workshops SET ${sets.join(", ")} WHERE workshop_id = $1`, params);
  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  const s = await requireSession();
  if (!canManage(s)) return err(403, "Forbidden");
  const { id } = await ctx.params;
  if (isMockMode()) {
    const store = getMockStore();
    store.workshops = store.workshops.filter((workshop) => workshop.workshopId !== Number(id));
    return ok({ success: true });
  }
  await query(`DELETE FROM workshops WHERE workshop_id = $1`, [id]);
  return ok({ success: true });
});
