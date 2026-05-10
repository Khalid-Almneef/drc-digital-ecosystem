import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, queryOne, withTx } from "@/lib/db";
import { getSession, requireSession } from "@/lib/auth";
import { canManageForms, type FormResponseRecord } from "@/lib/forms";

const AnswerInput = z.object({
  questionId: z.number().int(),
  answerText: z.string().nullable().optional(),
});

const Body = z.object({
  respondentName: z.string().optional().nullable(),
  respondentEmail: z.string().email().optional().nullable(),
  answers: z.array(AnswerInput).min(1),
});

export const GET = handle(async (_req, ctx) => {
  const s = await requireSession();
  if (!canManageForms(s)) return err(403, "Only HR or admins can view responses.");
  const { id } = await ctx.params;
  const formId = Number(id);
  if (!Number.isFinite(formId)) return err(400, "Invalid id");

  const responses = await query<{
    response_id: number; member_id: number | null;
    respondent_name: string | null; respondent_email: string | null;
    submitted_at: string;
  }>(
    `SELECT response_id, member_id, respondent_name, respondent_email, submitted_at
       FROM form_responses WHERE form_id = $1 ORDER BY submitted_at DESC`,
    [formId],
  );
  const answers = await query<{ response_id: number; question_id: number; answer_text: string | null }>(
    `SELECT a.response_id, a.question_id, a.answer_text
       FROM form_answers a
       JOIN form_responses r ON r.response_id = a.response_id
      WHERE r.form_id = $1`,
    [formId],
  );
  const byResponse = new Map<number, { questionId: number; answerText: string | null }[]>();
  for (const a of answers.rows) {
    const arr = byResponse.get(a.response_id) ?? [];
    arr.push({ questionId: a.question_id, answerText: a.answer_text });
    byResponse.set(a.response_id, arr);
  }
  const list: FormResponseRecord[] = responses.rows.map((r) => ({
    responseId: r.response_id,
    memberId: r.member_id,
    respondentName: r.respondent_name,
    respondentEmail: r.respondent_email,
    submittedAt: r.submitted_at,
    answers: byResponse.get(r.response_id) ?? [],
  }));
  return ok(list);
});

export const POST = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const formId = Number(id);
  if (!Number.isFinite(formId)) return err(400, "Invalid id");

  const form = await queryOne<{ audience: "members" | "leaders" | "public"; is_open: boolean; closes_at: string | null }>(
    `SELECT audience, is_open, closes_at FROM forms WHERE form_id = $1`,
    [formId],
  );
  if (!form) return err(404, "Form not found");
  if (!form.is_open) return err(403, "This application is closed.");
  if (form.closes_at && new Date(form.closes_at).getTime() < Date.now()) return err(403, "This application has closed.");

  const session = await getSession();
  if (form.audience !== "public" && !session) return err(401, "Sign in to submit this application.");
  if (form.audience === "leaders" && session) {
    const isLeader = ["president", "vice_president", "dept_leader", "dept_vice_leader", "sub_leader"].includes(session.position);
    if (!isLeader) return err(403, "This application is for leaders only.");
  }

  const b = await parseBody(req, Body);
  if (form.audience === "public") {
    if (!b.respondentName?.trim() || !b.respondentEmail?.trim()) {
      return err(400, "Name and email are required.");
    }
  }

  const responseId = await withTx(async (c) => {
    if (session) {
      const existing = await c.query<{ response_id: number }>(
        `SELECT response_id FROM form_responses WHERE form_id = $1 AND member_id = $2`,
        [formId, session.memberId],
      );
      if (existing.rows.length > 0) {
        throw new Error("ALREADY_SUBMITTED");
      }
    }
    const ins = await c.query<{ response_id: number }>(
      `INSERT INTO form_responses (form_id, member_id, respondent_name, respondent_email)
       VALUES ($1, $2, $3, $4) RETURNING response_id`,
      [formId, session?.memberId ?? null, b.respondentName ?? null, b.respondentEmail ?? null],
    );
    const rid = ins.rows[0].response_id;
    for (const a of b.answers) {
      await c.query(
        `INSERT INTO form_answers (response_id, question_id, answer_text) VALUES ($1, $2, $3)`,
        [rid, a.questionId, a.answerText ?? null],
      );
    }
    return rid;
  }).catch((e: unknown) => {
    if (e instanceof Error && e.message === "ALREADY_SUBMITTED") return null;
    throw e;
  });

  if (responseId === null) return err(409, "You've already submitted a response to this application.");
  return ok({ responseId });
});
