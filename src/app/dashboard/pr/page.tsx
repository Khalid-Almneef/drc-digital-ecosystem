"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Calendar,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Handshake,
  Megaphone,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BulkUploadCard } from "@/components/dashboard/BulkUploadCard";
import { LeaderTaskReviewPanel } from "@/components/dashboard/LeaderTaskReviewPanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { useApi } from "@/lib/hooks/useApi";

interface PRPromoEvent {
  eventId: number;
  title: string;
  description: string | null;
  type: "workshop" | "competition" | "meetup" | "general";
  category: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
  seatsAvailable: number | null;
  isPublished: boolean;
  imageUrl: string | null;
  createdBy: number | null;
  createdAt: string;
}

type SponsorStatus = "wanting_to_contact" | "contacted" | "in_process" | "valid" | "failed";
type SponsorTier = "platinum" | "gold" | "silver" | "bronze";

interface SponsorRow {
  sponsorId: number;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  tier: SponsorTier;
  amount: number | string | null;
  currency: string;
  status: SponsorStatus;
  contactName: string | null;
  contactEmail: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  notes: string | null;
  nextAction: string | null;
  lastContactedAt: string | null;
  proposalTitle: string | null;
  proposalBody: string | null;
  proposalPdfUrl: string | null;
  proposalUpdatedAt: string | null;
}

type SponsorForm = {
  name: string;
  websiteUrl: string;
  tier: SponsorTier;
  amount: string;
  currency: string;
  status: SponsorStatus;
  contactName: string;
  contactEmail: string;
  notes: string;
  nextAction: string;
  lastContactedAt: string;
  proposalTitle: string;
  proposalBody: string;
  proposalPdfUrl: string;
};

const emptyForm: SponsorForm = {
  name: "",
  websiteUrl: "",
  tier: "bronze",
  amount: "",
  currency: "SAR",
  status: "wanting_to_contact",
  contactName: "",
  contactEmail: "",
  notes: "",
  nextAction: "",
  lastContactedAt: "",
  proposalTitle: "",
  proposalBody: "",
  proposalPdfUrl: "",
};

const statusOptions: { value: SponsorStatus; label: string; className: string }[] = [
  { value: "wanting_to_contact", label: "Wanting to contact", className: "badge badge-warning" },
  { value: "contacted", label: "Contacted", className: "badge badge-info" },
  { value: "in_process", label: "In process", className: "badge bg-primary/15 text-primary border border-primary/20" },
  { value: "valid", label: "Valid", className: "badge badge-success" },
  { value: "failed", label: "Failed", className: "badge badge-error" },
];

const tierColors: Record<SponsorTier, string> = {
  platinum: "text-purple-300 bg-purple-400/10 border-purple-400/20",
  gold: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  silver: "text-gray-300 bg-gray-400/10 border-gray-400/20",
  bronze: "text-orange-300 bg-orange-400/10 border-orange-400/20",
};


function statusMeta(status: SponsorStatus) {
  return statusOptions.find((option) => option.value === status) ?? statusOptions[0];
}

function formFromSponsor(sponsor: SponsorRow): SponsorForm {
  return {
    name: sponsor.name,
    websiteUrl: sponsor.websiteUrl ?? "",
    tier: sponsor.tier,
    amount: sponsor.amount == null ? "" : String(sponsor.amount),
    currency: sponsor.currency || "SAR",
    status: sponsor.status,
    contactName: sponsor.contactName ?? "",
    contactEmail: sponsor.contactEmail ?? "",
    notes: sponsor.notes ?? "",
    nextAction: sponsor.nextAction ?? "",
    lastContactedAt: sponsor.lastContactedAt?.slice(0, 10) ?? "",
    proposalTitle: sponsor.proposalTitle ?? "",
    proposalBody: sponsor.proposalBody ?? "",
    proposalPdfUrl: sponsor.proposalPdfUrl ?? "",
  };
}

