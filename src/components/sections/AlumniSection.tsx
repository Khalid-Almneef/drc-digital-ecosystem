"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { api } from "@/lib/client";
import { useLang } from "@/contexts/LanguageContext";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Building2, Quote, X } from "lucide-react";

// Social icons custom SVGs to avoid build errors
const Github = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 3.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);
const Linkedin = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

interface AlumniMember {
  memberId: number;
  fullName: string;
  fullNameAr: string | null;
  avatarUrl: string | null;
  bio: string | null;
  quote: string | null;
  quoteAr: string | null;
  major: string | null;
  graduationYear?: number | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  departmentName: string;
}

export function AlumniSection({ adminManage }: { adminManage: string }) {
  const { t, lang } = useLang();
  const [alumni, setAlumni] = useState<AlumniMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlumnus, setSelectedAlumnus] = useState<AlumniMember | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.get<{ active: any[]; alumni: AlumniMember[] }>("/api/members/public")
      .then(d => {
        if (d?.alumni?.length) setAlumni(d.alumni);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scrollSlider = (direction: "prev" | "next") => {
    if (!sliderRef.current) return;
    // Scroll a full row at a time so users get 4 fresh cards per click on
    // desktop (and a meaningful jump on smaller breakpoints).
    const amount = sliderRef.current.clientWidth;
    sliderRef.current.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  };

  if (!loading && alumni.length === 0) return null;

  return (
    <section id="alumni-showcase" className="relative py-24 px-6 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-end justify-between gap-6">
          <SectionHeader
            label={t("team.alumni.label")}
            title={t("team.alumni.title")}
            description={t("team.alumni.desc")}
          />
          {!loading && alumni.length > 1 && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollSlider("prev")}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/80 text-foreground transition-all hover:border-primary/40 hover:text-primary"
                aria-label={lang === "ar" ? "السابق" : "Previous alumni"}
              >
                <ArrowLeft size={18} className={lang === "ar" ? "rotate-180" : ""} />
              </button>
              <button
                type="button"
                onClick={() => scrollSlider("next")}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/80 text-foreground transition-all hover:border-primary/40 hover:text-primary"
                aria-label={lang === "ar" ? "التالي" : "Next alumni"}
              >
                <ArrowRight size={18} className={lang === "ar" ? "rotate-180" : ""} />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-card h-80 animate-pulse bg-surface-elevated" />
            ))}
          </div>
        ) : (
          <div
            ref={sliderRef}
            className="flex snap-x snap-mandatory items-stretch gap-4 sm:gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {alumni.map((a, i) => (
              <AlumniCard 
                key={a.memberId} 
                alumnus={a} 
                index={i} 
                lang={lang} 
                onView={() => setSelectedAlumnus(a)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedAlumnus && (
          <AlumniModal 
            alumnus={selectedAlumnus} 
            lang={lang} 
            onClose={() => setSelectedAlumnus(null)} 
          />
        )}
      </AnimatePresence>

      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10" />
    </section>
  );
}

