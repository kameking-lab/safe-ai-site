"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import en from "@/data/translations/en.json";
import ja from "@/data/translations/ja.json";

type TranslationDict = typeof en;
type TranslationKey = keyof TranslationDict;

export type Language = "ja" | "en";

// セレクタに表示する言語は「実際に UI 翻訳が動いているもの」のみに絞る。
// 中文・ベトナム語・ポルトガル語・タガログ語は記事翻訳 API（LanguageButton）と
// /diversity の基本フレーズ集で個別に提供しており、サイト全体 UI 翻訳の
// 準備中ボタンを表示することは虚偽表示につながるため公開セレクタから除外。
export const SUPPORTED_LANGUAGES: readonly Language[] = ["ja", "en"];

export const LANGUAGE_LABELS: Record<Language, string> = {
  ja: "日本語",
  en: "English (Beta)",
};

export const LANGUAGE_SHORT: Record<Language, string> = {
  ja: "日",
  en: "EN",
};

// 実際に翻訳されている言語 (document.documentElement.lang に反映)
const TRANSLATION_READY: readonly Language[] = ["ja", "en"];

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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント直後の一度きりのlocalStorage hydration
        setLanguageState(stored);
        applyHtmlLang(stored);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    applyHtmlLang(lang);
    try {
      localStorage.setItem("language", lang);
    } catch {
      // localStorage unavailable
    }
    if (lang === "en") {
      setToast("This page is partially translated. Beta.");
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

export function useTranslation() {
  const { language } = useLanguage();
  const dict: TranslationDict = language === "en" ? en : (ja as TranslationDict);
  return {
    t: (key: TranslationKey): string => dict[key] ?? key,
    language,
  };
}
