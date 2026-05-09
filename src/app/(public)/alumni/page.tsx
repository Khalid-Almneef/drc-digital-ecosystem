"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, Building2, GraduationCap, Search } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";

interface Alumnus {
  memberId: number;
  fullName: string;
  fullNameAr: string | null;
  avatarUrl: string | null;
  bio: string | null;
  quote: string | null;
  quoteAr: string | null;
  major: string | null;
  gender: "male" | "female" | null;
  departmentName: string;
}

export default function AlumniListingPage() {
  const { lang, t } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [alumni, setAlumni] = useState<Alumnus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    api
      .get<{ alumni: Alumnus[] }>("/api/members/public")
      .then((res) => setAlumni(res?.alumni ?? []))
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  const filtered = useMemo(() => {
    if (!alumni) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return alumni;
    return alumni.filter((a) =>
      [a.fullName, a.fullNameAr, a.major, a.bio, a.departmentName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [alumni, q]);

  return (
    <main>
      <PageHero
        label={tr("Class Of", "خرّيجو النادي")}
        title={tr("Where our alumni went", "إلى أين انطلق خرّيجونا")}
        description={tr(
          "DRC graduates carry the club into industry, research, and graduate school. Reach out — they remember what it's like to be where you are.",
          "خرّيجو النادي ينتقلون إلى الصناعة والبحث والدراسات العليا. تواصل معهم — يتذكرون جيدًا أن يكونوا في مكانك.",
        )}
      />

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted">
              <GraduationCap size={16} className="text-primary" />
              <span>
                {alumni
                  ? tr(
                      `${filtered.length} of ${alumni.length} ${alumni.length === 1 ? "alumnus" : "alumni"}`,
                      `${filtered.length} من ${alumni.length} خرّيج`,
                    )
                  : tr("Loading…", "جاري التحميل…")}
              </span>
            </div>
            <label className="dashboard-field flex items-center gap-2 sm:w-72">
              <Search size={14} className="text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tr("Search by name, major, company…", "ابحث بالاسم أو التخصص أو الشركة…")}
                className="w-full bg-transparent outline-none placeholder:text-muted/70"
                aria-label={tr("Search alumni", "ابحث في الخرّيجين")}
              />
            </label>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
              {tr("Failed to load alumni: ", "تعذر تحميل الخرّيجين: ")}
              {error}
            </div>
          )}

          {alumni && alumni.length === 0 && (
            <EmptyState tr={tr} />
          )}

          {alumni && filtered.length === 0 && alumni.length > 0 && (
            <p className="rounded-2xl border border-border bg-surface/40 p-6 text-center text-sm text-muted">
              {tr("No alumni matched your search.", "لا يوجد نتائج مطابقة لبحثك.")}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a, idx) => (
              <AlumnusCard key={a.memberId} alumnus={a} delay={idx * 0.04} lang={lang} tr={tr} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function AlumnusCard({
  alumnus,
  delay,
  lang,
  tr,
}: {
  alumnus: Alumnus;
  delay: number;
  lang: "en" | "ar";
  tr: (en: string, ar: string) => string;
}) {
  const name = lang === "ar" && alumnus.fullNameAr ? alumnus.fullNameAr : alumnus.fullName;
  const initials = (alumnus.fullName || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/alumni/${alumnus.memberId}`}
        className="glass-card group flex h-full flex-col p-5 transition-colors hover:border-primary/35"
      >
        <div className="flex items-start gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-surface">
            {alumnus.avatarUrl ? (
              <Image
                src={alumnus.avatarUrl}
                alt={alumnus.fullName}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                {initials || "·"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-foreground">{name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-primary/80">
              <GraduationCap size={12} />
              {alumnus.departmentName}
            </p>
          </div>
          <ArrowUpRight
            size={16}
            className="mt-1 shrink-0 text-muted transition-colors group-hover:text-primary"
          />
        </div>

        {alumnus.major && (
          <p className="mt-3 text-xs text-muted">{alumnus.major}</p>
        )}

        {alumnus.bio && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-foreground">
            <Building2 size={13} className="mt-1 shrink-0 text-primary/60" />
            <span className="line-clamp-2">{alumnus.bio}</span>
          </p>
        )}

        {alumnus.quote && (
          <p className="mt-auto pt-4 text-xs italic leading-5 text-muted line-clamp-3">
            &ldquo;{lang === "ar" && alumnus.quoteAr ? alumnus.quoteAr : alumnus.quote}&rdquo;
          </p>
        )}
      </Link>
    </motion.div>
  );
}

function EmptyState({ tr }: { tr: (en: string, ar: string) => string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center">
      <GraduationCap size={28} className="mx-auto text-primary/60" />
      <p className="mt-3 text-base font-semibold text-foreground">
        {tr("No alumni profiles yet", "لا يوجد خرّيجون مسجّلون بعد")}
      </p>
      <p className="mt-2 text-sm text-muted">
        {tr(
          "As DRC members graduate they'll appear here. Check back next semester.",
          "سيظهر الخرّيجون هنا فور تخرّجهم. تابعنا في الفصل القادم.",
        )}
      </p>
    </div>
  );
}
