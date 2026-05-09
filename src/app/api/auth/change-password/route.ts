import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { hashPassword, requireSession, verifyPassword } from "@/lib/auth";

const Body = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const POST = handle(async (req) => {
  const s = await requireSession();
  const { currentPassword, newPassword } = await parseBody(req, Body);
  const row = await queryOne<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE member_id = $1`,
    [s.memberId],
  );
  if (!row || !(await verifyPassword(currentPassword, row.password_hash)))
    return err(400, "Current password is incorrect", "invalid_password");
  const pwd = await hashPassword(newPassword);
  await query(`UPDATE users SET password_hash = $1 WHERE member_id = $2`, [pwd, s.memberId]);
  return ok({ success: true });
});
