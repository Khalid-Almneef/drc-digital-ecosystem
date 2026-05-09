"use client";

import { useEffect, useState } from "react";
import { Loader2, Power, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { useLang } from "@/contexts/LanguageContext";

/**
 * Small editor exposed inside the Content dashboard's Join tab.
 * Lets leadership flip recruitment open/closed and edit the message
 * shown on /join when the form is hidden — without leaving the
 * dashboard. Form fields/labels themselves are still edited via the
 * existing Copy + Segments editors.
 */
export function JoinControlsCard() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [accepting, setAccepting] = useState<boolean>(false);
  const [closedEn, setClosedEn] = useState<string>("");
  const [closedAr, setClosedAr] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [savingToggle, setSavingToggle] = useState<boolean>(false);
  const [savingMessage, setSavingMessage] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      api.get<{ json: { accepting: boolean } | null }>("/api/site-content/join.accepting"),
      api.get<{ en: string | null; ar: string | null }>("/api/site-content/join.closed.message"),
    ])
      .then(([acceptingRes, msgRes]) => {
        if (cancelled) return;
        if (acceptingRes.status === "fulfilled") {
          setAccepting(Boolean(acceptingRes.value?.json?.accepting));
        }
        if (msgRes.status === "fulfilled") {
          setClosedEn(msgRes.value?.en ?? "");
          setClosedAr(msgRes.value?.ar ?? "");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleAccepting(next: boolean) {
    setSavingToggle(true);
    try {
      await api.patch("/api/site-content/join.accepting", { json: { accepting: next } });
      setAccepting(next);
      toast.success(
        next ? tr("Applications open.", "التسجيل مفتوح.") : tr("Applications closed.", "التسجيل مغلق."),
      );
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setSavingToggle(false);
    }
  }

  async function saveMessage() {
    setSavingMessage(true);
    try {
      await api.patch("/api/site-content/join.closed.message", { en: closedEn, ar: closedAr });
      toast.success(tr("Message saved.", "تم حفظ الرسالة."));
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setSavingMessage(false);
    }
  }

  return (
    <section className="glass-card p-5 space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
            {tr("Membership Window", "نافذة التسجيل")}
          </h3>
          <p className="mt-1 text-sm text-muted max-w-2xl">
            {tr(
              "Open or close the application form on the public Join page. When closed, the message below is shown instead.",
              "افتح أو أغلق نموذج التقديم على صفحة الانضمام العامة. عند الإغلاق تظهر الرسالة أدناه بدلًا من النموذج.",
            )}
          </p>
        </div>
        <span
          className={`badge ${accepting ? "badge-success" : "badge-warning"}`}
          aria-live="polite"
        >
          {accepting ? tr("Open", "مفتوح") : tr("Closed", "مغلق")}
        </span>
      </header>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-elevated/45 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <Power size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {tr("Accept new applications", "استقبال طلبات جديدة")}
            </p>
            <p className="text-xs text-muted">
              {tr(
                "Toggling this updates the public Join page immediately.",
                "تبديل هذا يحدث صفحة الانضمام مباشرة.",
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={loading || savingToggle}
          onClick={() => toggleAccepting(!accepting)}
          aria-pressed={accepting}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            accepting ? "bg-primary" : "bg-surface-elevated border border-border"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
              accepting ? "translate-x-6" : "translate-x-1"
            }`}
          />
          {savingToggle && (
            <Loader2 size={12} className="absolute -end-6 animate-spin text-muted" />
          )}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface-elevated/45 p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted">
            <MessageSquare size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {tr("Closed message", "رسالة الإغلاق")}
            </p>
            <p className="text-xs text-muted">
              {tr("Shown on /join when applications are closed.", "تظهر على صفحة /join عند إغلاق التسجيل.")}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              {tr("English", "الإنجليزية")}
            </span>
            <textarea
              rows={3}
              value={closedEn}
              onChange={(e) => setClosedEn(e.target.value)}
              placeholder={tr(
                "Membership applications are currently closed. Follow our pages for the next intake window.",
                "Membership applications are currently closed. Follow our pages for the next intake window.",
              )}
              className="w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none resize-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              {tr("Arabic", "العربية")}
            </span>
            <textarea
              rows={3}
              value={closedAr}
              onChange={(e) => setClosedAr(e.target.value)}
              placeholder="التسجيل مغلق حالياً. تابعوا حساباتنا لمعرفة موعد الفتح القادم."
              dir="rtl"
              className="w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none resize-none"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveMessage}
            disabled={loading || savingMessage}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
          >
            {savingMessage && <Loader2 size={12} className="animate-spin" />}
            {tr("Save message", "حفظ الرسالة")}
          </button>
        </div>
      </div>
    </section>
  );
}
