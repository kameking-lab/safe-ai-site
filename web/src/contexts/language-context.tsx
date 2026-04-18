"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Language = "ja" | "en" | "vi" | "zh" | "pt" | "tl";

export const SUPPORTED_LANGUAGES: readonly Language[] = [
  "ja",
  "en",
  "vi",
  "zh",
  "pt",
  "tl",
];

export const LANGUAGE_LABELS: Record<Language, string> = {
  ja: "日本語",
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
  pt: "Português",
  tl: "Tagalog",
};

export const LANGUAGE_SHORT: Record<Language, string> = {
  ja: "日",
  en: "EN",
  vi: "VI",
  zh: "中",
  pt: "PT",
  tl: "TL",
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "ja",
  setLanguage: () => undefined,
});

function isLanguage(v: unknown): v is Language {
  return typeof v === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(v);
}

function loadLanguage(): Language {
  if (typeof window === "undefined") return "ja";
  try {
    const stored = localStorage.getItem("language");
    if (isLanguage(stored)) return stored;
  } catch {
    // localStorage unavailable
  }
  return "ja";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(loadLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("language", lang);
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
