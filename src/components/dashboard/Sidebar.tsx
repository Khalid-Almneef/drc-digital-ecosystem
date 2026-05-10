"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, type Department, type Position } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/base/Button";
import { ThemeToggle } from "@/components/ui/base/ThemeToggle";
import { LangToggle } from "@/components/ui/base/LangToggle";
import { NotificationPanel } from "@/components/dashboard/NotificationPanel";
import {
  LayoutDashboard,
  Users,
  Code,
  Lightbulb,
  Camera,
  Megaphone,
  DollarSign,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  UserCircle,
  FileText,
  GraduationCap,
  Inbox,
} from "lucide-react";

interface NavItem {
  label: string;
  labelAr: string;
  href: string;
  icon: React.ElementType;
  dept?: Department;        // Which department this page belongs to (undefined = all)
  clubLeaderOnly?: boolean; // Only president/VP
  anyLeader?: boolean;      // Any department leader or above
}

const navItems: NavItem[] = [
  { label: "My Workspace", labelAr: "مساحتي", href: "/dashboard", icon: LayoutDashboard },
  { label: "HR & Members", labelAr: "الموارد والأعضاء", href: "/dashboard/hr", icon: Users, dept: "hr" },
  { label: "Development", labelAr: "التطوير", href: "/dashboard/development", icon: Code, dept: "development" },
  { label: "Innovation", labelAr: "الابتكار", href: "/dashboard/innovation", icon: Lightbulb, dept: "innovation" },
  { label: "Media", labelAr: "الإعلام", href: "/dashboard/media", icon: Camera, dept: "media" },
  { label: "Public Relations", labelAr: "العلاقات العامة", href: "/dashboard/pr", icon: Megaphone, dept: "pr" },
  { label: "Finance", labelAr: "المالية", href: "/dashboard/finance", icon: DollarSign, dept: "finance" },
  { label: "Madarat", labelAr: "مدارات", href: "/dashboard/madarat", icon: GraduationCap, dept: "madarat" },
  { label: "Admin Panel", labelAr: "لوحة الإدارة", href: "/dashboard/leaders", icon: Shield, clubLeaderOnly: true },
  { label: "Roster Manager", labelAr: "إدارة الفريق", href: "/dashboard/roster", icon: Users, clubLeaderOnly: true },
  { label: "Requests", labelAr: "الطلبات", href: "/dashboard/requests", icon: Inbox, anyLeader: true },
  { label: "Content", labelAr: "المحتوى", href: "/dashboard/content", icon: FileText, anyLeader: true },
  { label: "My Profile", labelAr: "ملفي", href: "/dashboard/profile", icon: UserCircle },
];

const positionLabels: Record<Position, string> = {
  president: "President",
  vice_president: "Vice President",
  dept_leader: "Leader",
  dept_vice_leader: "Vice Leader",
  sub_leader: "Sub-Leader",
  member: "Member",
};

const positionLabelsAr: Record<Position, string> = {
  president: "الرئيس",
  vice_president: "نائب الرئيس",
  dept_leader: "رئيس اللجنة",
  dept_vice_leader: "نائب رئيس اللجنة",
  sub_leader: "مسؤول فرعي",
  member: "عضو",
};

const deptColors: Record<Department, string> = {
  executive: "from-primary to-secondary-light",
  hr: "from-green-400 to-teal-500",
  development: "from-blue-400 to-indigo-500",
  innovation: "from-yellow-400 to-orange-500",
  media: "from-purple-400 to-pink-500",
  pr: "from-cyan-400 to-blue-500",
  finance: "from-amber-400 to-yellow-500",
  logistics: "from-rose-400 to-red-500",
  madarat: "from-fuchsia-400 to-purple-500",
};

