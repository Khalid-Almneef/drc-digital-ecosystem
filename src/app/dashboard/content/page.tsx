"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useLang } from "@/contexts/LanguageContext";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  FileText,
  GripVertical,
  ImageIcon,
  LayoutGrid,
  Loader2,
  Plus,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/hooks/useApi";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { JoinControlsCard } from "@/components/dashboard/JoinControlsCard";
import { baseTranslations } from "@/contexts/LanguageContext";
import {
  ABOUT_VALUE_ICON_OPTIONS as ABOUT_ICONS,
  DEFAULT_ABOUT_TIMELINE,
  DEFAULT_ABOUT_VALUES,
  DEFAULT_CUSTOM_PAGE_SEGMENTS,
  DEFAULT_HOME_ANNOUNCEMENT_CARDS,
  DEFAULT_HOME_HIGHLIGHTS,
  DEFAULT_JOIN_BENEFITS,
  DEFAULT_JOIN_FAQS,
  DEFAULT_JOIN_STEPS,
  DEFAULT_TEAM_STATS,
  getCustomSegmentsKey,
  HOME_HIGHLIGHT_ICON_OPTIONS,
  JOIN_BENEFIT_ICON_OPTIONS,
  PUBLIC_PAGE_KEYS,
  PUBLIC_TEXT_GROUPS,
  PublicPageKey,
  PublicTextGroupConfig,
  TextFieldType,
} from "@/lib/public-content";

type TabKey = PublicPageKey | "assets" | "advanced";
type PageEditorView = "copy" | "segments";
type PreviewLang = "en" | "ar";
type MobileCollectionPanel = "items" | "editor" | "preview";

type RecoverySnapshot = {
  textDrafts?: TextDraftMap;
  collectionDrafts?: CollectionDraftMap;
  stats?: HomeStats;
  visibility?: SectionVisibility;
  pageViews?: Record<PublicPageKey, PageEditorView>;
  collectionSelections?: Record<string, number>;
  timestamp: number;
};

const RECOVERY_STORAGE_KEY = "drc-content-dashboard-drafts-v3";

const CONTENT_TABS: { key: TabKey; label: string; labelAr: string; description: string; descriptionAr: string }[] = [
  { key: "main", label: "Main", labelAr: "الرئيسية", description: "Homepage, navigation, footer, and front-door public content.", descriptionAr: "محتوى الصفحة الرئيسية والقائمة والتذييل وواجهة الموقع العامة." },
  { key: "about", label: "About", labelAr: "من نحن", description: "About page story, values, departments, timeline, and custom sections.", descriptionAr: "قصة صفحة من نحن وقيمنا والأقسام والمسيرة الزمنية والأقسام المخصصة." },
  { key: "projects", label: "Projects", labelAr: "المشاريع", description: "Projects page copy, portfolio messaging, and extra project-story segments.", descriptionAr: "نصوص صفحة المشاريع ورسائل المعرض والأقسام الإضافية لقصص المشاريع." },
  { key: "workshops", label: "Workshops", labelAr: "الورش", description: "Workshops page copy, live registration messaging, and custom feature sections.", descriptionAr: "نصوص صفحة الورش ورسائل التسجيل المباشر والأقسام المخصصة." },
  { key: "events", label: "Events", labelAr: "الفعاليات", description: "Events page headings, achievement segments, and event-story add-ons.", descriptionAr: "عناوين صفحة الفعاليات وأقسام الإنجازات وإضافات قصص الفعاليات." },
  { key: "team", label: "Team", labelAr: "الفريق", description: "Leadership copy, recognition sections, and custom team storytelling blocks.", descriptionAr: "نصوص القيادة وأقسام التكريم وكتل قصص الفريق المخصصة." },
  { key: "join", label: "Join", labelAr: "انضم", description: "Application copy, process sections, FAQ content, and join-page feature blocks.", descriptionAr: "نصوص الانضمام وأقسام العملية والأسئلة الشائعة والكتل المميزة." },
  { key: "assets", label: "Assets", labelAr: "الأصول", description: "Upload and reuse public-facing images.", descriptionAr: "رفع وإعادة استخدام الصور المرئية للموقع." },
  { key: "advanced", label: "Advanced", labelAr: "متقدم", description: "Direct key editing for any stored content row.", descriptionAr: "تحرير مباشر لأي مفتاح محتوى مخزن." },
];

const PAGE_TITLES: Record<PublicPageKey, { en: string; ar: string }> = {
  main: { en: "Homepage", ar: "الصفحة الرئيسية" },
  about: { en: "About Page", ar: "صفحة من نحن" },
  projects: { en: "Projects Page", ar: "صفحة المشاريع" },
  workshops: { en: "Workshops Page", ar: "صفحة الورش" },
  events: { en: "Events Page", ar: "صفحة الفعاليات" },
  team: { en: "Team Page", ar: "صفحة الفريق" },
  join: { en: "Join Page", ar: "صفحة الانضمام" },
};

const PAGE_VIEW_LABELS: Record<PageEditorView, { label: string; labelAr: string; description: string; descriptionAr: string; icon: typeof FileText }> = {
  copy: { label: "Copy", labelAr: "النصوص", description: "Headings, labels, CTA text, and bilingual page copy.", descriptionAr: "العناوين والتسميات ونصوص الأزرار والمحتوى ثنائي اللغة.", icon: FileText },
  segments: { label: "Segments", labelAr: "الأقسام", description: "Cards, image blocks, toggles, stats, and repeatable page sections.", descriptionAr: "البطاقات وكتل الصور والمفاتيح والأرقام والأقسام القابلة للتكرار.", icon: LayoutGrid },
};

const DEFAULT_PAGE_VIEWS: Record<PublicPageKey, PageEditorView> = {
  main: "segments",
  about: "segments",
  projects: "segments",
  workshops: "segments",
  events: "segments",
  team: "segments",
  join: "segments",
};

interface ContentRow {
  key: string;
  en: string | null;
  ar: string | null;
  json: unknown;
  updatedAt: string | null;
}

interface HomeStats {
  projects: string;
  competitions: string;
  members: string;
  departments: string;
}

interface SectionVisibility {
  announcements: boolean;
  motm: boolean;
  whatwedo: boolean;
  workshops: boolean;
  projects: boolean;
}

interface Asset {
  assetId: number;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  label: string | null;
  createdAt: string;
  uploadedBy: string | null;
}

type TextDraft = { en: string; ar: string };
type TextDraftMap = Record<string, TextDraft>;
type CollectionItem = Record<string, string>;
type CollectionDraftMap = Record<string, CollectionItem[]>;

type CollectionField = {
  key: string;
  label: string;
  type?: TextFieldType | "select";
  options?: readonly { value: string; label: string }[];
};

type CollectionConfig = {
  page: PublicPageKey;
  key: string;
  title: string;
  description: string;
  fields: CollectionField[];
  defaults: CollectionItem[];
};

type EditorState =
  | { type: "group"; groupId: string }
  | { type: "collection"; sectionKey: string }
  | { type: "stats" }
  | { type: "visibility" }
  | null;

const CUSTOM_SEGMENT_FIELDS: CollectionField[] = [
  {
    key: "template",
    label: "Design Template",
    type: "select",
    options: [
      { value: "split-feature", label: "Split feature (image + text)" },
      { value: "hero-banner",   label: "Hero banner (full-bleed image)" },
      { value: "stacked",       label: "Stacked card (image above text)" },
      { value: "quote-card",    label: "Quote card (centered pull-quote)" },
      { value: "gallery",       label: "Gallery (2-up images)" },
      { value: "cta-banner",    label: "CTA banner (compact strip)" },
    ],
  },
  { key: "badgeEn", label: "Header / Label (EN)" },
  { key: "badgeAr", label: "Header / Label (AR)" },
  { key: "titleEn", label: "Title (EN)", type: "textarea" },
  { key: "titleAr", label: "Title (AR)", type: "textarea" },
  { key: "bodyEn", label: "Body (EN)", type: "textarea" },
  { key: "bodyAr", label: "Body (AR)", type: "textarea" },
  {
    key: "mediaMode",
    label: "Pictures",
    type: "select",
    options: [
      { value: "none", label: "No pictures" },
      { value: "single", label: "One picture" },
      { value: "double", label: "Two pictures" },
    ],
  },
  { key: "imageUrl", label: "Primary Image URL" },
  { key: "secondaryImageUrl", label: "Secondary Image URL" },
  {
    key: "align",
    label: "Layout Side",
    type: "select",
    options: [
      { value: "left", label: "Text left, media right" },
      { value: "right", label: "Text right, media left" },
    ],
  },
  {
    key: "tone",
    label: "Visual Tone",
    type: "select",
    options: [
      { value: "accent", label: "Accent" },
      { value: "neutral", label: "Neutral" },
      { value: "warm", label: "Warm" },
      { value: "cool", label: "Cool" },
    ],
  },
  { key: "href", label: "Link URL" },
  { key: "ctaEn", label: "CTA (EN)" },
  { key: "ctaAr", label: "CTA (AR)" },
];

function toCollectionItems<T extends object>(items: T[]): CollectionItem[] {
  return items.map((item) =>
    Object.fromEntries(
      Object.entries(item).map(([key, value]) => [key, String(value ?? "")]),
    ),
  );
}

const inputCls =
  "w-full rounded-2xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:border-primary/40 focus:outline-none transition-all";
const textareaCls = `${inputCls} min-h-[110px] resize-y`;
const labelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted";

// Empty by default — content leadership types in real numbers from the
// editor. Empty strings render as hidden stats on the public site.
const DEFAULT_STATS: HomeStats = {
  projects: "",
  competitions: "",
  members: "",
  departments: "",
};

const DEFAULT_VISIBILITY: SectionVisibility = {
  announcements: true,
  motm: true,
  whatwedo: true,
  workshops: true,
  projects: true,
};

