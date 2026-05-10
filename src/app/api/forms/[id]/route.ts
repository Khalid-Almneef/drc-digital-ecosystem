import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageForms, type FormDetail, type FormQuestion } from "@/lib/forms";

async function loadDetail(formId: number): Promise<FormDetail | null> {
  const form = await queryOne<{
    form_id: number; title: string; description: string | null;
    audience: "members" | "leaders" | "public"; is_open: boolean;
    closes_at: string | null; created_at: string; response_count: number;
  }>(
    `SELECT f.form_id, f.title, f.description, f.audience, f.is_open,
            f.closes_at, f.created_at,
            (SELECT COUNT(*)::int FROM form_responses r WHERE r.form_id = f.form_id) AS response_count
       FROM forms f WHERE f.form_id = $1`,
    [formId],
  );
  if (!form) return null;
  const qs = await query<{
    question_id: number; prompt: string; question_type: "text" | "multiple_choice";
    options: unknown; is_required: boolean; position: number;
  }>(
    `SELECT question_id, prompt, question_type, options, is_required, position
       FROM form_questions WHERE form_id = $1 ORDER BY position ASC, question_id ASC`,
    [formId],
  );
  const questions: FormQuestion[] = qs.rows.map((r) => ({
    questionId: r.question_id,
    prompt: r.prompt,
    questionType: r.question_type,
    options: Array.isArray(r.options) ? (r.options as string[]) : null,
    isRequired: r.is_required,
    position: r.position,
  }));
  return {
    formId: form.form_id,
    title: form.title,
    description: form.description,
    audience: form.audience,
    isOpen: form.is_open,
    closesAt: form.closes_at,
    createdAt: form.created_at,
    responseCount: form.response_count,
    questions,
  };
}

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const formId = Number(id);
  if (!Number.isFinite(formId)) return err(400, "Invalid id");
  const detail = await loadDetail(formId);
  if (!detail) return err(404, "Not found");
  return ok(detail);
});

const PatchBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isOpen: z.boolean().optional(),
  closesAt: z.string().nullable().optional(),
});

export const PATCH = handle(async (req, ctx) => {
  const s = await requireSession();
  if (!canManageForms(s)) return err(403, "Only HR or admins can edit forms.");
  const { id } = await ctx.params;
  const formId = Number(id);
  if (!Number.isFinite(formId)) return err(400, "Invalid id");
  const b = await parseBody(req, PatchBody);
  const sets: string[] = [];
  const params: unknown[] = [];
  if (b.title !== undefined) { params.push(b.title.trim()); sets.push(`title = $${params.length}`); }
  if (b.description !== undefined) { params.push(b.description?.trim() ?? null); sets.push(`description = $${params.length}`); }
  if (b.isOpen !== undefined) { params.push(b.isOpen); sets.push(`is_open = $${params.length}`); }
  if (b.closesAt !== undefined) { params.push(b.closesAt || null); sets.push(`closes_at = $${params.length}`); }
  if (!sets.length) return ok({ success: true });
  params.push(formId);
  await query(`UPDATE forms SET ${sets.join(", ")}, updated_at = NOW() WHERE form_id = $${params.length}`, params);
  return ok({ success: true });
});

export const DELETE = handle(async (_req, ctx) => {
  const s = await requireSession();
  if (!canManageForms(s)) return err(403, "Only HR or admins can delete forms.");
  const { id } = await ctx.params;
  const formId = Number(id);
  if (!Number.isFinite(formId)) return err(400, "Invalid id");
  await query(`DELETE FROM forms WHERE form_id = $1`, [formId]);
  return ok({ success: true });
});
