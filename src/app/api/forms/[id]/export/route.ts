import { handle } from "@/lib/api";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageForms } from "@/lib/forms";

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const GET = handle(async (_req, ctx) => {
  const s = await requireSession();
  if (!canManageForms(s)) return new Response("Forbidden", { status: 403 });
  const { id } = await ctx.params;
  const formId = Number(id);
  if (!Number.isFinite(formId)) return new Response("Invalid id", { status: 400 });

  const formRow = await query<{ title: string }>(`SELECT title FROM forms WHERE form_id = $1`, [formId]);
  if (formRow.rows.length === 0) return new Response("Not found", { status: 404 });
  const title = formRow.rows[0].title;

  const questions = await query<{ question_id: number; prompt: string; position: number }>(
    `SELECT question_id, prompt, position FROM form_questions WHERE form_id = $1 ORDER BY position ASC, question_id ASC`,
    [formId],
  );
  const responses = await query<{
    response_id: number; member_id: number | null; respondent_name: string | null;
    respondent_email: string | null; submitted_at: string; member_name: string | null; member_email: string | null;
  }>(
    `SELECT r.response_id, r.member_id, r.respondent_name, r.respondent_email, r.submitted_at,
            p.full_name AS member_name, u.email AS member_email
       FROM form_responses r
       LEFT JOIN users u ON u.member_id = r.member_id
       LEFT JOIN profiles p ON p.member_id = r.member_id
      WHERE r.form_id = $1
      ORDER BY r.submitted_at DESC`,
    [formId],
  );
  const answers = await query<{ response_id: number; question_id: number; answer_text: string | null }>(
    `SELECT a.response_id, a.question_id, a.answer_text
       FROM form_answers a
       JOIN form_responses r ON r.response_id = a.response_id
      WHERE r.form_id = $1`,
    [formId],
  );
  const lookup = new Map<string, string>();
  for (const a of answers.rows) lookup.set(`${a.response_id}:${a.question_id}`, a.answer_text ?? "");

  const headers = ["response_id", "submitted_at", "name", "email", ...questions.rows.map((q) => q.prompt)];
  const rows = responses.rows.map((r) => [
    r.response_id,
    r.submitted_at,
    r.member_name ?? r.respondent_name ?? "",
    r.member_email ?? r.respondent_email ?? "",
    ...questions.rows.map((q) => lookup.get(`${r.response_id}:${q.question_id}`) ?? ""),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const today = new Date().toISOString().slice(0, 10);
  const safeTitle = title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "form";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="drc-${safeTitle}-${today}.csv"`,
    },
  });
});
