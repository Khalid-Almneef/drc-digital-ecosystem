"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { GlowEffect } from "@/components/ui/GlowEffect";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { lang } = useLang();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    // Alumni accounts can only manage their alumni card. Bounce them to the
    // profile page from anywhere else inside /dashboard.
    if (
      !isLoading &&
      isAuthenticated &&
      user?.profileStatus === "alumni" &&
      pathname !== "/dashboard/profile"
    ) {
      router.push("/dashboard/profile");
    }
  }, [isAuthenticated, isLoading, user, pathname, router]);

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-glow text-primary text-sm">
          {lang === "ar" ? "جالس نجهز لك لوحة التحكم..." : "Loading dashboard..."}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-glow text-primary text-sm">{lang === "ar" ? "جالس نحمّل..." : "Loading..."}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <GlowEffect className="z-0" />
      <Sidebar />
      <div className="relative min-w-0 flex-1 overflow-hidden bg-background">
        <div className="pointer-events-none absolute left-1/3 top-0 h-[420px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/10 to-transparent blur-[120px]" />
        <div className="pointer-events-none absolute right-0 top-24 h-[300px] w-[380px] rounded-full bg-gradient-to-bl from-secondary/12 to-transparent blur-[110px]" />
        <div className="relative z-10 p-5 pt-16 sm:p-6 lg:p-8 lg:pt-8">
          {children}
        </div>
      </div>
    </div>
  );
}
