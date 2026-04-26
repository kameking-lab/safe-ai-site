"use client";

import { useLanguage } from "@/contexts/language-context";
import en from "@/data/translations/en.json";

export function EnglishBetaBanner() {
  const { language } = useLanguage();
  if (language !== "en") return null;
  return (
    <div
      role="note"
      aria-label="English beta notice"
      className="w-full border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800"
    >
      {en["beta.notice"]}
    </div>
  );
}
