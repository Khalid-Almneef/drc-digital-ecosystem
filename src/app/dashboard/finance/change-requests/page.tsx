"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FinanceNav } from "@/components/dashboard/FinanceNav";
import { ChangeRequestInbox } from "@/components/dashboard/ChangeRequestInbox";
import { useLang } from "@/contexts/LanguageContext";

// Self-scoping: members of Finance see their own pending submissions; Finance
// leaders + club leaders see incoming requests addressed to Finance leadership
// (budget allocation changes, expense decisions). The inbox component handles
// the scope choice via the API's auto-detection.
export default function FinanceChangeRequestsPage() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  return (
    <div>
      <DashboardHeader
        title={tr("Finance change requests", "طلبات تغيير المالية")}
        description={tr(
          "Approve to apply, reject to dismiss. Rejection has no reason field — only a notification.",
          "اعتمد للتطبيق أو ارفض للإلغاء. الرفض بدون ذكر سبب، فقط يُرسل إشعار للمرسل.",
        )}
      />
      <FinanceNav />
      <ChangeRequestInbox />
    </div>
  );
}
