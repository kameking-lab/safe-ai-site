"use client";

import { createContext, useContext, type ReactNode } from "react";
import ja from "@/data/translations/ja.json";

type TranslationDict = typeof ja;
type TranslationKey = keyof TranslationDict;

// SEO-015 / SEO-023 (audit 2026-05-17): the client-side English UI emitted no
// indexable English HTML for Googlebot — the static SSR is `lang="ja"` and the
// `applyHtmlLang` mutation only ran post-hydration. We kept the half-baked
// English toggle off the surface to stop GSC mixed-signal until a real `/en/`
// prefixed SSR layer ships. Hooks remain exported so legacy `language === "en"`
// branches still type-check and harmlessly render the ja fallback.

export type Language = "ja" | "en";

export const SUPPORTED_LANGUAGES: readonly Language[] = ["ja"];

export const LANGUAGE_LABELS: Record<Language, string> = {
  ja: "日本語",
  en: "English",
};

export const LANGUAGE_SHORT: Record<Language, string> = {
  ja: "日",
  en: "EN",
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toast: string | null;
}

const NOOP_VALUE: LanguageContextValue = {
  language: "ja",
  setLanguage: () => undefined,
  toast: null,
};

const LanguageContext = createContext<LanguageContextValue>(NOOP_VALUE);

export function LanguageProvider({ children }: { children: ReactNode }) {
  return (
    <LanguageContext.Provider value={NOOP_VALUE}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { language } = useLanguage();
  const dict = ja as TranslationDict;
  return {
    t: (key: TranslationKey): string => dict[key] ?? key,
    language,
  };
}
