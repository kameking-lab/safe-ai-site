"use client";

import { useLanguage, type Language } from "@/contexts/language-context";
import en from "@/lib/i18n/en.json";
import vi from "@/lib/i18n/vi.json";
import zh from "@/lib/i18n/zh.json";
import pt from "@/lib/i18n/pt.json";
import tl from "@/lib/i18n/tl.json";

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? NestedKeyOf<T[K], `${Prefix}${K}.`>
          : `${Prefix}${K}`
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<typeof en>;

const DICTS: Record<Exclude<Language, "ja">, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  vi: vi as Record<string, unknown>,
  zh: zh as Record<string, unknown>,
  pt: pt as Record<string, unknown>,
  tl: tl as Record<string, unknown>,
};

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function lookup(language: Language, k: string): string | undefined {
  if (language === "ja") return undefined;
  const dict = DICTS[language];
  const hit = getNestedValue(dict, k);
  if (hit) return hit;
  // Fallback to English when non-English locales lack the key
  if (language !== "en") return getNestedValue(DICTS.en, k);
  return undefined;
}

interface TranslatedTextProps {
  k: TranslationKey;
  /** Fallback text (usually the Japanese original). If omitted the key is shown. */
  fallback?: string;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export function TranslatedText({
  k,
  fallback,
  className,
  as: Tag = "span",
}: TranslatedTextProps) {
  const { language } = useLanguage();

  if (language === "ja") {
    return fallback ? <Tag className={className}>{fallback}</Tag> : null;
  }

  const translated = lookup(language, k);
  const text = translated ?? fallback ?? k;

  return <Tag className={className}>{text}</Tag>;
}

/** Hook version — returns the translated string (or fallback) */
export function useTranslation(k: TranslationKey, fallback?: string): string {
  const { language } = useLanguage();
  if (language === "ja") return fallback ?? k;
  const translated = lookup(language, k);
  return translated ?? fallback ?? k;
}
