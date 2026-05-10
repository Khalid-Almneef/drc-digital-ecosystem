"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Pencil, Plus, Trash2, X, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";

interface AlumniRow {
  memberId: number;
  fullName: string;
  fullNameAr: string | null;
  email: string;
  bio: string | null;
  major: string | null;
  phoneNumber: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  graduationYear: number | null;
  departmentSlug: string | null;
  departmentName: string;
  position: string;
  profileStatus: string;
  isActive: boolean;
}

interface ActiveMemberRow extends AlumniRow {}

export function AlumniManager({ tr }: { tr: (en: string, ar: string) => string }) {
  const [members, setMembers] = useState<AlumniRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AlumniRow | null>(null);
  const [adding, setAdding] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const data = await api.get<AlumniRow[]>("/api/members?scope=admin");
      setMembers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const alumni = useMemo(
    () => members.filter((m) => m.profileStatus === "alumni").sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [members],
  );

  async function softDelete(id: number, name: string) {
    if (!window.confirm(tr(`Remove "${name}" from alumni? They will no longer show on the public site.`, `إزالة "${name}" من الخريجين؟ لن يظهر/تظهر بعد ذلك في الموقع العام.`))) return;
    try {
      await api.delete(`/api/members/${id}`);
      toast.success(tr("Removed", "تمت الإزالة"));
      void reload();
    } catch {
      toast.error(tr("Could not remove", "تعذّرت الإزالة"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
            {tr("Alumni", "الخريجون")}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {tr(
              "Edit alumni profiles, add LinkedIn and bio details, and convert former members to alumni.",
              "حرّر ملفات الخريجين، أضف لينكدإن والسيرة، وحوّل الأعضاء السابقين إلى خريجين.",
            )}
          </p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs">
          <Plus size={12} />
          {tr("Add Alumni", "إضافة خريج")}
        </button>
      </div>

      {loading ? (
        <div className="glass-card flex min-h-[180px] items-center justify-center">
          <Loader2 className="animate-spin text-muted" />
        </div>
      ) : alumni.length === 0 ? (
        <div className="glass-card p-6 text-center text-sm text-muted">
          {tr("No alumni yet. Click 'Add Alumni' to start.", "لا يوجد خريجون بعد. اضغط 'إضافة خريج' للبدء.")}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {alumni.map((a) => (
            <div key={a.memberId} className="glass-card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{a.fullName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted">{a.departmentName}</p>
                  {a.graduationYear && <p className="mt-1 text-[11px] text-muted">{tr("Class of", "دفعة")} {a.graduationYear}</p>}
                </div>
                <GraduationCap size={16} className="shrink-0 text-primary/70" />
              </div>
              {a.bio && <p className="line-clamp-3 text-xs leading-5 text-muted">{a.bio}</p>}
              <div className="flex items-center gap-2 pt-1 text-[11px] text-muted">
                {a.linkedinUrl && <a href={a.linkedinUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">LinkedIn</a>}
                {a.githubUrl && <a href={a.githubUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">GitHub</a>}
              </div>
              <div className="flex items-center gap-1 border-t border-border/60 pt-2">
                <button onClick={() => setEditing(a)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-elevated hover:text-foreground">
                  <Pencil size={11} /> {tr("Edit", "تعديل")}
                </button>
                <button onClick={() => void softDelete(a.memberId, a.fullName)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-error/10 hover:text-error">
                  <Trash2 size={11} /> {tr("Remove", "إزالة")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <EditAlumniModal
            tr={tr}
            row={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); void reload(); }}
          />
        )}
        {adding && (
          <AddAlumniModal
            tr={tr}
            members={members.filter((m) => m.profileStatus !== "alumni" && m.isActive)}
            onClose={() => setAdding(false)}
            onSaved={() => { setAdding(false); void reload(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EditAlumniModal({
  tr,
  row,
  onClose,
  onSaved,
}: {
  tr: (en: string, ar: string) => string;
  row: AlumniRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    fullName: row.fullName ?? "",
    fullNameAr: row.fullNameAr ?? "",
    bio: row.bio ?? "",
    major: row.major ?? "",
    graduationYear: row.graduationYear?.toString() ?? "",
    linkedinUrl: row.linkedinUrl ?? "",
    githubUrl: row.githubUrl ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!f.fullName.trim()) {
      toast.error(tr("Full name is required.", "الاسم الكامل مطلوب."));
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/api/members/${row.memberId}`, {
        fullName: f.fullName.trim(),
        fullNameAr: f.fullNameAr.trim() || null,
        bio: f.bio.trim() || null,
        major: f.major.trim() || null,
        graduationYear: f.graduationYear ? Number(f.graduationYear) : null,
        linkedinUrl: f.linkedinUrl.trim() || null,
        githubUrl: f.githubUrl.trim() || null,
      });
      toast.success(tr("Alumni updated", "تم تحديث الخريج"));
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : tr("Could not save", "تعذّر الحفظ"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={tr("Edit Alumni", "تعديل خريج")} onClose={onClose}>
      <FormFields tr={tr} f={f} setF={setF} />
      <ModalActions tr={tr} saving={saving} onClose={onClose} onSave={save} />
    </Modal>
  );
}

function AddAlumniModal({
  tr,
  members,
  onClose,
  onSaved,
}: {
  tr: (en: string, ar: string) => string;
  members: ActiveMemberRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"convert" | "new">("convert");
  const [pickedMemberId, setPickedMemberId] = useState<string>("");
  const [search, setSearch] = useState("");

  // For new alumni
  const [newF, setNewF] = useState({
    email: "",
    fullName: "",
    fullNameAr: "",
    departmentSlug: "innovation",
    bio: "",
    major: "",
    graduationYear: "",
    linkedinUrl: "",
    githubUrl: "",
  });
  // For convert mode: the editable fields applied after conversion
  const [convertF, setConvertF] = useState({
    fullName: "",
    fullNameAr: "",
    bio: "",
    major: "",
    graduationYear: "",
    linkedinUrl: "",
    githubUrl: "",
  });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members.slice(0, 50);
    return members
      .filter((m) => m.fullName.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q))
      .slice(0, 50);
  }, [members, search]);

  function pickMember(id: number) {
    const m = members.find((x) => x.memberId === id);
    if (!m) return;
    setPickedMemberId(String(id));
    setConvertF({
      fullName: m.fullName ?? "",
      fullNameAr: m.fullNameAr ?? "",
      bio: m.bio ?? "",
      major: m.major ?? "",
      graduationYear: m.graduationYear?.toString() ?? "",
      linkedinUrl: m.linkedinUrl ?? "",
      githubUrl: m.githubUrl ?? "",
    });
  }

  async function save() {
    setSaving(true);
    try {
      if (mode === "convert") {
        if (!pickedMemberId) {
          toast.error(tr("Pick a member to convert.", "اختر عضواً للتحويل."));
          return;
        }
        // Update fields + status
        await api.patch(`/api/members/${pickedMemberId}`, {
          fullName: convertF.fullName.trim() || undefined,
          fullNameAr: convertF.fullNameAr.trim() || null,
          bio: convertF.bio.trim() || null,
          major: convertF.major.trim() || null,
          graduationYear: convertF.graduationYear ? Number(convertF.graduationYear) : null,
          linkedinUrl: convertF.linkedinUrl.trim() || null,
          githubUrl: convertF.githubUrl.trim() || null,
          status: "alumni",
        });
        toast.success(tr("Member converted to alumni", "تم تحويل العضو إلى خريج"));
      } else {
        if (!newF.email.trim() || !newF.fullName.trim()) {
          toast.error(tr("Email and full name are required.", "البريد والاسم الكامل مطلوبان."));
          return;
        }
        // Register new member, then patch profile + status
        const created = await api.post<{ memberId: number }>("/api/members/register", {
          email: newF.email.trim().toLowerCase(),
          fullName: newF.fullName.trim(),
          fullNameAr: newF.fullNameAr.trim() || undefined,
          departmentSlug: newF.departmentSlug,
          position: "member",
        });
        await api.patch(`/api/members/${created.memberId}`, {
          bio: newF.bio.trim() || null,
          major: newF.major.trim() || null,
          graduationYear: newF.graduationYear ? Number(newF.graduationYear) : null,
          linkedinUrl: newF.linkedinUrl.trim() || null,
          githubUrl: newF.githubUrl.trim() || null,
          status: "alumni",
        });
        toast.success(tr("Alumni created", "تم إنشاء الخريج"));
      }
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : tr("Could not save", "تعذّر الحفظ"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={tr("Add Alumni", "إضافة خريج")} onClose={onClose}>
      <div className="mb-4 flex gap-2 rounded-xl bg-surface-elevated p-1">
        <button
          onClick={() => setMode("convert")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${mode === "convert" ? "bg-primary text-white" : "text-muted hover:text-foreground"}`}
        >
          {tr("Convert existing member", "تحويل عضو موجود")}
        </button>
        <button
          onClick={() => setMode("new")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${mode === "new" ? "bg-primary text-white" : "text-muted hover:text-foreground"}`}
        >
          {tr("Add brand-new alumni", "إضافة خريج جديد كلياً")}
        </button>
      </div>

      {mode === "convert" ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Find member", "ابحث عن عضو")}</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dashboard-field"
              placeholder={tr("Type name or email…", "اكتب الاسم أو البريد…")}
            />
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border bg-surface-elevated/30">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted">{tr("No matches.", "لا نتائج.")}</p>
              ) : (
                filtered.map((m) => (
                  <button
                    key={m.memberId}
                    onClick={() => pickMember(m.memberId)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-border/40 px-3 py-2 text-left last:border-b-0 hover:bg-surface-elevated ${pickedMemberId === String(m.memberId) ? "bg-primary/10" : ""}`}
                  >
                    <span className="text-sm text-foreground">{m.fullName}</span>
                    <span className="text-[11px] text-muted">{m.departmentName}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          {pickedMemberId && (
            <FormFields tr={tr} f={convertF} setF={setConvertF} />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Email *", "البريد *")}</label>
              <input value={newF.email} onChange={(e) => setNewF((p) => ({ ...p, email: e.target.value }))} className="dashboard-field" placeholder="alumni@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Department", "القسم")}</label>
              <select value={newF.departmentSlug} onChange={(e) => setNewF((p) => ({ ...p, departmentSlug: e.target.value }))} className="dashboard-select">
                {["innovation", "development", "media", "pr", "hr", "finance", "logistics", "madarat", "executive"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <FormFields
            tr={tr}
            f={{ fullName: newF.fullName, fullNameAr: newF.fullNameAr, bio: newF.bio, major: newF.major, graduationYear: newF.graduationYear, linkedinUrl: newF.linkedinUrl, githubUrl: newF.githubUrl }}
            setF={(updater) => setNewF((prev) => ({ ...prev, ...(typeof updater === "function" ? updater({ fullName: prev.fullName, fullNameAr: prev.fullNameAr, bio: prev.bio, major: prev.major, graduationYear: prev.graduationYear, linkedinUrl: prev.linkedinUrl, githubUrl: prev.githubUrl }) : updater) }))}
          />
        </div>
      )}

      <ModalActions tr={tr} saving={saving} onClose={onClose} onSave={save} />
    </Modal>
  );
}

interface AlumniFormFields {
  fullName: string;
  fullNameAr: string;
  bio: string;
  major: string;
  graduationYear: string;
  linkedinUrl: string;
  githubUrl: string;
}

function FormFields({
  tr,
  f,
  setF,
}: {
  tr: (en: string, ar: string) => string;
  f: AlumniFormFields;
  setF: (updater: AlumniFormFields | ((prev: AlumniFormFields) => AlumniFormFields)) => void;
}) {
  function update(field: keyof AlumniFormFields, value: string) {
    setF((prev) => ({ ...prev, [field]: value }));
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Full Name *", "الاسم الكامل *")}</label>
        <input value={f.fullName} onChange={(e) => update("fullName", e.target.value)} className="dashboard-field" />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Full Name (AR)", "الاسم بالعربي")}</label>
        <input value={f.fullNameAr} onChange={(e) => update("fullNameAr", e.target.value)} className="dashboard-field" dir="rtl" />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Biography", "السيرة الذاتية")}</label>
        <textarea value={f.bio} onChange={(e) => update("bio", e.target.value)} rows={3} className="dashboard-field resize-none" placeholder={tr("Where they work, what they do, awards, etc.", "أين يعمل، ماذا يفعل، الجوائز، إلخ.")} />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Major", "التخصص")}</label>
        <input value={f.major} onChange={(e) => update("major", e.target.value)} className="dashboard-field" placeholder={tr("e.g. Computer Engineering", "مثل: هندسة الحاسب")} />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Graduation Year", "سنة التخرج")}</label>
        <input type="number" min="2000" max="2099" value={f.graduationYear} onChange={(e) => update("graduationYear", e.target.value)} className="dashboard-field" placeholder="2025" />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("LinkedIn URL", "رابط لينكدإن")}</label>
        <input type="url" value={f.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} className="dashboard-field" placeholder="https://linkedin.com/in/…" />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("GitHub URL", "رابط GitHub")}</label>
        <input type="url" value={f.githubUrl} onChange={(e) => update("githubUrl", e.target.value)} className="dashboard-field" placeholder="https://github.com/…" />
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-surface p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-elevated hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalActions({
  tr,
  saving,
  onClose,
  onSave,
}: {
  tr: (en: string, ar: string) => string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onClose} className="btn-secondary px-4 py-2 text-xs">{tr("Cancel", "إلغاء")}</button>
      <button onClick={onSave} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs">
        {saving && <Loader2 size={12} className="animate-spin" />}
        {tr("Save", "حفظ")}
      </button>
    </div>
  );
}
