import { z } from "zod";
import { handle, ok, err } from "@/lib/api";
import { query, withTx } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { findMockMember, getMockStore, isMockMode, nextMockId } from "@/lib/mock-store";

// Tolerant CSV parser: handles quoted cells, escaped quotes, CRLF/LF.
// Not RFC4180-perfect, but covers Excel/Sheets export and the templates we generate.
function parseCsv(text: string): string[][] {
  // Strip UTF-8 BOM if present (Excel adds one when "Save As CSV UTF-8").
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (c === "\r") {
      // swallow; CRLF handled by \n
      i += 1;
      continue;
    }
    if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 1;
      continue;
    }
    cell += c;
    i += 1;
  }
  // flush last cell/row
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

interface RowResult {
  rowNumber: number;
  email: string;
  status: "inserted" | "updated" | "skipped" | "error";
  message?: string;
}

const RowSchema = z.object({
  email: z.string().email().optional(),
  memberId: z.number().int().positive().optional(),
  hours: z.number().positive().max(1000),
  // title / participationDate / description are optional now — the simplified
  // template only asks for full_name + total_hours. The legacy template
  // (hours / title / participation_date / description per row) still works.
  title: z.string().min(1).max(255).optional(),
  participationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional(),
  description: z.string().max(2000).nullable().optional(),
});

