"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { MediaPicker } from "./MediaPicker";

interface ImageUrlInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  /** Optional label folded into the upload as the asset's `label` (helps searching later). */
  uploadLabel?: string;
}

export function ImageUrlInput({ value, onChange, placeholder = "https://…", className, uploadLabel }: ImageUrlInputProps) {
  const { lang } = useLang();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", uploadLabel ? `${uploadLabel}-${Date.now()}` : `image-${Date.now()}`);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.data?.url) {
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      onChange(body.data.url);
      toast.success(lang === "ar" ? "تم رفع الصورة" : "Image uploaded");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className ?? "min-w-[12rem] flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted/40 transition-all focus:border-primary/40 focus:outline-none"}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary transition-all hover:bg-primary/15 disabled:opacity-60"
          title={lang === "ar" ? "رفع صورة من جهازك" : "Upload image from your device"}
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading
            ? (lang === "ar" ? "جاري الرفع…" : "Uploading…")
            : (lang === "ar" ? "رفع" : "Upload")}
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs text-muted transition-all hover:border-primary/40 hover:text-foreground"
          title={lang === "ar" ? "اختر من مكتبة الوسائط" : "Pick from media library"}
        >
          <ImageIcon size={13} />
          {lang === "ar" ? "المكتبة" : "Library"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void uploadFile(file);
          }}
        />
      </div>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="mt-2 h-24 w-full max-w-xs rounded-lg border border-border object-cover"
        />
      ) : null}
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onChange}
      />
    </>
  );
}
