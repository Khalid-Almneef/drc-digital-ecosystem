"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";

/**
 * Generic "download CSV template + upload filled CSV" pair, used across
 * committee dashboards (HR volunteer hours, Events, Sponsors, Workshops, …).
 *
 * Each entity type gets a `templateUrl` (GET → CSV) and `uploadUrl` (POST CSV
 * body). The component handles the download, file picker, POST, and renders
 * `{ inserted, skipped, errors }` summary returned by the upload endpoint.
 */
export function BulkUploadCard({
  title,
  titleAr,
  description,
  descriptionAr,
  templateUrl,
  uploadUrl,
  templateFilename,
  onComplete,
}: {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  templateUrl: string;
  uploadUrl: string;
  templateFilename: string;
  onComplete?: () => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);

  async function downloadTemplate() {
    setDownloading(true);
    try {
      const res = await fetch(templateUrl, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = templateFilename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(tr("Template download failed.", "تعذّر تحميل القالب."));
    } finally {
      setDownloading(false);
    }
  }

  async function uploadCsv(file: File) {
    setUploading(true);
    setResult(null);
    try {
      const text = await file.text();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      const summary = json?.data ?? json;
      setResult(summary);
      if (summary.inserted > 0) {
        toast.success(tr(`Imported ${summary.inserted} rows`, `تم استيراد ${summary.inserted} صفوف`));
        onComplete?.();
      } else {
        toast.message(tr("No rows imported", "لم يتم استيراد أي صف"));
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-2">
          <FileSpreadsheet size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{tr(title, titleAr)}</h3>
          <p className="text-xs text-muted leading-relaxed mt-1">{tr(description, descriptionAr)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadTemplate}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-2 text-xs font-medium text-foreground hover:border-primary/30 transition-colors disabled:opacity-60"
        >
          {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {tr("Download template", "تحميل القالب")}
        </button>
        <label className={`inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15 ${uploading ? "opacity-60 cursor-wait" : "cursor-pointer"}`}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {tr(uploading ? "Uploading…" : "Upload filled CSV", uploading ? "جاري الرفع…" : "رفع ملف CSV المعبّأ")}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) uploadCsv(f);
            }}
          />
        </label>
      </div>

      {result && (
        <div className="mt-4 space-y-2 rounded-xl border border-border bg-surface-elevated/50 p-3 text-xs">
          <div className="flex items-center gap-2 text-foreground">
            <CheckCircle size={13} className="text-primary" />
            <span>
              {tr(
                `${result.inserted} inserted · ${result.skipped} skipped · ${result.errors.length} errors`,
                `${result.inserted} مُدخل · ${result.skipped} مُتجاوز · ${result.errors.length} خطأ`,
              )}
            </span>
          </div>
          {result.errors.slice(0, 5).map((line, i) => (
            <div key={i} className="flex items-start gap-2 text-error">
              <AlertCircle size={11} className="mt-0.5 shrink-0" />
              <span className="leading-5">{line}</span>
            </div>
          ))}
          {result.errors.length > 5 && (
            <p className="text-muted/70">
              {tr(`+${result.errors.length - 5} more errors`, `+${result.errors.length - 5} أخطاء أخرى`)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
