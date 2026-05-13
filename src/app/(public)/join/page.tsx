"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { PublicCustomSegments } from "@/components/ui/PublicCustomSegments";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  CheckCircle2, ArrowRight, Zap, BookOpen, Trophy,
  Users, Wrench, Rocket, CheckCircle, Loader2, Lock,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";
import {
  DEFAULT_JOIN_BENEFITS,
  DEFAULT_JOIN_FAQS,
  DEFAULT_JOIN_STEPS,
  JoinBenefitItem,
  JoinFaqItem,
  JoinStepItem,
  localizedValue,
  parseCollection,
} from "@/lib/public-content";

interface Department { id: number; slug: string; name: string; nameAr: string; }

const EXCLUDED_SLUGS = ["executive", "madarat"];

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all";

function SocialIcon({ kind }: { kind: "x" | "linkedin" | "tiktok" }) {
  if (kind === "x") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
        <path d="M18.244 2H21.5L14.05 10.516 22.78 22h-6.94l-5.43-7.06L4.21 22H.949l7.96-9.1L.5 2h7.094l4.91 6.49L18.244 2zm-1.22 18h1.928L7.05 4H5.02l12.004 16z" />
      </svg>
    );
  }
  if (kind === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
        <path d="M20.45 20.45h-3.555v-5.57c0-1.328-.024-3.037-1.85-3.037-1.852 0-2.135 1.446-2.135 2.94v5.667H9.355V9h3.414v1.561h.046c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.265 2.37 4.265 5.455v6.284zM5.339 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.118 20.45H3.557V9h3.561v11.45zM22.227 0H1.77C.792 0 0 .774 0 1.728v20.544C0 23.226.792 24 1.77 24h20.452c.978 0 1.778-.774 1.778-1.728V1.728C24 .774 23.2 0 22.227 0z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.74a8.16 8.16 0 0 0 4.77 1.52V6.81a4.85 4.85 0 0 1-1.84-.12z" />
    </svg>
  );
}

const BENEFIT_ICON_MAP: Record<string, React.ElementType> = {
  wrench: Wrench,
  trophy: Trophy,
  users: Users,
  "book-open": BookOpen,
  rocket: Rocket,
  zap: Zap,
};

