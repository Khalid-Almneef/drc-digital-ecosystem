import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

export const GET = handle(async () => {
  await requireSession();
  if (isMockMode()) {
    return ok(
      getMockStore().events
        .slice()
        .sort((a, b) => b.startTime.localeCompare(a.startTime))
        .map((event) => ({
          ...event,
        })),
    );
  }
  const { rows } = await query(
    `SELECT event_id AS "eventId", title, description, image_url AS "imageUrl",
            type::text AS type, category, start_time AS "startTime", end_time AS "endTime",
            location, seats_available AS "seatsAvailable", max_team_size AS "maxTeamSize",
            requirements, is_published AS "isPublished", credit_hours AS "creditHours"
       FROM events ORDER BY start_time DESC`,
  );
  return ok(rows);
});

const Post = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  type: z.enum(["workshop", "competition", "meetup", "general"]).default("general"),
  category: z.string().optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  seatsAvailable: z.number().int().optional(),
  maxTeamSize: z.number().int().optional(),
  requirements: z.string().optional(),
  isPublished: z.boolean().default(false),
  creditHours: z.number().nonnegative().optional(),
});

export const POST = handle(async (req) => {
  const s = await requireSession();
  const b = await parseBody(req, Post);
  if (isMockMode()) {
    const store = getMockStore();
    const eventId = store.events.reduce((max, event) => Math.max(max, event.eventId), 0) + 1;
    store.events.unshift({
      eventId,
      title: b.title,
      description: b.description ?? null,
      imageUrl: b.imageUrl ?? null,
      type: b.type,
      category: b.category ?? null,
      startTime: b.startTime,
      endTime: b.endTime ?? null,
      location: b.location ?? null,
      seatsAvailable: b.seatsAvailable ?? null,
      isPublished: b.isPublished,
      creditHours: b.creditHours ?? 0,
    });
    return ok({ eventId }, { status: 201 });
  }
  const { rows } = await query<{ event_id: number }>(
    `INSERT INTO events (title, description, image_url, type, category, start_time, end_time,
       location, seats_available, max_team_size, requirements, is_published, created_by, credit_hours)
     VALUES ($1,$2,$3,$4::event_type,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING event_id`,
    [
      b.title, b.description ?? null, b.imageUrl ?? null, b.type, b.category ?? null,
      b.startTime, b.endTime ?? null, b.location ?? null, b.seatsAvailable ?? null,
      b.maxTeamSize ?? 1, b.requirements ?? null, b.isPublished, s.memberId, b.creditHours ?? 0,
    ],
  );
  return ok({ eventId: rows[0].event_id }, { status: 201 });
});