function payloadFromForm(form: SponsorForm) {
  return {
    name: form.name.trim(),
    websiteUrl: form.websiteUrl.trim() || null,
    tier: form.tier,
    amount: form.amount ? Number(form.amount) : null,
    currency: form.currency.trim() || "SAR",
    status: form.status,
    contactName: form.contactName.trim() || null,
    contactEmail: form.contactEmail.trim() || null,
    notes: form.notes.trim() || null,
    nextAction: form.nextAction.trim() || null,
    lastContactedAt: form.lastContactedAt || null,
    proposalTitle: form.proposalTitle.trim() || null,
    proposalBody: form.proposalBody.trim() || null,
    proposalPdfUrl: form.proposalPdfUrl.trim() || null,
  };
}

function formatMoney(amount: SponsorRow["amount"], currency: string) {
  if (amount == null || amount === "") return "Open value";
  const value = Number(amount);
  if (Number.isNaN(value)) return `${amount} ${currency}`;
  return `${value.toLocaleString()} ${currency}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exportProposalPdf(sponsor: SponsorRow) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;
  const title = sponsor.proposalTitle || `${sponsor.name} Sponsorship Proposal`;
  const body = sponsor.proposalBody || "Proposal draft pending.";
  popup.document.write(`<!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 48px; line-height: 1.55; }
          .meta { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
          h1 { font-size: 32px; margin: 8px 0 24px; }
          h2 { font-size: 16px; margin-top: 28px; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
          .box { border: 1px solid #d1d5db; border-radius: 10px; padding: 14px; }
          .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
          .value { font-weight: 700; margin-top: 4px; }
          pre { white-space: pre-wrap; font: inherit; }
        </style>
      </head>
      <body>
        <div class="meta">Drone and Robotics Club</div>
        <h1>${escapeHtml(title)}</h1>
        <div class="grid">
          <div class="box"><div class="label">Sponsor</div><div class="value">${escapeHtml(sponsor.name)}</div></div>
          <div class="box"><div class="label">Tier</div><div class="value">${escapeHtml(sponsor.tier)}</div></div>
          <div class="box"><div class="label">Value</div><div class="value">${escapeHtml(formatMoney(sponsor.amount, sponsor.currency))}</div></div>
          <div class="box"><div class="label">Contact</div><div class="value">${escapeHtml(sponsor.contactEmail || sponsor.contactName || "Pending")}</div></div>
        </div>
        <h2>Proposal</h2>
        <pre>${escapeHtml(body)}</pre>
      </body>
    </html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

export default function PRDashboard() {
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState<"sponsors" | "promotions" | "visitIdeas" | "tasks">("sponsors");
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const { data: prEvents = [], isLoading: eventsLoading, mutate: refreshEvents } = useApi<PRPromoEvent[]>("/api/events");
  // Top-level fetch so Pipeline/Visit Ideas can show a pending-count badge
  // without the leader having to click in. Same endpoint VisitIdeasInbox uses.
  const { data: visitInbox = [] } = useApi<{ status: string }[]>("/api/service-requests?scope=inbox&requestType=company_visit&targetDepartment=pr");
  const pendingVisitCount = visitInbox.filter((r) => r.status === "pending").length;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<SponsorForm>(emptyForm);
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const metrics = useMemo(() => {
    const valid = sponsors.filter((sponsor) => sponsor.status === "valid");
    return {
      potential: sponsors.filter((sponsor) => sponsor.status === "wanting_to_contact").length,
      inProcess: sponsors.filter((sponsor) => sponsor.status === "in_process").length,
      valid: valid.length,
      validAmount: valid.reduce((sum, sponsor) => sum + (Number(sponsor.amount) || 0), 0),
    };
  }, [sponsors]);

  async function loadSponsors() {
    setLoading(true);
    try {
      const res = await fetch("/api/sponsors", { cache: "no-store" });
      if (res.ok) {
        const body = await res.json();
        const arr = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        setSponsors(arr);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSponsors();
  }, []);

  function startNewSponsor() {
    setEditingId("new");
    setForm({ ...emptyForm, proposalTitle: "DRC Sponsorship Proposal" });
  }

  function startEditSponsor(sponsor: SponsorRow) {
    setEditingId(sponsor.sponsorId);
    setForm(formFromSponsor(sponsor));
  }

  async function saveSponsor(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const isNew = editingId === "new";
      const res = await fetch(isNew ? "/api/sponsors" : `/api/sponsors/${editingId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm(form)),
      });
      if (res.ok) {
        setEditingId(null);
        setForm(emptyForm);
        await loadSponsors();
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateSponsor(id: number, patch: Partial<SponsorForm> | Partial<SponsorRow>) {
    const res = await fetch(`/api/sponsors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) await loadSponsors();
  }

  async function deleteSponsor(id: number) {
    const msg = lang === "ar"
      ? "هل تريد حذف هذا الراعي؟ لا يمكن التراجع."
      : "Delete this sponsor? This cannot be undone.";
    if (!window.confirm(msg)) return;
    const res = await fetch(`/api/sponsors/${id}`, { method: "DELETE" });
    if (res.ok) await loadSponsors();
  }

  async function importProposalPdf(sponsor: SponsorRow, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingId(sponsor.sponsorId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("label", `${sponsor.name} proposal PDF`);
      const upload = await fetch("/api/upload", { method: "POST", body: formData });
      if (!upload.ok) return;
      const data = await upload.json();
      await updateSponsor(sponsor.sponsorId, { proposalPdfUrl: data.url });
    } finally {
      setUploadingId(null);
      event.target.value = "";
    }
  }

  return (
    <div>
      <DashboardHeader
        title={tr("Public Relations", "العلاقات العامة")}
        description={tr("Sponsorships, outreach, partnerships, and event promotion.", "الرعايات، التواصل، الشراكات، والترويج للفعاليات.")}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard icon={Handshake} label={tr("Potential Sponsors", "رعاة محتملون")} value={metrics.potential}     onClick={() => setActiveTab("sponsors")} />
        <StatCard icon={Megaphone} label={tr("In Process", "قيد المتابعة")}        value={metrics.inProcess}     onClick={() => setActiveTab("sponsors")} />
        <StatCard icon={DollarSign} label={tr("Valid Sponsorship", "الرعاية المعتمدة")} value={`${metrics.validAmount.toLocaleString()} SAR`} onClick={() => setActiveTab("sponsors")} />
        <StatCard icon={Calendar} label={tr("PR Events", "فعاليات العلاقات")} value={eventsLoading ? "…" : prEvents.length} onClick={() => setActiveTab("promotions")} />
      </div>

      {/* Bulk-import past partner events / activations + sponsors */}
      <div className="mb-8 grid gap-4 xl:grid-cols-2">
        <BulkUploadCard
          title="Bulk-import past PR events"
          titleAr="استيراد فعاليات العلاقات العامة بالجملة"
          description="Migrate historical campaigns, partner events, or company visits in one CSV. Imports are saved as drafts and need media-team approval to go live. After upload, find them under the Promotions tab."
          descriptionAr="انقل الحملات السابقة وفعاليات الشركاء والزيارات بملف CSV واحد. الاستيراد يُحفظ كمسودات وينشر فقط بعد موافقة فريق الإعلام. بعد الرفع تجدها تحت تبويب الترويج."
          templateUrl="/api/events/bulk/template"
          uploadUrl="/api/events/bulk"
          templateFilename="pr-events-template.csv"
          onComplete={() => { void refreshEvents(); setActiveTab("promotions"); }}
        />
        <BulkUploadCard
          title="Bulk-import sponsors"
          titleAr="استيراد الرعاة بالجملة"
          description="Add many sponsors at once from a CSV. Same fields as the single-sponsor form (tier, status, contact info, proposal). Existing sponsor names are not deduplicated — review before uploading."
          descriptionAr="أضف عددًا من الرعاة دفعة واحدة عبر ملف CSV. نفس حقول إضافة راعٍ واحد (الفئة، الحالة، بيانات التواصل، العرض). لا يتم تجاهل الأسماء المكرّرة — راجع الملف قبل الرفع."
          templateUrl="/api/sponsors/bulk/template"
          uploadUrl="/api/sponsors/bulk"
          templateFilename="sponsors-bulk-template.csv"
          onComplete={() => { void loadSponsors(); setActiveTab("sponsors"); }}
        />
      </div>

      {(() => {
        const TAB_LABELS = {
          sponsors: tr("Sponsors", "الرعاة"),
          promotions: tr("Promotions", "الترويج"),
          visitIdeas: tr("Visit Ideas", "أفكار الزيارات"),
          tasks: tr("Task Review", "مراجعة المهام"),
        } as const;
        const GROUPS = {
          pipeline: { label: tr("Pipeline", "السلسلة"), tabs: ["sponsors", "promotions", "visitIdeas"] as const },
          tasks: { label: tr("Tasks", "المهام"), tabs: ["tasks"] as const },
        } as const;
        const findGroup = (): keyof typeof GROUPS => {
          for (const key of Object.keys(GROUPS) as (keyof typeof GROUPS)[]) {
            if ((GROUPS[key].tabs as readonly string[]).includes(activeTab)) return key;
          }
          return "pipeline";
        };
        const activeGroup = findGroup();
        const subTabs = GROUPS[activeGroup].tabs;
        return (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="tab-rail w-fit" role="tablist" aria-label={tr("PR sections", "أقسام العلاقات العامة")}>
                {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((key) => {
                  const showBadge = key === "pipeline" && pendingVisitCount > 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(GROUPS[key].tabs[0] as typeof activeTab)}
                      data-active={key === activeGroup}
                      aria-selected={key === activeGroup}
                      role="tab"
                      className="tab-pill"
                    >
                      {GROUPS[key].label}
                      {showBadge && (
                        <span className="ms-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                          {pendingVisitCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {subTabs.length > 1 ? (
                <div className="-mx-1 flex flex-wrap gap-1.5 px-1" role="tablist" aria-label={GROUPS[activeGroup].label}>
                  {subTabs.map((tab) => {
                    const isActive = activeTab === tab;
                    const showBadge = tab === "visitIdeas" && pendingVisitCount > 0;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab as typeof activeTab)}
                        aria-selected={isActive}
                        role="tab"
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          isActive
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border/70 bg-surface/30 text-muted hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        {TAB_LABELS[tab]}
                        {showBadge && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                            {pendingVisitCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            {activeTab === "sponsors" && (
              <button type="button" onClick={startNewSponsor} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs">
                <Plus className="w-3.5 h-3.5" />
                {tr("Add Potential Sponsor", "إضافة راع محتمل")}
              </button>
            )}
          </div>
        );
      })()}
      {activeTab === "sponsors" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          <div className="space-y-3 max-h-[calc(100dvh-18rem)] overflow-y-auto pr-1">
            {loading ? (
              <div className="glass-card p-6 text-sm text-muted">{tr("Loading sponsors…", "جارٍ تحميل الرعاة…")}</div>
            ) : sponsors.length === 0 ? (
              <div className="glass-card p-6 text-sm text-muted">{tr("No sponsors yet.", "لا يوجد رعاة بعد.")}</div>
            ) : sponsors.map((sponsor, i) => {
              const meta = statusMeta(sponsor.status);
              return (
                <motion.div
                  key={sponsor.sponsorId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card p-5 card-hover"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{sponsor.name}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${tierColors[sponsor.tier]}`}>
                          {sponsor.tier}
                        </span>
                        <span className={meta.className}>{meta.label}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted">
                        <span>{formatMoney(sponsor.amount, sponsor.currency)}</span>
                        <span>{sponsor.contactEmail || sponsor.contactName || tr("No contact set", "لا توجد جهة اتصال")}</span>
                        <span>{sponsor.lastContactedAt ? `${tr("Last contact", "آخر تواصل")} ${sponsor.lastContactedAt.slice(0, 10)}` : tr("Not contacted", "لم يُتواصل بعد")}</span>
                      </div>
                      <p className="mt-3 text-sm text-muted line-clamp-2">{sponsor.nextAction || sponsor.notes || tr("No next action set.", "لا توجد خطوة تالية محددة.")}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={sponsor.status}
                        onChange={(event) => updateSponsor(sponsor.sponsorId, { status: event.target.value as SponsorStatus })}
                        className="input h-9 w-[180px] text-xs"
                      >
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <button type="button" onClick={() => startEditSponsor(sponsor)} className="btn-ghost h-9">
                        <FileText className="w-4 h-4" />
                        {tr("Draft", "مسودّة")}
                      </button>
                      <label className="btn-ghost h-9 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        {uploadingId === sponsor.sponsorId ? tr("Importing", "جارٍ الاستيراد") : tr("Import PDF", "استيراد PDF")}
                        <input type="file" accept="application/pdf" className="sr-only" onChange={(event) => importProposalPdf(sponsor, event)} />
                      </label>
                      <button type="button" onClick={() => exportProposalPdf(sponsor)} className="btn-ghost h-9">
                        <Download className="w-4 h-4" />
                        Export PDF
                      </button>
                      {sponsor.proposalPdfUrl && (
                        <a href={sponsor.proposalPdfUrl} target="_blank" rel="noreferrer" className="btn-ghost h-9">
                          <ExternalLink className="w-4 h-4" />
                          PDF
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="glass-card p-5 h-fit">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                {editingId ? "Sponsor Proposal" : "Pipeline"}
              </h3>
              {editingId && (
                <button type="button" onClick={() => setEditingId(null)} className="text-xs text-muted hover:text-foreground">
                  {tr("Close", "إغلاق")}
                </button>
              )}
            </div>

            {editingId ? (
              <form onSubmit={saveSponsor} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tr("Sponsor name", "اسم الراعي")} required />
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SponsorStatus })}>
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select className="input" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as SponsorTier })}>
                    {(["bronze", "silver", "gold", "platinum"] as SponsorTier[]).map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                  </select>
                  <input className="input" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={tr("Amount", "المبلغ")} />
                  <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder={tr("Contact name", "اسم جهة الاتصال")} />
                  <input className="input" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder={tr("Contact email", "البريد الإلكتروني للتواصل")} />
                  <input className="input" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder={tr("Website URL", "رابط الموقع")} />
                  <input className="input" type="date" value={form.lastContactedAt} onChange={(e) => setForm({ ...form, lastContactedAt: e.target.value })} />
                </div>
                <input className="input" value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} placeholder={tr("Next action", "الخطوة التالية")} />
                <textarea className="input min-h-20 resize-y" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={tr("Internal notes", "ملاحظات داخلية")} />
                <input className="input" value={form.proposalTitle} onChange={(e) => setForm({ ...form, proposalTitle: e.target.value })} placeholder={tr("Proposal title", "عنوان العرض")} />
                <textarea className="input min-h-44 resize-y" value={form.proposalBody} onChange={(e) => setForm({ ...form, proposalBody: e.target.value })} placeholder={tr("Proposal draft", "مسودة العرض")} />
                <input className="input" value={form.proposalPdfUrl} onChange={(e) => setForm({ ...form, proposalPdfUrl: e.target.value })} placeholder={tr("Imported proposal PDF URL", "رابط ملف PDF للعرض المستورد")} />
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button type="submit" disabled={saving} className="btn-primary">
                    <Save className="w-4 h-4" />
                    {saving ? tr("Saving", "جارٍ الحفظ") : tr("Save", "حفظ")}
                  </button>
                  {typeof editingId === "number" && (
                    <button type="button" onClick={() => deleteSponsor(editingId)} className="btn-ghost text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                      {tr("Delete", "حذف")}
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {statusOptions.map((option) => {
                  const count = sponsors.filter((sponsor) => sponsor.status === option.value).length;
                  return (
                    <div key={option.value} className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-4 py-3">
                      <span className={option.className}>{option.label}</span>
                      <span className="text-sm font-semibold text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "promotions" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-xs text-muted">
            {tr(
              "Events imported through the CSV above (or created by Innovation) appear here. Drafts need Media leadership to publish them before they show on the public Events page.",
              "تظهر هنا الفعاليات المستوردة من ملف CSV أعلاه (أو التي ينشئها فريق الابتكار). تحتاج المسودات إلى موافقة فريق الإعلام قبل نشرها في صفحة الفعاليات العامة.",
            )}
          </div>
          {eventsLoading ? (
            <div className="glass-card p-6 text-center text-sm text-muted">{tr("Loading events…", "جاري تحميل الفعاليات…")}</div>
          ) : prEvents.length === 0 ? (
            <div className="glass-card p-6 text-center text-sm text-muted">
              {tr("No events yet. Use the CSV importer above to add past PR events.", "لا توجد فعاليات بعد. استخدم ملف CSV أعلاه لإضافة فعاليات سابقة.")}
            </div>
          ) : (
            prEvents.map((event, i) => {
              const startDate = new Date(event.startTime);
              const dateLabel = startDate.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" });
              const timeLabel = startDate.toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });
              return (
                <motion.div
                  key={event.eventId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 6) * 0.04 }}
                  className="glass-card p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start gap-3">
                    {event.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.imageUrl} alt={event.title} className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{event.title}</h4>
                        <span className={event.isPublished ? "badge badge-success" : "badge"}>
                          {event.isPublished ? tr("Published", "منشور") : tr("Draft", "مسودة")}
                        </span>
                        <span className="badge bg-surface-elevated text-muted border-border capitalize">{event.type}</span>
                        {event.category ? <span className="badge bg-surface-elevated text-muted border-border">{event.category}</span> : null}
                      </div>
                      {event.description ? <p className="mt-1 line-clamp-2 text-xs text-muted">{event.description}</p> : null}
                      <p className="mt-2 text-xs text-muted">
                        {dateLabel} · {timeLabel}{event.location ? ` · ${event.location}` : ""}
                        {typeof event.seatsAvailable === "number" ? ` · ${event.seatsAvailable} ${tr("seats", "مقعد")}` : ""}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}

      {activeTab === "visitIdeas" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <VisitIdeasInbox />
        </motion.div>
      )}

      {activeTab === "tasks" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <LeaderTaskReviewPanel
            department="pr"
            title="PR task review"
            titleAr="مراجعة مهام العلاقات العامة"
          />
        </motion.div>
      )}

    </div>
  );
}

interface VisitIdeaRow {
  requestId: number;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "assigned" | "in_progress" | "completed" | "rejected";
  sourceDepartmentName: string | null;
  requestedByName: string | null;
  assigneeNote: string | null;
  attachmentUrls: string[];
  requestedAt: string;
}

function VisitIdeasInbox() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [statusFilter, setStatusFilter] = useState<"pending" | "assigned" | "in_progress" | "completed" | "rejected">("pending");
  const [rows, setRows] = useState<VisitIdeaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/service-requests?scope=inbox&requestType=company_visit&targetDepartment=pr`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return [] as VisitIdeaRow[];
        const body = (await res.json()) as { data?: VisitIdeaRow[] } | VisitIdeaRow[];
        const arr = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        return arr;
      })
      .then((data) => setRows(data.filter((r) => r.status === statusFilter)))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(request: VisitIdeaRow, status: "assigned" | "in_progress" | "completed", note?: string) {
    setActingId(request.requestId);
    try {
      const res = await fetch(`/api/service-requests/${request.requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(note ? { assigneeNote: note } : {}) }),
      });
      if (!res.ok) throw new Error("update failed");
      toast.success(tr("Status updated", "تم تحديث الحالة"));
      load();
    } catch {
      toast.error(tr("Update failed. Please try again.", "فشل التحديث. حاول مرة أخرى."));
    } finally {
      setActingId(null);
    }
  }

  async function rejectWithReason(request: VisitIdeaRow) {
    if (!rejectReason.trim()) {
      toast.error(tr("Please enter a reason for rejection.", "يرجى إدخال سبب الرفض."));
      return;
    }
    setActingId(request.requestId);
    try {
      const res = await fetch(`/api/service-requests/${request.requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", assigneeNote: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error("update failed");
      toast.success(tr("Idea rejected", "تم رفض الفكرة"));
      setRejectingId(null);
      setRejectReason("");
      load();
    } catch {
      toast.error(tr("Reject failed. Please try again.", "فشل الرفض. حاول مرة أخرى."));
    } finally {
      setActingId(null);
    }
  }

  const filterButtons: { key: typeof statusFilter; label: string }[] = [
    { key: "pending",     label: tr("New",         "جديد") },
    { key: "assigned",    label: tr("Accepted",    "مقبول") },
    { key: "in_progress", label: tr("In Progress", "قيد التنفيذ") },
    { key: "completed",   label: tr("Completed",   "مكتمل") },
    { key: "rejected",    label: tr("Rejected",    "مرفوض") },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {tr("Company Visit Ideas", "أفكار زيارات الشركات")}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {tr(
              "Visit suggestions sent by Development. Accept to start arranging, or reject with a short reason.",
              "اقتراحات زيارات يرسلها قسم التطوير. اقبل لبدء التنسيق، أو ارفض مع سبب موجز.",
            )}
          </p>
        </div>
        <div className="tab-rail" role="tablist" aria-label={tr("Idea status", "حالة الفكرة")}>
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              data-active={statusFilter === key}
              role="tab"
              aria-selected={statusFilter === key}
              className="tab-pill"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">{tr("Loading…", "يتم التحميل…")}</div>
      ) : rows.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm text-muted">
          {tr("No visit ideas in this list.", "لا توجد أفكار زيارات في هذه القائمة.")}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((idea) => (
            <div key={idea.requestId} className="glass-card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-foreground">{idea.title}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {tr(`From ${idea.sourceDepartmentName ?? "Development"}`, `من ${idea.sourceDepartmentName ?? "التطوير"}`)}
                    {idea.requestedByName ? ` · ${idea.requestedByName}` : ""}
                  </p>
                  {idea.description && (
                    <p className="mt-2 text-xs leading-5 text-foreground/80 whitespace-pre-wrap">{idea.description}</p>
                  )}
                  {idea.assigneeNote && (
                    <p className="mt-2 text-xs leading-5 text-muted whitespace-pre-wrap">
                      <span className="font-medium">{tr("Note", "ملاحظة")}:</span> {idea.assigneeNote}
                    </p>
                  )}
                </div>
                {statusFilter === "pending" && rejectingId !== idea.requestId && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => { setRejectingId(idea.requestId); setRejectReason(""); }}
                      disabled={actingId === idea.requestId}
                      className="px-3 py-1.5 rounded-lg border border-border text-muted hover:text-error hover:border-error/30 hover:bg-error/10 text-xs transition-colors disabled:opacity-40"
                    >
                      {tr("Reject", "رفض")}
                    </button>
                    <button
                      onClick={() => setStatus(idea, "assigned")}
                      disabled={actingId === idea.requestId}
                      className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      {tr("Accept", "قبول")}
                    </button>
                  </div>
                )}
                {statusFilter === "assigned" && (
                  <button
                    onClick={() => setStatus(idea, "in_progress")}
                    disabled={actingId === idea.requestId}
                    className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    {tr("Mark in progress", "تحت التنفيذ")}
                  </button>
                )}
                {statusFilter === "in_progress" && (
                  <button
                    onClick={() => setStatus(idea, "completed")}
                    disabled={actingId === idea.requestId}
                    className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    {tr("Mark complete", "إكمال")}
                  </button>
                )}
              </div>

              {rejectingId === idea.requestId && (
                <div className="rounded-xl border border-error/30 bg-error/5 p-3 space-y-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {tr("Rejection reason", "سبب الرفض")}
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder={tr("Why isn't this visit a good fit right now?", "لماذا لا تناسب هذه الزيارة حاليًا؟")}
                    className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/40 resize-none"
                    dir={lang === "ar" ? "rtl" : "ltr"}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason(""); }}
                      className="px-3 py-1.5 rounded-lg border border-border text-muted hover:text-foreground text-xs"
                    >
                      {tr("Cancel", "إلغاء")}
                    </button>
                    <button
                      onClick={() => rejectWithReason(idea)}
                      disabled={!rejectReason.trim() || actingId === idea.requestId}
                      className="px-3 py-1.5 rounded-lg bg-error/15 border border-error/30 text-error text-xs disabled:opacity-40"
                    >
                      {tr("Confirm reject", "تأكيد الرفض")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
