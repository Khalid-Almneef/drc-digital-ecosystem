"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BookOpen,
  GitBranch,
  GraduationCap,
  Link2,
  Mail,
  Phone,
  Save,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MotmStatCard } from "@/components/dashboard/MotmStatCard";
import { AvatarUploader } from "@/components/dashboard/AvatarUploader";

interface ProfileData {
  fullName: string;
  fullNameAr: string;
  bio: string;
  major: string;
  phoneNumber: string;
  linkedinUrl: string;
  githubUrl: string;
  graduationYear: string;
  gender: "male" | "female" | "";
  email: string;
  position: string;
  departmentSlug: string | null;
  // Per-field privacy
  isPublicOnTeam: boolean;
  isEmailPublic: boolean;
  isLinkedinPublic: boolean;
  isPhonePublic: boolean;
  isGithubPublic: boolean;
}

const empty: ProfileData = {
  fullName: "",
  fullNameAr: "",
  bio: "",
  major: "",
  phoneNumber: "",
  linkedinUrl: "",
  githubUrl: "",
  graduationYear: "",
  gender: "",
  email: "",
  position: "",
  departmentSlug: null,
  isPublicOnTeam: false,
  isEmailPublic: false,
  isLinkedinPublic: true,
  isPhonePublic: false,
  isGithubPublic: true,
};

function Field({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  hint,
  textarea,
  disabled,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  textarea?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
        <Icon size={13} className="text-primary/70" />
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          disabled={disabled}
          className="dashboard-field w-full resize-none px-3 py-2.5 text-sm disabled:opacity-60"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="dashboard-field min-h-11 w-full px-3 py-2.5 text-sm disabled:opacity-60"
        />
      )}
      {hint ? <p className="text-xs leading-5 text-muted">{hint}</p> : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel-soft p-5 sm:p-6">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function PrivacyToggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface/40 p-3 transition-colors hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </div>
      <span
        aria-hidden="true"
        className={`relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors ${
          checked ? "border-primary/40 bg-primary/30" : "border-border bg-surface"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
            checked ? "translate-x-5 bg-primary" : "translate-x-1 bg-muted"
          }`}
        />
      </span>
    </div>
  );
}

