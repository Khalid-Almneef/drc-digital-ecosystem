"use client";

import { useEffect, useState } from "react";
import { Crown, Trophy } from "lucide-react";
import { api } from "@/lib/client";
import { useLang } from "@/contexts/LanguageContext";

interface Stats {
  memberCount: number;
  leaderCount: number;
  totalCount: number;
  lastAwardedAt: string | null;
  history: Array<{ year: number; month: number; role: "member" | "leader" }>;
}

const MONTH_EN = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_AR = ["", "يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export function MotmStatCard({ memberId }: { memberId: number }) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>(`/api/members/${memberId}/motm`)
      .then(setStats)
      .catch(() => setStats(null));
  }, [memberId]);

  if (!stats || stats.totalCount === 0) return null;

  return (
    <section className="panel-soft p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={15} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {tr("Recognition", "التكريمات")}
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.memberCount > 0 && (
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2">
              <Trophy size={13} className="text-primary" />
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                {tr("Member of month", "عضو الشهر")}
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.memberCount}×</p>
          </div>
        )}
        {stats.leaderCount > 0 && (
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2">
              <Crown size={13} className="text-primary" />
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                {tr("Leader of month", "قائد الشهر")}
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.leaderCount}×</p>
          </div>
        )}
      </div>
      {stats.history.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stats.history.slice(0, 8).map((h, i) => (
            <span
              key={i}
              className="rounded-full border border-border bg-background/40 px-2.5 py-0.5 text-[11px] text-muted"
            >
              {(lang === "ar" ? MONTH_AR : MONTH_EN)[h.month]} {h.year}
              {h.role === "leader" && " • L"}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
