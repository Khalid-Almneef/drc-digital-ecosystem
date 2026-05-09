import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

const Body = z.object({ email: z.string().email() });

export const POST = handle(async (req) => {
  const { email } = await parseBody(req, Body);
  const row = await queryOne<{ member_id: number }>(
    `SELECT member_id FROM users WHERE email = $1 AND is_active = TRUE`,
    [email.toLowerCase()],
  );

  // Always respond OK to avoid user enumeration.
  if (row) {
    const plain = randomToken(24);
    await query(
      `INSERT INTO email_tokens (member_id, token_hash, purpose, expires_at)
       VALUES ($1, $2, 'password_reset', NOW() + INTERVAL '1 hour')`,
      [row.member_id, sha256(plain)],
    );
    // Prefer NEXT_PUBLIC_SITE_URL (set by deploy), then NEXT_PUBLIC_APP_URL
    // for back-compat, then VERCEL_URL on preview deploys, and finally
    // localhost so dev still works.
    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "http://localhost:3000";
    try {
      await sendEmail({
        to: email,
        subject: "Reset your DRC password",
        html: `<p>Click to reset your password (expires in 1 hour):</p>
               <p><a href="${appUrl}/reset-password?token=${plain}">Reset password</a></p>`,
        text: `${appUrl}/reset-password?token=${plain}`,
      });
    } catch (err) {
      // Surface email-send failures in Vercel logs without leaking that
      // the address is registered.
      console.error("[forgot-password] sendEmail failed:", err);
    }
  }
  return ok({ success: true });
});
