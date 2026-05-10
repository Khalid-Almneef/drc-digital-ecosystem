import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/auth";
import { sendEmail, renderEmail } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().email() });

// 3 requests per email per hour, 20 per IP per hour. We intentionally do NOT
// surface 429 to the caller: returning a different shape would re-introduce the
// enumeration channel that the always-200 response was designed to close. When
// over budget we silently skip the DB write + email send and still return 200.
const PER_EMAIL_MAX = 3;
const PER_EMAIL_WINDOW_MS = 60 * 60 * 1000;
const PER_IP_MAX = 20;
const PER_IP_WINDOW_MS = 60 * 60 * 1000;

export const POST = handle(async (req) => {
  const { email } = await parseBody(req, Body);
  const normEmail = email.toLowerCase();
  const ip = clientIp(req);

  const emailBudget = rateLimit(`forgot:email:${normEmail}`, PER_EMAIL_MAX, PER_EMAIL_WINDOW_MS);
  const ipBudget = rateLimit(`forgot:ip:${ip}`, PER_IP_MAX, PER_IP_WINDOW_MS);
  const withinBudget = emailBudget.allowed && ipBudget.allowed;

  const row = withinBudget
    ? await queryOne<{ member_id: number; email: string }>(
        `SELECT member_id, email FROM users WHERE email = $1 AND is_active = TRUE`,
        [normEmail],
      )
    : null;

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
    const resetUrl = `${appUrl}/reset-password?token=${plain}`;
    try {
      await sendEmail({
        // Use the canonical DB-stored email rather than the user-supplied
        // casing. Falls back to the normalized input if the DB row somehow
        // came back without it.
        to: row.email ?? normEmail,
        subject: "Reset your DRC password",
        html: renderEmail({
          siteUrl: appUrl,
          preheader: "Reset your DRC password — link expires in 1 hour.",
          heading: "Reset your password",
          intro:
            "We received a request to reset the password for your DRC account. Click the button below to choose a new password. This link expires in 1 hour.",
          ctaLabel: "Reset password",
          ctaUrl: resetUrl,
          footerNote:
            "If you didn't request this, you can safely ignore this email — your password will stay the same.",
        }),
        text: `Reset your DRC password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
      });
    } catch (err) {
      // Surface email-send failures in Vercel logs without leaking that
      // the address is registered.
      console.error("[forgot-password] sendEmail failed:", err);
    }
  }
  return ok({ success: true });
});
