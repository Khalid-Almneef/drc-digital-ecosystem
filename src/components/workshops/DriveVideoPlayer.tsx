"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Play } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

/**
 * Embeds a Google Drive video via the /preview iframe and tracks approximate
 * watched time in browser cookies.
 *
 * Watch-time accounting limitations (be honest about these):
 *   - Google Drive's iframe does not expose a JS API for play/pause/seek events.
 *   - We can't tell whether the user is *actually* watching — only whether the
 *     player is on screen and the tab is foregrounded.
 *   - Heuristic: the timer ticks once per second while
 *       (a) document.visibilityState === "visible"
 *       (b) the iframe is in the viewport (IntersectionObserver)
 *       (c) the user has clicked into the player at least once (proxy for play)
 *   - Counter is persisted to a cookie `drc_watch_<watchId>=<seconds>` with a
 *     1-year max-age. Resume hint is rendered from that value on mount.
 *
 * Props:
 *   - watchId: stable identifier for this video (e.g. `workshop-12-session-1`).
 *   - driveUrl: any Google Drive video URL — ID is auto-extracted.
 *   - durationSec: optional total length in seconds; used for the progress bar.
 *   - thumbnailUrl: optional poster shown before the user clicks play.
 *   - title / titleAr: shown in the resume hint.
 */
export function DriveVideoPlayer({
  watchId,
  driveUrl,
  durationSec,
  thumbnailUrl,
  title,
  titleAr,
}: {
  watchId: string;
  driveUrl: string;
  durationSec?: number;
  thumbnailUrl?: string | null;
  title?: string | null;
  titleAr?: string | null;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const fileId = extractDriveFileId(driveUrl);
  const cookieKey = `drc_watch_${watchId}`;

  const [started, setStarted] = useState(false);
  const [watched, setWatched] = useState(() => readCookieNumber(cookieKey));
  const [completed, setCompleted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const visibleRef = useRef(true);
  const inViewportRef = useRef(true);

  // Track tab/visibility
  useEffect(() => {
    const onVis = () => { visibleRef.current = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Track in-viewport
  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { inViewportRef.current = entries[0]?.isIntersecting ?? true; },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  // The 1-second timer that increments watched while playing
  useEffect(() => {
    if (!started || completed) return;
    const tick = setInterval(() => {
      if (!visibleRef.current || !inViewportRef.current) return;
      setWatched((prev) => {
        const next = prev + 1;
        // Persist every 5s to avoid hammering document.cookie
        if (next % 5 === 0) writeCookieNumber(cookieKey, next);
        return next;
      });
    }, 1000);
    return () => {
      // Persist final value
      writeCookieNumber(cookieKey, watchedRef.current);
      clearInterval(tick);
    };
    // We intentionally exclude `watched` so the interval resets only on
    // start/complete transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, completed, cookieKey]);

  // Mirror watched into a ref so the cleanup persist sees the latest value
  const watchedRef = useRef(watched);
  useEffect(() => { watchedRef.current = watched; }, [watched]);

  if (!fileId) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        {tr("Could not parse Google Drive URL: ", "تعذّر قراءة رابط جوجل درايف: ")}
        {driveUrl}
      </div>
    );
  }

  const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  const hasResume = !started && watched > 5 && (!durationSec || watched < durationSec - 5);
  const pct = durationSec ? Math.min(100, Math.round((watched / durationSec) * 100)) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background/70">
      {/* Player area */}
      <div className="relative aspect-video bg-black">
        {!started ? (
          <button
            type="button"
            onClick={() => setStarted(true)}
            aria-label={tr("Play video", "تشغيل الفيديو")}
            className="group relative h-full w-full overflow-hidden"
          >
            {thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 to-black/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-white/10 backdrop-blur transition-transform group-hover:scale-110">
                <Play size={26} fill="currentColor" className="ms-1 text-white" />
              </div>
            </div>
            {hasResume && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-start">
                <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                  {tr("Resume from", "استئناف من")}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatTime(watched)}{durationSec ? ` / ${formatTime(durationSec)}` : ""}
                </p>
              </div>
            )}
          </button>
        ) : (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="h-full w-full"
            title={title ?? "Drive video"}
          />
        )}
      </div>

      {/* Progress + actions */}
      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={12} className="text-primary/70" />
            {tr("Watched", "تم متابعته")}: {formatTime(watched)}
            {durationSec && ` / ${formatTime(durationSec)}`}
          </span>
          {!completed ? (
            <button
              type="button"
              onClick={() => {
                setCompleted(true);
                writeCookieNumber(cookieKey, durationSec ?? watched);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <CheckCircle2 size={11} />
              {tr("Mark as watched", "تم المشاهدة")}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-primary">
              <CheckCircle2 size={11} />
              {tr("Completed", "اكتمل")}
            </span>
          )}
        </div>
        {pct !== null && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full bg-primary transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {(title || titleAr) && (
          <p className="mt-2 truncate text-xs text-muted">{lang === "ar" && titleAr ? titleAr : title}</p>
        )}
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function extractDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  // Bare ID
  if (/^[a-zA-Z0-9_-]{15,}$/.test(url)) return url;
  return null;
}

function readCookieNumber(key: string): number {
  if (typeof document === "undefined") return 0;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${key}=(\\d+)`));
  return m ? Number(m[1]) : 0;
}

function writeCookieNumber(key: string, value: number) {
  if (typeof document === "undefined") return;
  // 1 year, root path, lax
  document.cookie = `${key}=${value}; max-age=31536000; path=/; samesite=lax`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
