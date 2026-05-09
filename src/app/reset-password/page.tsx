"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/base/Button";
import { Input } from "@/components/ui/base/Input";
import { Card, CardBody } from "@/components/ui/base/Card";
import { api } from "@/lib/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { lang } = useLang();
  const ar = lang === "ar";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = !!token && password.length >= 8 && password === confirm && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!canSubmit) return;
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("invalid_token") || /expired|invalid/i.test(msg)) {
        setError(
          ar
            ? "الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً."
            : "Link is invalid or expired. Please request a new one.",
        );
      } else {
        setError(msg || (ar ? "تعذر تعيين كلمة المرور." : "Could not set password."));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <CardBody className="p-8 text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">
            {ar ? "رابط ناقص" : "Missing token"}
          </h1>
          <p className="text-sm text-muted">
            {ar
              ? "الرابط الذي اتبعته لا يحتوي على رمز إعادة التعيين."
              : "The link you followed is missing a reset token."}
          </p>
          <Link
            href="/forgot-password"
            className="inline-block text-sm text-primary hover:underline underline-offset-4"
          >
            {ar ? "اطلب رابطاً جديداً" : "Request a new link"}
          </Link>
        </CardBody>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardBody className="p-8 text-center space-y-4">
          <CheckCircle2 size={42} className="mx-auto text-emerald-400" />
          <h1 className="text-xl font-bold text-foreground">
            {ar ? "تم تعيين كلمة المرور" : "Password set"}
          </h1>
          <p className="text-sm text-muted">
            {ar ? "جاري إعادة التوجيه لتسجيل الدخول..." : "Redirecting to login..."}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="p-8">
        <h1 className="text-2xl font-bold text-foreground mb-1 text-center">
          {ar ? "تعيين كلمة المرور" : "Set your password"}
        </h1>
        <p className="text-sm text-muted text-center mb-6">
          {ar
            ? "اختر كلمة مرور قوية لحسابك (8 أحرف على الأقل)."
            : "Choose a strong password for your account (minimum 8 characters)."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <Input
              label={ar ? "كلمة المرور الجديدة" : "New password"}
              type={show ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              placeholder="••••••••"
              error={tooShort ? (ar ? "8 أحرف على الأقل" : "At least 8 characters") : undefined}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3.5 top-[34px] text-muted/40 hover:text-muted transition-colors z-10 p-1"
              aria-label={show ? (ar ? "إخفاء" : "Hide") : (ar ? "إظهار" : "Show")}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Input
            label={ar ? "تأكيد كلمة المرور" : "Confirm password"}
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            icon={<Lock size={16} />}
            placeholder="••••••••"
            error={mismatch ? (ar ? "كلمتا المرور غير متطابقتين" : "Passwords do not match") : undefined}
          />

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {loading
              ? ar ? "جاري الحفظ..." : "Saving..."
              : ar ? "تعيين كلمة المرور" : "Set password"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <Logo width={40} height={40} alt="DRC" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Suspense fallback={<Card><CardBody className="p-8 text-center text-sm text-muted">Loading…</CardBody></Card>}>
            <ResetPasswordForm />
          </Suspense>
        </motion.div>
      </div>
    </main>
  );
}
