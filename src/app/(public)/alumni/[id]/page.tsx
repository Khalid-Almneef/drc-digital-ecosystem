"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, GraduationCap, Building2 } from "lucide-react";
// Social icons seem to be missing or named differently in this lucide-react version.
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
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/client";
import { useLang } from "@/contexts/LanguageContext";
import { localizedValue } from "@/lib/public-content";
import { displayMemberName, translateMajor } from "@/lib/format-name";

interface AlumnusInfo {
  memberId: number;
  fullName: string;
  fullNameAr: string | null;
  avatarUrl: string | null;
  bio: string | null;
  quote: string | null;
  quoteAr: string | null;
  major: string | null;
  graduationYear: number | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  departmentName: string;
  departmentNameAr: string | null;
}

export default function AlumnusProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, lang } = useLang();
  const [data, setData] = useState<AlumnusInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AlumnusInfo>(`/api/members/${id}/public`)
      .then(setData)
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-glow text-primary">Loading profile...</div>
      </div>
    );
  }

  if (!data) return null;

  const displayName = displayMemberName(data.fullName, data.fullNameAr, lang as "en" | "ar");
  const displayDept = lang === "ar" && data.departmentNameAr ? data.departmentNameAr : data.departmentName;
  const displayQuote = lang === "ar" && data.quoteAr ? data.quoteAr : data.quote;

  return (
    <div className="relative min-h-screen pt-32 pb-20 px-6 overflow-hidden">
      <div className="mx-auto max-w-4xl relative z-10">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-12"
        >
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {lang === 'ar' ? 'العودة للرئيسية' : 'Back to home'}
          </Link>
        </motion.div>

        <div className="grid gap-12 md:grid-cols-[280px_1fr] items-start">
          {/* Avatar & Basic Info */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center md:items-start md:text-left"
          >
            <div className="relative group mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full" />
              <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-primary/20 bg-surface-elevated">
                {data.avatarUrl ? (
                  <Image 
                    src={data.avatarUrl} 
                    alt={displayName} 
                    fill 
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                    <Building2 size={64} />
                  </div>
                )}
              </div>
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-2">{displayName}</h1>
            <p className="text-primary font-bold mb-6">{displayDept}</p>

            <div className="flex gap-3">
              {data.linkedinUrl && (
                <a 
                  href={data.linkedinUrl} 
                  target="_blank" 
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-elevated border border-border text-foreground hover:border-primary/40 hover:text-primary transition-all"
                >
                  <Linkedin size={18} />
                </a>
              )}
              {data.githubUrl && (
                <a 
                  href={data.githubUrl} 
                  target="_blank" 
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-elevated border border-border text-foreground hover:border-primary/40 hover:text-primary transition-all"
                >
                  <Github size={18} />
                </a>
              )}
            </div>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-10"
          >
            {/* Quote Card */}
            {displayQuote && (
              <div className="relative p-8 rounded-3xl bg-surface-elevated border border-primary/10 italic">
                <div className="absolute -top-4 -left-2 text-6xl text-primary/20 font-serif">“</div>
                <p className="text-xl leading-relaxed text-foreground relative z-10">
                  {displayQuote}
                </p>
                <div className="absolute -bottom-10 -right-2 text-6xl text-primary/20 font-serif rotate-180">“</div>
              </div>
            )}

            {/* Bio Section */}
            <section>
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                {lang === 'ar' ? 'السيرة الذاتية' : 'Biography'}
              </h2>
              <p className="text-muted leading-8 text-lg">
                {data.bio || (lang === 'ar' ? 'لا يوجد سيرة ذاتية متاحة.' : 'No biography available.')}
              </p>
            </section>

            {/* Academic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted font-bold">{lang === "ar" ? "التخصص" : "Major"}</p>
                  <p className="text-foreground font-semibold">{translateMajor(data.major, lang as "en" | "ar") || "—"}</p>
                </div>
              </div>
              <div className="glass-card p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 size={24} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Graduation</p>
                  <p className="text-foreground font-semibold">{data.graduationYear || '2024'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Decorative Glow */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
    </div>
  );
}