// POST /api/volunteer-hours/bulk
//   Content-Type: text/csv (raw body) OR multipart/form-data (file field).
//   Returns { totalRows, inserted, skipped, errors, rows: RowResult[] }.
export const POST = handle(async (req) => {
  const s = await requireSession();
  const isAdmin = s.position === "president" || s.position === "vice_president";
  const isHr = (s.position === "dept_leader" || s.position === "dept_vice_leader") && s.departmentSlug === "hr";
  if (!isAdmin && !isHr) return err(403, "Forbidden");

  let csvText = "";
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) return err(400, "Missing file field");
    if (file.size > 5 * 1024 * 1024) return err(400, "File too large (max 5 MB)");
    csvText = await file.text();
  } else {
    csvText = await req.text();
  }

  if (!csvText.trim()) return err(400, "Empty CSV");

  const rows = parseCsv(csvText);
  if (rows.length < 2) return err(400, "CSV must include a header row and at least one data row");

  const rawHeader = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const idx = (name: string) => rawHeader.indexOf(name);
  const idxEmail = idx("email");
  const idxMemberId = idx("member_id");
  // Simplified template uses `total_hours`; legacy template uses `hours`.
  const idxHours = idx("hours") !== -1 ? idx("hours") : idx("total_hours");
  const idxTitle = idx("title");
  const idxDate = idx("participation_date");
  const idxDesc = idx("description");

  if (idxHours === -1) {
    return err(400, "Missing required column: hours (or total_hours)");
  }
  if (idxEmail === -1 && idxMemberId === -1) {
    return err(400, "CSV needs either an email or member_id column");
  }

  // Pair each row with its parsed result so iteration is straightforward.
  type Pending = { result: RowResult; data: z.infer<typeof RowSchema> | null };
  const pending: Pending[] = [];

  const todayDate = new Date().toISOString().slice(0, 10);
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNumber = r + 1;
    const get = (i: number) => (i >= 0 && i < row.length ? row[i].trim() : "");
    const emailRaw = get(idxEmail);
    const memberIdRaw = get(idxMemberId);
    const hoursRaw = get(idxHours);
    const titleRaw = get(idxTitle);
    const dateRaw = get(idxDate);
    const descRaw = get(idxDesc);

    if (!hoursRaw && !titleRaw && !dateRaw) continue; // blank line: skip silently
    // Simplified template: rows with no hours entered are intentional blanks
    // (members the HR didn't credit this round). Skip them silently.
    if (!hoursRaw) continue;

    const parsed = RowSchema.safeParse({
      email: emailRaw ? emailRaw.toLowerCase() : undefined,
      memberId: memberIdRaw ? Number(memberIdRaw) : undefined,
      hours: hoursRaw ? Number(hoursRaw) : NaN,
      // Default title / date when the simplified template is used so the row
      // still records something meaningful.
      title: titleRaw || "Credit hours adjustment",
      participationDate: dateRaw || todayDate,
      description: descRaw || null,
    });
    if (!parsed.success) {
      pending.push({
        result: {
          rowNumber,
          email: emailRaw,
          status: "error",
          message: parsed.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; "),
        },
        data: null,
      });
      continue;
    }
    pending.push({
      result: { rowNumber, email: emailRaw, status: "inserted" },
      data: parsed.data,
    });
  }

  let inserted = 0;
  let skipped = 0;

  if (isMockMode()) {
    const store = getMockStore();
    for (const p of pending) {
      if (!p.data) continue;
      let memberId = p.data.memberId ?? null;
      if (!memberId && p.data.email) {
        memberId = store.members.find((m) => m.email.toLowerCase() === p.data!.email)?.memberId ?? null;
      }
      if (!memberId || !findMockMember(memberId)) {
        p.result.status = "error";
        p.result.message = "Member not found";
        continue;
      }
      const dupe = store.volunteerHours.some(
        (h) => h.memberId === memberId && h.participationDate === (p.data!.participationDate ?? todayDate) &&
               h.title === (p.data!.title ?? "Credit hours adjustment") && h.sourceType === "bulk_import",
      );
      if (dupe) {
        p.result.status = "skipped";
        p.result.message = "Duplicate (same member, date, title)";
        skipped++;
        continue;
      }
      store.volunteerHours.unshift({
        id: nextMockId("volunteerHour"),
        memberId,
        hours: p.data.hours,
        title: p.data.title ?? "Credit hours adjustment",
        description: p.data.description ?? null,
        participationDate: p.data.participationDate ?? todayDate,
        approvalStatus: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: s.memberId,
        sourceType: "bulk_import",
        sourceId: null,
      });
      inserted++;
    }
  } else {
    await withTx(async (c) => {
      for (const p of pending) {
        if (!p.data) continue;
        let memberId = p.data.memberId ?? null;
        if (!memberId && p.data.email) {
          const found = await c.query<{ member_id: number }>(
            `SELECT member_id FROM users WHERE LOWER(email) = $1 AND is_active = TRUE`,
            [p.data.email],
          );
          memberId = found.rows[0]?.member_id ?? null;
        }
      if (!memberId) {
        p.result.status = "error";
        p.result.message = "Member not found or inactive";
        continue;
      }

      // Idempotency: skip if a bulk_import row with same member + date + title already exists.
      const rowTitle = p.data.title ?? "Credit hours adjustment";
      const rowDate = p.data.participationDate ?? todayDate;
      const dupe = await c.query<{ volunthr_id: number }>(
        `SELECT volunthr_id FROM volunteer_hours
          WHERE member_id = $1 AND participation_date = $2::date AND title = $3 AND source_type = 'bulk_import'`,
        [memberId, rowDate, rowTitle],
      );
      if (dupe.rows.length > 0) {
        p.result.status = "skipped";
        p.result.message = "Duplicate (same member, date, title)";
        skipped++;
        continue;
      }

      await c.query(
        `INSERT INTO volunteer_hours
            (member_id, hours, title, description, participation_date,
             approval_status, approved_by, approved_at, source_type)
         VALUES ($1, $2, $3, $4, $5::date, 'approved', $6, NOW(), 'bulk_import')`,
        [memberId, p.data.hours, rowTitle, p.data.description ?? null, rowDate, s.memberId],
      );
      inserted++;
    }
  });
  }

  const errorsCount = pending.filter((p) => p.result.status === "error").length;
  return ok({
    totalRows: pending.length,
    inserted,
    skipped,
    errors: errorsCount,
    rows: pending.map((p) => p.result),
  });
});
