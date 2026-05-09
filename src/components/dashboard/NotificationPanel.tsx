"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/client";
import { useLang } from "@/contexts/LanguageContext";
import { useEscape } from "@/lib/hooks/useEscape";

interface NotificationRow {
  notificationId: number;
  recipientId: number;
  category: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  sourceType: string | null;
  sourceId: number | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

interface NotificationsResponse {
  rows: NotificationRow[];
  unreadCount: number;
}

const POLL_MS = 60_000;

function relativeTime(iso: string, lang: "en" | "ar") {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return lang === "ar" ? "الآن" : "now";
  if (minutes < 60) return lang === "ar" ? `قبل ${minutes} د` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "ar" ? `قبل ${hours} س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return lang === "ar" ? `قبل ${days} ي` : `${days}d ago`;
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar" : "en-US", { month: "short", day: "numeric" });
}

export function NotificationPanel({ collapsed = false }: { collapsed?: boolean }) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationsResponse>({ rows: [], unreadCount: 0 });
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.get<NotificationsResponse>("/api/notifications?limit=20");
      if (result) setData(result);
    } catch {
      // Silent on poll errors — UI just shows last known state.
    }
  }, []);

  // Initial load + poll
  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // When the dropdown opens, refresh once.
  useEffect(() => {
    if (open) {
      setLoading(true);
      load().finally(() => setLoading(false));
    }
  }, [open, load]);

  // Click outside closes the dropdown.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  useEscape(open, () => setOpen(false));

  async function markRead(notificationId: number) {
    // Optimistic
    setData((prev) => ({
      rows: prev.rows.map((n) => n.notificationId === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
    try {
      await api.patch(`/api/notifications/${notificationId}`, { isRead: true });
    } catch {
      load();
    }
  }

  async function markAllRead() {
    if (data.unreadCount === 0) return;
    setMarking(true);
    setData((prev) => ({
      rows: prev.rows.map((n) => ({ ...n, isRead: true, readAt: prev.rows.find((r) => r.notificationId === n.notificationId)?.readAt ?? new Date().toISOString() })),
      unreadCount: 0,
    }));
    try {
      await api.post("/api/notifications/mark-all-read", {});
    } catch {
      load();
    } finally {
      setMarking(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={tr("Notifications", "الإشعارات")}
        aria-expanded={open}
        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 w-full ${
          open
            ? "border border-primary/20 text-foreground bg-primary/8"
            : "text-muted hover:bg-surface-elevated hover:text-foreground"
        } ${collapsed ? "justify-center" : ""}`}
      >
        <span className="relative shrink-0">
          <Bell size={18} className={open ? "text-primary" : ""} />
          {data.unreadCount > 0 && (
            <span className="absolute -top-1 -end-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-bold text-white">
              {data.unreadCount > 9 ? "9+" : data.unreadCount}
            </span>
          )}
        </span>
        {!collapsed && <span className="truncate">{tr("Notifications", "الإشعارات")}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${collapsed ? "start-full ms-2 top-0" : "start-0 end-0 top-full mt-2"} w-[320px] max-w-[90vw] rounded-2xl border border-border bg-surface shadow-[0_24px_60px_rgba(2,10,24,0.28)]`}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{tr("Notifications", "الإشعارات")}</p>
              <button
                onClick={markAllRead}
                disabled={data.unreadCount === 0 || marking}
                className="text-xs text-muted hover:text-foreground disabled:opacity-40 inline-flex items-center gap-1"
              >
                {marking ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                {tr("Mark all read", "تعليم الكل كمقروء")}
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {loading && data.rows.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-muted">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : data.rows.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted">
                  {tr("You're all caught up.", "لا توجد إشعارات جديدة.")}
                </p>
              ) : (
                <ul className="py-1">
                  {data.rows.map((notification) => {
                    const content = (
                      <div className={`px-4 py-3 border-b border-border/40 last:border-0 transition-colors ${
                        notification.isRead ? "" : "bg-primary/5"
                      } hover:bg-surface-elevated`}>
                        <div className="flex items-start gap-2">
                          {!notification.isRead && (
                            <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs leading-snug ${notification.isRead ? "text-muted" : "text-foreground font-medium"}`}>
                              {notification.title}
                            </p>
                            {notification.body && (
                              <p className="mt-1 text-[11px] leading-snug text-muted whitespace-pre-wrap line-clamp-3">
                                {notification.body}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] text-muted/70">
                              {relativeTime(notification.createdAt, lang)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                    const onClick = () => {
                      if (!notification.isRead) void markRead(notification.notificationId);
                      setOpen(false);
                    };
                    return (
                      <li key={notification.notificationId}>
                        {notification.linkUrl ? (
                          <Link href={notification.linkUrl} onClick={onClick} className="block">
                            {content}
                          </Link>
                        ) : (
                          <button onClick={onClick} className="w-full text-start">
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
