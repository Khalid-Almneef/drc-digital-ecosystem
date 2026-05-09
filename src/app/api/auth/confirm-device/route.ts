import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { queryOne, withTx } from "@/lib/db";
import { loadSessionUser, setDeviceCookie, setSessionCookie, sha256 } from "@/lib/auth";

export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) return NextResponse.redirect(new URL("/login?error=missing_token", url));
  const hash = sha256(token);

  const row = await queryOne<{
    token_id: number;
    member_id: number;
    payload: { deviceToken: string; ua: string | null };
  }>(
    `SELECT token_id, member_id, payload FROM email_tokens
      WHERE token_hash = $1 AND purpose = 'device_confirm'
        AND consumed_at IS NULL AND expires_at > NOW()`,
    [hash],
  );
  if (!row) return NextResponse.redirect(new URL("/login?error=invalid_token", url));

  await withTx(async (c) => {
    await c.query(
      `INSERT INTO user_devices (member_id, device_token, user_agent)
       VALUES ($1, $2, $3)
       ON CONFLICT (device_token) DO NOTHING`,
      [row.member_id, row.payload.deviceToken, row.payload.ua],
    );
    await c.query(`UPDATE email_tokens SET consumed_at = NOW() WHERE token_id = $1`, [row.token_id]);
    await c.query(`UPDATE users SET last_login = NOW() WHERE member_id = $1`, [row.member_id]);
  });

  const user = await loadSessionUser(row.member_id);
  if (!user) return NextResponse.redirect(new URL("/login?error=inactive", url));
  await setDeviceCookie(row.payload.deviceToken);
  await setSessionCookie(user);
  return NextResponse.redirect(new URL("/dashboard/overview", url));
});
