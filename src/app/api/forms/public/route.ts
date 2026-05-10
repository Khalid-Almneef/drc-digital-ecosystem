import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import type { FormSummary } from "@/lib/forms";

export const GET = handle(async () => {
  const rows = await query<{
    form_id: number; title: string; description: string | null;
    is_open: boolean; closes_at: string | null; created_at: string;
  }>(
    `SELECT form_id, title, description, is_open, closes_at, created_at
       FROM forms
      WHERE audience = 'public' AND is_open = TRUE
        AND (closes_at IS NULL OR closes_at > NOW())
      ORDER BY created_at DESC`,
  );
  const list: FormSummary[] = rows.rows.map((r) => ({
    formId: r.form_id, title: r.title, description: r.description,
    audience: "public", isOpen: r.is_open, closesAt: r.closes_at,
    createdAt: r.created_at, responseCount: 0,
  }));
  return ok(list);
});
