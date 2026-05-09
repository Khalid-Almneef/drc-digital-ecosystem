"use client";

import { useEffect, useState } from "react";
import { Crown, Trophy } from "lucide-react";
import { api } from "@/lib/client";
import { useLang } from "@/contexts/LanguageContext";

interface Row {
  memberId: number;
  fullName: string;
  fullNameAr: string | null;
  avatarUrl: string | null;
  departmentSlug: string | null;
  departmentName: string | null;
  memberCount: number;
  leaderCount: number;
  totalCount: number;
  lastAwardedAt: string;
}

export function MotmLeaderboardPanel({ tr }: { tr: (en: string, ar: string) => string }) {
  const { lang } = useLang();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    api.get<Row[]>("/api/members/motm-leaderboard?limit=12")
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="panel-soft mt-6 max-w-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Trophy size={15} className="text-primary" />
        <h3 className="text-base font-semibold text-foreground">
          {tr("Recognition leaderboard", "لوحة التكريم")}
        </h3>
      </div>
      <p className="mb-4 text-xs leading-5 text-muted">
        {tr(
          "Lifetime Member-of-Month and Leader-of-Month counts. Updates whenever you save the MOTM list above.",
          "إجمالي مرات الحصول على لقب عضو الشهر وقائد الشهر مدى الحياة. يُحدّث عند حفظ القائمة بالأعلى.",
        )}
      </p>

      {!rows && <p className="text-sm text-muted">{tr("Loading…", "جاري التحميل…")}</p>}

      {rows && rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-background/40 p-4 text-center text-xs text-muted">
          {tr("No awards recorded yet.", "لم تُسجّل تكريمات بعد.")}
        </p>
      )}

      {rows && rows.length > 0 && (
        <ol className="space-y-1.5">
          {rows.map((r, i) => {
            const name = lang === "ar" && r.fullNameAr ? r.fullNameAr : r.fullName;
            const isTop = i < 3;
            return (
              <li
                key={r.memberId}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2"
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${isTop ? "bg-primary/15 text-primary" : "bg-surface text-muted"}`}>
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm text-foreground">{name}</span>
                {r.departmentName && (
                  <span className="hidden sm:inline truncate rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">
                    {r.departmentName}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-foreground">
                  <Trophy size={11} className="text-primary/70" />
                  {r.memberCount}
                </span>
                <span className="flex items-center gap-1 text-xs text-foreground">
                  <Crown size={11} className="text-primary/70" />
                  {r.leaderCount}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
