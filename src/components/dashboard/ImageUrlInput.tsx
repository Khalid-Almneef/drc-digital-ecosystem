"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { MediaPicker } from "./MediaPicker";

interface ImageUrlInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
}

export function ImageUrlInput({ value, onChange, placeholder = "https://…", className }: ImageUrlInputProps) {
  const { lang } = useLang();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className ?? "flex-1 px-3 py-2 rounded-lg bg-surface-elevated border border-border text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 transition-all"}
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="shrink-0 px-3 py-2 rounded-lg bg-surface-elevated border border-border text-muted hover:text-foreground hover:border-primary/40 transition-all flex items-center gap-1.5 text-xs"
          title={lang === "ar" ? "اختر من مكتبة الوسائط" : "Pick from media library"}
        >
          <ImageIcon size={13} />
          {lang === "ar" ? "المكتبة" : "Library"}
        </button>
      </div>
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onChange}
      />
    </>
  );
}
