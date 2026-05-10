import { z } from "zod";
import { handle, ok, parseBody, err } from "@/lib/api";
import { query, queryOne, withTx } from "@/lib/db";
import {
  getDeviceToken,
  loadSessionUser,
  randomToken,
  setSessionCookie,
  sha256,
  verifyPassword,
} from "@/lib/auth";
import { sendEmail, renderEmail } from "@/lib/email";
import { getRequireDeviceConfirm } from "@/lib/auth-settings";
import { getMockStore, isMockMode, MOCK_DEMO_USERS, mockSessionFromKey } from "@/lib/mock-store";
import { NextResponse } from "next/server";
import { clientIp, rateLimit, rateLimitReset } from "@/lib/rate-limit";

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function resolveAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000"
  );
}

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function sendSetupEmail(memberId: number, email: string) {
  const plain = randomToken(24);
  await query(
    `INSERT INTO email_tokens (member_id, token_hash, purpose, expires_at)
     VALUES ($1, $2, 'password_reset', NOW() + INTERVAL '24 hours')`,
    [memberId, sha256(plain)],
  );
  const appUrl = resolveAppUrl();
  const setupUrl = `${appUrl}/reset-password?token=${plain}`;
  await sendEmail({
    to: email,
    subject: "Welcome to DRC — set up your account",
    html: renderEmail({
      siteUrl: appUrl,
      preheader: "Your DRC account is ready. Set a password to sign in.",
      heading: "Welcome to DRC",
      intro:
        "Your account at the Drones & Robotics Club has been created by HR. Set a password to finish signing in. This link is valid for 24 hours.",
      ctaLabel: "Set your password",
      ctaUrl: setupUrl,
      footerNote:
        "If you weren't expecting this email, you can safely ignore it — no account changes will be made.",
    }),
    text: `Welcome to DRC. Set your password (valid for 24 hours):\n${setupUrl}`,
  });
}

export const POST = handle(async (req) => {
  const { email, password } = await parseBody(req, Body);
  const normEmail = email.toLowerCase();
  const ip = clientIp(req);
  const limitKey = `login:${ip}:${normEmail}`;

  // Pre-check: if this IP+email is already over its failed-attempt budget,
  // bail before even touching the DB or bcrypt. We DO NOT distinguish "no
  // such user" from "wrong password" in the 429 message so the limiter does
  // not become an enumeration oracle.
  {
    const probe = rateLimit(limitKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
    if (!probe.allowed) {
      const retrySec = Math.ceil(probe.retryAfterMs / 1000);
      return NextResponse.json(
        { error: { message: "Too many attempts. Try again later.", code: "rate_limited" } },
        { status: 429, headers: { "Retry-After": String(retrySec) } },
      );
    }
  }
  if (isMockMode()) {
    const entry = Object.entries(MOCK_DEMO_USERS).find(([, user]) => user.email.toLowerCase() === email.toLowerCase());
    if (entry) {
      void password;
      const session = mockSessionFromKey(entry[0]);
      if (!session) return err(401, "Account unavailable", "inactive");
      await setSessionCookie(session);
      return ok({ user: session });
    }
    // Look for an HR-registered member awaiting first-login setup.
    const member = getMockStore().members.find((m) => m.email.toLowerCase() === email.toLowerCase());
    if (member && member.isActive && member.passwordSet === false) {
      return ok({ requiresSetup: true });
    }
    return err(401, "Invalid email or password", "invalid_credentials");
  }

  const row = await queryOne<{ member_id: number; password_hash: string | null; is_active: boolean }>(
    `SELECT member_id, password_hash, is_active FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );

  // Unknown email or inactive: fail silently. No setup email goes to non-members.
  if (!row || !row.is_active) return err(401, "Invalid email or password", "invalid_credentials");

  // HR-registered member who has not set a password yet → send setup email instead of validating.
  if (!row.password_hash) {
    await sendSetupEmail(row.member_id, email.toLowerCase());
    return ok({ requiresSetup: true });
  }

  if (!(await verifyPassword(password, row.password_hash)))
    return err(401, "Invalid email or password", "invalid_credentials");

  const user = await loadSessionUser(row.member_id);
  if (!user) return err(401, "Account unavailable", "inactive");

  const deviceToken = await getDeviceToken();
  const knownDevice = deviceToken
    ? await queryOne(`SELECT 1 FROM user_devices WHERE member_id = $1 AND device_token = $2`, [
        user.memberId,
        deviceToken,
      ])
    : null;

  const requireDeviceConfirm = await getRequireDeviceConfirm();

  if (!knownDevice && requireDeviceConfirm) {
    const plain = randomToken(24);
    const appUrl = resolveAppUrl();
    const newDeviceToken = randomToken(24);
    await withTx(async (c) => {
      await c.query(
        `INSERT INTO email_tokens (member_id, token_hash, purpose, payload, expires_at)
         VALUES ($1, $2, 'device_confirm', $3, NOW() + INTERVAL '30 minutes')`,
        [user.memberId, sha256(plain), { deviceToken: newDeviceToken, ua: req.headers.get("user-agent") ?? null }],
      );
    });
    const confirmUrl = `${appUrl}/api/auth/confirm-device?token=${plain}`;
    const ua = req.headers.get("user-agent") ?? "an unknown device";
    await sendEmail({
      to: user.email,
      subject: "Confirm your sign-in to DRC",
      html: renderEmail({
        siteUrl: appUrl,
        preheader: "Confirm this device to finish signing in to your DRC account.",
        heading: "Confirm your sign-in",
        intro: `Someone signed in to your DRC account from ${ua}. Confirm this device to finish signing in. This link expires in 30 minutes.`,
        ctaLabel: "Confirm this device",
        ctaUrl: confirmUrl,
        footerNote:
          "If this wasn't you, ignore this email and consider resetting your password.",
      }),
      text: `Confirm this device to finish signing in to DRC (expires in 30 minutes):\n${confirmUrl}\n\nIf this wasn't you, ignore this email.`,
    });
    return ok({ requiresDeviceConfirmation: true });
  }

  await query(`UPDATE users SET last_login = NOW() WHERE member_id = $1`, [user.memberId]);
  await query(`UPDATE user_devices SET last_seen_at = NOW() WHERE device_token = $1`, [deviceToken]);
  await setSessionCookie(user);
  // Legitimate sign-in — clear the failed-attempt counter so a subsequent
  // mistyped-password session doesn't lock the real user out.
  rateLimitReset(limitKey);
  return ok({ user });
});
