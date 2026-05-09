"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogIn, LayoutDashboard, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LanguageContext";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/base/Button";
import { ThemeToggle } from "@/components/ui/base/ThemeToggle";
import { LangToggle } from "@/components/ui/base/LangToggle";

const navLinks = [
  { labelKey: "nav.about", href: "/about" },
  { labelKey: "nav.projects", href: "/projects" },
  { labelKey: "nav.workshops", href: "/workshops" },
  { labelKey: "nav.events", href: "/events" },
  { labelKey: "nav.team", href: "/team" },
  { labelKey: "nav.alumni", href: "/alumni" },
  { labelKey: "nav.joinus", href: "/join" },
];

export const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { t } = useLang();
  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -28, opacity: 0.75 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "glass py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            : "bg-transparent py-5"
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 shadow-[0_0_14px_color-mix(in_srgb,var(--primary)_15%,transparent)] transition-all duration-300 group-hover:shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_25%,transparent)]" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, transparent), color-mix(in srgb, var(--secondary) 14%, transparent))" }}>
              <Logo
                alt="DRC"
                width={28}
                height={28}
                className={`transition-transform duration-300 group-hover:scale-105 ${
                  theme === 'light'
                    ? 'drop-shadow-[0_2px_8px_rgba(0,36,156,0.15)]'
                    : 'drop-shadow-[0_0_8px_rgba(0,217,172,0.3)]'
                }`}
              />
            </div>
            <span className="hidden text-sm font-bold tracking-tight text-foreground sm:block lg:text-base xl:text-lg">
              Drones &amp; Robotics Club
            </span>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 text-sm transition-all duration-200 group rounded-lg ${
                  pathname === link.href
                    ? "text-foreground bg-primary/8"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t(link.labelKey)}
                <span
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-300 ${
                    pathname === link.href ? "w-3/4" : "w-0 group-hover:w-3/4"
                  }`}
                />
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1 border-r border-border pr-3 mr-1">
              <LangToggle />
              <ThemeToggle />
            </div>
            {isAuthenticated ? (
              <Button
                asChild
                variant="outline"
                size="md"
                className="rounded-full px-5 shadow-[0_0_14px_color-mix(in_srgb,var(--primary)_12%,transparent)] hover:shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_22%,transparent)]"
                leftIcon={<LayoutDashboard size={14} />}
              >
                <Link href="/dashboard">
                  {t("nav.dashboard")}
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                size="md"
                className="rounded-full px-5"
                leftIcon={<LogIn size={14} />}
              >
                <Link href="/login">
                  {t("nav.signin")}
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden relative p-2 text-foreground z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {mobileMenuOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <X size={22} />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Menu size={22} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 glass md:hidden"
          >
            <motion.nav
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center h-full gap-8"
            >
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                >
                  <Link
                    href={link.href}
                    onClick={closeMobileMenu}
                    className={`text-2xl font-medium transition-colors ${
                      pathname === link.href ? "text-primary" : "text-foreground hover:text-primary"
                    }`}
                  >
                    {t(link.labelKey)}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + navLinks.length * 0.07 }}
                className="flex flex-col items-center gap-6 mt-4"
              >
                <div className="flex items-center gap-3 border border-border rounded-2xl p-2 bg-surface-elevated/50">
                  <LangToggle />
                  <ThemeToggle />
                </div>
                {isAuthenticated ? (
                  <Button
                    asChild
                    size="lg"
                    leftIcon={<LayoutDashboard size={16} />}
                  >
                    <Link href="/dashboard" onClick={closeMobileMenu}>
                      {t("nav.dashboard")}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    leftIcon={<LogIn size={16} />}
                  >
                    <Link href="/login" onClick={closeMobileMenu}>
                      {t("nav.signin")}
                    </Link>
                  </Button>
                )}
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
};
