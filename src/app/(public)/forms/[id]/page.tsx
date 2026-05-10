"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/client";
import type { FormDetail } from "@/lib/forms";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FormFillPage({ params }: PageProps) {
  const { id } = use(params);
  const formId = Number(id);
  const [form, setForm] = useState<FormDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(formId)) {
      setErrorMsg("Invalid application link.");
      setLoading(false);
      return;
    }
    api.get<FormDetail>(`/api/forms/${formId}`)
      .then((data) => setForm(data))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Could not load this application.";
        setErrorMsg(msg);
      })
      .finally(() => setLoading(false));
  }, [formId]);

  function setAnswer(qid: number, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function submit() {
    if (!form) return;
    for (const q of form.questions) {
      if (q.isRequired && !(answers[q.questionId] ?? "").trim()) {
        setErrorMsg("Please answer all required questions.");
        return;
      }
    }
    if (form.audience === "public") {
      if (!respondentName.trim() || !respondentEmail.trim()) {
        setErrorMsg("Please enter your name and email.");
        return;
      }
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post(`/api/forms/${formId}/responses`, {
        respondentName: respondentName.trim() || undefined,
        respondentEmail: respondentEmail.trim() || undefined,
        answers: form.questions.map((q) => ({
          questionId: q.questionId,
          answerText: answers[q.questionId] ?? "",
        })),
      });
      setSubmitted(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not submit.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-muted" />
      </div>
    );
  }

  if (errorMsg && !form) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20">
        <div className="glass-card flex items-start gap-3 p-6">
          <AlertCircle className="text-error" size={20} />
          <div>
            <p className="font-semibold text-foreground">Could not load application</p>
            <p className="mt-1 text-sm text-muted">{errorMsg}</p>
            <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20">
        <div className="glass-card flex items-start gap-3 p-6">
          <CheckCircle2 className="text-success" size={20} />
          <div>
            <p className="font-semibold text-foreground">Response submitted</p>
            <p className="mt-1 text-sm text-muted">Thanks for your time. The DRC team will review your response.</p>
            <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!form) return null;

  if (!form.isOpen) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20">
        <div className="glass-card p-6">
          <h1 className="text-xl font-semibold text-foreground">{form.title}</h1>
          <p className="mt-3 text-sm text-muted">This application is closed and is no longer accepting responses.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-semibold text-foreground">{form.title}</h1>
        {form.description && <p className="mt-2 text-sm text-muted whitespace-pre-line">{form.description}</p>}
        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          {form.audience === "public" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Your name *</label>
                <input
                  className="dashboard-field"
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Your email *</label>
                <input
                  type="email"
                  className="dashboard-field"
                  value={respondentEmail}
                  onChange={(e) => setRespondentEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
          {form.questions.map((q, idx) => (
            <div key={q.questionId}>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {idx + 1}. {q.prompt}{q.isRequired && <span className="text-error"> *</span>}
              </label>
              {q.questionType === "text" ? (
                <textarea
                  className="dashboard-field resize-none"
                  rows={3}
                  value={answers[q.questionId] ?? ""}
                  onChange={(e) => setAnswer(q.questionId, e.target.value)}
                />
              ) : (
                <div className="space-y-2">
                  {(q.options ?? []).map((opt) => (
                    <label key={opt} className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated/35 px-3 py-2 cursor-pointer hover:bg-surface-elevated/60">
                      <input
                        type="radio"
                        name={`q-${q.questionId}`}
                        value={opt}
                        checked={answers[q.questionId] === opt}
                        onChange={() => setAnswer(q.questionId, opt)}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          {errorMsg && (
            <div className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{errorMsg}</div>
          )}
          <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-2 px-6 py-2">
            {submitting && <Loader2 className="animate-spin" size={14} />}
            Submit response
          </button>
        </form>
      </div>
    </div>
  );
}
