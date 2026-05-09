"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";
import { Mail, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/base/Button";
import { Input } from "@/components/ui/base/Input";
import { Card, CardBody } from "@/components/ui/base/Card";
import { api } from "@/lib/client";

export default function ForgotPasswordPage() {
  const { lang } = useLang();
  const ar = lang === "ar";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ar
            ? "تعذر إرسال رابط الاستعادة. حاول لاحقاً."
            : "Could not send reset link. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 py-16 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex items-center justify-center">
          <Logo width={40} height={40} alt="DRC" />
        </div>

        <Card>
          <CardBody className="p-8">
            <h1 className="text-2xl font-bold text-foreground mb-1 text-center">
              {ar ? "إعادة تعيين كلمة المرور" : "Reset your password"}
            </h1>
            <p className="text-sm text-muted text-center mb-6">
              {ar
                ? "أدخل بريدك المسجّل لإرسال رابط إعادة التعيين."
                : "Enter your registered email and we'll send you a reset link."}
            </p>

            {submitted ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                  {ar
                    ? "إذا كان البريد مسجّلاً لدينا، فستصلك رسالة تحتوي على رابط إعادة التعيين خلال دقائق. الرابط صالح لمدة ساعة واحدة."
                    : "If that email is registered with us, a reset link is on its way. It expires in 1 hour."}
                </div>
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 text-sm text-primary hover:underline underline-offset-4"
                >
                  <ArrowLeft size={14} />
                  {ar ? "العودة لتسجيل الدخول" : "Back to login"}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label={ar ? "البريد الإلكتروني" : "Email"}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail size={16} />}
                  placeholder="you@example.com"
                />

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading || !email}>
                  {loading
                    ? ar ? "جاري الإرسال..." : "Sending..."
                    : ar ? "إرسال رابط الاستعادة" : "Send reset link"}
                </Button>

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 text-xs text-muted hover:text-foreground"
                >
                  <ArrowLeft size={12} />
                  {ar ? "العودة لتسجيل الدخول" : "Back to login"}
                </Link>
              </form>
            )}
          </CardBody>
        </Card>
      </motion.div>
    </main>
  );
}