export default function JoinPage() {
  const { t, lang } = useLang();

  // ── Membership gate ───────────────────────────────────────────────────────
  // Default to closed: applications only open when leadership flips
  // join.accepting=true via the dashboard. Avoids accidentally taking
  // applications during off-cycle.
  const [accepting, setAccepting] = useState(false);
  const [closedMsg, setClosedMsg] = useState("");
  const [social, setSocial] = useState<{ x?: string; linkedin?: string; tiktok?: string }>({});
  const [benefits, setBenefits] = useState<JoinBenefitItem[]>(DEFAULT_JOIN_BENEFITS);
  const [steps, setSteps] = useState<JoinStepItem[]>(DEFAULT_JOIN_STEPS);
  const [faqs, setFaqs] = useState<JoinFaqItem[]>(DEFAULT_JOIN_FAQS);
  useEffect(() => {
    api.get<{ json: { accepting: boolean } }>("/api/site-content/join.accepting")
      .then(d => setAccepting(d?.json?.accepting ?? false)).catch(() => {});
    api.get<{ en: string; ar: string }>("/api/site-content/join.closed.message")
      .then(d => setClosedMsg(lang === "ar" ? (d?.ar ?? d?.en ?? "") : (d?.en ?? ""))).catch(() => {});
    api.get<{ json: typeof social }>("/api/site-content/social.handles")
      .then(d => { if (d?.json) setSocial(d.json); }).catch(() => {});
    api.get<{ key: string; json: JoinBenefitItem[] | null }>("/api/site-content/join.benefits.items")
      .then(d => setBenefits(parseCollection(d?.json, DEFAULT_JOIN_BENEFITS))).catch(() => {});
    api.get<{ key: string; json: JoinStepItem[] | null }>("/api/site-content/join.steps.items")
      .then(d => setSteps(parseCollection(d?.json, DEFAULT_JOIN_STEPS))).catch(() => {});
    api.get<{ key: string; json: JoinFaqItem[] | null }>("/api/site-content/join.faqs.items")
      .then(d => setFaqs(parseCollection(d?.json, DEFAULT_JOIN_FAQS))).catch(() => {});
  }, [lang]);

  // ── Departments ───────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);
  useEffect(() => {
    api.get<Department[]>("/api/departments")
      .then(data => setDepartments(data.filter(d => !EXCLUDED_SLUGS.includes(d.slug))))
      .catch(() => {/* silently fall back to empty — select stays visible */});
  }, []);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    applicantName: "",
    applicantEmail: "",
    universityId: "",
    major: "",
    phoneNumber: "",
    preferredDeptId: "",
    motivation: "",
    skills: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedApplicationId, setSubmittedApplicationId] = useState<number | null>(null);

  const selectedDepartment = departments.find((department) => String(department.id) === form.preferredDeptId) ?? null;
  const selectedDepartmentName = selectedDepartment
    ? (lang === "ar" ? selectedDepartment.nameAr : selectedDepartment.name)
    : null;
  const readinessItems = [
    {
      key: "identity",
      done: Boolean(form.applicantName.trim() && form.applicantEmail.trim()),
      label: t("join.readiness.identity"),
    },
    {
      key: "department",
      done: Boolean(form.preferredDeptId),
      label: t("join.readiness.dept"),
    },
    {
      key: "context",
      done: Boolean(form.major.trim() || form.universityId.trim()),
      label: t("join.readiness.context"),
    },
    {
      key: "motivation",
      done: form.motivation.trim().length >= 20,
      label: t("join.readiness.motivation"),
    },
    {
      key: "skills",
      done: Boolean(form.skills.trim() || form.major.trim()),
      label: t("join.readiness.skills"),
    },
  ];
  const readinessProgress = Math.round(
    (readinessItems.filter((item) => item.done).length / readinessItems.length) * 100,
  );
  const expectationSteps = [
    { title: t("join.expectations.step1.title"), body: t("join.expectations.step1.desc") },
    { title: t("join.expectations.step2.title"), body: t("join.expectations.step2.desc") },
    { title: t("join.expectations.step3.title"), body: t("join.expectations.step3.desc") },
    { title: t("join.expectations.step4.title"), body: t("join.expectations.step4.desc") },
  ];

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.applicantName || !form.applicantEmail || !form.preferredDeptId) return;
    setStatus("loading");
    setErrorMsg("");
    setSubmittedApplicationId(null);
    try {
      const response = await api.post<{ applicationId: number }>("/api/applications", {
        applicantName: form.applicantName,
        applicantEmail: form.applicantEmail,
        universityId: form.universityId || undefined,
        major: form.major || undefined,
        phoneNumber: form.phoneNumber || undefined,
        preferredDepartmentIds: [Number(form.preferredDeptId)],
        motivation: form.motivation || undefined,
        skills: form.skills || undefined,
      });
      setSubmittedApplicationId(response.applicationId);
      setStatus("success");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      setErrorMsg(msg || t("join.error.generic"));
      setStatus("error");
    }
  }

  // ── Closed card ───────────────────────────────────────────────────────────
  if (!accepting) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-10 max-w-md w-full text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-surface-elevated border border-border flex items-center justify-center mx-auto">
            <Lock size={22} className="text-muted" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            {t("join.closed.badge")}
          </span>
          <p className="text-sm text-muted leading-relaxed">
            {closedMsg || "Membership applications are currently closed. Follow our social media to stay updated."}
          </p>
          {(social.x || social.linkedin || social.tiktok) && (
            <div className="flex justify-center gap-4 pt-2">
              {social.x && (
                <a href={social.x} target="_blank" rel="noopener noreferrer"
                  className="text-muted hover:text-primary transition-colors" aria-label="X">
                  <SocialIcon kind="x" />
                </a>
              )}
              {social.linkedin && (
                <a href={social.linkedin} target="_blank" rel="noopener noreferrer"
                  className="text-muted hover:text-primary transition-colors" aria-label="LinkedIn">
                  <SocialIcon kind="linkedin" />
                </a>
              )}
              {social.tiktok && (
                <a href={social.tiktok} target="_blank" rel="noopener noreferrer"
                  className="text-muted hover:text-primary transition-colors" aria-label="TikTok">
                  <SocialIcon kind="tiktok" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <PageHero
        label={t("join.hero.label")}
        title={t("join.hero.title")}
        accentText={t("join.hero.accent")}
        description={t("join.hero.desc")}
      />

      {/* ═══ WHY JOIN ═══ */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            label={t("join.benefits.label")}
            title={t("join.benefits.title")}
            description={t("join.benefits.desc")}
          />

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((item, i) => {
              const Icon = BENEFIT_ICON_MAP[item.icon] ?? Wrench;
              return (
              <motion.div
                key={`${item.titleEn}-${i}`}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.07, ease: [0.16, 1, 0.3, 1] as const }}
                className="glass-card p-7 card-hover group"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <Icon size={20} className="text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {localizedValue(lang, item.titleEn, item.titleAr)}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {localizedValue(lang, item.descriptionEn, item.descriptionAr)}
                </p>
              </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ═══ HOW TO JOIN ═══ */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <SectionHeader
            label={t("join.process.label")}
            title={t("join.process.title")}
            description={t("join.process.desc")}
            centered
          />

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.08, ease: [0.16, 1, 0.3, 1] as const }}
                className="glass-card p-7 group card-hover"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl font-bold text-primary/20 group-hover:text-primary/40 transition-colors leading-none">
                    {step.number}
                  </span>
                  <div>
                    <h4 className="text-base font-semibold text-foreground mb-2">
                      {localizedValue(lang, step.titleEn, step.titleAr)}
                    </h4>
                    <p className="text-sm text-muted leading-relaxed">
                      {localizedValue(lang, step.descriptionEn, step.descriptionAr)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ═══ APPLICATION FORM ═══ */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            label={t("join.form.label")}
            title={t("join.form.title")}
            description={t("join.form.desc")}
            centered
          />

          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] as const }}
              className="space-y-6 lg:sticky lg:top-24"
            >
              <div className="glass-card p-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                  {t("join.readiness.label")}
                </span>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{t("join.readiness.title")}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{t("join.readiness.desc")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{t("join.readiness.progress")}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{readinessProgress}%</p>
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-primary-bright to-secondary transition-[width] duration-300"
                    style={{ width: `${readinessProgress}%` }}
                  />
                </div>

                <div className="mt-6 space-y-3">
                  {readinessItems.map((item) => (
                    <div
                      key={item.key}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                        item.done
                          ? "border-primary/20 bg-primary/10"
                          : "border-border bg-surface-elevated/70"
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 ${item.done ? "text-primary" : "text-muted/50"}`}>
                        <CheckCircle2 size={16} />
                      </div>
                      <p className={`text-sm leading-6 ${item.done ? "text-foreground" : "text-muted"}`}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.4rem] border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {t("join.readiness.selected")}
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {selectedDepartmentName ?? t("join.readiness.selected.empty")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {t("join.readiness.selected.hint")}
                  </p>
                </div>
              </div>

              <div className="glass-card p-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                  {t("join.expectations.label")}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-foreground">{t("join.expectations.title")}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{t("join.expectations.desc")}</p>

                <div className="mt-6 space-y-4">
                  {expectationSteps.map((step, index) => {
                    const isDone = status === "success" && index === 0;
                    const isCurrent = status === "success" && index === 1;

                    return (
                      <div key={step.title} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                              isCurrent
                                ? "border-primary/40 bg-primary/15 text-primary"
                                : isDone
                                  ? "border-primary/25 bg-primary/10 text-primary"
                                  : "border-border bg-surface-elevated text-muted"
                            }`}
                          >
                            {index + 1}
                          </div>
                          {index < expectationSteps.length - 1 && (
                            <div className="mt-2 h-8 w-px bg-border" />
                          )}
                        </div>
                        <div className="pb-2">
                          <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
                          <p className="mt-1 text-sm leading-6 text-muted">{step.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            <div>
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.96, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }}
                    className="glass-card p-8 sm:p-10"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                      <CheckCircle size={32} className="text-primary" />
                    </div>
                    <h3 className="text-2xl font-semibold text-foreground mb-3">{t("join.success.title")}</h3>
                    <p className="text-sm text-muted leading-relaxed">{t("join.success.desc")}</p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                      <div className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                          {t("join.success.reference")}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-foreground">
                          #{submittedApplicationId ?? "—"}
                        </p>
                        <p className="mt-3 text-xs leading-5 text-muted">
                          {t("join.success.keep")}
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-border bg-background/55 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                          {t("join.success.next")}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {t("join.success.timelineIntro")}
                        </p>
                        <div className="mt-4 space-y-3">
                          {expectationSteps.map((step, index) => (
                            <div key={step.title} className="flex items-start gap-3">
                              <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-primary" : "bg-border"}`} />
                              <div>
                                <p className="text-sm font-medium text-foreground">{step.title}</p>
                                <p className="mt-1 text-xs leading-5 text-muted">{step.body}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                      <Link href="/" className="btn-primary px-8 py-3 text-sm inline-flex items-center justify-center gap-2">
                        {t("join.success.cta")}
                        <ArrowRight size={15} />
                      </Link>
                      <Link href="/projects" className="btn-secondary px-8 py-3 text-sm inline-flex items-center justify-center gap-2">
                        {t("home.cta.projects")}
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] as const }}
                    className="glass-card p-6 sm:p-8"
                  >
                    <motion.form className="space-y-5" onSubmit={handleSubmit}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                            {t("join.form.name")}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={t("join.form.name.placeholder")}
                            value={form.applicantName}
                            onChange={e => set("applicantName", e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                            {t("join.form.id")}
                          </label>
                          <input
                            type="text"
                            placeholder={t("join.form.id.placeholder")}
                            value={form.universityId}
                            onChange={e => set("universityId", e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                            {t("join.form.email")}
                          </label>
                          <input
                            type="email"
                            required
                            placeholder={t("join.form.email.placeholder")}
                            value={form.applicantEmail}
                            onChange={e => set("applicantEmail", e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                            {t("join.form.phone")}
                          </label>
                          <input
                            type="tel"
                            placeholder={t("join.form.phone.placeholder")}
                            value={form.phoneNumber}
                            onChange={e => set("phoneNumber", e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                          {t("join.form.major")}
                        </label>
                        <input
                          type="text"
                          placeholder={t("join.form.major.placeholder")}
                          value={form.major}
                          onChange={e => set("major", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                          {t("join.form.dept")}
                        </label>
                        <select
                          required
                          value={form.preferredDeptId}
                          onChange={e => set("preferredDeptId", e.target.value)}
                          className={INPUT_CLASS + " appearance-none"}
                        >
                          <option value="">{t("join.form.dept.placeholder")}</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>
                              {lang === "ar" ? d.nameAr : d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                          {t("join.form.motivation")}
                        </label>
                        <textarea
                          rows={4}
                          placeholder={t("join.form.motivation.placeholder")}
                          value={form.motivation}
                          onChange={e => set("motivation", e.target.value)}
                          className={INPUT_CLASS + " resize-none"}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                          {t("join.form.skills")}{" "}
                          <span className="text-muted/40 normal-case">{t("join.form.skills.optional")}</span>
                        </label>
                        <input
                          type="text"
                          placeholder={t("join.form.skills.placeholder")}
                          value={form.skills}
                          onChange={e => set("skills", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </div>

                      {status === "error" && (
                        <p className="text-sm text-red-400 text-center">{errorMsg}</p>
                      )}

                      <button
                        type="submit"
                        disabled={status === "loading"}
                        className="w-full btn-primary px-8 py-4 text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {status === "loading" ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            {t("join.form.submitting")}
                          </>
                        ) : (
                          <>
                            {t("join.form.submit")}
                            <ArrowRight size={15} />
                          </>
                        )}
                      </button>

                      <p className="text-xs text-muted/50 text-center">{t("join.form.consent")}</p>
                    </motion.form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ═══ FAQ ═══ */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-3xl">
          <SectionHeader
            label={t("join.faq.label")}
            title={t("join.faq.title")}
            centered
          />

          <div className="mt-12 space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={`${faq.questionEn}-${i}`}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: Math.min(i, 6) * 0.06 }}
                className="glass-card p-6"
              >
                <h4 className="text-sm font-semibold text-foreground flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                  {localizedValue(lang, faq.questionEn, faq.questionAr)}
                </h4>
                <p className="text-sm text-muted leading-relaxed mt-3 ms-7">
                  {localizedValue(lang, faq.answerEn, faq.answerAr)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <PublicCustomSegments page="join" />
    </div>
  );
}
