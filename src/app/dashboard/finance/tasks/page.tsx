"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FinanceNav } from "@/components/dashboard/FinanceNav";
import { LeaderTaskReviewPanel } from "@/components/dashboard/LeaderTaskReviewPanel";
import { useLang } from "@/contexts/LanguageContext";

export default function FinanceTasksPage() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  return (
    <div>
      <DashboardHeader
        title={tr("Finance Tasks", "مهام المالية")}
        description={tr(
          "Review tasks submitted by finance members and approve them to grant credit hours.",
          "راجع المهام المرسلة من أعضاء المالية واعتمدها لمنح ساعات الاعتماد.",
        )}
      />
      <FinanceNav />
      <LeaderTaskReviewPanel
        department="finance"
        title="Finance task review"
        titleAr="مراجعة مهام المالية"
      />
    </div>
  );
}
