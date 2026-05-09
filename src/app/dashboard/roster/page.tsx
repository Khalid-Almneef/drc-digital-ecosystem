"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/hooks/useApi";
import { api } from "@/lib/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { firstAndLastName } from "@/lib/format-name";

/**
 * Roster Manager — president/VP-only.
 *
 * Lets admins reshape the team without touching SQL: change a member's
 * position, department, custom role label, and active/alumni status.
 * Designed so each new semester the structure can be redrawn without
 * a code or migration change.
 */

type Position = "president" | "vice_president" | "dept_leader" | "dept_vice_leader" | "sub_leader" | "member";
type ProfileStatus = "active" | "inactive" | "alumni" | "suspended";

interface Department {
  id: number;
  slug: string;
  name: string;
  nameAr: string;
}

interface RosterMember {
  memberId: number;
  email: string;
  position: Position;
  isActive: boolean;
  departmentSlug: string | null;
  departmentName: string | null;
  fullName: string;
  fullNameAr: string | null;
  customRole?: string | null;
  customRoleAr?: string | null;
  profileStatus: ProfileStatus;
}

const POSITION_OPTIONS: { value: Position; label: string; labelAr: string }[] = [
  { value: "president",        label: "President",         labelAr: "رئيس النادي" },
  { value: "vice_president",   label: "Vice President",    labelAr: "نائب الرئيس" },
  { value: "dept_leader",      label: "Department Lead",   labelAr: "قائد لجنة" },
  { value: "dept_vice_leader", label: "Vice Lead",         labelAr: "نائب القائد" },
  { value: "sub_leader",       label: "Sub-leader",        labelAr: "قائد فرعي" },
  { value: "member",           label: "Member",            labelAr: "عضو" },
];

const STATUS_OPTIONS: { value: ProfileStatus; label: string; labelAr: string }[] = [
  { value: "active",    label: "Active",    labelAr: "نشط" },
  { value: "alumni",    label: "Alumni",    labelAr: "خريج" },
  { value: "inactive",  label: "Inactive",  labelAr: "غير نشط" },
  { value: "suspended", label: "Suspended", labelAr: "موقوف" },
];

