import { handle, ok, err } from "@/lib/api";
import { query, queryOne, withTx } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMockStore, isMockMode } from "@/lib/mock-store";

/**
 * POST /api/members/bulk
 *
 * Body: text/csv with header row matching the template at
 * /api/members/bulk/template. Each row creates a new member account
 * with no password (the user triggers their own password setup via
 * the login flow's "set up your password" path or /forgot-password).
 *
 * Returns { inserted, skipped, errors }.
 */
function canRegister(session: { position: string; departmentSlug: string | null }) {
  if (session.position === "president" || session.position === "vice_president") return true;
  if (session.departmentSlug !== "hr") return false;
  return ["dept_leader", "dept_vice_leader"].includes(session.position);
}

const ALLOWED_POSITIONS = new Set(["member", "sub_leader", "dept_vice_leader", "dept_leader"]);
const ALLOWED_GENDERS = new Set(["male", "female", ""]);

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
      if (ch === '"') inQuote = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch === "\r") { /* ignore */ }
      else cell += ch;
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 0);
}

export const POST = handle(async (req) => {
  const session = await requireSession();
  if (!canRegister(session)) return err(403, "Only HR or admins can bulk-import members.");

  const csv = await req.text();
  const rows = parseCsv(csv);
  if (rows.length === 0) return err(400, "CSV is empty.");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const required = ["email", "full_name", "department_slug"];
  for (const col of required) {
    if (!header.includes(col)) return err(400, `Missing column: ${col}`);
  }
  const idx = (col: string) => header.indexOf(col);

  const results = { inserted: 0, skipped: 0, errors: [] as string[] };

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((c) => !c.trim())) { results.skipped++; continue; }

    const get = (col: string) => {
      const i = idx(col);
      if (i < 0) return "";
      return (row[i] ?? "").trim();
    };

    try {
      const email = get("email").toLowerCase();
      const fullName = get("full_name");
      const fullNameAr = get("full_name_ar") || null;
      const deptSlug = get("department_slug").toLowerCase();
      const positionRaw = get("position") || "member";
      const customRole = get("custom_role") || null;
      const customRoleAr = get("custom_role_ar") || null;
      const major = get("major") || null;
      const phoneNumber = get("phone_number") || null;
      const gender = get("gender").toLowerCase();

      if (!email) { results.errors.push(`Row ${r + 1}: missing email`); continue; }
      if (!fullName) { results.errors.push(`Row ${r + 1}: missing full_name`); continue; }
      if (!deptSlug) { results.errors.push(`Row ${r + 1}: missing department_slug`); continue; }
      if (!ALLOWED_POSITIONS.has(positionRaw)) {
        results.errors.push(`Row ${r + 1}: invalid position '${positionRaw}'`);
        continue;
      }
      if (!ALLOWED_GENDERS.has(gender)) {
        results.errors.push(`Row ${r + 1}: invalid gender '${gender}'`);
        continue;
      }

      if (isMockMode()) {
        const store = getMockStore();
        if (store.members.some((m) => m.email.toLowerCase() === email)) {
          results.skipped++;
          continue;
        }
        const dept = store.departments.find((d) => d.slug === deptSlug);
        if (!dept) { results.errors.push(`Row ${r + 1}: unknown department '${deptSlug}'`); continue; }
        // Mock store has no member id counter — derive next id from current max.
        const memberId = (store.members.reduce((max, m) => Math.max(max, m.memberId), 0) || 1000) + 1;
        store.members.push({
          memberId, email, fullName, fullNameAr: fullNameAr ?? "",
          position: positionRaw as never,
          departmentId: dept.id, departmentSlug: dept.slug,
          departmentName: dept.name, departmentNameAr: dept.nameAr,
          avatarUrl: null, bio: null, quote: null, quoteAr: null,
          major, phoneNumber,
          linkedinUrl: null, githubUrl: null, graduationYear: null,
          gender: (gender === "male" || gender === "female") ? gender : null, isActive: true, isPublicOnTeam: true,
          customRole, customRoleAr,
          profileStatus: "active",
        });
        results.inserted++;
        continue;
      }

      // Production DB path
      const dept = await queryOne<{ id: number }>(
        `SELECT department_id AS id FROM departments WHERE slug = $1::department_type`,
        [deptSlug],
      );
      if (!dept) { results.errors.push(`Row ${r + 1}: unknown department '${deptSlug}'`); continue; }

      const existing = await queryOne<{ member_id: number }>(
        `SELECT member_id FROM users WHERE email = $1`,
        [email],
      );
      if (existing) { results.skipped++; continue; }

      await withTx(async (client) => {
        const ins = await client.query<{ member_id: number }>(
          `INSERT INTO users (email, position, department_id, is_active)
           VALUES ($1, $2::user_position, $3, TRUE) RETURNING member_id`,
          [email, positionRaw, dept.id],
        );
        const memberId = ins.rows[0].member_id;
        await client.query(
          `INSERT INTO profiles
             (member_id, full_name, full_name_ar, major, phone_number, gender, custom_role, custom_role_ar, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
          [memberId, fullName, fullNameAr, major, phoneNumber, gender || null, customRole, customRoleAr],
        );
      });
      results.inserted++;
    } catch (e) {
      results.errors.push(`Row ${r + 1}: ${(e as Error).message}`);
    }
  }

  return ok(results);
});
