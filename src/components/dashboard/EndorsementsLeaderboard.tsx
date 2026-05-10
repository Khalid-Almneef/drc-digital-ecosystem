"use client";

import { useApi } from "@/lib/hooks/useApi";
import { Award, ThumbsUp, Users } from "lucide-react";

interface LeaderboardRow {
  memberId: number;
  fullName: string;
  departmentName: string;
  position: string;
  endorsementsReceived: number;
  endorsementPoints: number;
  uniqueEndorsers: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardRow[];
}

export function EndorsementsLeaderboard({ tr }: { tr: (en: string, ar: string) => string }) {
  const { data, isLoading } = useApi<LeaderboardResponse>("/api/endorsements/leaderboard");
  const rows = data?.leaderboard ?? [];

  const totalReceived = rows.reduce((sum, row) => sum + row.endorsementsReceived, 0);
  const totalEndorsees = rows.length;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface/40 p-4">
        <h3 className="text-sm font-semibold text-foreground">{tr("Peer endorsements", "تزكيات الزملاء")}</h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          {tr(
            "Endorsement notes are private between the giver and the recipient. Only counts and totals are shown here so you can spot consistently endorsed members for Member of the Month and similar recognitions.",
            "ملاحظات التزكيات خاصة بين الموزّع والمستلم. تظهر هنا الأعداد والإجماليات فقط لمساعدتك في رصد الأعضاء الأكثر تزكيةً لاختيار عضو الشهر وما شابه.",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={<ThumbsUp size={16} />} label={tr("Endorsements given", "إجمالي التزكيات")} value={totalReceived} />
        <Stat icon={<Users size={16} />} label={tr("Members endorsed", "أعضاء تم تزكيتهم")} value={totalEndorsees} />
        <Stat icon={<Award size={16} />} label={tr("Top points", "أعلى نقاط")} value={rows[0]?.endorsementPoints ?? 0} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface/40">
            <tr>
              <th className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-muted">{tr("#", "#")}</th>
              <th className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-muted">{tr("Member", "العضو")}</th>
              <th className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-muted">{tr("Department", "القسم")}</th>
              <th className="px-3 py-2 text-end text-xs font-semibold uppercase tracking-wide text-muted">{tr("Points", "النقاط")}</th>
              <th className="px-3 py-2 text-end text-xs font-semibold uppercase tracking-wide text-muted">{tr("Endorsements", "التزكيات")}</th>
              <th className="px-3 py-2 text-end text-xs font-semibold uppercase tracking-wide text-muted">{tr("Unique endorsers", "موزّعون مختلفون")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface/20">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs text-muted">{tr("Loading…", "جاري التحميل…")}</td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs text-muted">
                  {tr("No endorsements yet.", "لا توجد تزكيات بعد.")}
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={row.memberId} className="transition-colors hover:bg-surface/40">
                <td className="px-3 py-2 text-xs font-mono text-muted">{index + 1}</td>
                <td className="px-3 py-2 font-medium text-foreground">{row.fullName}</td>
                <td className="px-3 py-2 text-xs text-muted">{row.departmentName}</td>
                <td className="px-3 py-2 text-end font-semibold text-primary">{row.endorsementPoints}</td>
                <td className="px-3 py-2 text-end text-foreground">{row.endorsementsReceived}</td>
                <td className="px-3 py-2 text-end text-muted">{row.uniqueEndorsers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-3">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
