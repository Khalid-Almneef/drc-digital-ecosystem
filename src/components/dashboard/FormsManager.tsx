"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Download, Trash2, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import type { FormSummary, FormDetail, FormQuestionType, FormResponseRecord } from "@/lib/forms";

interface DraftQuestion {
  prompt: string;
  questionType: FormQuestionType;
  options: string[];
  isRequired: boolean;
}

export function FormsManager({ tr }: { tr: (en: string, ar: string) => string }) {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [viewing, setViewing] = useState<FormSummary | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const data = await api.get<FormSummary[]>("/api/forms");
      setForms(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  async function deleteForm(id: number, title: string) {
    if (!window.confirm(tr(`Delete application "${title}"? This removes all responses.`, `حذف الطلب "${title}"؟ سيتم حذف جميع الاستجابات.`))) return;
    try {
      await api.delete(`/api/forms/${id}`);
      toast.success(tr("Application deleted", "تم حذف الطلب"));
      void reload();
    } catch {
      toast.error(tr("Could not delete", "تعذّر الحذف"));
    }
  }

  async function toggleOpen(form: FormSummary) {
    try {
      await api.patch(`/api/forms/${form.formId}`, { isOpen: !form.isOpen });
      void reload();
    } catch {
      toast.error(tr("Could not update", "تعذّر التحديث"));
    }
  }

  function exportCsv(id: number, title: string) {
    const a = document.createElement("a");
    a.href = `/api/forms/${id}/export`;
    a.download = `drc-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
            {tr("Applications", "الطلبات")}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {tr(
              "Build custom forms with text or multiple-choice questions. Send to members or leaders by email, or publish on the public events page.",
              "أنشئ نماذج مخصصة بأسئلة نصية أو متعددة الخيارات. أرسلها إلى الأعضاء أو القادة بالبريد، أو انشرها في صفحة الفعاليات.",
            )}
          </p>
        </div>
        <button onClick={() => setShowBuilder(true)} className="btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs">
          <Plus size={12} />
          {tr("New application", "طلب جديد")}
        </button>
      </div>

      {loading ? (
        <div className="glass-card flex min-h-[180px] items-center justify-center">
          <Loader2 className="animate-spin text-muted" />
        </div>
      ) : forms.length === 0 ? (
        <div className="glass-card p-6 text-center text-sm text-muted">
          {tr("No applications yet. Click 'New application' to get started.", "لا توجد طلبات بعد. اضغط 'طلب جديد' للبدء.")}
        </div>
      ) : (
        <div className="space-y-2">
          {forms.map((f) => (
            <div key={f.formId} className="glass-card flex items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{f.title}</p>
                  <span className="badge bg-surface-elevated text-muted border-border text-[11px]">{f.audience}</span>
                  {f.isOpen ? (
                    <span className="badge badge-success text-[11px]">{tr("open", "مفتوح")}</span>
                  ) : (
                    <span className="badge bg-red-500/10 text-red-300 border-red-500/20 text-[11px]">{tr("closed", "مغلق")}</span>
                  )}
                </div>
                {f.description && <p className="mt-1 line-clamp-1 text-xs text-muted">{f.description}</p>}
                <p className="mt-1 text-[11px] text-muted">
                  {f.responseCount} {tr("responses", "استجابة")} · {new Date(f.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setViewing(f)} title={tr("View responses", "عرض الردود")}
                  className="rounded-lg p-2 text-muted hover:bg-surface-elevated hover:text-foreground">
                  <Eye size={14} />
                </button>
                <button onClick={() => exportCsv(f.formId, f.title)} title={tr("Export CSV", "تصدير CSV")}
                  className="rounded-lg p-2 text-muted hover:bg-surface-elevated hover:text-foreground">
                  <Download size={14} />
                </button>
                <button onClick={() => void toggleOpen(f)} className="text-[11px] text-muted hover:text-foreground px-2">
                  {f.isOpen ? tr("Close", "إغلاق") : tr("Reopen", "إعادة فتح")}
                </button>
                <button onClick={() => void deleteForm(f.formId, f.title)} title={tr("Delete", "حذف")}
                  className="rounded-lg p-2 text-muted hover:bg-error/10 hover:text-error">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBuilder && (
        <FormBuilderModal
          tr={tr}
          onClose={() => setShowBuilder(false)}
          onCreated={() => { setShowBuilder(false); void reload(); }}
        />
      )}
      {viewing && (
        <ResponsesModal
          tr={tr}
          form={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function FormBuilderModal({ tr, onClose, onCreated }: { tr: (en: string, ar: string) => string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<"members" | "leaders" | "public">("members");
  const [closesAt, setClosesAt] = useState("");
  const [notify, setNotify] = useState(true);
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    { prompt: "", questionType: "text", options: [], isRequired: true },
  ]);
  const [saving, setSaving] = useState(false);

  function updateQ(idx: number, patch: Partial<DraftQuestion>) {
    setQuestions((arr) => arr.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }
  function removeQ(idx: number) {
    setQuestions((arr) => arr.filter((_, i) => i !== idx));
  }
  function addQ() {
    setQuestions((arr) => [...arr, { prompt: "", questionType: "text", options: [], isRequired: true }]);
  }
  function addOption(qIdx: number) {
    setQuestions((arr) => arr.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ""] } : q));
  }
  function updateOption(qIdx: number, optIdx: number, value: string) {
    setQuestions((arr) => arr.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? value : o) } : q));
  }
  function removeOption(qIdx: number, optIdx: number) {
    setQuestions((arr) => arr.map((q, i) => i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== optIdx) } : q));
  }

  async function submit() {
    if (!title.trim()) { toast.error(tr("Title required", "العنوان مطلوب")); return; }
    if (questions.length === 0) { toast.error(tr("Add at least one question", "أضف سؤالاً واحداً على الأقل")); return; }
    for (const q of questions) {
      if (!q.prompt.trim()) { toast.error(tr("All questions need a prompt", "جميع الأسئلة تحتاج نصاً")); return; }
      if (q.questionType === "multiple_choice") {
        const cleanOpts = q.options.map((o) => o.trim()).filter(Boolean);
        if (cleanOpts.length < 2) { toast.error(tr("Multiple-choice needs at least 2 options", "السؤال متعدد الخيارات يحتاج خيارين")); return; }
      }
    }
    setSaving(true);
    try {
      await api.post("/api/forms", {
        title: title.trim(),
        description: description.trim() || null,
        audience,
        closesAt: closesAt || null,
        isOpen: true,
        notify: notify && audience !== "public",
        questions: questions.map((q) => ({
          prompt: q.prompt.trim(),
          questionType: q.questionType,
          options: q.questionType === "multiple_choice" ? q.options.map((o) => o.trim()).filter(Boolean) : undefined,
          isRequired: q.isRequired,
        })),
      });
      toast.success(tr("Application published", "تم نشر الطلب"));
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : tr("Could not publish", "تعذّر النشر"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{tr("New application", "طلب جديد")}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-elevated hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">{tr("Title *", "العنوان *")}</label>
            <input className="dashboard-field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">{tr("Description (optional)", "الوصف (اختياري)")}</label>
            <textarea className="dashboard-field resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{tr("Audience", "الجمهور")}</label>
              <select className="dashboard-select" value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
                <option value="members">{tr("All active members (email)", "كل الأعضاء النشطين (بريد)")}</option>
                <option value="leaders">{tr("Leaders only (email)", "القادة فقط (بريد)")}</option>
                <option value="public">{tr("Public (events page)", "عام (صفحة الفعاليات)")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{tr("Closes at (optional)", "يُغلق في (اختياري)")}</label>
              <input type="date" className="dashboard-field" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            </div>
          </div>
          {audience !== "public" && (
            <label className="inline-flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-primary" />
              {tr("Email recipients now", "أرسل البريد الآن")}
            </label>
          )}

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{tr("Questions", "الأسئلة")}</p>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-surface-elevated/35 p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2 text-[11px] text-muted">{idx + 1}.</span>
                    <div className="flex-1 space-y-2">
                      <input
                        className="dashboard-field"
                        placeholder={tr("Question text", "نص السؤال")}
                        value={q.prompt}
                        onChange={(e) => updateQ(idx, { prompt: e.target.value })}
                      />
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <select
                          className="dashboard-select py-1 text-xs"
                          value={q.questionType}
                          onChange={(e) => updateQ(idx, { questionType: e.target.value as FormQuestionType, options: e.target.value === "multiple_choice" ? ["", ""] : [] })}
                        >
                          <option value="text">{tr("Text answer", "إجابة نصية")}</option>
                          <option value="multiple_choice">{tr("Multiple choice", "متعدد الخيارات")}</option>
                        </select>
                        <label className="inline-flex items-center gap-1">
                          <input type="checkbox" checked={q.isRequired} onChange={(e) => updateQ(idx, { isRequired: e.target.checked })} className="accent-primary" />
                          <span className="text-muted">{tr("Required", "مطلوب")}</span>
                        </label>
                      </div>
                      {q.questionType === "multiple_choice" && (
                        <div className="space-y-1">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <input
                                className="dashboard-field flex-1"
                                placeholder={tr(`Option ${optIdx + 1}`, `خيار ${optIdx + 1}`)}
                                value={opt}
                                onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                              />
                              <button onClick={() => removeOption(idx, optIdx)} className="rounded p-1 text-muted hover:bg-error/10 hover:text-error">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addOption(idx)} className="text-[11px] text-primary hover:underline">
                            + {tr("Add option", "إضافة خيار")}
                          </button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeQ(idx)} className="rounded p-1 text-muted hover:bg-error/10 hover:text-error">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addQ} className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs">
                <Plus size={11} />
                {tr("Add question", "إضافة سؤال")}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary px-4 py-2 text-xs">{tr("Cancel", "إلغاء")}</button>
            <button onClick={() => void submit()} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs">
              {saving && <Loader2 className="animate-spin" size={12} />}
              {tr("Publish", "نشر")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResponsesModal({ tr, form, onClose }: { tr: (en: string, ar: string) => string; form: FormSummary; onClose: () => void }) {
  const [detail, setDetail] = useState<FormDetail | null>(null);
  const [responses, setResponses] = useState<FormResponseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<FormDetail>(`/api/forms/${form.formId}`),
      api.get<FormResponseRecord[]>(`/api/forms/${form.formId}/responses`),
    ])
      .then(([d, r]) => { setDetail(d); setResponses(Array.isArray(r) ? r : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [form.formId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{form.title}</h3>
            <p className="text-xs text-muted">{responses.length} {tr("responses", "استجابة")}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-elevated hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center"><Loader2 className="animate-spin text-muted" /></div>
        ) : responses.length === 0 ? (
          <p className="text-sm text-muted">{tr("No responses yet.", "لا توجد استجابات بعد.")}</p>
        ) : (
          <div className="space-y-3">
            {responses.map((r) => {
              const lookup = new Map(r.answers.map((a) => [a.questionId, a.answerText]));
              return (
                <div key={r.responseId} className="rounded-xl border border-border bg-surface-elevated/35 p-3">
                  <p className="text-xs text-muted">
                    {r.respondentName ?? `Member #${r.memberId ?? "?"}`} {r.respondentEmail ? `· ${r.respondentEmail}` : ""}
                    {" · "}{new Date(r.submittedAt).toLocaleString()}
                  </p>
                  <div className="mt-2 space-y-2">
                    {(detail?.questions ?? []).map((q) => (
                      <div key={q.questionId}>
                        <p className="text-[11px] font-medium text-muted">{q.prompt}</p>
                        <p className="text-sm text-foreground whitespace-pre-line">{lookup.get(q.questionId) ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
