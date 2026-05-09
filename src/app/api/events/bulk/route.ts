import { handle, ok, err } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

/**
 * POST /api/events/bulk
 *
 * Body: text/csv (one event per row, header row required). Same column names
 * as /api/events/bulk/template. Returns counts: { inserted, skipped, errors }.
 *
 * Drafts by default — `is_published` column is forced to FALSE unless the
 * caller is media leadership or admin (mirrors the per-event publish gate).
 */
export const POST = handle(async (req) => {
  const s = await requireSession();
  const isLeader = ["president", "vice_president", "dept_leader", "dept_vice_leader"].includes(s.position);
  if (!isLeader) return err(403, "Only leaders can bulk-import events.");

  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isMediaLead =
    (s.position === "dept_leader" || s.position === "dept_vice_leader") &&
    s.departmentSlug === "media";
  const canPublish = isAdmin || isMediaLead;

  const csvText = await req.text();
  const rows = parseCsv(csvText);
  if (rows.length === 0) return err(400, "CSV is empty.");

  const headerRow = rows[0].map((h) => h.trim().toLowerCase());
  const requiredCols = ["title", "start_time"];
  for (const col of requiredCols) {
    if (!headerRow.includes(col)) return err(400, `Missing column: ${col}`);
  }
  const idx = (col: string) => headerRow.indexOf(col);

  const results = { inserted: 0, skipped: 0, errors: [] as string[] };

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((c) => !c.trim())) { results.skipped++; continue; }
    try {
      const title = row[idx("title")]?.trim();
      const startTime = row[idx("start_time")]?.trim();
      if (!title || !startTime) {
        results.errors.push(`Row ${r + 1}: missing title or start_time`);
        continue;
      }
      const get = (col: string) => {
        const i = idx(col);
        if (i < 0) return null;
        const v = row[i]?.trim();
        return v ? v : null;
      };
      const type = (get("type") as "workshop" | "competition" | "meetup" | "general" | null) ?? "general";
      const description = get("description");
      const category = get("category");
      const endTime = get("end_time");
      const location = get("location");
      const seats = get("seats_available");
      const seatsAvailable = seats ? Number(seats) : null;
      const creditRaw = get("credit_hours");
      const creditHours = creditRaw ? Number(creditRaw) : 0;
      const publishedRaw = (get("is_published") || "false").toLowerCase();
      const requested = publishedRaw === "true" || publishedRaw === "1" || publishedRaw === "yes";
      const isPublished = canPublish ? requested : false;
      const imageUrl = get("image_url");

      if (isMockMode()) {
        const eventId = nextMockId("project") + 9000 + r; // safe id range
        getMockStore().events.unshift({
          eventId,
          title,
          description,
          imageUrl,
          type,
          category,
          startTime,
          endTime,
          location,
          seatsAvailable,
          isPublished,
          creditHours,
        });
      } else {
        await query(
          `INSERT INTO events (title, description, image_url, type, category,
                               start_time, end_time, location, seats_available,
                               is_published, credit_hours)
           VALUES ($1,$2,$3,$4::event_type,$5,$6,$7,$8,$9,$10,$11)`,
          [
            title, description, imageUrl, type, category,
            startTime, endTime, location, seatsAvailable, isPublished, creditHours,
          ],
        );
      }
      results.inserted++;
    } catch (e) {
      results.errors.push(`Row ${r + 1}: ${(e as Error).message}`);
    }
  }

  return ok(results);
});

// Tiny CSV parser handling double-quoted fields and escaped quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch === "\r") { /* ignore */ }
      else { cell += ch; }
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 0);
}
