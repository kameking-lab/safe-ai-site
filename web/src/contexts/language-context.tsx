"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

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
  en: "English (Beta)",
  vi: "Tiếng Việt (準備中)",
  zh: "中文 (準備中)",
  pt: "Português (準備中)",
  tl: "Tagalog (準備中)",
};

export const LANGUAGE_SHORT: Record<Language, string> = {
  ja: "日",
  en: "EN",
  vi: "VI",
  zh: "中",
  pt: "PT",
  tl: "TL",
};

// 実際に翻訳されている言語 (document.documentElement.lang に反映)
const TRANSLATION_READY: readonly Language[] = ["ja", "en"];

// 「準備中」表示の言語
const PREPARATION_LANGUAGES: readonly Language[] = ["vi", "zh", "pt", "tl"];

function isPreparationLanguage(lang: Language): boolean {
  return PREPARATION_LANGUAGES.includes(lang);
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toast: string | null;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "ja",
  setLanguage: () => undefined,
  toast: null,
});

function isLanguage(v: unknown): v is Language {
  return typeof v === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(v);
}

function applyHtmlLang(lang: Language) {
  if (typeof document === "undefined") return;
  // 準備中言語はコンテンツが未翻訳なので html lang は ja のまま維持
  const htmlLang = TRANSLATION_READY.includes(lang) ? lang : "ja";
  document.documentElement.lang = htmlLang;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // SSR/hydration対策: 初期値は"ja"で統一し、マウント後にlocalStorageから読む
  const [language, setLanguageState] = useState<Language>("ja");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("language");
      if (isLanguage(stored)) {
        setLanguageState(stored);
        applyHtmlLang(stored);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    if (isPreparationLanguage(lang)) {
      // 準備中言語: 選択を保存せず、日本語のまま維持してトースト表示
      setToast(`${LANGUAGE_LABELS[lang]}は現在準備中です。日本語表示のまま継続します。`);
      applyHtmlLang("ja");
      return;
    }
    setLanguageState(lang);
    applyHtmlLang(lang);
    try {
      localStorage.setItem("language", lang);
    } catch {
      // localStorage unavailable
    }
    if (lang === "en") {
      setToast("English beta UI is partial. Most content remains in Japanese.");
    } else {
      setToast(null);
    }
  }, []);

  // auto-dismiss toast after 4s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toast }}>
      {children}
      {toast && <LanguageToast message={toast} onDismiss={() => setToast(null)} />}
    </LanguageContext.Provider>
  );
}

function LanguageToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900/95 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="通知を閉じる"
        className="ml-3 rounded-full px-2 text-xs text-slate-300 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
