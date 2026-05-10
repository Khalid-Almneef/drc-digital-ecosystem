import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { queryOne, withTx } from "@/lib/db";
import { hashPassword, sha256 } from "@/lib/auth";

const Body = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

export const POST = handle(async (req) => {
  const { token, password } = await parseBody(req, Body);
  const hash = sha256(token);
  const row = await queryOne<{ token_id: number; member_id: number }>(
    `SELECT token_id, member_id FROM email_tokens
      WHERE token_hash = $1 AND purpose = 'password_reset'
        AND consumed_at IS NULL AND expires_at > NOW()`,
    [hash],
  );
  if (!row) return err(400, "Invalid or expired token", "invalid_token");

  const pwd = await hashPassword(password);
  await withTx(async (c) => {
    // Bump password_hash AND password_changed_at in one shot. The auth layer
    // refuses any JWT whose `iat` predates password_changed_at, which kills
    // every session cookie currently floating around for this member.
    await c.query(
      `UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE member_id = $2`,
      [pwd, row.member_id],
    );
    // Mark the consumed token.
    await c.query(`UPDATE email_tokens SET consumed_at = NOW() WHERE token_id = $1`, [row.token_id]);
    // H-03: invalidate every other unconsumed password_reset token for this
    // member, so a parallel attacker-held link can't be used to reset again.
    await c.query(
      `UPDATE email_tokens SET consumed_at = NOW()
        WHERE member_id = $1
          AND purpose = 'password_reset'
          AND consumed_at IS NULL`,
      [row.member_id],
    );
  });
  return ok({ success: true });
});
