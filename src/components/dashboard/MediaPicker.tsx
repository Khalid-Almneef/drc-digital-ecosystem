"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Image as ImageIcon, Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { useLang } from "@/contexts/LanguageContext";

interface Asset {
  assetId: number;
  url: string;
  filename: string;
  mimeType: string;
  label: string | null;
  createdAt: string;
}

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function MediaPicker({ open, onClose, onSelect }: MediaPickerProps) {
  const { lang } = useLang();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;

      setLoading(true);
      try {
        const data = await api.get<Asset[]>("/api/upload?mime=image&limit=60");
        if (!cancelled) setAssets(data ?? []);
      } catch {
        if (!cancelled) setAssets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = assets.filter((a) =>
    !search || (a.label ?? a.filename).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] z-50 mx-auto max-w-3xl bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold text-foreground">{lang === "ar" ? "مكتبة الوسائط" : "Media Library"}</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted/50" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={lang === "ar" ? "ابحث..." : "Search…"}
                    className="pl-7 pr-3 py-1.5 text-xs rounded-lg bg-surface-elevated border border-border text-foreground placeholder:text-muted/40 focus:outline-none focus:border-primary/40 w-40"
                  />
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-elevated transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-40 text-muted">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted">
                  <ImageIcon size={24} className="opacity-30" />
                  <p className="text-xs">
                    {assets.length === 0
                      ? (lang === "ar" ? "ما فيه صور مرفوعة إلى الآن" : "No images uploaded yet")
                      : (lang === "ar" ? `ما لقينا نتائج لـ "${search}"` : `No results for "${search}"`)}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {filtered.map((asset) => (
                    <button
                      key={asset.assetId}
                      onClick={() => { onSelect(asset.url); onClose(); }}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-all"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.url}
                        alt={asset.label ?? asset.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      {asset.label && (
                        <p className="absolute bottom-0 inset-x-0 text-[9px] text-white bg-black/50 px-1.5 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {asset.label}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