const PRESET_PALETTES = [
  { name: "DRC Default", palette: { primary: "#00d9ac", secondary: "#00249c", accent: "#00d9ac" } },
  { name: "Midnight Purple", palette: { primary: "#7c3aed", secondary: "#1e1b4b", accent: "#a78bfa" } },
  { name: "Solar", palette: { primary: "#f59e0b", secondary: "#92400e", accent: "#fcd34d" } },
  { name: "Crimson", palette: { primary: "#ef4444", secondary: "#7f1d1d", accent: "#fca5a5" } },
  { name: "Ocean", palette: { primary: "#06b6d4", secondary: "#0c4a6e", accent: "#67e8f9" } },
  { name: "Forest", palette: { primary: "#10b981", secondary: "#064e3b", accent: "#6ee7b7" } },
  { name: "Sunset", palette: { primary: "#fb7185", secondary: "#881337", accent: "#fda4af" } },
  { name: "Royal", palette: { primary: "#3b82f6", secondary: "#1e3a8a", accent: "#93c5fd" } },
  { name: "Mint", palette: { primary: "#14b8a6", secondary: "#134e4a", accent: "#5eead4" } },
  { name: "Rose Gold", palette: { primary: "#e11d48", secondary: "#4c0519", accent: "#fda4af" } },
  { name: "Mono", palette: { primary: "#e5e7eb", secondary: "#1f2937", accent: "#9ca3af" } },
  { name: "Saudi Green", palette: { primary: "#006c35", secondary: "#003d1f", accent: "#34d399" } },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const { lang, setLang } = useLang();
  const { theme, setTheme, palette, hasCustomPalette, setPalette, resetPalette } = useTheme();
  const [form, setForm] = useState<ProfileData>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  useEffect(() => {
    if (!user) return;
    api
      .get<Record<string, unknown>>(`/api/members/${user.id}`)
      .then((data) => {
        setForm({
          fullName: (data.fullName as string) ?? "",
          fullNameAr: (data.fullNameAr as string) ?? "",
          bio: (data.bio as string) ?? "",
          major: (data.major as string) ?? "",
          phoneNumber: (data.phoneNumber as string) ?? "",
          linkedinUrl: (data.linkedinUrl as string) ?? "",
          githubUrl: (data.githubUrl as string) ?? "",
          graduationYear: data.graduationYear != null ? String(data.graduationYear) : "",
          gender: (data.gender as ProfileData["gender"]) ?? "",
          email: (data.email as string) ?? user.email,
          position: (data.position as string) ?? user.position,
          departmentSlug: (data.departmentSlug as string | null) ?? null,
          isPublicOnTeam: Boolean(data.isPublicOnTeam ?? false),
          isEmailPublic: Boolean(data.isEmailPublic ?? false),
          isLinkedinPublic: Boolean(data.isLinkedinPublic ?? true),
          isPhonePublic: Boolean(data.isPhonePublic ?? false),
          isGithubPublic: Boolean(data.isGithubPublic ?? true),
        });
        setAvatarUrl((data.avatarUrl as string | null) ?? null);
      })
      .catch(() => {
        setForm((current) => ({ ...current, email: user.email, position: user.position }));
      })
      .finally(() => setLoading(false));
  }, [user]);

  const set = (key: keyof ProfileData) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/members/${user.id}`, {
        fullName: form.fullName || undefined,
        fullNameAr: form.fullNameAr || undefined,
        bio: form.bio || undefined,
        major: form.major || undefined,
        phoneNumber: form.phoneNumber || undefined,
        linkedinUrl: form.linkedinUrl,
        githubUrl: form.githubUrl,
        graduationYear: form.graduationYear ? Number(form.graduationYear) : undefined,
        gender: form.gender || undefined,
        isPublicOnTeam: true,
        isEmailPublic: form.isEmailPublic,
        isLinkedinPublic: form.isLinkedinPublic,
        isPhonePublic: false,
        isGithubPublic: form.isGithubPublic,
      });
      toast.success(tr("Profile saved", "تم حفظ الملف"));
    } catch (e) {
      setError((e as { message?: string }).message ?? tr("Failed to save. Please try again.", "تعذر الحفظ. حاول مرة أخرى."));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const deptGradient: Record<string, string> = {
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
  const gradient = deptGradient[user.department] ?? "from-primary to-secondary-light";
  const userInitials = user.name.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase();

  const isAlumni = user.profileStatus === "alumni";

  return (
    <div>
      <DashboardHeader
        title={isAlumni ? tr("My Alumni Card", "بطاقتي كخريج") : tr("My Profile", "ملفي")}
        description={
          isAlumni
            ? tr(
                "Keep your alumni card current. Update your photo, bio, current role, and links — they'll show on the public Alumni page.",
                "حافظ على تحديث بطاقتك. صورتك ونبذتك ودورك الحالي وروابطك تظهر في صفحة الخرّيجين العامة.",
              )
            : tr(
                "Manage your identity, public member details, language, theme, and saved appearance preferences.",
                "أدر هويتك وبياناتك العامة واللغة والمظهر وتفضيلات الحساب المحفوظة.",
              )
        }
      />

      {isAlumni && (
        <div className="mb-5 rounded-2xl border border-primary/25 bg-primary/8 p-4 text-sm text-foreground">
          <p className="font-semibold">{tr("Welcome back, alumnus.", "أهلاً بك مجددًا، يا خرّيج النادي.")}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {tr(
              "As an alumni you can manage just your alumni card on this page — committee dashboards are off-limits. Update your photo and bio whenever your career changes.",
              "كخرّيج تستطيع تحديث بطاقتك فقط من هذه الصفحة — لوحات اللجان غير متاحة. حدّث صورتك ونبذتك متى تغيّرت تجربتك المهنية.",
            )}
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="panel-soft animate-pulse p-6">
              <div className="mb-4 h-4 w-1/4 rounded bg-surface-elevated" />
              <div className="h-10 rounded bg-surface-elevated" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
          <section className="panel-soft flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <AvatarUploader
              memberId={Number(user.id)}
              currentUrl={avatarUrl}
              fallbackInitials={userInitials}
              gradient={gradient}
              onChange={setAvatarUrl}
            />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-foreground">{user.name}</p>
              <p className="mt-0.5 text-sm text-muted">{user.email}</p>
              <p className="mt-0.5 text-xs capitalize text-muted">
                {user.position.replace("_", " ")} · {user.departmentName}
              </p>
            </div>
          </section>

          {/* Recognition — only renders when the member has at least one
              MOTM/Leader-of-month award logged. */}
          <MotmStatCard memberId={Number(user.id)} />

          {/* Completeness meter — encourages members to fill optional but
              high-value fields. Each field weighted equally; threshold for
              "complete" is 100%. The hint surfaces the first missing field
              so the call-to-action is concrete. */}
          <ProfileCompleteness form={form} tr={tr} />


          <Section title={tr("Basic Information", "البيانات الأساسية")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={tr("Full Name (EN)", "الاسم الكامل (EN)")} icon={User} value={form.fullName} onChange={set("fullName")} placeholder={tr("Your full name", "اسمك الكامل")} />
              <Field label={tr("Full Name (AR)", "الاسم الكامل (AR)")} icon={User} value={form.fullNameAr} onChange={set("fullNameAr")} placeholder="الاسم الكامل" />
              <Field label={tr("Email", "البريد الإلكتروني")} icon={Mail} type="email" value={form.email} onChange={() => {}} placeholder="-" hint={tr("Email is managed by admins.", "البريد الإلكتروني تتم إدارته من الإدارة.")} disabled />
              <Field label={tr("Phone", "رقم الجوال")} icon={Phone} type="tel" value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="+966 5X XXX XXXX" />
              <Field label={tr("Major / Field of Study", "التخصص / مجال الدراسة")} icon={GraduationCap} value={form.major} onChange={set("major")} placeholder={tr("e.g. Aerospace Engineering", "مثال: هندسة طيران")} />
              <Field label={tr("Graduation Year", "سنة التخرج")} icon={GraduationCap} type="number" value={form.graduationYear} onChange={set("graduationYear")} placeholder={tr("e.g. 2026", "مثال: 2026")} />
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                  <User size={13} className="text-primary/70" />
                  {tr("Gender", "الجنس")}
                </label>
                <select value={form.gender} onChange={(event) => set("gender")(event.target.value)} className="dashboard-field min-h-11 w-full px-3 py-2.5 text-sm">
                  <option value="">{tr("Select gender", "اختر الجنس")}</option>
                  <option value="male">{tr("Male", "ذكر")}</option>
                  <option value="female">{tr("Female", "أنثى")}</option>
                </select>
              </div>
            </div>
          </Section>

          <Section title={tr("Appearance & Memory", "المظهر والذاكرة")}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{tr("Language", "اللغة")}</label>
                  <select value={lang} onChange={(event) => setLang(event.target.value as "en" | "ar")} className="dashboard-field min-h-11 w-full px-3 py-2.5 text-sm">
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                  <p className="text-xs text-muted">{tr("Saved to your account automatically.", "ينحفظ تلقائيًا على حسابك.")}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{tr("Theme", "المظهر")}</label>
                  <select value={theme} onChange={(event) => setTheme(event.target.value as "dark" | "light")} className="dashboard-field min-h-11 w-full px-3 py-2.5 text-sm">
                    <option value="dark">{tr("Dark", "داكن")}</option>
                    <option value="light">{tr("Light", "فاتح")}</option>
                  </select>
                </div>
              </div>

              <div className="rounded-[1.1rem] border border-border bg-surface-elevated/35 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{tr("Custom Palette", "ألوانك الخاصة")}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{tr("Pick three colors for your signed-in dashboard experience.", "اختر ثلاث ألوان لتجربتك الخاصة داخل الحساب.")}</p>
                  </div>
                  <button onClick={resetPalette} className="btn-secondary min-h-11 px-4 py-2 text-xs">{tr("Reset", "إعادة ضبط")}</button>
                </div>
                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">{tr("Presets", "أنماط جاهزة")}</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {PRESET_PALETTES.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => setPalette(preset.palette)}
                        title={preset.name}
                        aria-label={preset.name}
                        className="group relative h-9 overflow-hidden rounded-lg border border-white/10 transition-all duration-200 hover:scale-[1.04] hover:border-primary/40 hover:shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_18%,transparent)] focus-visible:outline-2 focus-visible:outline-primary/40 outline-offset-2"
                        style={{ background: `linear-gradient(135deg, ${preset.palette.primary} 0%, ${preset.palette.primary} 50%, ${preset.palette.secondary} 50%, ${preset.palette.secondary} 100%)` }}
                      >
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "primary", label: tr("Primary", "أساسي") },
                    { key: "secondary", label: tr("Secondary", "ثانوي") },
                    { key: "accent", label: tr("Accent", "لمسة") },
                  ].map((item) => (
                    <label key={item.key} className="flex flex-col gap-2 text-xs text-muted">
                      <span className="font-semibold uppercase tracking-[0.12em]">{item.label}</span>
                      <input
                        type="color"
                        value={palette[item.key as keyof typeof palette]}
                        onChange={(event) => setPalette({ ...palette, [item.key]: event.target.value })}
                        className="h-11 w-full cursor-pointer rounded-xl border border-border bg-surface p-1"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-9 flex-1 rounded-xl" style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }} />
                  <div className="h-9 w-16 rounded-xl border border-border" style={{ backgroundColor: palette.accent }} />
                </div>
                <p className="mt-3 text-xs text-muted">
                  {hasCustomPalette
                    ? tr("Your custom palette is active for this account.", "ألوانك الخاصة مفعلة لهذا الحساب.")
                    : tr("You are currently using the default club palette.", "أنت حاليًا على ألوان النادي الافتراضية.")}
                </p>
              </div>
            </div>
          </Section>

          <Section title={tr("Bio", "النبذة")}>
            <Field
              label={tr("About You", "نبذة عنك")}
              icon={BookOpen}
              value={form.bio}
              onChange={set("bio")}
              placeholder={tr("A short bio shown to teammates when they view your profile on project pages.", "نبذة قصيرة تظهر لزملائك لما يشوفون ملفك في صفحات المشاريع.")}
              hint={tr("Shown publicly on project contributor cards.", "تظهر بشكل عام في بطاقات مساهمي المشاريع.")}
              textarea
            />
          </Section>

          <Section title={tr("Social Links", "روابطك")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={tr("LinkedIn URL", "رابط لينكدإن")} icon={Link2} type="url" value={form.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://linkedin.com/in/username" />
              <Field label={tr("GitHub URL", "رابط GitHub")} icon={GitBranch} type="url" value={form.githubUrl} onChange={set("githubUrl")} placeholder="https://github.com/username" />
            </div>
          </Section>

          <Section title={tr("Privacy — what's public", "الخصوصية — ما يظهر للعامة")}>
            <p className="mb-4 text-xs leading-5 text-muted">
              {tr(
                "Choose which contact channels show on your public team profile. Toggling these on/off affects only what visitors see — your data stays the same.",
                "اختر قنوات التواصل التي تظهر على ملفك العام. تشغيل/إيقاف هذه الخيارات يؤثر فقط على ما يراه الزوار — بياناتك تبقى محفوظة كما هي.",
              )}
            </p>
            <div className="space-y-2.5">
              <PrivacyToggle
                checked={form.isEmailPublic}
                onChange={(v) => setForm((c) => ({ ...c, isEmailPublic: v }))}
                title={tr("Show my email", "إظهار بريدي الإلكتروني")}
                description={tr("A clickable mailto link on your card.", "رابط بريد إلكتروني قابل للنقر على بطاقتك.")}
              />
              <PrivacyToggle
                checked={form.isLinkedinPublic}
                onChange={(v) => setForm((c) => ({ ...c, isLinkedinPublic: v }))}
                title={tr("Show my LinkedIn", "إظهار حساب لينكدإن")}
                description={tr("Hidden if your URL field is blank.", "يخفى إذا كان حقل الرابط فارغًا.")}
              />
              <PrivacyToggle
                checked={form.isGithubPublic}
                onChange={(v) => setForm((c) => ({ ...c, isGithubPublic: v }))}
                title={tr("Show my GitHub", "إظهار حساب GitHub")}
                description={tr("Recommended for engineering profiles.", "موصى به لمن يعمل في البرمجة والهندسة.")}
              />
            </div>
          </Section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 text-sm disabled:opacity-60 sm:ml-auto">
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save size={14} />}
              {saving ? tr("Saving...", "جالس نحفظ...") : tr("Save Profile", "حفظ الملف")}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Profile completeness ─────────────────────────────────────────────────────
//
// Shows a thin progress bar with the % of optional fields the member has filled.
// Non-blocking — the goal is to nudge habituation, not gate functionality.
//
// We intentionally exclude email and position because those are admin-managed,
// and gender because some members prefer not to disclose. The remaining 7 fields
// are all members can edit and all add real value to the team page / project
// member cards.
const COMPLETENESS_FIELDS = [
  { key: "fullName" as const,      labelEn: "English name",  labelAr: "الاسم بالإنجليزية" },
  { key: "fullNameAr" as const,    labelEn: "Arabic name",   labelAr: "الاسم بالعربية" },
  { key: "phoneNumber" as const,   labelEn: "Phone",         labelAr: "رقم الجوال" },
  { key: "major" as const,         labelEn: "Major",         labelAr: "التخصص" },
  { key: "graduationYear" as const,labelEn: "Graduation year", labelAr: "سنة التخرج" },
  { key: "bio" as const,           labelEn: "Bio",           labelAr: "نبذة" },
  { key: "linkedinUrl" as const,   labelEn: "LinkedIn",      labelAr: "لينكدإن" },
];

function ProfileCompleteness({
  form,
  tr,
}: {
  form: { fullName: string; fullNameAr: string; phoneNumber: string; major: string; graduationYear: string; bio: string; linkedinUrl: string };
  tr: (en: string, ar: string) => string;
}) {
  const filled = COMPLETENESS_FIELDS.filter((field) => Boolean(form[field.key]?.trim?.()));
  const missing = COMPLETENESS_FIELDS.filter((field) => !form[field.key]?.trim?.());
  const pct = Math.round((filled.length / COMPLETENESS_FIELDS.length) * 100);
  const isComplete = pct === 100;

  return (
    <section className="panel-soft p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
          {tr("Profile completeness", "اكتمال الملف")}
        </p>
        <span className={`text-sm font-bold tabular-nums ${isComplete ? "text-emerald-400" : "text-foreground"}`}>
          {pct}%
        </span>
      </div>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-elevated"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={tr("Profile completeness", "اكتمال الملف")}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-400" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted leading-relaxed">
        {isComplete ? (
          tr(
            "Your profile is complete — teammates will see your full info on project cards and the public team page.",
            "ملفك مكتمل — زملاؤك يشوفون كامل بياناتك في بطاقات المشاريع وصفحة الفريق العامة.",
          )
        ) : (
          <>
            {tr("Add ", "أضف ")}
            <span className="text-foreground font-medium">
              {missing.slice(0, 3).map((m) => tr(m.labelEn, m.labelAr)).join(tr(", ", "، "))}
              {missing.length > 3 ? tr(`, and ${missing.length - 3} more`, ` و${missing.length - 3} غيرها`) : ""}
            </span>
            {tr(" to make your profile shine.", " لتكتمل ملفك.")}
          </>
        )}
      </p>
    </section>
  );
}
