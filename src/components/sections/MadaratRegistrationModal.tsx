"use client";

import { useState } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/client";

interface MadaratEventLike {
  eventId: number | string;
  title: string;
  visibility?: "public" | "club_only" | null;
}

export function MadaratRegistrationModal({ event, onClose }: { event: MadaratEventLike; onClose: () => void }) {
  const { lang } = useLang();
  const { user } = useAuth();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [form, setForm] = useState(() => ({
    fullName: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    department: user?.departmentName ?? "",
    notes: "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function submit() {
    if (!form.fullName.trim() || !form.email.trim()) {
      setMessage({ kind: "error", text: tr("Name and email are required.", "الاسم والبريد الإلكتروني مطلوبان.") });
      return;
    }
    const sessionId = String(event.eventId).startsWith("madarat-")
      ? String(event.eventId).slice("madarat-".length)
      : String(event.eventId);
    setSubmitting(true);
    setMessage(null);
    try {
      await api.post(`/api/madarat/sessions/${sessionId}/registrations`, form);
      setMessage({ kind: "ok", text: tr("You're registered. We'll follow up by email.", "تم تسجيلك. سنتواصل معك عبر البريد الإلكتروني.") });
    } catch (error) {
      const errorMsg = (error as { message?: string } | null)?.message;
      setMessage({ kind: "error", text: errorMsg || tr("Registration failed. Please try again.", "فشل التسجيل. حاول مرة أخرى.") });
    } finally {
      setSubmitting(false);
    }
  }

  const fieldCls = "w-full rounded-lg border border-border bg-surface/40 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary/40";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">{tr("Register", "التسجيل")} — {event.title}</h3>
          <p className="mt-1 text-xs text-muted">
            {user
              ? tr("We pre-filled your info from your DRC account. Edit anything that's out of date.", "تم تعبئة بياناتك من حسابك في النادي. عدّل أي بيانات غير محدّثة.")
              : tr("We share your contact info with the Madarat organizers only.", "نشارك بياناتك مع منظّمي مدارات فقط.")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
          <label className="text-xs text-muted sm:col-span-2">{tr("Full name", "الاسم الكامل")}
            <input className={fieldCls} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </label>
          <label className="text-xs text-muted">{tr("Email", "البريد الإلكتروني")}
            <input type="email" className={fieldCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="text-xs text-muted">{tr("Phone (optional)", "الجوال (اختياري)")}
            <input className={fieldCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="text-xs text-muted sm:col-span-2">{tr("Department / major (optional)", "القسم / التخصص (اختياري)")}
            <input className={fieldCls} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </label>
          <label className="text-xs text-muted sm:col-span-2">{tr("Notes (optional)", "ملاحظات (اختياري)")}
            <textarea rows={3} className={`${fieldCls} resize-none`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        {message && (
          <div className={`mx-5 mb-3 rounded-lg border px-3 py-2 text-xs ${message.kind === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
            {message.text}
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="btn-secondary inline-flex items-center px-4 py-2 text-xs">{tr("Close", "إغلاق")}</button>
          <button type="button" onClick={submit} disabled={submitting} className="btn-primary inline-flex items-center px-4 py-2 text-xs disabled:opacity-50">
            {submitting ? tr("Submitting…", "جاري الإرسال…") : tr("Submit", "إرسال")}
          </button>
        </div>
      </div>
    </div>
  );
}
