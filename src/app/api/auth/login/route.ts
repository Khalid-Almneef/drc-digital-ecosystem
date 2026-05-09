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
import { sendEmail } from "@/lib/email";
import { getMockStore, isMockMode, MOCK_DEMO_USERS, mockSessionFromKey } from "@/lib/mock-store";

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to: email,
    subject: "Set up your DRC account",
    html: `<p>Welcome to DRC. Your HR team has registered your account.</p>
           <p>Set your password to finish signing in (link expires in 24 hours):</p>
           <p><a href="${appUrl}/reset-password?token=${plain}">Set password</a></p>
           <p>If you did not expect this email, you can ignore it.</p>`,
    text: `Set your DRC password: ${appUrl}/reset-password?token=${plain}`,
  });
}

export const POST = handle(async (req) => {
  const { email, password } = await parseBody(req, Body);
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

  if (!knownDevice) {
    const plain = randomToken(24);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const newDeviceToken = randomToken(24);
    await withTx(async (c) => {
      await c.query(
        `INSERT INTO email_tokens (member_id, token_hash, purpose, payload, expires_at)
         VALUES ($1, $2, 'device_confirm', $3, NOW() + INTERVAL '30 minutes')`,
        [user.memberId, sha256(plain), { deviceToken: newDeviceToken, ua: req.headers.get("user-agent") ?? null }],
      );
    });
    await sendEmail({
      to: user.email,
      subject: "Confirm this device to sign in",
      html: `<p>To finish signing in, confirm this device:</p>
             <p><a href="${appUrl}/api/auth/confirm-device?token=${plain}">Confirm device</a></p>
             <p>Link expires in 30 minutes.</p>`,
      text: `Confirm: ${appUrl}/api/auth/confirm-device?token=${plain}`,
    });
    return ok({ requiresDeviceConfirmation: true });
  }

  await query(`UPDATE users SET last_login = NOW() WHERE member_id = $1`, [user.memberId]);
  await query(`UPDATE user_devices SET last_seen_at = NOW() WHERE device_token = $1`, [deviceToken]);
  await setSessionCookie(user);
  return ok({ user });
});
