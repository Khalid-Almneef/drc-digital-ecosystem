"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { PublicCustomSegments } from "@/components/ui/PublicCustomSegments";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionAnchorBar } from "@/components/ui/SectionAnchorBar";
import { useLang } from "@/contexts/LanguageContext";
import { ExternalLink, Mail, Users } from "lucide-react";
import { api } from "@/lib/client";
import { DEFAULT_TEAM_STATS, TeamStatItem, localizedValue, parseCollection } from "@/lib/public-content";
import { displayMemberName, firstAndLastName } from "@/lib/format-name";
import { MotmModal } from "@/components/team/MotmModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicMember {
  memberId: number;
  position: string;
  departmentSlug: string | null;
  departmentName: string;
  departmentNameAr: string;
  fullName: string;
  fullNameAr: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  email?: string | null;
  customRole?: string | null;
  customRoleAr?: string | null;
}

interface MonthMember {
  memberId: number;
  fullName: string;
  fullNameAr: string | null;
  avatarUrl: string | null;
  departmentSlug: string | null;
  departmentName: string;
  departmentNameAr: string | null;
}

// ─── Org chart definition ─────────────────────────────────────────────────────

type Slot = { pos: string; deptSlug: string | null; roleKey: string };

const EXEC_SLOTS: Slot[] = [
  { pos: "president",      deptSlug: null,        roleKey: "team.role.president"   },
  { pos: "vice_president", deptSlug: null,        roleKey: "team.role.vp"          },
  { pos: "vice_president", deptSlug: null,        roleKey: "team.role.vp"          },
  { pos: "sub_leader",     deptSlug: "executive", roleKey: "team.role.supervisor"  },
];

type DeptConfig = {
  dept: string;
  leaderRole: string;
  viceRole: string | null;
  coLeader?: boolean;
  qa?: boolean;
};

const DEPT_CONFIGS: DeptConfig[] = [
  // Innovation is the engineering core of the club — pinned first.
  { dept: "innovation",  leaderRole: "team.role.leader",    viceRole: "team.role.vice", qa: true },
  { dept: "development", leaderRole: "team.role.leader",    viceRole: "team.role.vice"      },
  { dept: "media",       leaderRole: "team.role.leader",    viceRole: "team.role.vice"      },
  { dept: "pr",          leaderRole: "team.role.leader",    viceRole: "team.role.vice"      },
  { dept: "hr",          leaderRole: "team.role.leader",    viceRole: "team.role.vice"      },
  { dept: "finance",     leaderRole: "team.role.leader",    viceRole: null                  },
  { dept: "logistics",   leaderRole: "team.role.leader",    viceRole: null                  },
  { dept: "madarat",     leaderRole: "team.role.co_leader", viceRole: "team.role.co_leader", coLeader: true },
];

// ─── Dept gradient colours ────────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
  executive:   "from-primary/20 to-secondary/20",
  hr:          "from-green-400/20 to-teal-400/20",
  development: "from-primary/20 to-blue-400/20",
  innovation:  "from-yellow-400/20 to-orange-400/20",
  media:       "from-purple-400/20 to-pink-400/20",
  pr:          "from-rose-400/20 to-orange-400/20",
  finance:     "from-amber-400/20 to-yellow-400/20",
  logistics:   "from-blue-400/20 to-indigo-400/20",
  madarat:     "from-indigo-400/20 to-violet-400/20",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickMember(
  members: PublicMember[],
  used: Set<number>,
  pos: string,
  deptSlug: string | null,
): PublicMember | null {
  const m = members.find(
    x => !used.has(x.memberId) &&
         x.position === pos &&
         (deptSlug === null ? true : x.departmentSlug === deptSlug),
  );
  if (m) used.add(m.memberId);
  return m ?? null;
}

// ─── Member card ──────────────────────────────────────────────────────────────

