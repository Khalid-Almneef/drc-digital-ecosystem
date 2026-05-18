"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";

interface DepartmentOption {
  departmentId: number;
  slug: string;
  name: string;
}

export interface EditableMember {
  memberId: number;
  fullName: string;
  fullNameAr?: string | null;
  email?: string;
  position?: string;
  departmentId?: number | null;
  bio?: string | null;
  major?: string | null;
  phoneNumber?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  avatarUrl?: string | null;
  graduationYear?: number | null;
  gender?: string | null;
  isActive?: boolean;
  profileStatus?: string | null;
  customRole?: string | null;
  customRoleAr?: string | null;
}

const POSITION_OPTIONS = [
  { value: "president",        en: "President",          ar: "الرئيس" },
  { value: "vice_president",   en: "Vice President",     ar: "نائب الرئيس" },
  { value: "dept_leader",      en: "Department Leader",  ar: "رئيس اللجنة" },
  { value: "dept_vice_leader", en: "Vice Leader",        ar: "نائب رئيس اللجنة" },
  { value: "sub_leader",       en: "Sub Leader",         ar: "مسؤول فرعي" },
  { value: "member",           en: "Member",             ar: "عضو" },
];

const STATUS_OPTIONS = [
  { value: "active",    en: "Active",    ar: "نشِط" },
  { value: "inactive",  en: "Inactive",  ar: "غير نشِط" },
  { value: "alumni",    en: "Alumni",    ar: "خريج" },
  { value: "suspended", en: "Suspended", ar: "مُعلَّق" },
];

/**
 * HR / club-admin member-edit modal. Mirrors the member-profile fields one
 * member can edit on themself, plus admin-only fields (dept, status, isActive,
 * position). Names (fullName / fullNameAr) are editable here — names are no
 * longer self-service-only.
 */
