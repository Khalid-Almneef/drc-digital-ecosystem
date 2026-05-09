"use client";

import { useRef, useState } from "react";
import { Download, FileUp, Loader2, Upload } from "lucide-react";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { useLang } from "@/contexts/LanguageContext";

interface ImportExportToolbarProps {
  exportFilename: string;
  templateFilename: string;
  getExportCsv: () => string;
  getTemplateCsv: () => string;
  onImportRows: (rows: Record<string, string>[]) => Promise<void>;
  exportLabel?: string;
  templateLabel?: string;
  importLabel?: string;
}

export function ImportExportToolbar({
  exportFilename,
  templateFilename,
  getExportCsv,
  getTemplateCsv,
  onImportRows,
  exportLabel = "Export CSV",
  templateLabel = "Template CSV",
  importLabel = "Import CSV",
}: ImportExportToolbarProps) {
  const { lang } = useLang();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleImport(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      await onImportRows(rows);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => downloadCsv(exportFilename, getExportCsv())}
        className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs"
      >
        <Download size={13} />
        {lang === "ar" && exportLabel === "Export CSV" ? "تصدير CSV" : exportLabel}
      </button>

      <button
        onClick={() => downloadCsv(templateFilename, getTemplateCsv())}
        className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs"
      >
        <FileUp size={13} />
        {lang === "ar" && templateLabel === "Template CSV" ? "قالب CSV" : templateLabel}
      </button>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs disabled:opacity-60"
      >
        {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {lang === "ar" && importLabel === "Import CSV" ? "استيراد CSV" : importLabel}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          await handleImport(file);
        }}
      />
    </div>
  );
}
