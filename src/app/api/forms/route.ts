import { z } from "zod";
import { handle, ok, err, parseBody } from "@/lib/api";
import { query, withTx } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageForms, type FormSummary } from "@/lib/forms";
import { sendEmail, renderEmail } from "@/lib/email";

function resolveAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000"
  );
}

const QuestionInput = z.object({
  prompt: z.string().min(1),
  questionType: z.enum(["text", "multiple_choice"]),
  options: z.array(z.string().min(1)).optional(),
  isRequired: z.boolean().default(true),
});

const Body = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  audience: z.enum(["members", "leaders", "public"]),
  closesAt: z.string().optional().nullable(),
  isOpen: z.boolean().default(true),
  questions: z.array(QuestionInput).min(1),
  notify: z.boolean().default(false),
});

export const GET = handle(async () => {
  const s = await requireSession();
  if (!canManageForms(s)) return err(403, "Only HR or admins can view forms.");
  const rows = await query<{
    form_id: number; title: string; description: string | null;
    audience: "members" | "leaders" | "public"; is_open: boolean;
    closes_at: string | null; created_at: string; response_count: number;
  }>(
    `SELECT f.form_id, f.title, f.description, f.audience, f.is_open,
            f.closes_at, f.created_at,
            (SELECT COUNT(*)::int FROM form_responses r WHERE r.form_id = f.form_id) AS response_count
       FROM forms f
       ORDER BY f.created_at DESC`,
  );
  const list: FormSummary[] = rows.rows.map((r) => ({
    formId: r.form_id, title: r.title, description: r.description,
    audience: r.audience, isOpen: r.is_open, closesAt: r.closes_at,
    createdAt: r.created_at, responseCount: r.response_count,
  }));
  return ok(list);
});

export const POST = handle(async (req) => {
  const s = await requireSession();
  if (!canManageForms(s)) return err(403, "Only HR or admins can create forms.");
  const b = await parseBody(req, Body);

  for (const q of b.questions) {
    if (q.questionType === "multiple_choice" && (!q.options || q.options.length < 2)) {
      return err(400, "Multiple-choice questions need at least two options.");
    }
  }

  const formId = await withTx(async (c) => {
    const ins = await c.query<{ form_id: number }>(
      `INSERT INTO forms (title, description, audience, is_open, closes_at, created_by)
       VALUES ($1, $2, $3::form_audience, $4, $5, $6)
       RETURNING form_id`,
      [b.title.trim(), b.description?.trim() || null, b.audience, b.isOpen, b.closesAt || null, s.memberId],
    );
    const id = ins.rows[0].form_id;
    for (let i = 0; i < b.questions.length; i++) {
      const q = b.questions[i];
      await c.query(
        `INSERT INTO form_questions (form_id, prompt, question_type, options, is_required, position)
         VALUES ($1, $2, $3::form_question_type, $4::jsonb, $5, $6)`,
        [id, q.prompt.trim(), q.questionType, q.options ? JSON.stringify(q.options) : null, q.isRequired, i],
      );
    }
    return id;
  });

  if (b.notify && (b.audience === "members" || b.audience === "leaders")) {
    void notifyAudience(formId, b.title.trim(), b.audience).catch((e) =>
      console.error("[forms] notify failed:", e),
    );
  }

  return ok({ formId });
});

async function notifyAudience(formId: number, title: string, audience: "members" | "leaders") {
  const sql =
    audience === "leaders"
      ? `SELECT email FROM users
           WHERE is_active = TRUE
             AND position IN ('president','vice_president','dept_leader','dept_vice_leader','sub_leader')`
      : `SELECT email FROM users WHERE is_active = TRUE`;
  const rows = await query<{ email: string }>(sql);
  const appUrl = resolveAppUrl();
  const formUrl = `${appUrl}/forms/${formId}`;
  await Promise.all(
    rows.rows.map((r) =>
      sendEmail({
        to: r.email,
        subject: `New DRC application: ${title}`,
        html: renderEmail({
          siteUrl: appUrl,
          preheader: `${title} — please complete this DRC application.`,
          heading: title,
          intro:
            "HR has published a new application for you to complete. Click the button below to view the questions and submit your response.",
          ctaLabel: "Open application",
          ctaUrl: formUrl,
          footerNote: "You're receiving this because you're an active DRC member.",
        }),
        text: `Open application: ${formUrl}`,
      }).catch((e) => console.error(`[forms] email to ${r.email} failed:`, e)),
    ),
  );
}
