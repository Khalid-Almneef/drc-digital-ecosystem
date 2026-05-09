import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { getMockStore, isMockMode } from "@/lib/mock-store";

export const GET = handle(async () => {
  if (isMockMode()) {
    const now = new Date();
    const store = getMockStore();
    const upcoming = store.events
      .filter((e) => e.isPublished && new Date(e.startTime) >= now)
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
    const past = store.events
      .filter((e) => e.isPublished && new Date(e.startTime) < now)
      .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime))
      .slice(0, 50)
      .map(({ ...rest }) => rest);
    return ok({
      upcoming: upcoming.map((event) => ({
        eventId: event.eventId,
        title: event.title,
        description: event.description,
        imageUrl: event.imageUrl,
        type: event.type,
        category: event.category,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        seatsAvailable: event.seatsAvailable,
      })),
      past: past.map((event) => ({
        eventId: event.eventId,
        title: event.title,
        description: event.description,
        imageUrl: event.imageUrl,
        type: event.type,
        category: event.category,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
      })),
    });
  }
  const upcoming = await query(
    `SELECT event_id AS "eventId", title, description, image_url AS "imageUrl",
            type::text AS type, category, start_time AS "startTime", end_time AS "endTime",
            location, seats_available AS "seatsAvailable"
       FROM events
      WHERE is_published = TRUE AND start_time >= NOW()
      ORDER BY start_time ASC`,
  );
  const past = await query(
    `SELECT event_id AS "eventId", title, description, image_url AS "imageUrl",
            type::text AS type, category, start_time AS "startTime", end_time AS "endTime", location
       FROM events
      WHERE is_published = TRUE AND start_time < NOW()
      ORDER BY start_time DESC
      LIMIT 50`,
  );
  return ok({
    upcoming: upcoming.rows,
    past: past.rows,
  });
});
