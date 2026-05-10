import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { queryOne } from "./db";
import { isMockMode, mockSessionFromKey } from "./mock-store";

export type Position =
  | "president"
  | "vice_president"
  | "dept_leader"
  | "dept_vice_leader"
  | "sub_leader"
  | "member";

export interface SessionUser {
  memberId: number;
  email: string;
  position: Position;
  departmentId: number | null;
  departmentSlug: string | null;
}

function resolveJwtSecret(): string {
  const raw = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === "production";
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (!raw || raw === "dev-only-change-me" || raw.length < 32) {
    if (isProd && !isBuildPhase) {
      throw new Error(
        "JWT_SECRET must be set to a strong random value (>=32 chars) in production",
      );
    }
    console.warn(
      "[auth] JWT_SECRET is missing or weak; using insecure dev fallback. DO NOT run this in production.",
    );
    return raw && raw.length > 0 ? raw : "dev-only-change-me";
  }
  return raw;
}

const SECRET = resolveJwtSecret();
const COOKIE = process.env.SESSION_COOKIE_NAME ?? "drc_session";
const DAYS = Number(process.env.SESSION_DAYS ?? "7");
const DEVICE_COOKIE = "drc_device";
export const MOCK_SESSION_COOKIE = "drc_demo_session";

// Permission overrides applied on every getSession() — the *displayed* role
// (team page, profile, /api/auth/me which reads users/profiles directly) is
// untouched, so members keep their real titles. These only affect the
// SessionUser used by server-side permission gates.
//
// SUPER_ADMIN_EMAILS get full president-level access.
// Any sub_leader is treated as dept_vice_leader for their own department, so
// committee sub-leaders (e.g. Quality & Assurance) can use the leader
// dashboard for their own committee.
export const SUPER_ADMIN_EMAILS = new Set<string>([
  "khalidalmneef@gmail.com",
]);

export function applyPermissionOverrides<T extends SessionUser>(s: T): T {
  if (SUPER_ADMIN_EMAILS.has(s.email.toLowerCase())) {
    return { ...s, position: "president" };
  }
  if (s.position === "sub_leader") {
    return { ...s, position: "dept_vice_leader" };
  }
  return s;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signSession(user: SessionUser): string {
  return jwt.sign(user, SECRET, { expiresIn: `${DAYS}d` });
}

export interface VerifiedSession extends SessionUser {
  iat: number;
}

export function verifySession(token: string): VerifiedSession | null {
  try {
    const { exp, ...rest } = jwt.verify(token, SECRET) as SessionUser & {
      iat: number;
      exp: number;
    };
    void exp;
    return rest as VerifiedSession;
  } catch {
    return null;
  }
}

// Returns true if the JWT was issued strictly before the user's last password
// change, in which case the session must be rejected. Failing closed: if the
// users row can't be read, we treat the token as stale.
async function isJwtStale(memberId: number, iat: number): Promise<boolean> {
  try {
    const row = await queryOne<{ password_changed_at: string | null }>(
      `SELECT password_changed_at FROM users WHERE member_id = $1`,
      [memberId],
    );
    if (!row || !row.password_changed_at) return false;
    const changedSec = Math.floor(new Date(row.password_changed_at).getTime() / 1000);
    return iat < changedSec;
  } catch {
    // DB unreachable: don't lock users out on a transient failure.
    return false;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const store = await cookies();
  if (isMockMode()) {
    const mockKey =
      user.position === "president" ? "president"
      : user.position === "vice_president" ? "vp"
      : user.position === "dept_leader" && user.departmentSlug === "hr" ? "hr_leader"
      : user.position === "dept_leader" && user.departmentSlug === "development" ? "dev_leader"
      : user.position === "dept_leader" && user.departmentSlug === "innovation" ? "innovation_leader"
      : user.position === "dept_leader" && user.departmentSlug === "media" ? "media_leader"
      : user.position === "dept_leader" && user.departmentSlug === "pr" ? "pr_leader"
      : user.position === "dept_leader" && user.departmentSlug === "finance" ? "finance_leader"
      : user.position === "dept_leader" && user.departmentSlug === "madarat" ? "madarat_leader"
      : "member";
    store.set(MOCK_SESSION_COOKIE, mockKey, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DAYS * 24 * 60 * 60,
    });
    return;
  }
  store.set(COOKIE, signSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
  store.delete(MOCK_SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  if (isMockMode()) {
    const s = mockSessionFromKey(store.get(MOCK_SESSION_COOKIE)?.value);
    return s ? applyPermissionOverrides(s) : null;
  }
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const s = verifySession(token);
  if (!s) return null;
  // H-03: reject JWTs issued before the user's most recent password change.
  // This invalidates every session cookie in circulation as soon as the user
  // (or an admin doing forced reset) sets a new password.
  if (await isJwtStale(s.memberId, s.iat)) return null;
  const { iat: _iat, ...rest } = s;
  void _iat;
  return applyPermissionOverrides(rest as SessionUser);
}

export async function requireSession(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Not authenticated");
  return s;
}

export async function requirePositions(positions: Position[]): Promise<SessionUser> {
  const s = await requireSession();
  if (!positions.includes(s.position)) throw new HttpError(403, "Forbidden");
  return s;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requirePositions(["president", "vice_president"]);
}

export async function requireDeptLeaderOf(departmentSlug: string | string[]): Promise<SessionUser> {
  const s = await requireSession();
  if (s.position === "president" || s.position === "vice_president") return s;
  const allowed = Array.isArray(departmentSlug) ? departmentSlug : [departmentSlug];
  const isLeader = s.position === "dept_leader" || s.position === "dept_vice_leader";
  if (!isLeader || !s.departmentSlug || !allowed.includes(s.departmentSlug)) {
    throw new HttpError(403, "Forbidden");
  }
  return s;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export async function getDeviceToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEVICE_COOKIE)?.value ?? null;
}

export async function setDeviceCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 400 * 24 * 60 * 60,
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function loadSessionUser(memberId: number): Promise<SessionUser | null> {
  return queryOne<SessionUser>(
    `SELECT u.member_id AS "memberId", u.email, u.position::text AS position,
            u.department_id AS "departmentId", d.slug::text AS "departmentSlug"
       FROM users u
       LEFT JOIN departments d ON d.department_id = u.department_id
      WHERE u.member_id = $1 AND u.is_active = TRUE`,
    [memberId],
  );
}