export default function RosterManagerPage() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const { user } = useAuth();
  const isAdmin = user?.position === "president" || user?.position === "vice_president";

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProfileStatus>("active");
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: members = [], mutate: refresh, isLoading } = useApi<RosterMember[]>("/api/members?scope=admin");
  const { data: depts = [] } = useApi<Department[]>("/api/departments");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (deptFilter !== "all" && m.departmentSlug !== deptFilter) return false;
      if (statusFilter !== "all" && m.profileStatus !== statusFilter) return false;
      if (!q) return true;
      const haystack = `${m.fullName} ${m.fullNameAr ?? ""} ${m.email} ${m.customRole ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [members, search, deptFilter, statusFilter]);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <DashboardHeader title={tr("Roster Manager", "إدارة الفريق")} description={tr("Admin only.", "للإدارة فقط.")} />
        <p className="glass-card p-6 text-sm text-muted">
          {tr("Only the president or vice president can edit the roster.", "فقط الرئيس أو نائب الرئيس يمكنه تعديل الفريق.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={tr("Roster Manager", "إدارة الفريق")}
        description={tr(
          "Change positions, departments, custom role labels, and member status. Updates apply to the public team page immediately.",
          "غيّر المناصب واللجان والأدوار وحالة الأعضاء. تظهر التحديثات على صفحة الفريق العامة فورًا.",
        )}
      />

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {tr("Search", "بحث")}
          </label>
          <div className="relative">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr("Name, email, or role…", "اسم أو بريد أو دور…")}
              className="w-full rounded-2xl border border-border bg-surface-elevated ps-9 pe-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {tr("Department", "اللجنة")}
          </label>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
          >
            <option value="all">{tr("All", "الكل")}</option>
            {depts.map((d) => (
              <option key={d.slug} value={d.slug}>
                {lang === "ar" ? d.nameAr : d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {tr("Status", "الحالة")}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
          >
            <option value="all">{tr("All", "الكل")}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{lang === "ar" ? s.labelAr : s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="glass-card p-6 text-sm text-muted">{tr("Loading…", "جاري التحميل…")}</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_140px_140px_100px] items-center gap-3 border-b border-border bg-surface-elevated/40 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            <span>{tr("Member", "العضو")}</span>
            <span>{tr("Position", "المنصب")}</span>
            <span>{tr("Department", "اللجنة")}</span>
            <span>{tr("Custom role", "الدور المخصص")}</span>
            <span className="text-end">{tr("Action", "إجراء")}</span>
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">{tr("No members match the filters.", "لا يوجد أعضاء يطابقون التصفية.")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((m) => {
                const positionLabel = POSITION_OPTIONS.find((p) => p.value === m.position);
                return (
                  <li
                    key={m.memberId}
                    className="grid grid-cols-[1fr_120px_140px_140px_100px] items-center gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{firstAndLastName(m.fullName)}</p>
                      <p className="truncate text-xs text-muted">{m.email}</p>
                    </div>
                    <span className="text-xs text-foreground">{lang === "ar" ? positionLabel?.labelAr : positionLabel?.label}</span>
                    <span className="text-xs text-foreground">{m.departmentName ?? "—"}</span>
                    <span className="truncate text-xs text-muted">{(lang === "ar" ? m.customRoleAr : m.customRole) ?? "—"}</span>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingId(m.memberId)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil size={12} />
                        {tr("Edit", "تعديل")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {editingId !== null && (
        <EditMemberModal
          memberId={editingId}
          departments={depts}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Edit modal ────────────────────────────────────────────────────────────

interface FullMember extends RosterMember {
  departmentId: number | null;
}

function EditMemberModal({
  memberId,
  departments,
  onClose,
  onSaved,
}: {
  memberId: number;
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [member, setMember] = useState<FullMember | null>(null);
  const [position, setPosition] = useState<Position>("member");
  const [departmentId, setDepartmentId] = useState<number | "none">("none");
  const [customRole, setCustomRole] = useState("");
  const [customRoleAr, setCustomRoleAr] = useState("");
  const [status, setStatus] = useState<ProfileStatus>("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<FullMember>(`/api/members/${memberId}`)
      .then((data) => {
        setMember(data);
        setPosition(data.position);
        setDepartmentId(data.departmentId ?? "none");
        setCustomRole(data.customRole ?? "");
        setCustomRoleAr(data.customRoleAr ?? "");
        setStatus(data.profileStatus);
      })
      .catch((e) => toast.error((e as Error).message ?? "Load failed"))
      .finally(() => setLoading(false));
  }, [memberId]);

  async function save() {
    if (!member) return;
    setSaving(true);
    try {
      // Position + department go through the dedicated /role endpoint so
      // the user_position type cast and audit pathway stays consistent.
      const deptIdValue = departmentId === "none" ? null : Number(departmentId);
      await api.patch(`/api/members/${memberId}/role`, {
        position,
        departmentId: deptIdValue,
      });
      // Profile fields (custom role labels, status) go through the main
      // PATCH endpoint.
      await api.patch(`/api/members/${memberId}`, {
        customRole: customRole.trim(),
        customRoleAr: customRoleAr.trim(),
        status,
      });
      toast.success(tr("Saved.", "تم الحفظ."));
      onSaved();
    } catch (e) {
      toast.error((e as Error).message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{tr("Edit Member", "تعديل عضو")}</h3>
            {member && (
              <p className="mt-1 text-sm text-muted">
                {firstAndLastName(member.fullName)} · {member.email}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label={tr("Close", "إغلاق")} className="text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">{tr("Loading…", "جاري التحميل…")}</p>
        ) : !member ? (
          <p className="text-sm text-error">{tr("Member not found.", "العضو غير موجود.")}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                {tr("Position", "المنصب")}
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
                className="w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
              >
                {POSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {lang === "ar" ? o.labelAr : o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                {tr("Department", "اللجنة")}
              </label>
              <select
                value={String(departmentId)}
                onChange={(e) => setDepartmentId(e.target.value === "none" ? "none" : Number(e.target.value))}
                className="w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
              >
                <option value="none">{tr("Unassigned (club-wide)", "بدون لجنة")}</option>
                {departments.map((d) => (
                  <option key={d.slug} value={d.id}>
                    {lang === "ar" ? d.nameAr : d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {tr("Custom role (English)", "الدور المخصص (إنجليزي)")}
                </label>
                <input
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder={tr("e.g. Quality & Assurance Lead", "مثال: قائد الجودة")}
                  className="w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {tr("Custom role (Arabic)", "الدور المخصص (عربي)")}
                </label>
                <input
                  value={customRoleAr}
                  onChange={(e) => setCustomRoleAr(e.target.value)}
                  placeholder="مثال: قائد الجودة"
                  dir="rtl"
                  className="w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
                />
              </div>
            </div>
            <p className="-mt-2 text-[11px] text-muted/70">
              {tr(
                "Leave blank to use the position label automatically.",
                "اتركه فارغًا لاستخدام مسمى المنصب الافتراضي.",
              )}
            </p>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                {tr("Status", "الحالة")}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProfileStatus)}
                className="w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {lang === "ar" ? o.labelAr : o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted/70">
                {tr(
                  "Mark someone as Alumni when they leave the club — they keep their profile but stop appearing on the leadership view.",
                  "ضع العضو كخريج عند مغادرته النادي — يحتفظ بملفه ويختفي من قسم القيادة.",
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border bg-surface-elevated px-4 py-2 text-sm text-foreground hover:border-primary/30"
              >
                {tr("Cancel", "إلغاء")}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {tr("Save changes", "حفظ التعديلات")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
