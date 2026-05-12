"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/contexts/LanguageContext";

const items = [
  { label: "Operations", labelAr: "التشغيل", href: "/dashboard/finance" },
  { label: "Tasks", labelAr: "المهام", href: "/dashboard/finance/tasks" },
  { label: "Reports", labelAr: "التقارير", href: "/dashboard/finance/reports" },
];

export function FinanceNav() {
  const pathname = usePathname();
  const { lang } = useLang();

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border bg-surface text-muted hover:border-primary/15 hover:text-foreground"
            }`}
          >
            {lang === "ar" ? item.labelAr : item.label}
          </Link>
        );
      })}
    </div>
  );
}