function AlumniCard({
  alumnus,
  index,
  lang,
  onView,
}: {
  alumnus: AlumniMember;
  index: number;
  lang: string;
  onView: () => void;
}) {
  const displayName = lang === "ar" && alumnus.fullNameAr ? alumnus.fullNameAr : alumnus.fullName;
  const displayQuote = lang === "ar" && alumnus.quoteAr ? alumnus.quoteAr : alumnus.quote;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="group flex h-64 w-[calc(100%-1rem)] sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)] xl:w-[calc((100%-3.75rem)/4)] shrink-0 snap-start cursor-pointer flex-col rounded-2xl border-2 border-primary/15 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_96%,transparent),color-mix(in_srgb,var(--surface-elevated)_92%,transparent))] shadow-[0_12px_40px_rgba(2,10,24,0.16)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_52px_rgba(0,217,172,0.12)]"
      onClick={onView}
    >
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-primary/15 bg-surface-elevated sm:h-16 sm:w-16">
              {alumnus.avatarUrl ? (
                <Image 
                  src={alumnus.avatarUrl} 
                  alt={displayName} 
                  fill 
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                  <Quote size={20} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-xl font-semibold text-foreground transition-colors group-hover:text-primary sm:text-2xl">
                {displayName}
              </h4>
              <p className="mt-1 truncate text-xs font-medium text-muted sm:text-sm">
                {alumnus.departmentName}
              </p>
            </div>
          </div>

          {alumnus.linkedinUrl ? (
            <div className="flex min-h-11 min-w-11 items-center justify-center rounded-[999px] bg-primary/25 p-1 shadow-[inset_0_1px_2px_rgba(255,255,255,0.28)] backdrop-blur-md">
              <a
                href={alumnus.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="flex items-center justify-center rounded-full bg-primary px-2.5 py-2 text-background shadow-[inset_0_2px_4px_rgba(255,255,255,0.24),inset_0_-2px_4px_rgba(0,0,0,0.22)] transition-transform hover:scale-105"
                aria-label={`${displayName} LinkedIn`}
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex-1">
          <p className="text-sm leading-7 text-muted sm:text-base">
            {displayQuote || alumnus.bio || (lang === "ar" ? "لا يوجد اقتباس أو نبذة متاحة." : "No public quote available yet.")}
          </p>
        </div>

        <div className="mx-auto mt-4 flex w-3/4 flex-col border-t border-border/60 pt-3">
          <p className="text-center text-base font-semibold text-muted sm:text-lg">
            {alumnus.graduationYear || "DRC Alumni"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function AlumniModal({ alumnus, lang, onClose }: { alumnus: AlumniMember; lang: string; onClose: () => void }) {
  const displayName = lang === "ar" && alumnus.fullNameAr ? alumnus.fullNameAr : alumnus.fullName;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 py-10">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl max-h-full overflow-y-auto glass-card shadow-2xl"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-surface-elevated border border-border hover:border-primary/40 hover:text-primary transition-all z-20"
        >
          <X size={20} />
        </button>

        <div className="p-8 sm:p-12">
          <div className="grid gap-10 sm:grid-cols-[180px_1fr] items-start">
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="relative group mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full" />
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border-2 border-primary/20 bg-surface-elevated">
                  {alumnus.avatarUrl ? (
                    <Image 
                      src={alumnus.avatarUrl} 
                      alt={displayName} 
                      fill 
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                      <Building2 size={48} />
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-2">{displayName}</h3>
              <p className="text-primary font-bold mb-6 text-sm uppercase tracking-widest">{alumnus.departmentName}</p>

              <div className="flex gap-3">
                {alumnus.linkedinUrl && (
                  <a href={alumnus.linkedinUrl} target="_blank" className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-elevated border border-border text-foreground hover:border-primary/40 hover:text-primary transition-all">
                    <Linkedin size={18} />
                  </a>
                )}
                {alumnus.githubUrl && (
                  <a href={alumnus.githubUrl} target="_blank" className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-elevated border border-border text-foreground hover:border-primary/40 hover:text-primary transition-all">
                    <Github size={18} />
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <section>
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                  <div className="w-1 h-3 bg-primary rounded-full" />
                  {lang === 'ar' ? 'السيرة الذاتية' : 'Biography'}
                </h4>
                <p className="text-muted leading-relaxed text-sm">
                  {alumnus.bio || (lang === 'ar' ? 'لا يوجد سيرة ذاتية متاحة.' : 'No biography available.')}
                </p>
              </section>

              {alumnus.linkedinUrl && (
                <section>
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                    <div className="h-3 w-1 rounded-full bg-primary" />
                    LinkedIn
                  </h4>
                  <a
                    href={alumnus.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-bright"
                  >
                    {lang === "ar" ? "فتح الملف الشخصي" : "Open profile"}
                    <ArrowRight size={14} className={lang === "ar" ? "rotate-180" : ""} />
                  </a>
                </section>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Major</p>
                  <p className="text-foreground text-sm font-semibold">{alumnus.major || 'Engineering'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Graduation</p>
                  <p className="text-foreground text-sm font-semibold">{alumnus.graduationYear || '2024'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