export function Sidebar() {
  const { user, logout, canAccessDept, isClubLeader, isAnyLeader } = useAuth();
  const { lang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  // Filter nav items based on user's position + department
  // Alumni accounts are limited to managing their own alumni card. They sign
  // in to keep their public profile fresh; no committee dashboards.
  const isAlumni = user?.profileStatus === "alumni";

  const filteredNav = navItems.filter((item) => {
    if (isAlumni) return item.href === "/dashboard/profile";
    if (item.clubLeaderOnly) return isClubLeader;
    if (item.anyLeader) return isAnyLeader;
    if (item.dept) return canAccessDept(item.dept);
    return true; // Overview is visible to all
  });

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const dashboardTitle = lang === "ar" ? "بوابة النادي" : "DRC Portal";
  const dashboardSubtitle = lang === "ar" ? "لوحة الأعضاء" : "Member Dashboard";
  const backLabel = lang === "ar" ? "الرجوع للموقع" : "Back to Website";
  const signOutLabel = lang === "ar" ? "تسجيل الخروج" : "Sign Out";
  const userPositionLabel = lang === "ar" ? positionLabelsAr[user.position] : positionLabels[user.position];
  const userDepartmentLabel = lang === "ar" ? user.departmentNameAr : user.departmentName;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/dashboard/overview";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`border-b border-border/80 px-4 py-5 ${collapsed ? "flex justify-center" : "flex items-center gap-3"}`}>
        <Logo alt="DRC" width={32} height={32} className="shrink-0 drop-shadow-[0_0_8px_rgba(0,217,172,0.2)]" />
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-bold text-sm text-foreground">{dashboardTitle}</span>
            <span className="block text-[10px] text-muted truncate">{dashboardSubtitle}</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="px-2 pt-3">
        <NotificationPanel collapsed={collapsed} />
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                active
                  ? "border border-primary/20 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground"
              } ${collapsed ? "justify-center" : ""}`}
              style={active ? { background: "linear-gradient(90deg, color-mix(in srgb, var(--primary) 15%, transparent), color-mix(in srgb, var(--primary) 4%, transparent))" } : undefined}
            >
              {active ? <span className="absolute inset-y-2 start-0 w-0.5 rounded-es-full rounded-ss-full bg-primary shadow-[0_0_8px_var(--primary)]" /> : null}
              <item.icon size={18} className={`shrink-0 ${active ? "text-primary" : "text-muted group-hover:text-foreground"}`} />
              {!collapsed && <span className="truncate">{lang === "ar" ? item.labelAr : item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-2">
        <div className="rounded-xl border border-border bg-surface-elevated/70 p-1 space-y-1">
          <LangToggle showLabel collapsed={collapsed} />
          <ThemeToggle showLabel collapsed={collapsed} />
        </div>

        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted hover:text-foreground hover:bg-surface-elevated transition-all ${collapsed ? "justify-center" : ""}`}
        >
          <ExternalLink size={14} className="shrink-0" />
          {!collapsed && <span>{backLabel}</span>}
        </Link>

        {/* User info */}
        <div className={`rounded-xl border border-border bg-surface-elevated px-3 py-3 ${collapsed ? "flex justify-center" : "flex items-center gap-3"}`}>
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${deptColors[user.department]} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
            {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-start">
              <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted truncate">
                {userPositionLabel} · {userDepartmentLabel}
              </p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={`w-full text-red-400 hover:bg-red-400/10 transition-all ${collapsed ? "justify-center px-0" : "justify-start"}`}
          leftIcon={<LogOut size={14} className="shrink-0" />}
        >
          {!collapsed && <span>{signOutLabel}</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed start-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-elevated text-foreground shadow-[0_10px_25px_rgba(2,10,24,0.2)] lg:hidden"
        aria-label={mobileOpen ? (lang === "ar" ? "إغلاق القائمة" : "Close menu") : (lang === "ar" ? "فتح القائمة" : "Open menu")}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: lang === "ar" ? 280 : -280 }}
            animate={{ x: 0 }}
            exit={{ x: lang === "ar" ? 280 : -280 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 start-0 top-0 z-50 w-[260px] border-e border-border bg-surface shadow-[0_24px_60px_rgba(2,10,24,0.28)] lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 z-30 hidden h-screen shrink-0 border-r border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-elevated)_26%,transparent),transparent_22%),var(--surface)] transition-all duration-300 lg:flex lg:flex-col ${
          collapsed ? "w-[68px]" : "w-[250px]"
        }`}
      >
        {sidebarContent}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -end-3 top-7 w-6 h-6 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
}