export function EditMemberModal({
  member,
  departments,
  onClose,
  onSaved,
}: {
  member: EditableMember;
  departments: DepartmentOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLang();
  const { isClubLeader } = useAuth();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [f, setF] = useState({
    fullName: member.fullName ?? "",
    fullNameAr: member.fullNameAr ?? "",
    bio: member.bio ?? "",
    major: member.major ?? "",
    phoneNumber: member.phoneNumber ?? "",
    linkedinUrl: member.linkedinUrl ?? "",
    githubUrl: member.githubUrl ?? "",
    avatarUrl: member.avatarUrl ?? "",
    graduationYear: member.graduationYear != null ? String(member.graduationYear) : "",
    gender: (member.gender as "male" | "female" | "") ?? "",
    customRole: member.customRole ?? "",
    customRoleAr: member.customRoleAr ?? "",
    position: (member.position as string) ?? "member",
    departmentId: member.departmentId != null ? String(member.departmentId) : "",
    status: (member.profileStatus as string) ?? "active",
    isActive: member.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  // Keep form in sync if a different member is opened in the same modal mount.
  useEffect(() => {
    setF({
      fullName: member.fullName ?? "",
      fullNameAr: member.fullNameAr ?? "",
      bio: member.bio ?? "",
      major: member.major ?? "",
      phoneNumber: member.phoneNumber ?? "",
      linkedinUrl: member.linkedinUrl ?? "",
      githubUrl: member.githubUrl ?? "",
      avatarUrl: member.avatarUrl ?? "",
      graduationYear: member.graduationYear != null ? String(member.graduationYear) : "",
      gender: (member.gender as "male" | "female" | "") ?? "",
      customRole: member.customRole ?? "",
      customRoleAr: member.customRoleAr ?? "",
      position: (member.position as string) ?? "member",
      departmentId: member.departmentId != null ? String(member.departmentId) : "",
      status: (member.profileStatus as string) ?? "active",
      isActive: member.isActive ?? true,
    });
  }, [member]);

  async function save() {
    if (!f.fullName.trim()) {
      toast.error(tr("Full name is required.", "الاسم الكامل مطلوب."));
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: f.fullName.trim(),
        fullNameAr: f.fullNameAr.trim() || "",
        bio: f.bio,
        major: f.major,
        phoneNumber: f.phoneNumber,
        linkedinUrl: f.linkedinUrl,
        githubUrl: f.githubUrl,
        avatarUrl: f.avatarUrl,
        customRole: f.customRole,
        customRoleAr: f.customRoleAr,
        graduationYear: f.graduationYear ? Number(f.graduationYear) : undefined,
        gender: f.gender || undefined,
        status: f.status,
        isActive: f.isActive,
        departmentId: f.departmentId === "" ? null : Number(f.departmentId),
      };
      if (isClubLeader) payload.position = f.position;
      await api.patch(`/api/members/${member.memberId}`, payload);
      toast.success(tr("Member updated", "تم تحديث العضو"));
      onSaved();
      onClose();
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setSaving(false);
    }
  }

  const fieldCls =
    "w-full rounded-[0.9rem] border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted/45 focus:border-primary/35 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors";
  const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[1.4rem] border border-border bg-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.38)]"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/40 rounded"
          aria-label={tr("Close", "إغلاق")}
        >
          <X size={18} />
        </button>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70">
          {tr("HR · Edit member", "الموارد البشرية · تعديل العضو")}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">
          {member.fullName}
          <span className="ms-2 text-xs font-normal text-muted">#{member.memberId}</span>
        </h2>
        {member.email && (
          <p className="mt-0.5 text-[11px] text-muted">{member.email}</p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
              {tr("Identity", "الهوية")}
            </p>
          </div>
          <div>
            <label className={labelCls}>{tr("Full name (English) *", "الاسم الكامل (إنجليزي) *")}</label>
            <input
              value={f.fullName}
              onChange={(e) => setF((p) => ({ ...p, fullName: e.target.value }))}
              className={fieldCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>{tr("Full name (Arabic)", "الاسم الكامل (عربي)")}</label>
            <input
              value={f.fullNameAr}
              onChange={(e) => setF((p) => ({ ...p, fullNameAr: e.target.value }))}
              className={fieldCls}
              dir="rtl"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{tr("Bio", "نبذة")}</label>
            <textarea
              value={f.bio}
              onChange={(e) => setF((p) => ({ ...p, bio: e.target.value }))}
              rows={2}
              className={`${fieldCls} resize-none`}
              placeholder={tr("Short bio shown on /team profile", "نبذة قصيرة تظهر على ملف /team")}
            />
          </div>

          <div className="sm:col-span-2 mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
              {tr("Affiliation", "الانتماء")}
            </p>
          </div>
          <div>
            <label className={labelCls}>{tr("Department", "اللجنة")}</label>
            <select
              value={f.departmentId}
              onChange={(e) => setF((p) => ({ ...p, departmentId: e.target.value }))}
              className={fieldCls}
            >
              <option value="">{tr("Club-wide", "كل النادي")}</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>
              {tr("Position", "المنصب")}
              {!isClubLeader && <span className="ms-1 text-[10px] font-normal normal-case text-muted">{tr("(admin only)", "(للمسؤولين فقط)")}</span>}
            </label>
            <select
              value={f.position}
              onChange={(e) => setF((p) => ({ ...p, position: e.target.value }))}
              disabled={!isClubLeader}
              className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {POSITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{tr(o.en, o.ar)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{tr("Custom role (English)", "المسمى المخصص (إنجليزي)")}</label>
            <input
              value={f.customRole}
              onChange={(e) => setF((p) => ({ ...p, customRole: e.target.value }))}
              className={fieldCls}
              placeholder={tr("e.g. Media Advisor", "مثال: مستشار الإعلام")}
            />
          </div>
          <div>
            <label className={labelCls}>{tr("Custom role (Arabic)", "المسمى المخصص (عربي)")}</label>
            <input
              value={f.customRoleAr}
              onChange={(e) => setF((p) => ({ ...p, customRoleAr: e.target.value }))}
              className={fieldCls}
              dir="rtl"
            />
          </div>

          <div className="sm:col-span-2 mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
              {tr("Profile details", "تفاصيل الملف")}
            </p>
          </div>
          <div>
            <label className={labelCls}>{tr("Major", "التخصص")}</label>
            <input
              value={f.major}
              onChange={(e) => setF((p) => ({ ...p, major: e.target.value }))}
              className={fieldCls}
              placeholder={tr("e.g. Computer Engineering", "مثال: هندسة الحاسب")}
            />
          </div>
          <div>
            <label className={labelCls}>{tr("Graduation year", "سنة التخرج")}</label>
            <input
              type="number"
              min="2000"
              max="2099"
              value={f.graduationYear}
              onChange={(e) => setF((p) => ({ ...p, graduationYear: e.target.value }))}
              className={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>{tr("Phone", "الجوال")}</label>
            <input
              value={f.phoneNumber}
              onChange={(e) => setF((p) => ({ ...p, phoneNumber: e.target.value }))}
              className={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>{tr("Gender", "الجنس")}</label>
            <select
              value={f.gender}
              onChange={(e) => setF((p) => ({ ...p, gender: e.target.value as "male" | "female" | "" }))}
              className={fieldCls}
            >
              <option value="">{tr("Unspecified", "غير محدد")}</option>
              <option value="male">{tr("Male", "ذكر")}</option>
              <option value="female">{tr("Female", "أنثى")}</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{tr("LinkedIn URL", "رابط LinkedIn")}</label>
            <input
              value={f.linkedinUrl}
              onChange={(e) => setF((p) => ({ ...p, linkedinUrl: e.target.value }))}
              className={fieldCls}
              placeholder="https://linkedin.com/in/…"
            />
          </div>
          <div>
            <label className={labelCls}>{tr("GitHub URL", "رابط GitHub")}</label>
            <input
              value={f.githubUrl}
              onChange={(e) => setF((p) => ({ ...p, githubUrl: e.target.value }))}
              className={fieldCls}
              placeholder="https://github.com/…"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{tr("Avatar URL", "رابط الصورة")}</label>
            <input
              value={f.avatarUrl}
              onChange={(e) => setF((p) => ({ ...p, avatarUrl: e.target.value }))}
              className={fieldCls}
              placeholder="/uploads/…"
            />
          </div>

          <div className="sm:col-span-2 mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
              {tr("Membership state", "حالة العضوية")}
            </p>
          </div>
          <div>
            <label className={labelCls}>{tr("Status", "الحالة")}</label>
            <select
              value={f.status}
              onChange={(e) => setF((p) => ({ ...p, status: e.target.value }))}
              className={fieldCls}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{tr(o.en, o.ar)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{tr("Active account", "حساب نشِط")}</label>
            <label className="inline-flex items-center gap-2 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={f.isActive}
                onChange={(e) => setF((p) => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">
                {f.isActive ? tr("Active", "نشِط") : tr("Inactive", "غير نشِط")}
              </span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-secondary px-4 py-2 text-sm flex-1 disabled:opacity-60"
          >
            {tr("Cancel", "إلغاء")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !f.fullName.trim()}
            className="btn-primary px-4 py-2 text-sm flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {tr("Save changes", "حفظ التغييرات")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