function MemberCard({
  member,
  roleKey,
  deptSlug,
  delay = 0,
  t,
  lang,
}: {
  member: PublicMember | null;
  roleKey: string;
  deptSlug: string | null;
  delay?: number;
  t: (k: string) => string;
  lang: string;
}) {
  const gradient = DEPT_COLORS[deptSlug ?? "executive"] ?? "from-primary/20 to-secondary/20";
  const displayName = member
    ? displayMemberName(member.fullName, member.fullNameAr, lang as "en" | "ar")
    : t("team.placeholder.name");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const }}
      className="control-surface rounded-2xl p-4"
    >
      <div className="flex items-start gap-4">
        {member ? (
          <Link
            href={`/team/${member.memberId}`}
            className="flex flex-1 items-start gap-4 min-w-0 group rounded-lg focus-visible:outline-2 focus-visible:outline-primary/40 outline-offset-2"
          >
            <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient}`}>
              {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt={displayName} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <div className="absolute inset-0 bg-circuit opacity-30" />
                  <Users size={18} className="relative text-foreground/20" />
                </>
              )}
            </div>
            <div className="min-w-0 flex-1 text-start">
              <p className="text-[10px] font-medium text-primary uppercase tracking-wider">
                {t(`dept.${deptSlug ?? "executive"}.name`)}
              </p>
              <h4 className="mt-1 text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
                {displayName}
              </h4>
              <p className="mt-1 text-xs text-primary/70">
                {member?.customRole
                  ? (lang === "ar" && member.customRoleAr ? member.customRoleAr : member.customRole)
                  : t(roleKey)}
              </p>
            </div>
          </Link>
        ) : (
          <>
            <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient}`}>
              <div className="absolute inset-0 bg-circuit opacity-30" />
              <Users size={18} className="relative text-foreground/20" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-primary uppercase tracking-wider">
                {t(`dept.${deptSlug ?? "executive"}.name`)}
              </p>
              <h4 className="mt-1 text-sm font-semibold leading-snug text-foreground">{displayName}</h4>
              <p className="mt-1 text-xs text-primary/70">{t(roleKey)}</p>
            </div>
          </>
        )}
        <div className="flex gap-2">
          {member?.linkedinUrl ? (
            <a
              href={member.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-elevated transition-colors hover:border-primary/20 focus-visible:outline-2 focus-visible:outline-primary/40 outline-offset-2"
            >
              <ExternalLink size={14} className="text-muted" />
            </a>
          ) : null}
          {member?.email ? (
            <a
              href={`mailto:${member.email}`}
              aria-label={`Email ${displayName}`}
              title={member.email}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-muted transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary/40 outline-offset-2"
            >
              <Mail size={14} />
            </a>
          ) : (
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-elevated opacity-35">
              <Mail size={14} className="text-muted" />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { t, lang } = useLang();
  const [activeMembers, setActiveMembers] = useState<PublicMember[]>([]);
  const [monthMembers, setMonthMembers] = useState<MonthMember[]>([]);
  const [stats, setStats] = useState<TeamStatItem[]>(DEFAULT_TEAM_STATS);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [motmFocus, setMotmFocus] = useState<number | null>(null);
  const sectionAnchors = [
    { href: "#team-directory", label: t("team.anchor.directory") },
    { href: "#team-department-leadership", label: t("team.anchor.departments") },
    { href: "#team-recognition", label: t("team.anchor.recognition") },
  ];

  useEffect(() => {
    api.get<{ active: PublicMember[] }>("/api/members/public")
      .then(d => {
        if (d?.active?.length) setActiveMembers(d.active);
      })
      .catch(() => {})
      .finally(() => setLoadingMembers(false));

    api.get<MonthMember[]>("/api/members/month")
      .then(d => { if (d?.length) setMonthMembers(d); })
      .catch(() => {});

    api.get<{ key: string; json: TeamStatItem[] | null }>("/api/site-content/team.stats.items")
      .then(d => setStats(parseCollection(d?.json, DEFAULT_TEAM_STATS)))
      .catch(() => {});
  }, []);

  // Assign API members to predefined org slots (useMemo avoids re-computing on re-renders)
  const { execCards, deptCards, extraLeaders } = useMemo(() => {
    const used = new Set<number>();

    const execCards = EXEC_SLOTS.map((slot, i) => ({
      key: `exec-${i}`,
      slot,
      member: pickMember(activeMembers, used, slot.pos, slot.deptSlug),
    }));

    const deptCards = DEPT_CONFIGS.map(cfg => {
      // Collect *all* leaders for this dept, not just one. Real rosters often
      // have multiple co-leaders, vice-leaders, or sub-leaders.
      const leaders = activeMembers.filter(
        (m) => !used.has(m.memberId) && m.position === "dept_leader" && m.departmentSlug === cfg.dept,
      );
      leaders.forEach((m) => used.add(m.memberId));

      const vices = cfg.viceRole
        ? activeMembers.filter(
            (m) => !used.has(m.memberId) && m.position === "dept_vice_leader" && m.departmentSlug === cfg.dept,
          )
        : [];
      vices.forEach((m) => used.add(m.memberId));

      const subs = activeMembers.filter(
        (m) => !used.has(m.memberId) && m.position === "sub_leader" && m.departmentSlug === cfg.dept,
      );
      subs.forEach((m) => used.add(m.memberId));

      return { cfg, leaders, vices, subs };
    });

    // Catch-all: any leader whose dept slug doesn't match the canonical 8
    // (e.g. legacy roster rows tagged "executive" beyond the president/VP slots,
    // or a freshly-created committee). Avoids "missing leader" gaps.
    const extraLeaders = activeMembers.filter(
      (m) =>
        !used.has(m.memberId) &&
        ["dept_leader", "dept_vice_leader", "sub_leader"].includes(m.position),
    );

    return { execCards, deptCards, extraLeaders };
  }, [activeMembers]);

  return (
    <div className="relative">
      <PageHero
        label={t("team.hero.label")}
        title={t("team.hero.title")}
        accentText={t("team.hero.accent")}
        description={t("team.hero.desc")}
      />

      <SectionAnchorBar items={sectionAnchors} title={t("team.anchor.label")} lang={lang} className="mt-[-1.5rem] mb-6" />

      {/* ═══ STATS STRIP ═══ */}
      <section className="relative py-8 px-6">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-3 gap-4"
          >
            {stats.map((s, index) => (
              <div key={`${s.labelEn}-${index}`} className="glass-card p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted mt-1">
                  {localizedValue(lang, s.labelEn, s.labelAr)}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ═══ EXECUTIVE ═══ */}
      <section id="team-directory" className="relative py-14 px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            label={t("team.executive.label")}
            title={t("team.executive.title")}
            description={t("team.executive.desc")}
          />
          {loadingMembers ? (
            <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="glass-card h-56 animate-pulse bg-surface-elevated" />
              ))}
            </div>
          ) : (
            <div className="mt-10 glass-card p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {execCards.map(({ key, slot, member }, i) => (
                  <MemberCard
                    key={key}
                    member={member}
                    roleKey={slot.roleKey}
                    deptSlug={slot.deptSlug}
                    delay={i * 0.07}
                    t={t}
                    lang={lang}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ═══ DEPARTMENT LEADERSHIP ═══ */}
      <section id="team-department-leadership" className="relative py-14 px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            label={t("team.depts.label")}
            title={t("team.depts.title")}
            description={t("team.depts.desc")}
          />

          <div className="mt-10 space-y-8">
            {deptCards.map(({ cfg, leaders, vices, subs }, di) => {
              // If a dept has *no* leaders at all, still render a card with a
              // single empty placeholder so the org chart stays complete.
              const headEntries = leaders.length > 0 || vices.length > 0
                ? [
                    ...leaders.map((m) => ({ member: m, role: cfg.leaderRole })),
                    ...vices.map((m) => ({ member: m, role: cfg.viceRole ?? "team.role.vice" })),
                  ]
                : [{ member: null as PublicMember | null, role: cfg.leaderRole }];
              return (
                <div key={cfg.dept} className="glass-card p-5">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${DEPT_COLORS[cfg.dept]?.replace("/20", "") ?? "from-primary to-secondary"}`} />
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest">
                        {t(`dept.${cfg.dept}.name`)}
                      </h3>
                    </div>
                    <span className="rounded-full border border-border bg-surface/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted">
                      {headEntries.filter((e) => e.member).length + subs.length}{" "}
                      {(lang as string) === "ar" ? "قائد" : headEntries.filter((e) => e.member).length + subs.length === 1 ? "lead" : "leads"}
                    </span>
                  </div>

                  {(() => {
                    // For QA-flagged departments (Innovation), promote sub-leaders
                    // into the same row as the dept leader / vice — they're
                    // "Quality & Assurance leaders" with the same dashboard
                    // access. Other departments keep sub-leaders in a separate
                    // panel below.
                    const promotedHeads = cfg.qa
                      ? [
                          ...headEntries,
                          ...subs.map((m) => ({ member: m as PublicMember | null, role: "team.role.qa_leader" })),
                        ]
                      : headEntries;
                    const remainingSubs = cfg.qa ? [] : subs;
                    const cols =
                      promotedHeads.length === 1 ? "grid-cols-1 max-w-xl" :
                      promotedHeads.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
                      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
                    return (
                      <>
                        <div className={`grid gap-4 ${cols}`}>
                          {promotedHeads.map((entry, idx) => (
                            <MemberCard
                              key={entry.member?.memberId ?? `placeholder-${cfg.dept}-${idx}`}
                              member={entry.member}
                              roleKey={entry.role}
                              deptSlug={cfg.dept}
                              delay={di * 0.04 + idx * 0.04}
                              t={t}
                              lang={lang}
                            />
                          ))}
                        </div>

                        {remainingSubs.length > 0 && (
                          <div className="mt-5 rounded-2xl border border-border bg-surface/45 p-4">
                            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
                              {(lang as string) === "ar" ? "قادة فرعيون" : "Sub-leads"}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {remainingSubs.map((m, qi) => (
                                <MemberCard
                                  key={m.memberId}
                                  member={m}
                                  roleKey="team.role.sub_leader"
                                  deptSlug={cfg.dept}
                                  delay={di * 0.04 + qi * 0.06}
                                  t={t}
                                  lang={lang}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              );
            })}

            {extraLeaders.length > 0 && (
              <div className="glass-card p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-5 w-1 rounded-full bg-gradient-to-b from-primary/60 to-secondary/60" />
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground">
                    {lang === "ar" ? "قيادات إضافية" : "Other leadership"}
                  </h3>
                  <span className="rounded-full border border-border bg-surface/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted">
                    {extraLeaders.length}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {extraLeaders.map((m, idx) => (
                    <MemberCard
                      key={m.memberId}
                      member={m}
                      roleKey={
                        m.position === "dept_vice_leader"
                          ? "team.role.vice"
                          : m.position === "sub_leader"
                            ? "team.role.sub_leader"
                            : "team.role.leader"
                      }
                      deptSlug={m.departmentSlug}
                      delay={idx * 0.04}
                      t={t}
                      lang={lang}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ═══ MEMBERS OF THE MONTH ═══ */}
      <section id="team-recognition" className="relative py-14 px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            label={t("team.motm.label")}
            title={t("team.motm.title")}
            description={t("team.motm.desc")}
            centered
          />

          <div className="mt-10">
            {monthMembers.length === 0 ? (
              <div className="mx-auto max-w-xl rounded-[1.6rem] border border-dashed border-border bg-surface/45 p-8 text-center">
                <p className="text-base font-semibold text-foreground">{t("team.motm.emptyTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{t("team.motm.empty")}</p>
              </div>
            ) : (
              <>
              <div className="flex flex-wrap justify-center gap-5">
                {monthMembers.map((m, i) => (
                  <motion.button
                    key={m.memberId}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const }}
                    onClick={() => setMotmFocus(m.memberId)}
                    className="glass-card overflow-hidden card-hover w-52 text-left transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    aria-label={`${displayMemberName(m.fullName, m.fullNameAr, lang as "en" | "ar")} — ${lang === "ar" ? "عرض التفاصيل" : "view details"}`}
                  >
                    <div className={`h-24 bg-gradient-to-br ${DEPT_COLORS[m.departmentSlug ?? "executive"] ?? "from-primary/20 to-secondary/20"} relative overflow-hidden`}>
                      {m.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatarUrl} alt={displayMemberName(m.fullName, m.fullNameAr, lang as "en" | "ar")} className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-circuit opacity-30" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Users size={24} className="text-foreground/10" />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="p-4 text-center">
                      <h4 className="text-sm font-semibold text-foreground">
                        {displayMemberName(m.fullName, m.fullNameAr, lang as "en" | "ar")}
                      </h4>
                      <p className="text-xs text-primary mt-1">
                        {lang === "ar" && m.departmentNameAr ? m.departmentNameAr : m.departmentName}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
              <MotmModal memberId={motmFocus} onClose={() => setMotmFocus(null)} />
              </>
            )}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ═══ JOIN CTA ═══ */}
      <section className="relative py-14 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
            className="card-feature p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/8 to-transparent rounded-full blur-[60px] pointer-events-none" />
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              {t("team.join.title")}
            </h2>
            <p className="text-muted text-sm leading-relaxed mb-6">{t("team.join.desc")}</p>
            <Link href="/join" className="btn-primary px-8 py-3 text-sm inline-block">
              {t("team.join.cta")}
            </Link>
          </motion.div>
        </div>
      </section>

      <PublicCustomSegments page="team" />
    </div>
  );
}
