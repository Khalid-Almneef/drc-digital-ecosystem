"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth, DEMO_USERS } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { ChevronRight, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/base/Button";
import { Input } from "@/components/ui/base/Input";
import { Card, CardBody } from "@/components/ui/base/Card";

const demoGroups = [
  {
    label: "Club Leadership",
    labelAr: "قيادة النادي",
    accounts: [
      { key: "president", color: "from-primary to-secondary-light" },
      { key: "vp", color: "from-primary to-secondary-light" },
    ],
  },
  {
    label: "Department Leaders",
    labelAr: "رؤساء اللجان",
    accounts: [
      { key: "hr_leader", color: "from-green-400 to-teal-500" },
      { key: "dev_leader", color: "from-blue-400 to-indigo-500" },
      { key: "innovation_leader", color: "from-yellow-400 to-orange-500" },
      { key: "media_leader", color: "from-purple-400 to-pink-500" },
      { key: "pr_leader", color: "from-cyan-400 to-blue-500" },
      { key: "finance_leader", color: "from-amber-400 to-yellow-500" },
      { key: "madarat_leader", color: "from-fuchsia-400 to-purple-500" },
    ],
  },
  {
    label: "Vice & Sub-Leaders",
    labelAr: "نواب ومسؤولين",
    accounts: [
      { key: "hr_vice", color: "from-green-400 to-teal-500" },
      { key: "dev_sub", color: "from-blue-400 to-indigo-500" },
    ],
  },
  {
    label: "Regular Member",
    labelAr: "عضو عادي",
    accounts: [
      { key: "member", color: "from-gray-400 to-gray-500" },
    ],
  },
];

const positionLabels: Record<string, string> = {
  president: "President",
  vice_president: "Vice President",
  dept_leader: "Dept. Leader",
  dept_vice_leader: "Dept. Vice Leader",
  sub_leader: "Sub-Leader",
  member: "Member",
};

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsDemo } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      router.push("/dashboard");
    } else if (res.requiresSetup) {
      setInfo(t("login.info.setup"));
      setPassword("");
    } else if (res.requiresDeviceConfirmation) {
      setError(t("login.error.device"));
    } else {
      setError(res.error ?? t("login.error.invalid"));
    }
  };

  const handleDemoLogin = (key: string) => {
    loginAsDemo(key);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-6 py-12">
      <div className="fixed top-0 left-1/3 -z-10 w-[600px] h-[400px] bg-gradient-to-b from-primary/6 to-transparent rounded-full blur-[120px]" />
      <div className="fixed bottom-0 right-1/4 -z-10 w-[400px] h-[400px] bg-gradient-to-t from-secondary/8 to-transparent rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Logo alt="DRC" width={64} height={64} className="mx-auto drop-shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_25%,transparent)]" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{t("login.title")}</h1>
          <p className="text-sm text-muted mt-2">{t("login.subtitle")}</p>
        </div>

        {/* Login Form */}
        <Card variant="glass" className="overflow-hidden shadow-2xl">
          <CardBody className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label={t("login.email")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                icon={<Mail size={16} />}
                id="email"
                autoComplete="email"
                required
              />

              <div className="relative">
                <Input
                  label={t("login.password")}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  icon={<Lock size={16} />}
                  id="password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t("login.hide_password") : t("login.show_password")}
                  className="absolute end-3.5 top-[34px] text-muted/40 hover:text-muted focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-primary/40 outline-offset-2 rounded transition-colors z-10 p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  {error}
                </p>
              )}

              {info && (
                <p className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  {info}
                </p>
              )}

              <Button
                type="submit"
                isLoading={loading}
                className="w-full"
                size="lg"
                rightIcon={!loading && <ChevronRight size={14} />}
              >
                {t("login.submit")}
              </Button>

              <p className="text-center text-xs text-muted/50">
                <Link href="/forgot-password" className="hover:text-primary transition-colors">
                  {t("login.forgot")}
                </Link>
              </p>
            </form>

            {process.env.NODE_ENV !== "production" && (
              <button
                onClick={() => setShowDemo(!showDemo)}
                className="w-full text-center text-xs font-semibold text-primary hover:text-primary-bright transition-colors uppercase tracking-wider"
              >
                {showDemo ? t("login.demo.hide") : t("login.demo.show")}
              </button>
            )}

            {process.env.NODE_ENV !== "production" && showDemo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
                className="mt-6 space-y-4"
              >
                {demoGroups.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] font-bold text-muted/60 uppercase tracking-[0.15em] mb-2.5 flex items-center justify-between px-1">
                      {group.label}
                      <span className="text-muted/30 font-medium" dir="rtl">{group.labelAr}</span>
                    </p>
                    <div className="space-y-2">
                      {group.accounts.map(({ key, color }) => {
                        const user = DEMO_USERS[key];
                        if (!user) return null;
                        return (
                          <Card
                            key={key}
                            variant="glass"
                            interactive
                            onClick={() => handleDemoLogin(key)}
                            className="p-3 flex items-center gap-3 text-left group cursor-pointer border-border/40 hover:border-primary/20"
                          >
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-[11px] font-bold text-white shadow-lg shadow-black/10 shrink-0`}>
                              {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{user.name}</p>
                              <p className="text-[11px] text-muted truncate mt-0.5">
                                {positionLabels[user.position]} · {user.departmentName}
                              </p>
                            </div>
                            <ChevronRight size={14} className="text-muted/20 group-hover:text-primary transition-all group-hover:translate-x-0.5 shrink-0" />
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </CardBody>
        </Card>

        <p className="text-center text-xs text-muted/50 mt-6">
          <Link href="/" className="hover:text-primary transition-colors">{t("login.back")}</Link>
        </p>
      </motion.div>
    </div>
  );
}