const BASE_COLLECTION_CONFIGS: CollectionConfig[] = [
  {
    page: "main",
    key: "home.highlights",
    title: "Home Highlights",
    description: "The cards under “What We Do” on the homepage.",
    defaults: toCollectionItems(DEFAULT_HOME_HIGHLIGHTS),
    fields: [
      { key: "icon", label: "Icon", type: "select", options: HOME_HIGHLIGHT_ICON_OPTIONS },
      { key: "titleEn", label: "Title (EN)" },
      { key: "titleAr", label: "Title (AR)" },
      { key: "descriptionEn", label: "Description (EN)", type: "textarea" },
      { key: "descriptionAr", label: "Description (AR)", type: "textarea" },
    ],
  },
  {
    page: "main",
    key: "home.announcementCards",
    title: "Homepage Announcement Cards",
    description: "Image-backed announcement segment for the homepage.",
    defaults: toCollectionItems(DEFAULT_HOME_ANNOUNCEMENT_CARDS),
    fields: [
      { key: "badgeEn", label: "Badge (EN)" },
      { key: "badgeAr", label: "Badge (AR)" },
      { key: "titleEn", label: "Title (EN)" },
      { key: "titleAr", label: "Title (AR)" },
      { key: "bodyEn", label: "Body (EN)", type: "textarea" },
      { key: "bodyAr", label: "Body (AR)", type: "textarea" },
      { key: "imageUrl", label: "Image URL" },
      { key: "href", label: "Link URL" },
      { key: "ctaEn", label: "CTA (EN)" },
      { key: "ctaAr", label: "CTA (AR)" },
      {
        key: "pinned",
        label: "Pinned",
        type: "select",
        options: [
          { value: "true", label: "Pinned" },
          { value: "false", label: "Normal" },
        ],
      },
    ],
  },
  {
    page: "about",
    key: "about.values.items",
    title: "About Values",
    description: "Cards shown in the About page values section.",
    defaults: toCollectionItems(DEFAULT_ABOUT_VALUES),
    fields: [
      { key: "icon", label: "Icon", type: "select", options: ABOUT_ICONS },
      { key: "titleEn", label: "Title (EN)" },
      { key: "titleAr", label: "Title (AR)" },
      { key: "descriptionEn", label: "Description (EN)", type: "textarea" },
      { key: "descriptionAr", label: "Description (AR)", type: "textarea" },
    ],
  },
  {
    page: "about",
    key: "about.timeline.items",
    title: "About Timeline",
    description: "Year-by-year timeline entries on the About page.",
    defaults: toCollectionItems(DEFAULT_ABOUT_TIMELINE),
    fields: [
      { key: "year", label: "Year" },
      { key: "eventEn", label: "Event (EN)" },
      { key: "eventAr", label: "Event (AR)" },
      { key: "detailEn", label: "Detail (EN)", type: "textarea" },
      { key: "detailAr", label: "Detail (AR)", type: "textarea" },
    ],
  },
  {
    page: "join",
    key: "join.benefits.items",
    title: "Join Benefits",
    description: "Benefits cards shown on the Join page.",
    defaults: toCollectionItems(DEFAULT_JOIN_BENEFITS),
    fields: [
      { key: "icon", label: "Icon", type: "select", options: JOIN_BENEFIT_ICON_OPTIONS },
      { key: "titleEn", label: "Title (EN)" },
      { key: "titleAr", label: "Title (AR)" },
      { key: "descriptionEn", label: "Description (EN)", type: "textarea" },
      { key: "descriptionAr", label: "Description (AR)", type: "textarea" },
    ],
  },
  {
    page: "join",
    key: "join.steps.items",
    title: "Join Steps",
    description: "Process cards on the Join page.",
    defaults: toCollectionItems(DEFAULT_JOIN_STEPS),
    fields: [
      { key: "number", label: "Step Number" },
      { key: "titleEn", label: "Title (EN)" },
      { key: "titleAr", label: "Title (AR)" },
      { key: "descriptionEn", label: "Description (EN)", type: "textarea" },
      { key: "descriptionAr", label: "Description (AR)", type: "textarea" },
    ],
  },
  {
    page: "join",
    key: "join.faqs.items",
    title: "Join FAQs",
    description: "Frequently asked questions on the Join page.",
    defaults: toCollectionItems(DEFAULT_JOIN_FAQS),
    fields: [
      { key: "questionEn", label: "Question (EN)" },
      { key: "questionAr", label: "Question (AR)" },
      { key: "answerEn", label: "Answer (EN)", type: "textarea" },
      { key: "answerAr", label: "Answer (AR)", type: "textarea" },
    ],
  },
  {
    page: "team",
    key: "team.stats.items",
    title: "Team Stats",
    description: "The stat strip shown at the top of the Team page.",
    defaults: toCollectionItems(DEFAULT_TEAM_STATS),
    fields: [
      { key: "value", label: "Value" },
      { key: "labelEn", label: "Label (EN)" },
      { key: "labelAr", label: "Label (AR)" },
    ],
  },
];

const COLLECTION_CONFIGS: CollectionConfig[] = [
  ...BASE_COLLECTION_CONFIGS,
  ...PUBLIC_PAGE_KEYS.map((page) => ({
    page,
    key: getCustomSegmentsKey(page),
    title: "Custom Segments",
    description: "Create new public sections with headers, optional pictures, CTA links, and layout direction.",
    defaults: toCollectionItems(DEFAULT_CUSTOM_PAGE_SEGMENTS),
    fields: CUSTOM_SEGMENT_FIELDS,
  })),
];

