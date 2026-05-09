"use client";

import { useLang } from "@/contexts/LanguageContext";

export function useDirection() {
  const { lang } = useLang();
  return lang === "ar" ? -1 : 1;
}
