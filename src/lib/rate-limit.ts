// In-memory sliding-window rate limiter.
//
// Tradeoffs: this state is per-process and resets on every cold start. For a
// small Vercel deployment that's acceptable as a first line of defense
// against credential stuffing, password-reset spam, and form-flood. If we
// ever need cross-instance accounting we should swap this for Upstash.
//
// `rateLimit(key, max, windowMs)` records a hit and returns whether the
// caller is still within the allowed budget for the rolling window. The
// timestamps array is pruned in-place so memory usage stays bounded by the
// number of distinct active keys, not by the total request count.

type Bucket = number[];

const BUCKETS = new Map<string, Bucket>();
// Periodically GC keys whose entire window has expired. Without this the map
// would grow with every distinct IP/email seen, which is unbounded under
// abuse. A small interval is fine because Map ops are O(1).
const GC_INTERVAL_MS = 5 * 60 * 1000;
let lastGc = Date.now();

function maybeGc(now: number) {
  if (now - lastGc < GC_INTERVAL_MS) return;
  lastGc = now;
  // Drop buckets that have nothing within the last hour. We pick a coarse
  // upper-bound here so this GC is cheap and never accidentally drops a
  // bucket that still matters.
  const cutoff = now - 60 * 60 * 1000;
  for (const [k, ts] of BUCKETS) {
    if (ts.length === 0 || ts[ts.length - 1] < cutoff) {
      BUCKETS.delete(k);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  maybeGc(now);
  const cutoff = now - windowMs;
  const bucket = BUCKETS.get(key) ?? [];
  // Prune expired entries first.
  let i = 0;
  while (i < bucket.length && bucket[i] < cutoff) i++;
  const pruned = i > 0 ? bucket.slice(i) : bucket;
  if (pruned.length >= max) {
    // Oldest still-counted hit defines when we'd next drop below `max`.
    const retryAfterMs = pruned[0] + windowMs - now;
    BUCKETS.set(key, pruned);
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }
  pruned.push(now);
  BUCKETS.set(key, pruned);
  return { allowed: true, retryAfterMs: 0 };
}

// Reset a key. Call this on a successful login so the previous failed-attempt
// count for that IP+email pair doesn't penalise the legitimate user.
export function rateLimitReset(key: string): void {
  BUCKETS.delete(key);
}

// Best-effort client IP from a Next.js Request. Prefers the first hop in
// x-forwarded-for (Vercel's edge sets this), falls back to x-real-ip, and
// finally "unknown" so callers always get a stable string to key on.
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}
