import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { getMockStore, isMockMode } from "@/lib/mock-store";

interface PublicEventRow {
  eventId: number | string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  type: string;
  category: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
  seatsAvailable: number | null;
  registrationKind?: "madarat" | null;
  registrationOpen?: boolean | null;
  visibility?: "public" | "club_only" | null;
}

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

  const [eventsUpcoming, eventsPast, madaratUpcoming, madaratPast] = await Promise.all([
    query<PublicEventRow>(
      `SELECT event_id AS "eventId", title, description, image_url AS "imageUrl",
              type::text AS type, category, start_time AS "startTime", end_time AS "endTime",
              location, seats_available AS "seatsAvailable"
         FROM events
        WHERE is_published = TRUE AND start_time >= NOW()
        ORDER BY start_time ASC`,
    ),
    query<PublicEventRow>(
      `SELECT event_id AS "eventId", title, description, image_url AS "imageUrl",
              type::text AS type, category, start_time AS "startTime", end_time AS "endTime",
              location, NULL::int AS "seatsAvailable"
         FROM events
        WHERE is_published = TRUE AND start_time < NOW()
        ORDER BY start_time DESC
        LIMIT 50`,
    ),
    query<PublicEventRow>(
      `SELECT 'madarat-' || ms.session_id AS "eventId",
              ms.title,
              COALESCE(NULLIF(ms.description, ''), CONCAT('Guest: ', ms.interviewee_name)) AS description,
              NULL::text AS "imageUrl",
              'meetup' AS type,
              ms.program_type::text AS category,
              ms.scheduled_at AS "startTime",
              CASE WHEN ms.duration_min IS NOT NULL THEN ms.scheduled_at + (ms.duration_min || ' minutes')::interval ELSE NULL END AS "endTime",
              ms.location,
              CASE WHEN ms.max_registrants IS NULL THEN NULL
                   ELSE GREATEST(ms.max_registrants - COALESCE((SELECT COUNT(*)::int FROM madarat_session_registrations r WHERE r.session_id = ms.session_id), 0), 0)
              END AS "seatsAvailable",
              'madarat'::text AS "registrationKind",
              ms.registration_open AS "registrationOpen",
              ms.visibility
         FROM madarat_sessions ms
        WHERE ms.is_published = TRUE AND ms.scheduled_at >= NOW()
        ORDER BY ms.scheduled_at ASC`,
    ),
    query<PublicEventRow>(
      `SELECT 'madarat-' || ms.session_id AS "eventId",
              ms.title,
              COALESCE(NULLIF(ms.description, ''), CONCAT('Guest: ', ms.interviewee_name)) AS description,
              NULL::text AS "imageUrl",
              'meetup' AS type,
              ms.program_type::text AS category,
              ms.scheduled_at AS "startTime",
              CASE WHEN ms.duration_min IS NOT NULL THEN ms.scheduled_at + (ms.duration_min || ' minutes')::interval ELSE NULL END AS "endTime",
              ms.location,
              NULL::int AS "seatsAvailable"
         FROM madarat_sessions ms
        WHERE ms.is_published = TRUE AND ms.scheduled_at < NOW()
        ORDER BY ms.scheduled_at DESC
        LIMIT 50`,
    ),
  ]);

  const upcoming = [...eventsUpcoming.rows, ...madaratUpcoming.rows]
    .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
  const past = [...eventsPast.rows, ...madaratPast.rows]
    .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime))
    .slice(0, 50);

  return ok({ upcoming, past });
});