function isPageTab(tab: TabKey): tab is PublicPageKey {
  return PUBLIC_PAGE_KEYS.includes(tab as PublicPageKey);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildRowMap(rows: ContentRow[]) {
  return rows.reduce<Record<string, ContentRow>>((acc, row) => {
    acc[row.key] = row;
    return acc;
  }, {});
}

function buildTextDrafts(rowMap: Record<string, ContentRow>) {
  const drafts: TextDraftMap = {};

  for (const group of PUBLIC_TEXT_GROUPS) {
    for (const field of group.fields) {
      const row = rowMap[field.key] ?? rowMap[`${field.key}.text`];
      drafts[field.key] = {
        en: row?.en ?? baseTranslations.en[field.key] ?? "",
        ar: row?.ar ?? baseTranslations.ar[field.key] ?? "",
      };
    }
  }

  return drafts;
}

function buildCollectionDrafts(rowMap: Record<string, ContentRow>) {
  const drafts: CollectionDraftMap = {};

  for (const section of COLLECTION_CONFIGS) {
    drafts[section.key] = Array.isArray(rowMap[section.key]?.json)
      ? deepClone(rowMap[section.key]?.json as CollectionItem[])
      : deepClone(section.defaults);
  }

  return drafts;
}

function buildEmptyCollectionItem(section: CollectionConfig, itemCount: number) {
  return section.fields.reduce<CollectionItem>((acc, field) => {
    if (field.type === "select") {
      acc[field.key] = field.options?.[0]?.value ?? "";
      return acc;
    }

    if (field.key === "number") {
      acc[field.key] = String(itemCount + 1).padStart(2, "0");
      return acc;
    }

    acc[field.key] = "";
    return acc;
  }, {});
}

function normalizeCollectionItems(section: CollectionConfig, items: CollectionItem[]) {
  if (!section.fields.some((field) => field.key === "number")) return items;

  return items.map((item, index) => ({
    ...item,
    number: String(index + 1).padStart(2, "0"),
  }));
}

function pickItemTitle(item: CollectionItem, fields: CollectionField[]) {
  const preferredKeys = [
    "titleEn",
    "nameEn",
    "questionEn",
    "eventEn",
    "badgeEn",
    "labelEn",
    "value",
    "year",
    "eyebrowEn",
    "number",
  ];

  for (const key of preferredKeys) {
    if (item[key]?.trim()) return item[key];
  }

  for (const field of fields) {
    const value = item[field.key];
    if (value?.trim()) return value;
  }

  return "Untitled";
}

function pickItemSubtitle(item: CollectionItem) {
  const preferredKeys = [
    "titleAr",
    "nameAr",
    "questionAr",
    "descriptionEn",
    "bodyEn",
    "detailEn",
    "resultEn",
    "locationEn",
  ];

  for (const key of preferredKeys) {
    if (item[key]?.trim()) return item[key];
  }

  return "";
}

function pickItemImage(item: CollectionItem) {
  const match = Object.entries(item).find(([key, value]) => key.toLowerCase().includes("imageurl") && value?.trim());
  return match?.[1] ?? "";
}

function pickFirstFilled(item: CollectionItem, keys: string[]) {
  for (const key of keys) {
    if (item[key]?.trim()) return item[key];
  }

  return "";
}

function mergeTextDrafts(base: TextDraftMap, recovered?: TextDraftMap) {
  if (!recovered) return base;

  const next = { ...base };
  for (const [key, value] of Object.entries(recovered)) {
    next[key] = {
      en: value?.en ?? next[key]?.en ?? "",
      ar: value?.ar ?? next[key]?.ar ?? "",
    };
  }
  return next;
}

function mergeCollectionDrafts(base: CollectionDraftMap, recovered?: CollectionDraftMap) {
  if (!recovered) return base;
  return { ...base, ...recovered };
}

function hasUnsavedContent({
  textDrafts,
  textBaseDrafts,
  collectionDrafts,
  collectionBaseDrafts,
  stats,
  statsBase,
  visibility,
  visibilityBase,
}: {
  textDrafts: TextDraftMap;
  textBaseDrafts: TextDraftMap;
  collectionDrafts: CollectionDraftMap;
  collectionBaseDrafts: CollectionDraftMap;
  stats: HomeStats;
  statsBase: HomeStats;
  visibility: SectionVisibility;
  visibilityBase: SectionVisibility;
}) {
  return JSON.stringify(textDrafts) !== JSON.stringify(textBaseDrafts)
    || JSON.stringify(collectionDrafts) !== JSON.stringify(collectionBaseDrafts)
    || JSON.stringify(stats) !== JSON.stringify(statsBase)
    || JSON.stringify(visibility) !== JSON.stringify(visibilityBase);
}

function formatAutosaveTime(timestamp: number | null, lang: "en" | "ar" = "en") {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString(lang === "ar" ? "ar" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function TextField({
  type = "input",
  value,
  onChange,
  dir,
  placeholder,
}: {
  type?: TextFieldType;
  value: string;
  onChange: (next: string) => void;
  dir?: "ltr" | "rtl";
  placeholder?: string;
}) {
  if (type === "textarea") {
    return (
      <textarea
        value={value}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={textareaCls}
      />
    );
  }

  return (
    <input
      value={value}
      dir={dir}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

function EditorModal({
  open,
  title,
  description,
  onClose,
  actions,
  footer,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 18 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none border border-border bg-[color:var(--surface)] shadow-2xl sm:max-h-[92vh] sm:h-auto sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-20 border-b border-border bg-[color:var(--surface)]/95 px-4 py-4 backdrop-blur sm:px-6">
              <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                {actions}
                <button
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-muted transition-colors hover:text-foreground"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-muted transition-colors hover:text-foreground sm:hidden"
                aria-label="Close editor"
              >
                <X size={16} />
              </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
            {footer && (
              <div className="sticky bottom-0 z-20 border-t border-border bg-[color:var(--surface)]/95 px-4 py-3 backdrop-blur sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LaunchCard({
  title,
  description,
  meta,
  dirty,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  meta: string;
  dirty: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  return (
    <button
      onClick={onClick}
      className="glass-card group relative overflow-hidden rounded-[26px] border border-border p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/20"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-primary/90">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            dirty ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-surface-elevated text-muted"
          }`}
        >
          {dirty ? tr("Unsaved", "غير محفوظ") : tr("Ready", "جاهز")}
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted">
        <span>{meta}</span>
        <span className="font-medium text-primary/80 transition-colors group-hover:text-primary">{tr("Open editor", "افتح المحرر")}</span>
      </div>
    </button>
  );
}

function GroupEditorModal({
  group,
  drafts,
  baseDrafts,
  onChange,
  onSave,
  onDiscard,
  saving,
  onClose,
}: {
  group: PublicTextGroupConfig;
  drafts: TextDraftMap;
  baseDrafts: TextDraftMap;
  onChange: (key: string, lang: "en" | "ar", value: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const dirty = group.fields.some((field) => {
    const current = drafts[field.key];
    const baseline = baseDrafts[field.key];
    return current?.en !== baseline?.en || current?.ar !== baseline?.ar;
  });

  const discardButton = dirty ? (
    <button
      onClick={() => {
        if (window.confirm(tr("Discard your changes?", "تجاهل التغييرات؟"))) onDiscard();
      }}
      className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs text-red-300"
    >
      {tr("Discard", "تجاهل")}
    </button>
  ) : null;

  const saveButton = (
    <button
      onClick={onSave}
      disabled={!dirty || saving}
      className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-40"
    >
      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
      {tr("Save Group", "حفظ المجموعة")}
    </button>
  );

  return (
    <EditorModal
      open
      title={group.title}
      description={group.description}
      onClose={onClose}
      actions={(
        <>
          {discardButton}
          {saveButton}
        </>
      )}
      footer={(
        <div className="flex justify-end gap-2">
          {discardButton}
          {saveButton}
        </div>
      )}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        {group.fields.map((field) => (
          <div key={field.key} className="rounded-[24px] border border-border bg-surface/35 p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">{field.label}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-muted">{field.key}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={labelCls}>{tr("English", "الإنجليزية")}</label>
                <TextField
                  type={field.type}
                  value={drafts[field.key]?.en ?? ""}
                  onChange={(value) => onChange(field.key, "en", value)}
                  placeholder={tr("Type the English text here", "اكتب النص بالإنجليزية هنا")}
                />
              </div>
              <div>
                <label className={labelCls}>{tr("Arabic", "العربية")}</label>
                <TextField
                  type={field.type}
                  dir="rtl"
                  value={drafts[field.key]?.ar ?? ""}
                  onChange={(value) => onChange(field.key, "ar", value)}
                  placeholder={tr("Type the Arabic text here", "اكتب النص بالعربية هنا")}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </EditorModal>
  );
}

function CollectionLivePreview({
  section,
  item,
  previewLang,
}: {
  section: CollectionConfig;
  item: CollectionItem;
  previewLang: PreviewLang;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const titleEn = pickFirstFilled(item, ["titleEn", "nameEn", "questionEn", "eventEn", "badgeEn", "labelEn", "value", "eyebrowEn", "year", "number"]);
  const titleAr = pickFirstFilled(item, ["titleAr", "nameAr", "questionAr", "eventAr"]);
  const bodyEn = pickFirstFilled(item, ["descriptionEn", "bodyEn", "detailEn", "answerEn", "resultEn", "locationEn", "metric"]);
  const bodyAr = pickFirstFilled(item, ["descriptionAr", "bodyAr", "detailAr", "answerAr", "resultAr", "locationAr"]);
  const labelEn = pickFirstFilled(item, ["badgeEn", "labelEn", "eyebrowEn", "number", "icon", "year"]);
  const labelAr = pickFirstFilled(item, ["badgeAr", "labelAr", "eyebrowAr"]);
  const ctaEn = pickFirstFilled(item, ["ctaEn"]);
  const ctaAr = pickFirstFilled(item, ["ctaAr"]);
  const title = previewLang === "ar" ? titleAr || titleEn : titleEn || titleAr;
  const body = previewLang === "ar" ? bodyAr || bodyEn : bodyEn || bodyAr;
  const label = previewLang === "ar" ? labelAr || labelEn : labelEn || labelAr;
  const cta = previewLang === "ar" ? ctaAr || ctaEn : ctaEn || ctaAr;
  const href = item.href?.trim();
  const primaryImage = item.imageUrl?.trim() || "";
  const secondaryImage = item.secondaryImageUrl?.trim() || "";
  const mediaMode = item.mediaMode || (secondaryImage ? "double" : primaryImage ? "single" : "none");
  const isCustomSegment = section.key.endsWith("customSegments");
  const tone = item.tone || "accent";
  const toneClass =
    tone === "warm"
      ? "from-amber-400/16 via-orange-400/10 to-transparent"
      : tone === "cool"
        ? "from-sky-400/16 via-cyan-400/10 to-transparent"
        : tone === "neutral"
          ? "from-foreground/8 via-foreground/3 to-transparent"
          : "from-primary/16 via-secondary/10 to-transparent";

  const pills = [
    previewLang === "ar" ? item.metric?.trim() || item.locationAr?.trim() : item.metric?.trim() || item.locationEn?.trim(),
    item.value?.trim(),
    item.icon?.trim(),
    item.pinned === "true" ? "Pinned" : "",
  ].filter(Boolean) as string[];

  return (
    <div className="xl:sticky xl:top-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{tr("Live Preview", "معاينة مباشرة")}</p>
          <p className="mt-1 text-xs text-muted">{tr("Public-style approximation of the selected segment.", "معاينة مقرّبة لشكل القسم على الموقع العام.")}</p>
        </div>
        <span className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted">
          {tr("Preview", "معاينة")}
        </span>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-border bg-surface/35">
        <div className={`relative overflow-hidden p-5 ${isCustomSegment ? "min-h-[440px]" : "min-h-[400px]"}`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${toneClass}`} />
          <div className="absolute inset-0 bg-grid opacity-20" />

          {isCustomSegment ? (
            <div className={`relative grid gap-4 ${mediaMode !== "none" ? "grid-cols-1" : "grid-cols-1"} h-full`}>
              <div className={`grid gap-4 ${item.align === "right" && mediaMode !== "none" ? "xl:grid-cols-[1fr_1.1fr]" : "xl:grid-cols-[1.1fr_1fr]"}`}>
                <div className={`${item.align === "right" && mediaMode !== "none" ? "xl:order-2" : ""} rounded-[24px] border border-border/80 bg-black/10 p-5 backdrop-blur-sm`}>
                  {(label || labelAr) && (
                    <div className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/90">
                      {label}
                    </div>
                  )}
                  <h3 className="text-xl font-semibold leading-tight text-foreground">{title || tr("Segment title", "عنوان القسم")}</h3>
                  {((previewLang === "ar" ? titleEn : titleAr)) && <p className="mt-2 text-sm text-muted">{previewLang === "ar" ? titleEn : titleAr}</p>}
                  {body && (
                    <p className="mt-4 text-sm leading-6 text-muted">{body}</p>
                  )}
                  {!!pills.length && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {pills.map((pill) => (
                        <span key={pill} className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[10px] text-muted">
                          {pill}
                        </span>
                      ))}
                    </div>
                  )}
                  {cta && (
                    <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/12 px-4 py-2 text-xs font-medium text-primary">
                      {cta}
                      {href && <span className="text-primary/60">↗</span>}
                    </div>
                  )}
                </div>

                {mediaMode !== "none" && (
                  <div className={`${item.align === "right" ? "xl:order-1" : ""} grid gap-3 ${mediaMode === "double" ? "grid-rows-[1.35fr_0.95fr]" : "grid-rows-1"}`}>
                    <div className="overflow-hidden rounded-[24px] border border-border bg-surface-elevated">
                      {primaryImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={primaryImage} alt={title || "Preview image"} className="h-full min-h-[180px] w-full object-cover" />
                      ) : (
                        <div className="flex min-h-[180px] items-center justify-center text-muted">
                          <ImageIcon size={22} />
                        </div>
                      )}
                    </div>
                    {mediaMode === "double" && (
                      <div className="overflow-hidden rounded-[22px] border border-border bg-surface-elevated">
                        {secondaryImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={secondaryImage} alt={`${title || "Preview image"} secondary`} className="h-full min-h-[120px] w-full object-cover" />
                        ) : (
                          <div className="flex min-h-[120px] items-center justify-center text-muted">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative h-full rounded-[24px] border border-border/80 bg-black/10 p-5 backdrop-blur-sm">
              {primaryImage && (
                <div className="mb-4 overflow-hidden rounded-[22px] border border-border bg-surface-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={primaryImage} alt={title || "Preview image"} className="h-44 w-full object-cover" />
                </div>
              )}
              <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/90">
                {label || section.title}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{title || tr("Segment title", "عنوان القسم")}</h3>
              {((previewLang === "ar" ? titleEn : titleAr)) && <p className="mt-2 text-sm text-muted">{previewLang === "ar" ? titleEn : titleAr}</p>}
              {body && <p className="mt-4 text-sm leading-6 text-muted">{body}</p>}

              {!!pills.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {pills.map((pill) => (
                    <span key={pill} className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[10px] text-muted">
                      {pill}
                    </span>
                  ))}
                </div>
              )}

              {cta && (
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/12 px-4 py-2 text-xs font-medium text-primary">
                  {cta}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CollectionEditorModal({
  section,
  items,
  baseItems,
  selectedIndex,
  previewLang,
  setPreviewLang,
  onSelect,
  onChange,
  onAdd,
  onDuplicate,
  onRemove,
  onMove,
  onReorder,
  onSave,
  onDiscard,
  onUploadImage,
  saving,
  onClose,
}: {
  section: CollectionConfig;
  items: CollectionItem[];
  baseItems: CollectionItem[];
  selectedIndex: number;
  previewLang: PreviewLang;
  setPreviewLang: Dispatch<SetStateAction<PreviewLang>>;
  onSelect: (index: number) => void;
  onChange: (index: number, field: string, value: string) => void;
  onAdd: () => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSave: () => void;
  onDiscard: () => void;
  onUploadImage: (index: number, field: string, file: File) => Promise<void>;
  saving: boolean;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const dirty = JSON.stringify(items) !== JSON.stringify(baseItems);
  const safeIndex = Math.max(0, Math.min(selectedIndex, Math.max(items.length - 1, 0)));
  const item = items[safeIndex];
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobileCollectionPanel>("editor");
  const [pickerForField, setPickerForField] = useState<string | null>(null);

  const addButton = (
    <button onClick={onAdd} className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs">
      <Plus size={12} />
      {tr("Add Item", "إضافة عنصر")}
    </button>
  );

  const duplicateButton = items.length > 0 ? (
    <button onClick={() => onDuplicate(safeIndex)} className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs">
      <Copy size={12} />
      {tr("Duplicate", "تكرار")}
    </button>
  ) : null;

  const discardButton = dirty ? (
    <button
      onClick={() => {
        if (window.confirm(tr("Discard your changes?", "تجاهل التغييرات؟"))) onDiscard();
      }}
      className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs text-red-300"
    >
      {tr("Discard", "تجاهل")}
    </button>
  ) : null;

  const saveButton = (
    <button
      onClick={onSave}
      disabled={!dirty || saving}
      className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-40"
    >
      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
      {tr("Save Section", "حفظ القسم")}
    </button>
  );

  return (
    <EditorModal
      open
      title={section.title}
      description={section.description}
      onClose={onClose}
      actions={(
        <>
          {addButton}
          {duplicateButton}
          <div className="inline-flex rounded-full border border-border bg-surface/30 p-1" role="group" aria-label={tr("Preview language", "لغة المعاينة")}>
            {(["en", "ar"] as PreviewLang[]).map((pl) => (
              <button
                key={pl}
                onClick={() => setPreviewLang(pl)}
                aria-pressed={previewLang === pl}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all ${
                  previewLang === pl ? "bg-primary/12 text-primary" : "text-muted hover:text-foreground"
                }`}
              >
                {pl}
              </button>
            ))}
          </div>
          {discardButton}
          {saveButton}
        </>
      )}
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-border bg-surface/30 p-1 sm:hidden" role="tablist" aria-label={tr("Mobile view", "عرض الجوال")}>
              {(["items", "editor", "preview"] as MobileCollectionPanel[]).map((panel) => {
                const labels: Record<MobileCollectionPanel, string> = {
                  items: tr("Items", "العناصر"),
                  editor: tr("Editor", "المحرر"),
                  preview: tr("Preview", "معاينة"),
                };
                return (
                  <button
                    key={panel}
                    onClick={() => setMobilePanel(panel)}
                    role="tab"
                    aria-selected={mobilePanel === panel}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all ${
                      mobilePanel === panel ? "bg-primary/12 text-primary" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {labels[panel]}
                  </button>
                );
              })}
            </div>
            <div className="inline-flex rounded-full border border-border bg-surface/30 p-1 sm:hidden" role="group" aria-label={tr("Preview language", "لغة المعاينة")}>
              {(["en", "ar"] as PreviewLang[]).map((pl) => (
                <button
                  key={pl}
                  onClick={() => setPreviewLang(pl)}
                  aria-pressed={previewLang === pl}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all ${
                    previewLang === pl ? "bg-primary/12 text-primary" : "text-muted hover:text-foreground"
                  }`}
                >
                  {pl}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 ms-auto">
            {addButton}
            {duplicateButton}
            {discardButton}
            {saveButton}
          </div>
        </div>
      )}
    >
      {items.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-border bg-surface/25 p-8 text-center">
          <div className="max-w-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-primary">
              <Sparkles size={20} />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">{tr("No segments yet", "لا توجد عناصر بعد")}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {tr(
                "Add the first item to build this public section. You can include titles, bilingual content, optional images, links, and emojis.",
                "أضف العنصر الأول لبناء هذا القسم. يمكنك تضمين عناوين ومحتوى ثنائي اللغة وصور وروابط ورموز تعبيرية.",
              )}
            </p>
            <button onClick={onAdd} className="btn-primary mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm">
              <Plus size={14} />
              {tr("Add First Item", "أضف أول عنصر")}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <div className={`space-y-3 ${mobilePanel !== "items" ? "hidden xl:block" : ""}`}>
            <div className="rounded-[24px] border border-dashed border-border bg-surface/20 px-4 py-3 text-xs leading-5 text-muted">
              {tr(
                "Drag cards to reorder. Duplicate or remove from the item controls. The preview updates as you type.",
                "اسحب البطاقات لإعادة ترتيبها. كرّر أو احذف من أدوات العنصر. تتحدّث المعاينة أثناء الكتابة.",
              )}
            </div>
            {items.map((entry, index) => {
              const previewTitle = pickItemTitle(entry, section.fields);
              const previewSubtitle = pickItemSubtitle(entry);
              const previewImage = pickItemImage(entry);

              return (
                <div
                  key={`${section.key}-${index}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelect(index);
                    setMobilePanel("editor");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(index);
                      setMobilePanel("editor");
                    }
                  }}
                  draggable
                  onDragStart={() => {
                    setDragIndex(index);
                    setDragOverIndex(index);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragIndex !== null && dragIndex !== index) onReorder(dragIndex, index);
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`w-full rounded-[24px] border p-3 text-left transition-all ${
                    index === safeIndex
                      ? "border-primary/30 bg-primary/8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                      : "border-border bg-surface/25 hover:border-primary/15"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {previewImage ? (
                      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-border bg-surface-elevated">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewImage} alt={previewTitle} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-primary/80">
                        <ImageIcon size={18} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="cursor-grab text-muted/70 active:cursor-grabbing">
                            <GripVertical size={14} />
                          </span>
                          <p className="truncate text-sm font-semibold text-foreground">{previewTitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {dragOverIndex === index && dragIndex !== null && dragIndex !== index && (
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                              {tr("Drop", "أفلت هنا")}
                            </span>
                          )}
                          <span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] text-muted">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                      {previewSubtitle && (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{previewSubtitle}</p>
                      )}
                      <div className="mt-3 flex items-center gap-1.5">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            onMove(index, -1);
                          }}
                          disabled={index === 0}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-elevated text-muted transition-colors hover:text-foreground disabled:opacity-30"
                          aria-label={tr("Move up", "نقل لأعلى")}
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            onMove(index, 1);
                          }}
                          disabled={index === items.length - 1}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-elevated text-muted transition-colors hover:text-foreground disabled:opacity-30"
                          aria-label={tr("Move down", "نقل لأسفل")}
                        >
                          <ChevronDown size={13} />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            onDuplicate(index);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-elevated text-muted transition-colors hover:text-foreground"
                          aria-label={tr("Duplicate item", "تكرار العنصر")}
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            const label = pickItemTitle(entry, section.fields);
                            const message = lang === "ar"
                              ? `هل تريد حذف "${label}"؟`
                              : `Delete "${label}"?`;
                            if (window.confirm(message)) onRemove(index);
                          }}
                          disabled={items.length <= 1}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-elevated text-red-400 transition-colors hover:text-red-300 disabled:opacity-30"
                          aria-label={lang === "ar" ? "حذف العنصر" : "Delete item"}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`rounded-[28px] border border-border bg-surface/30 p-5 ${mobilePanel !== "editor" ? "hidden xl:block" : ""}`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{tr(`Item ${safeIndex + 1}`, `العنصر ${safeIndex + 1}`)}</p>
                <p className="mt-1 text-sm text-muted">
                  {tr(
                    "Edit the selected segment here. Text supports emojis, and image fields can upload directly into the segment.",
                    "حرّر القسم المحدّد هنا. يدعم النص الرموز التعبيرية، ويمكن رفع الصور مباشرة إلى الحقل.",
                  )}
                </p>
              </div>
              <span className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted">
                {section.key}
              </span>
            </div>

            {pickItemImage(item) && (
              <div className="relative mb-5 h-52 overflow-hidden rounded-[24px] border border-border bg-surface-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pickItemImage(item)} alt={pickItemTitle(item, section.fields)} className="h-full w-full object-cover" />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {section.fields.map((field) => {
                const isImageField = field.key.toLowerCase().includes("imageurl");
                return (
                  <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                    <label className={labelCls}>{field.label}</label>
                    {field.type === "select" ? (
                      <select
                        value={item[field.key] ?? ""}
                        onChange={(event) => onChange(safeIndex, field.key, event.target.value)}
                        className={inputCls}
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-2">
                        <TextField
                          type={field.type}
                          value={item[field.key] ?? ""}
                          dir={field.key.endsWith("Ar") ? "rtl" : "ltr"}
                          onChange={(value) => onChange(safeIndex, field.key, value)}
                        />
                        {isImageField && (
                          <div className="space-y-2">
                            {item[field.key] && (
                              <div className="relative overflow-hidden rounded-[20px] border border-border bg-surface-elevated">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item[field.key]} alt={`${field.label} preview`} className="h-36 w-full object-cover" />
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-surface-elevated px-3 py-2 text-xs text-muted transition-colors hover:text-foreground">
                              <Upload size={12} />
                              {tr("Upload image", "رفع صورة")}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) void onUploadImage(safeIndex, field.key, file);
                                  event.target.value = "";
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setPickerForField(field.key)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface-elevated px-3 py-2 text-xs text-muted transition-colors hover:text-foreground"
                            >
                              <ImageIcon size={12} />
                              {tr("Pick from library", "من المكتبة")}
                            </button>
                            {item[field.key] && (
                              <button
                                type="button"
                                onClick={() => onChange(safeIndex, field.key, "")}
                                className="inline-flex items-center gap-2 rounded-2xl border border-red-300/30 bg-red-300/5 px-3 py-2 text-xs text-red-300 hover:bg-red-300/10 transition-colors"
                              >
                                <X size={12} />
                                {tr("Remove", "إزالة")}
                              </button>
                            )}
                            {item[field.key] && (
                              <span className="text-xs text-primary/80">{tr("Stored and ready for the public page.", "تم الحفظ وجاهز للصفحة العامة.")}</span>
                            )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={mobilePanel !== "preview" ? "hidden xl:block" : ""}>
            <CollectionLivePreview section={section} item={item} previewLang={previewLang} />
          </div>
        </div>
      )}

      <MediaPicker
        open={pickerForField !== null}
        onClose={() => setPickerForField(null)}
        onSelect={(url) => {
          if (pickerForField) onChange(safeIndex, pickerForField, url);
        }}
      />
    </EditorModal>
  );
}

function StatsEditorModal({
  stats,
  statsBase,
  setStats,
  saveStats,
  saving,
  onClose,
  onDiscard,
}: {
  stats: HomeStats;
  statsBase: HomeStats;
  setStats: Dispatch<SetStateAction<HomeStats>>;
  saveStats: () => void;
  saving: boolean;
  onClose: () => void;
  onDiscard: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const dirty = JSON.stringify(stats) !== JSON.stringify(statsBase);
  const STAT_LABELS: Record<keyof HomeStats, string> = {
    projects: tr("Projects", "المشاريع"),
    competitions: tr("Competitions", "المسابقات"),
    members: tr("Members", "الأعضاء"),
    departments: tr("Departments", "الأقسام"),
  };
  const discardButton = dirty ? (
    <button
      onClick={() => {
        if (window.confirm(tr("Discard your changes?", "تجاهل التغييرات؟"))) onDiscard();
      }}
      className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs text-red-300"
    >
      {tr("Discard", "تجاهل")}
    </button>
  ) : null;
  const saveButton = (
    <button
      onClick={saveStats}
      disabled={!dirty || saving}
      className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-40"
    >
      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
      {tr("Save Stats", "حفظ الأرقام")}
    </button>
  );

  return (
    <EditorModal
      open
      title={tr("Home Stats", "أرقام الصفحة الرئيسية")}
      description={tr(
        "Edit the homepage stat strip. These are the proof numbers visible in the hero area.",
        "حرّر شريط الأرقام في الصفحة الرئيسية. هذه هي الأرقام الموثّقة الظاهرة في القسم الترويسي.",
      )}
      onClose={onClose}
      actions={(<>{discardButton}{saveButton}</>)}
      footer={<div className="flex justify-end gap-2">{discardButton}{saveButton}</div>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["projects", "competitions", "members", "departments"] as (keyof HomeStats)[]).map((key) => (
          <div key={key} className="rounded-[24px] border border-border bg-surface/35 p-4">
            <label className={labelCls}>{STAT_LABELS[key]}</label>
            <input
              value={stats[key]}
              onChange={(event) => setStats((current) => ({ ...current, [key]: event.target.value }))}
              className={inputCls}
            />
          </div>
        ))}
      </div>
    </EditorModal>
  );
}

function VisibilityEditorModal({
  visibility,
  visibilityBase,
  setVisibility,
  saveVisibility,
  saving,
  onClose,
  onDiscard,
}: {
  visibility: SectionVisibility;
  visibilityBase: SectionVisibility;
  setVisibility: Dispatch<SetStateAction<SectionVisibility>>;
  saveVisibility: () => void;
  saving: boolean;
  onClose: () => void;
  onDiscard: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const dirty = JSON.stringify(visibility) !== JSON.stringify(visibilityBase);
  const VIS_LABELS: Record<keyof SectionVisibility, string> = {
    announcements: tr("Announcements", "الإعلانات"),
    motm: tr("Member of the Month", "عضو الشهر"),
    whatwedo: tr("What We Do", "ماذا نفعل"),
    workshops: tr("Workshops", "الورش"),
    projects: tr("Projects", "المشاريع"),
  };
  const discardButton = dirty ? (
    <button
      onClick={() => {
        if (window.confirm(tr("Discard your changes?", "تجاهل التغييرات؟"))) onDiscard();
      }}
      className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs text-red-300"
    >
      {tr("Discard", "تجاهل")}
    </button>
  ) : null;
  const saveButton = (
    <button
      onClick={saveVisibility}
      disabled={!dirty || saving}
      className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-40"
    >
      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
      {tr("Save Toggles", "حفظ الإعدادات")}
    </button>
  );

  return (
    <EditorModal
      open
      title={tr("Page Visibility", "ظهور الأقسام")}
      description={tr(
        "Toggle major homepage sections on or off. This changes what visitors see without changing the underlying content.",
        "تحكّم في إظهار أو إخفاء أقسام الصفحة الرئيسية الكبرى. لن يتغيّر المحتوى نفسه — فقط ما يراه الزائر.",
      )}
      onClose={onClose}
      actions={(<>{discardButton}{saveButton}</>)}
      footer={<div className="flex justify-end gap-2">{discardButton}{saveButton}</div>}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(DEFAULT_VISIBILITY) as (keyof SectionVisibility)[]).map((key) => (
          <label key={key} className="flex items-center justify-between gap-4 rounded-[24px] border border-border bg-surface/35 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{VIS_LABELS[key]}</p>
              <p className="mt-1 text-xs text-muted">{tr("Show this block on the homepage.", "إظهار هذا القسم في الصفحة الرئيسية.")}</p>
            </div>
            <button
              type="button"
              onClick={() => setVisibility((current) => ({ ...current, [key]: !current[key] }))}
              className={`inline-flex h-8 w-14 items-center rounded-full border p-1 transition-all ${
                visibility[key]
                  ? "border-primary/30 bg-primary/15 justify-end"
                  : "border-border bg-surface-elevated justify-start"
              }`}
              aria-pressed={visibility[key]}
            >
              <span className={`h-6 w-6 rounded-full ${visibility[key] ? "bg-primary" : "bg-muted/60"}`} />
            </button>
          </label>
        ))}
      </div>
    </EditorModal>
  );
}

function AdvancedRowEditor({
  row,
  onSaved,
}: {
  row: ContentRow;
  onSaved: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [en, setEn] = useState(row.en ?? "");
  const [ar, setAr] = useState(row.ar ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = en !== (row.en ?? "") || ar !== (row.ar ?? "");

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/site-content/${row.key}`, { en: en || null, ar: ar || null });
      toast.success(tr("Content saved", "تم حفظ المحتوى"));
      onSaved();
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 align-top">
        <code className="break-all font-mono text-[11px] text-primary">{row.key}</code>
        {row.json != null && (
          <span className="ms-2 rounded bg-surface-elevated px-1.5 py-0.5 text-[9px] text-muted">JSON</span>
        )}
      </td>
      <td className="min-w-[180px] px-3 py-2 align-top">
        <input
          value={en}
          onChange={(event) => setEn(event.target.value)}
          className="w-full rounded-xl border border-border bg-surface-elevated px-2.5 py-2 text-xs text-foreground placeholder:text-muted/30 focus:border-primary/40 focus:outline-none"
        />
      </td>
      <td className="min-w-[180px] px-3 py-2 align-top">
        <input
          value={ar}
          dir="rtl"
          onChange={(event) => setAr(event.target.value)}
          className="w-full rounded-xl border border-border bg-surface-elevated px-2.5 py-2 text-xs text-foreground placeholder:text-muted/30 focus:border-primary/40 focus:outline-none"
        />
      </td>
      <td className="px-3 py-2 align-top">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="btn-primary inline-flex items-center gap-1 px-3 py-2 text-xs disabled:opacity-40"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {tr("Save", "حفظ")}
        </button>
      </td>
    </tr>
  );
}

export default function ContentDashboard() {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [activeTab, setActiveTab] = useState<TabKey>("main");
  const [pageViews, setPageViews] = useState<Record<PublicPageKey, PageEditorView>>(DEFAULT_PAGE_VIEWS);
  const [editorState, setEditorState] = useState<EditorState>(null);
  const [collectionSelections, setCollectionSelections] = useState<Record<string, number>>({});
  const [previewLang, setPreviewLang] = useState<PreviewLang>("en");

  const [allRows, setAllRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [textDrafts, setTextDrafts] = useState<TextDraftMap>({});
  const [textBaseDrafts, setTextBaseDrafts] = useState<TextDraftMap>({});
  const [collectionDrafts, setCollectionDrafts] = useState<CollectionDraftMap>({});
  const [collectionBaseDrafts, setCollectionBaseDrafts] = useState<CollectionDraftMap>({});

  const [groupSaving, setGroupSaving] = useState<Record<string, boolean>>({});
  const [collectionSaving, setCollectionSaving] = useState<Record<string, boolean>>({});

  const [stats, setStats] = useState<HomeStats>(DEFAULT_STATS);
  const [statsBase, setStatsBase] = useState<HomeStats>(DEFAULT_STATS);
  const [statsSaving, setStatsSaving] = useState(false);

  const [visibility, setVisibility] = useState<SectionVisibility>(DEFAULT_VISIBILITY);
  const [visibilityBase, setVisibilityBase] = useState<SectionVisibility>(DEFAULT_VISIBILITY);
  const [visibilitySaving, setVisibilitySaving] = useState(false);

  const [assetLimit, setAssetLimit] = useState(24);
  const [assetLabel, setAssetLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recoveryDraftRef = useRef<RecoverySnapshot | null>(null);
  const recoveryAppliedRef = useRef(false);
  const [recoveryLoaded, setRecoveryLoaded] = useState(false);
  const [recoveryRestored, setRecoveryRestored] = useState(false);
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [autosaveAt, setAutosaveAt] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECOVERY_STORAGE_KEY);
      if (raw) {
        recoveryDraftRef.current = JSON.parse(raw) as RecoverySnapshot;
      }
    } catch {
      recoveryDraftRef.current = null;
    } finally {
      setRecoveryLoaded(true);
    }
  }, []);

  const loadAll = useCallback(() => {
    setLoading(true);

    api.get<ContentRow[]>("/api/site-content")
      .then((rows) => {
        const nextRows = rows ?? [];
        const nextRowMap = buildRowMap(nextRows);
        setAllRows(nextRows);
        const nextTextBase = buildTextDrafts(nextRowMap);
        const nextCollectionBase = buildCollectionDrafts(nextRowMap);
        setTextBaseDrafts(nextTextBase);
        setCollectionBaseDrafts(nextCollectionBase);

        const nextTextDrafts = recoveryDraftRef.current && !recoveryAppliedRef.current
          ? mergeTextDrafts(nextTextBase, recoveryDraftRef.current.textDrafts)
          : nextTextBase;
        const nextCollectionDrafts = recoveryDraftRef.current && !recoveryAppliedRef.current
          ? mergeCollectionDrafts(nextCollectionBase, recoveryDraftRef.current.collectionDrafts)
          : nextCollectionBase;

        setTextDrafts(nextTextDrafts);
        setCollectionDrafts(nextCollectionDrafts);

        const nextStats = typeof nextRowMap["home.stats"]?.json === "object" && nextRowMap["home.stats"]?.json
          ? { ...DEFAULT_STATS, ...(nextRowMap["home.stats"].json as Partial<HomeStats>) }
          : DEFAULT_STATS;
        setStatsBase(nextStats);
        setStats(recoveryDraftRef.current && !recoveryAppliedRef.current && recoveryDraftRef.current.stats
          ? { ...nextStats, ...recoveryDraftRef.current.stats }
          : nextStats);

        const nextVisibility = typeof nextRowMap["home.sections"]?.json === "object" && nextRowMap["home.sections"]?.json
          ? { ...DEFAULT_VISIBILITY, ...(nextRowMap["home.sections"].json as Partial<SectionVisibility>) }
          : DEFAULT_VISIBILITY;
        setVisibilityBase(nextVisibility);
        setVisibility(recoveryDraftRef.current && !recoveryAppliedRef.current && recoveryDraftRef.current.visibility
          ? { ...nextVisibility, ...recoveryDraftRef.current.visibility }
          : nextVisibility);

        if (recoveryDraftRef.current && !recoveryAppliedRef.current) {
          if (recoveryDraftRef.current.pageViews) setPageViews(recoveryDraftRef.current.pageViews);
          if (recoveryDraftRef.current.collectionSelections) setCollectionSelections(recoveryDraftRef.current.collectionSelections);
          recoveryAppliedRef.current = true;
          setRecoveryRestored(true);
          setAutosaveAt(recoveryDraftRef.current.timestamp ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { data: assets = [], isLoading: assetsLoading, mutate: loadAssets } = useApi<Asset[]>(
    `/api/upload?mime=image&limit=${assetLimit}`,
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const deleteAsset = async (asset: Asset) => {
    const confirmMsg = lang === "ar"
      ? `هل تريد حذف "${asset.label ?? asset.filename}"؟ لا يمكن التراجع.`
      : `Delete "${asset.label ?? asset.filename}"? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.delete(`/api/upload/${asset.assetId}`);
      toast.success(tr("Asset deleted", "تم حذف الأصل"));
      loadAssets();
    } catch {
      toast.error(tr("Delete failed. Please try again.", "فشل الحذف. حاول مرة أخرى."));
    }
  };

  useEffect(() => {
    if (!recoveryLoaded || loading) return;

    const dirty = hasUnsavedContent({
      textDrafts,
      textBaseDrafts,
      collectionDrafts,
      collectionBaseDrafts,
      stats,
      statsBase,
      visibility,
      visibilityBase,
    });

    if (!dirty) {
      window.localStorage.removeItem(RECOVERY_STORAGE_KEY);
      setAutosaveState("idle");
      setAutosaveAt(null);
      return;
    }

    setAutosaveState("saving");
    const timer = window.setTimeout(() => {
      try {
        const snapshot: RecoverySnapshot = {
          textDrafts,
          collectionDrafts,
          stats,
          visibility,
          pageViews,
          collectionSelections,
          timestamp: Date.now(),
        };
        window.localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(snapshot));
        setAutosaveAt(snapshot.timestamp);
        setAutosaveState("saved");
      } catch {
        setAutosaveState("idle");
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    recoveryLoaded,
    loading,
    textDrafts,
    textBaseDrafts,
    collectionDrafts,
    collectionBaseDrafts,
    stats,
    statsBase,
    visibility,
    visibilityBase,
    pageViews,
    collectionSelections,
  ]);

  const filteredRows = allRows.filter((row) => !search || row.key.toLowerCase().includes(search.toLowerCase()));
  const activePage = isPageTab(activeTab) ? activeTab : null;
  const activePageView = activePage ? pageViews[activePage] : null;
  const visibleGroups = activePage ? PUBLIC_TEXT_GROUPS.filter((group) => group.page === activePage) : [];
  const visibleCollections = activePage ? COLLECTION_CONFIGS.filter((section) => section.page === activePage) : [];

  const activeGroup = editorState?.type === "group"
    ? PUBLIC_TEXT_GROUPS.find((group) => group.id === editorState.groupId) ?? null
    : null;

  const activeCollection = editorState?.type === "collection"
    ? COLLECTION_CONFIGS.find((section) => section.key === editorState.sectionKey) ?? null
    : null;

  const updateTextDraft = (key: string, lang: "en" | "ar", value: string) => {
    setTextDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? { en: "", ar: "" }),
        [lang]: value,
      },
    }));
  };

  const saveGroup = async (group: PublicTextGroupConfig) => {
    setGroupSaving((current) => ({ ...current, [group.id]: true }));
    try {
      await Promise.all(group.fields.map((field) => {
        const draft = textDrafts[field.key] ?? { en: "", ar: "" };
        return api.patch(`/api/site-content/${field.key}`, {
          en: draft.en || null,
          ar: draft.ar || null,
        });
      }));

      setTextBaseDrafts((current) => {
        const next = { ...current };
        for (const field of group.fields) {
          next[field.key] = { ...(textDrafts[field.key] ?? { en: "", ar: "" }) };
        }
        return next;
      });
      toast.success(tr("Content group saved", "تم حفظ مجموعة المحتوى"));
      loadAll();
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setGroupSaving((current) => ({ ...current, [group.id]: false }));
    }
  };

  const updateCollectionItem = (key: string, index: number, field: string, value: string) => {
    setCollectionDrafts((current) => ({
      ...current,
      [key]: (current[key] ?? []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addCollectionItem = (section: CollectionConfig) => {
    const nextIndex = collectionDrafts[section.key]?.length ?? 0;
    const nextItem = buildEmptyCollectionItem(section, nextIndex);
    setCollectionDrafts((current) => ({
      ...current,
      [section.key]: normalizeCollectionItems(section, [...(current[section.key] ?? []), nextItem]),
    }));
    setCollectionSelections((current) => ({ ...current, [section.key]: nextIndex }));
  };

  const duplicateCollectionItem = (section: CollectionConfig, index: number) => {
    setCollectionDrafts((current) => {
      const items = [...(current[section.key] ?? [])];
      const source = items[index];
      if (!source) return current;
      items.splice(index + 1, 0, { ...source });
      return { ...current, [section.key]: normalizeCollectionItems(section, items) };
    });
    setCollectionSelections((current) => ({ ...current, [section.key]: index + 1 }));
  };

  const removeCollectionItem = (section: CollectionConfig, index: number) => {
    setCollectionDrafts((current) => {
      const nextItems = normalizeCollectionItems(
        section,
        (current[section.key] ?? []).filter((_, itemIndex) => itemIndex !== index),
      );
      return { ...current, [section.key]: nextItems };
    });
    setCollectionSelections((current) => {
      const currentIndex = current[section.key] ?? 0;
      const nextIndex = currentIndex >= index ? Math.max(0, currentIndex - 1) : currentIndex;
      return { ...current, [section.key]: nextIndex };
    });
  };

  const moveCollectionItem = (section: CollectionConfig, index: number, direction: -1 | 1) => {
    setCollectionDrafts((current) => {
      const items = [...(current[section.key] ?? [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= items.length) return current;
      const [moved] = items.splice(index, 1);
      items.splice(targetIndex, 0, moved);
      return { ...current, [section.key]: normalizeCollectionItems(section, items) };
    });
    setCollectionSelections((current) => {
      const currentIndex = current[section.key] ?? 0;
      if (currentIndex === index) return { ...current, [section.key]: index + direction };
      if (direction === -1 && currentIndex === index - 1) return { ...current, [section.key]: index };
      if (direction === 1 && currentIndex === index + 1) return { ...current, [section.key]: index };
      return current;
    });
  };

  const reorderCollectionItem = (section: CollectionConfig, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setCollectionDrafts((current) => {
      const items = [...(current[section.key] ?? [])];
      if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) return current;
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { ...current, [section.key]: normalizeCollectionItems(section, items) };
    });
    setCollectionSelections((current) => ({ ...current, [section.key]: toIndex }));
  };

  const saveCollection = async (section: CollectionConfig) => {
    setCollectionSaving((current) => ({ ...current, [section.key]: true }));
    try {
      await api.patch(`/api/site-content/${section.key}`, {
        json: collectionDrafts[section.key] ?? [],
      });
      setCollectionBaseDrafts((current) => ({
        ...current,
        [section.key]: deepClone(collectionDrafts[section.key] ?? []),
      }));
      toast.success(tr("Collection saved", "تم حفظ القسم"));
      loadAll();
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setCollectionSaving((current) => ({ ...current, [section.key]: false }));
    }
  };

  const saveStats = async () => {
    setStatsSaving(true);
    try {
      await api.patch("/api/site-content/home.stats", { json: stats });
      setStatsBase(stats);
      toast.success(tr("Stats saved", "تم حفظ الأرقام"));
      loadAll();
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setStatsSaving(false);
    }
  };

  const saveVisibility = async () => {
    setVisibilitySaving(true);
    try {
      await api.patch("/api/site-content/home.sections", { json: visibility });
      setVisibilityBase(visibility);
      toast.success(tr("Section visibility saved", "تم حفظ ظهور الأقسام"));
      loadAll();
    } catch {
      toast.error(tr("Save failed. Please try again.", "فشل الحفظ. حاول مرة أخرى."));
    } finally {
      setVisibilitySaving(false);
    }
  };

  const uploadAssetAndGetUrl = async (file: File, label?: string) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (label?.trim()) fd.append("label", label.trim());
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.success(tr("Image uploaded", "تم رفع الصورة"));
        loadAssets();
        return body?.data?.url as string | undefined;
      }
      const body = await res.json().catch(() => ({}));
      toast.error(body?.error ?? tr("Upload failed. Please try again.", "فشل الرفع. حاول مرة أخرى."));
      return undefined;
    } catch {
      toast.error(tr("Upload failed. Please try again.", "فشل الرفع. حاول مرة أخرى."));
      return undefined;
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (file: File) => {
    const url = await uploadAssetAndGetUrl(file, assetLabel.trim());
    if (url) setAssetLabel("");
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleUpload(file);
    event.target.value = "";
  };

  const copyAssetUrl = async (asset: Asset) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${asset.url}`);
      setCopied(asset.assetId);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.error(tr("Could not copy URL", "تعذّر نسخ الرابط"));
    }
  };

  const uploadCollectionImage = async (sectionKey: string, index: number, field: string, file: File) => {
    const url = await uploadAssetAndGetUrl(file, `${sectionKey}-${index + 1}`);
    if (!url) return;
    setCollectionDrafts((current) => ({
      ...current,
      [sectionKey]: (current[sectionKey] ?? []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: url } : item,
      ),
    }));
  };

  const openNewCustomSegment = (page: PublicPageKey) => {
    const section = COLLECTION_CONFIGS.find((item) => item.key === getCustomSegmentsKey(page));
    if (!section) return;
    addCollectionItem(section);
    setEditorState({ type: "collection", sectionKey: section.key });
  };

  const discardRecoveredDrafts = () => {
    setTextDrafts(textBaseDrafts);
    setCollectionDrafts(collectionBaseDrafts);
    setStats(statsBase);
    setVisibility(visibilityBase);
    setPageViews(DEFAULT_PAGE_VIEWS);
    setCollectionSelections({});
    window.localStorage.removeItem(RECOVERY_STORAGE_KEY);
    recoveryDraftRef.current = null;
    setRecoveryRestored(false);
    setAutosaveAt(null);
    setAutosaveState("idle");
  };

  const dismissRecoveryNotice = () => {
    setRecoveryRestored(false);
  };

  const groupIsDirty = (group: PublicTextGroupConfig) => group.fields.some((field) => {
    const current = textDrafts[field.key];
    const baseline = textBaseDrafts[field.key];
    return current?.en !== baseline?.en || current?.ar !== baseline?.ar;
  });

  const collectionIsDirty = (key: string) =>
    JSON.stringify(collectionDrafts[key] ?? []) !== JSON.stringify(collectionBaseDrafts[key] ?? []);

  return (
    <div>
      <DashboardHeader
        title={lang === "ar" ? "إدارة المحتوى" : "Content Management"}
        description={lang === "ar" ? "أدر الموقع العام مباشرة. تنقل صفحة بصفحة، وبدّل بين النصوص والعناصر، ثم عدّل كل قسم في نافذة مركزة بدل التمرير داخل صفوف مزدحمة." : "Manage the public site online. Switch page by page, toggle between copy and segments, then edit each section in a focused popup instead of scrolling through dense rows."}
      />

      <div className="space-y-8">
        <section className="glass-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{tr("Editor Recovery", "استرجاع المحرّر")}</p>
              <p className="mt-1 text-sm text-muted">
                {autosaveState === "saving"
                  ? tr("Saving draft locally…", "يجري حفظ مسودة محلية…")
                  : autosaveAt
                    ? (recoveryRestored
                        ? tr(`Local draft recovered at ${formatAutosaveTime(autosaveAt, lang)}.`, `تم استرجاع المسودة المحلية في ${formatAutosaveTime(autosaveAt, lang)}.`)
                        : tr(`Local draft saved at ${formatAutosaveTime(autosaveAt, lang)}.`, `تم حفظ المسودة المحلية في ${formatAutosaveTime(autosaveAt, lang)}.`))
                    : tr("No local draft stored right now.", "لا توجد مسودة محلية محفوظة حاليًا.")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {recoveryRestored && (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                  {tr("Recovery applied", "تم تطبيق الاسترجاع")}
                </span>
              )}
              {autosaveState === "saved" && (
                <span className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted">
                  {tr("Autosave on", "الحفظ التلقائي مفعّل")}
                </span>
              )}
              {recoveryRestored && (
                <>
                  <button onClick={dismissRecoveryNotice} className="btn-secondary px-3 py-2 text-xs">
                    {tr("Keep Recovered Draft", "الاحتفاظ بالمسودة")}
                  </button>
                  <button onClick={discardRecoveredDrafts} className="btn-secondary px-3 py-2 text-xs text-red-300">
                    {tr("Discard Recovery", "تجاهل الاسترجاع")}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="glass-card p-4">
          <div className="tab-rail" role="tablist" aria-label={tr("Content sections", "أقسام المحتوى")}>
            {CONTENT_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                data-active={activeTab === tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className="tab-pill"
              >
                {lang === "ar" ? tab.labelAr : tab.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            {(() => {
              const t = CONTENT_TABS.find((tab) => tab.key === activeTab);
              if (!t) return "";
              return lang === "ar" ? t.descriptionAr : t.description;
            })()}
          </p>
        </section>

        {activePage === "join" && <JoinControlsCard />}

        {activePage && (
          <section className="glass-card overflow-hidden p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/90">
                  {lang === "ar" ? PAGE_TITLES[activePage].ar : PAGE_TITLES[activePage].en}
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-foreground">{tr("Workspace for this page", "مساحة العمل لهذه الصفحة")}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                  {tr(
                    "Use Copy for bilingual text and labels. Use Segments for cards, media blocks, page toggles, stats, and the new custom segments that render directly on the public pages.",
                    "استخدم \"النصوص\" للنص ثنائي اللغة والتسميات. استخدم \"الأقسام\" للبطاقات وكتل الوسائط ومفاتيح الإظهار والأرقام والأقسام المخصصة التي تظهر مباشرةً في الصفحات العامة.",
                  )}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                  <span className="rounded-full border border-border bg-surface-elevated px-3 py-1">
                    {tr(`${visibleGroups.length} copy groups`, `${visibleGroups.length} مجموعة نصية`)}
                  </span>
                  <span className="rounded-full border border-border bg-surface-elevated px-3 py-1">
                    {tr(`${visibleCollections.length + (activePage === "main" ? 2 : 0)} segment editors`, `${visibleCollections.length + (activePage === "main" ? 2 : 0)} محرر أقسام`)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-border bg-surface/30 p-1" role="tablist" aria-label={tr("Page view", "نمط العرض")}>
                  {(Object.keys(PAGE_VIEW_LABELS) as PageEditorView[]).map((view) => {
                    const Icon = PAGE_VIEW_LABELS[view].icon;
                    const active = pageViews[activePage] === view;
                    return (
                      <button
                        key={view}
                        onClick={() => setPageViews((current) => ({ ...current, [activePage]: view }))}
                        role="tab"
                        aria-selected={active}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                          active ? "bg-primary/12 text-primary" : "text-muted hover:text-foreground"
                        }`}
                      >
                        <Icon size={14} />
                        {lang === "ar" ? PAGE_VIEW_LABELS[view].labelAr : PAGE_VIEW_LABELS[view].label}
                      </button>
                    );
                  })}
                </div>

                {activePageView === "segments" && (
                  <button
                    onClick={() => openNewCustomSegment(activePage)}
                    className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    <Plus size={14} />
                    {tr("New Segment", "قسم جديد")}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {activePage && activePageView === "copy" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">{tr("Copy Editors", "محرّرات النصوص")}</h3>
                <p className="mt-1 text-sm text-muted">
                  {tr(
                    "Each card opens a focused popup for that content block. No more long rows on the main page.",
                    "تفتح كل بطاقة نافذة مركّزة لتحرير الكتلة. لا مزيد من الصفوف الطويلة في الصفحة الرئيسية.",
                  )}
                </p>
              </div>
              <span className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted">
                {lang === "ar" ? PAGE_VIEW_LABELS.copy.descriptionAr : PAGE_VIEW_LABELS.copy.description}
              </span>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleGroups.map((group) => (
                <LaunchCard
                  key={group.id}
                  title={group.title}
                  description={group.description}
                  meta={tr(`${group.fields.length} editable fields`, `${group.fields.length} حقول قابلة للتحرير`)}
                  dirty={groupIsDirty(group)}
                  icon={<FileText size={18} />}
                  onClick={() => setEditorState({ type: "group", groupId: group.id })}
                />
              ))}
            </div>
          </section>
        )}

        {activePage && activePageView === "segments" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">{tr("Segment Editors", "محرّرات الأقسام")}</h3>
                <p className="mt-1 text-sm text-muted">
                  {tr(
                    "Open a segment card to edit its data in a popup. This keeps the page clean while still supporting rich section editing and media uploads.",
                    "افتح بطاقة قسم لتحرير بياناتها في نافذة منفصلة. هذا يبقي الصفحة نظيفة ويدعم تحريرًا غنيًا ورفع وسائط.",
                  )}
                </p>
              </div>
              <span className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted">
                {lang === "ar" ? PAGE_VIEW_LABELS.segments.descriptionAr : PAGE_VIEW_LABELS.segments.description}
              </span>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {activePage === "main" && (
                <>
                  <LaunchCard
                    title={tr("Home Stats", "أرقام الصفحة الرئيسية")}
                    description={tr(
                      "Numbers shown in the homepage hero proof strip. This moved here from the executive dashboard.",
                      "الأرقام الظاهرة في شريط الإثبات بالقسم الترويسي للصفحة الرئيسية. تم نقلها إلى هنا من لوحة التنفيذيين.",
                    )}
                    meta={tr("4 numeric proof fields", "٤ حقول رقمية")}
                    dirty={JSON.stringify(stats) !== JSON.stringify(statsBase)}
                    icon={<Settings2 size={18} />}
                    onClick={() => setEditorState({ type: "stats" })}
                  />
                  <LaunchCard
                    title={tr("Home Section Toggles", "ظهور أقسام الصفحة الرئيسية")}
                    description={tr(
                      "Show or hide major homepage sections without removing their data. Executive users now manage these here in Content.",
                      "أظهر أو أخفِ أقسام الصفحة الرئيسية دون حذف بياناتها. يديرها التنفيذيون الآن من قسم المحتوى.",
                    )}
                    meta={tr(`${Object.keys(DEFAULT_VISIBILITY).length} visibility toggles`, `${Object.keys(DEFAULT_VISIBILITY).length} مفاتيح ظهور`)}
                    dirty={JSON.stringify(visibility) !== JSON.stringify(visibilityBase)}
                    icon={<Eye size={18} />}
                    onClick={() => setEditorState({ type: "visibility" })}
                  />
                </>
              )}

              {visibleCollections.map((section) => (
                <LaunchCard
                  key={section.key}
                  title={section.title}
                  description={section.description}
                  meta={tr(`${collectionDrafts[section.key]?.length ?? section.defaults.length} items`, `${collectionDrafts[section.key]?.length ?? section.defaults.length} عناصر`)}
                  dirty={collectionIsDirty(section.key)}
                  icon={section.key.endsWith("customSegments") ? <Sparkles size={18} /> : <LayoutGrid size={18} />}
                  onClick={() => setEditorState({ type: "collection", sectionKey: section.key })}
                />
              ))}
            </div>
          </section>
        )}

        {activeTab === "assets" && (
          <section className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">{tr("Visual Assets", "الأصول البصرية")}</h3>
                <p className="mt-1 text-sm text-muted">{tr("Upload image assets and copy public URLs for announcements, sections, and cards.", "ارفع الصور وانسخ روابطها العامة للإعلانات والأقسام والبطاقات.")}</p>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs">
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {tr("Upload Image", "رفع صورة")}
              </button>
            </div>

            <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className={labelCls}>{tr("Asset Label", "تسمية الأصل")}</label>
                <input
                  value={assetLabel}
                  onChange={(event) => setAssetLabel(event.target.value)}
                  className={inputCls}
                  placeholder={tr("Optional friendly label", "تسمية اختيارية مألوفة")}
                />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map((asset) => (
                <div key={asset.assetId} className="overflow-hidden rounded-[24px] border border-border bg-surface/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.label ?? asset.filename} loading="lazy" className="h-44 w-full object-cover bg-black/10" />
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="line-clamp-1 text-sm font-medium text-foreground">{asset.label ?? asset.filename}</p>
                      <p className="mt-1 break-all text-xs text-muted">{asset.url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => void copyAssetUrl(asset)} className="btn-secondary inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs">
                        {copied === asset.assetId ? <Check size={12} /> : <Copy size={12} />}
                        {copied === asset.assetId ? tr("Copied URL", "تم النسخ") : tr("Copy URL", "نسخ الرابط")}
                      </button>
                      <button
                        onClick={() => void deleteAsset(asset)}
                        aria-label={tr("Delete asset", "حذف الأصل")}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-red-400 transition-colors hover:text-red-300"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {assets.length >= assetLimit && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setAssetLimit((current) => current + 24)}
                  disabled={assetsLoading}
                  className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-40"
                >
                  {assetsLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                  {tr("Load more", "تحميل المزيد")}
                </button>
              </div>
            )}

            {!assetsLoading && assets.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-border bg-surface/20 p-8 text-center text-sm text-muted">
                {tr("No assets yet. Upload your first image above.", "لا توجد أصول بعد. ارفع أول صورة من الأعلى.")}
              </div>
            )}
          </section>
        )}

        {activeTab === "advanced" && (
          <section className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">{tr("Advanced Keys", "المفاتيح المتقدمة")}</h3>
                <p className="mt-1 text-sm text-muted">{tr("Direct bilingual edits for any stored site content key.", "تحرير ثنائي اللغة مباشرة لأي مفتاح محتوى مخزّن.")}</p>
              </div>
              <div className="relative w-full max-w-sm">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={tr("Search stored keys", "ابحث في المفاتيح")}
                  className="w-full rounded-2xl border border-border bg-surface-elevated py-2 ps-9 pe-3 text-sm text-foreground placeholder:text-muted/40 focus:border-primary/40 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-auto rounded-[24px] border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface/60 text-xs uppercase tracking-[0.18em] text-muted">
                  <tr>
                    <th className="px-4 py-3 text-start">{tr("Key", "المفتاح")}</th>
                    <th className="px-3 py-3 text-start">{tr("English", "الإنجليزية")}</th>
                    <th className="px-3 py-3 text-start">{tr("Arabic", "العربية")}</th>
                    <th className="px-3 py-3 text-start">{tr("Action", "إجراء")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted">{tr("Loading content…", "يتم تحميل المحتوى…")}</td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted">{tr("No stored keys found.", "لا توجد مفاتيح مخزّنة.")}</td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => <AdvancedRowEditor key={row.key} row={row} onSaved={loadAll} />)
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {activeGroup && (
        <GroupEditorModal
          group={activeGroup}
          drafts={textDrafts}
          baseDrafts={textBaseDrafts}
          onChange={updateTextDraft}
          onSave={() => void saveGroup(activeGroup)}
          onDiscard={() => {
            setTextDrafts((current) => {
              const next = { ...current };
              for (const field of activeGroup.fields) {
                next[field.key] = { ...(textBaseDrafts[field.key] ?? { en: "", ar: "" }) };
              }
              return next;
            });
          }}
          saving={Boolean(groupSaving[activeGroup.id])}
          onClose={() => setEditorState(null)}
        />
      )}

      {activeCollection && (
        <CollectionEditorModal
          section={activeCollection}
          items={collectionDrafts[activeCollection.key] ?? deepClone(activeCollection.defaults)}
          baseItems={collectionBaseDrafts[activeCollection.key] ?? deepClone(activeCollection.defaults)}
          selectedIndex={collectionSelections[activeCollection.key] ?? 0}
          previewLang={previewLang}
          setPreviewLang={setPreviewLang}
          onSelect={(index) => setCollectionSelections((current) => ({ ...current, [activeCollection.key]: index }))}
          onChange={(index, field, value) => updateCollectionItem(activeCollection.key, index, field, value)}
          onAdd={() => addCollectionItem(activeCollection)}
          onDuplicate={(index) => duplicateCollectionItem(activeCollection, index)}
          onRemove={(index) => removeCollectionItem(activeCollection, index)}
          onMove={(index, direction) => moveCollectionItem(activeCollection, index, direction)}
          onReorder={(fromIndex, toIndex) => reorderCollectionItem(activeCollection, fromIndex, toIndex)}
          onSave={() => void saveCollection(activeCollection)}
          onDiscard={() => {
            setCollectionDrafts((current) => ({
              ...current,
              [activeCollection.key]: deepClone(collectionBaseDrafts[activeCollection.key] ?? activeCollection.defaults),
            }));
          }}
          onUploadImage={(index, field, file) => uploadCollectionImage(activeCollection.key, index, field, file)}
          saving={Boolean(collectionSaving[activeCollection.key])}
          onClose={() => setEditorState(null)}
        />
      )}

      {editorState?.type === "stats" && (
        <StatsEditorModal
          stats={stats}
          statsBase={statsBase}
          setStats={setStats}
          saveStats={() => void saveStats()}
          onDiscard={() => setStats(statsBase)}
          saving={statsSaving}
          onClose={() => setEditorState(null)}
        />
      )}

      {editorState?.type === "visibility" && (
        <VisibilityEditorModal
          visibility={visibility}
          visibilityBase={visibilityBase}
          setVisibility={setVisibility}
          saveVisibility={() => void saveVisibility()}
          onDiscard={() => setVisibility(visibilityBase)}
          saving={visibilitySaving}
          onClose={() => setEditorState(null)}
        />
      )}
    </div>
  );
}
