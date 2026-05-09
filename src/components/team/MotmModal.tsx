"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Crown, ExternalLink, Building2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/client";
import { useLang } from "@/contexts/LanguageContext";

interface MemberPublic {
  memberId: number;
  fullName: string;
  fullNameAr: string | null;
  avatarUrl: string | null;
  bio: string | null;
  major: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  departmentName: string;
  departmentNameAr?: string | null;
  position?: string;
}

interface MotmStats {
  memberCount: number;
  leaderCount: number;
  totalCount: number;
  lastAwardedAt: string | null;
  history: Array<{ year: number; month: number; role: "member" | "leader"; awardedAt: string }>;
}

const MONTH_NAMES_EN = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_NAMES_AR = ["", "يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export function MotmModal({
  memberId,
  onClose,
}: {
  memberId: number | null;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [member, setMember] = useState<MemberPublic | null>(null);
  const [stats, setStats] = useState<MotmStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    setMember(null);
    setStats(null);
    Promise.all([
      api.get<MemberPublic>(`/api/members/${memberId}/public`).catch(() => null),
      api.get<MotmStats>(`/api/members/${memberId}/motm`).catch(() => null),
    ]).then(([m, s]) => {
      setMember(m);
      setStats(s);
      setLoading(false);
    });
  }, [memberId]);

  // Lock body scroll while open
  useEffect(() => {
    if (!memberId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [memberId]);

  return (
    <AnimatePresence>
      {memberId !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="motm-modal-name"
          >
            <button
              onClick={onClose}
              aria-label={tr("Close", "إغلاق")}
              className="absolute end-4 top-4 z-10 rounded-full bg-background/70 p-2 text-foreground/70 transition-colors hover:bg-background hover:text-foreground"
            >
              <X size={16} />
            </button>

            {/* Avatar header */}
            <div className="relative h-32 bg-gradient-to-br from-primary/30 to-secondary/30">
              {member?.avatarUrl && (
                <Image
                  src={member.avatarUrl}
                  alt={member.fullName}
                  fill
                  sizes="448px"
                  className="object-cover opacity-50"
                />
              )}
              <div className="absolute inset-x-0 -bottom-12 flex justify-center">
                <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-surface bg-surface">
                  {member?.avatarUrl ? (
                    <Image src={member.avatarUrl} alt={member.fullName} fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                      {(member?.fullName || "·").split(" ").slice(0, 2).map((s) => s[0]).join("")}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 pt-16 text-center">
              {loading && !member && <p className="text-sm text-muted">{tr("Loading…", "جاري التحميل…")}</p>}

              {member && (
                <>
                  <h2 id="motm-modal-name" className="text-lg font-semibold text-foreground">
                    {lang === "ar" && member.fullNameAr ? member.fullNameAr : member.fullName}
                  </h2>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.16em] text-primary/80">
                    <Building2 size={11} />
                    {lang === "ar" && member.departmentNameAr ? member.departmentNameAr : member.departmentName}
                  </p>
                  {member.major && <p className="mt-1.5 text-xs text-muted">{member.major}</p>}

                  {/* Stats row */}
                  {stats && stats.totalCount > 0 && (
                    <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-3">
                      {stats.memberCount > 0 && (
                        <div className="rounded-2xl border border-border bg-background/40 p-3">
                          <Trophy size={14} className="mx-auto text-primary" />
                          <p className="mt-1 text-2xl font-bold text-foreground">{stats.memberCount}×</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">
                            {tr("Member of month", "عضو الشهر")}
                          </p>
                        </div>
                      )}
                      {stats.leaderCount > 0 && (
                        <div className="rounded-2xl border border-border bg-background/40 p-3">
                          <Crown size={14} className="mx-auto text-primary" />
                          <p className="mt-1 text-2xl font-bold text-foreground">{stats.leaderCount}×</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">
                            {tr("Leader of month", "قائد الشهر")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bio */}
                  {member.bio && (
                    <p className="mt-5 text-sm leading-6 text-muted">{member.bio}</p>
                  )}

                  {/* History pills */}
                  {stats && stats.history.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                        {tr("Recognition history", "سجل التكريم")}
                      </p>
                      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                        {stats.history.slice(0, 8).map((h, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-border bg-background/40 px-2.5 py-1 text-[10px] text-muted"
                          >
                            {(lang === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN)[h.month]} {h.year}
                            {h.role === "leader" && " • L"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex justify-center gap-2">
                    {member.linkedinUrl && (
                      <a
                        href={member.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                      >
                        LinkedIn <ExternalLink size={11} />
                      </a>
                    )}
                    <Link
                      href={`/team/${member.memberId}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/30"
                    >
                      {tr("Full profile", "الملف الكامل")} <ExternalLink size={11} />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
