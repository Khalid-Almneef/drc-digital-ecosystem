import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/mock-store";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lightweight health probe for uptime monitoring (UptimeRobot, BetterStack,
// Vercel uptime, etc.). Returns 200 + JSON when reachable + DB ok, 503 when
// the database is unreachable in production. Always cheap to call.
export async function GET() {
  const start = Date.now();
  const status: {
    ok: boolean;
    mode: "mock" | "live";
    db: "ok" | "error" | "skipped";
    uptimeMs: number;
    commit?: string;
    region?: string;
  } = {
    ok: true,
    mode: isMockMode() ? "mock" : "live",
    db: "skipped",
    uptimeMs: Math.round(process.uptime() * 1000),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    region: process.env.VERCEL_REGION,
  };

  if (!isMockMode()) {
    try {
      await query("SELECT 1");
      status.db = "ok";
    } catch {
      status.db = "error";
      status.ok = false;
    }
  }

  return NextResponse.json(
    { ...status, latencyMs: Date.now() - start },
    { status: status.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
