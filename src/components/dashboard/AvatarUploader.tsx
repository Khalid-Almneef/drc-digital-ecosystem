"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";

/**
 * Drop-in avatar control. Picks a file, POSTs to /api/upload, then PATCHes
 * the member's profile so `avatarUrl` persists.
 *
 * Optimistic UI: shows the preview as soon as upload succeeds, before the
 * PATCH round-trip completes. Errors revert.
 */
export function AvatarUploader({
  memberId,
  currentUrl,
  fallbackInitials,
  gradient,
  onChange,
}: {
  memberId: number;
  currentUrl: string | null;
  fallbackInitials: string;
  gradient: string;
  onChange?: (url: string | null) => void;
}) {
  const { lang } = useLang();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(currentUrl);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error(tr("Please pick an image file.", "اختر ملف صورة من فضلك."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(tr("Max size is 5 MB.", "الحد الأقصى 5 ميغابايت."));
      return;
    }
    setBusy(true);
    const previousUrl = url;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", `avatar-member-${memberId}`);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const newUrl: string | undefined = json?.data?.url ?? json?.url;
      if (!newUrl) throw new Error("No URL in upload response");

      // Persist on the profile
      const patch = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatarUrl: newUrl }),
      });
      if (!patch.ok) throw new Error(await patch.text());

      setUrl(newUrl);
      onChange?.(newUrl);
      toast.success(tr("Profile picture updated", "تم تحديث صورة الملف"));
    } catch (e) {
      setUrl(previousUrl);
      toast.error(tr("Upload failed.", "تعذّر رفع الصورة."));
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const patch = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatarUrl: "" }),
      });
      if (!patch.ok) throw new Error(await patch.text());
      setUrl(null);
      onChange?.(null);
      toast.success(tr("Profile picture removed", "تمت إزالة الصورة"));
    } catch {
      toast.error(tr("Could not remove. Try again.", "تعذّرت الإزالة. حاول مرة أخرى."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
      <div className="relative">
        <div className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} text-xl font-bold text-white`}>
          {url ? (
            <Image
              src={url}
              alt={tr("Profile picture", "صورة الملف")}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <span>{fallbackInitials}</span>
          )}
        </div>
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/70">
            <Loader2 size={16} className="animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 text-center sm:text-start">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-secondary inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-medium disabled:opacity-60"
        >
          <Camera size={13} />
          {url ? tr("Change picture", "تغيير الصورة") : tr("Upload picture", "رفع صورة")}
        </button>
        {url && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 text-[11px] text-muted hover:text-error transition-colors"
          >
            <Trash2 size={11} /> {tr("Remove", "إزالة")}
          </button>
        )}
        <p className="text-[10px] text-muted/70">
          {tr("PNG / JPG / WEBP — up to 5 MB", "PNG / JPG / WEBP — حتى 5 ميغابايت")}
        </p>
      </div>
    </div>
  );
}
