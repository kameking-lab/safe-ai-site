"use client";

import { useLanguage } from "@/contexts/language-context";
import en from "@/lib/i18n/en.json";

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

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
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

  const translated = getNestedValue(en as Record<string, unknown>, k);
  const text = translated ?? fallback ?? k;

  return <Tag className={className}>{text}</Tag>;
}

/** Hook version — returns the translated string (or fallback) */
export function useTranslation(k: TranslationKey, fallback?: string): string {
  const { language } = useLanguage();
  if (language === "ja") return fallback ?? k;
  const translated = getNestedValue(en as Record<string, unknown>, k);
  return translated ?? fallback ?? k;
}
