"use client";

import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
  getCached,
  setCached,
} from "@/lib/translation-cache";

type LanguageButtonProps = {
  /** 翻訳対象テキスト（タイトル+本文を改行連結） */
  sourceText: string;
  /** リソース種別（記事 / 通達 など） */
  resource: string;
  /** リソースID */
  resourceId: string;
  /** 事前生成済みタイトル（あれば即座に使用） */
  prebuiltTitles?: Partial<Record<LanguageCode, string>>;
};

export function LanguageButton({
  sourceText,
  resource,
  resourceId,
  prebuiltTitles,
}: LanguageButtonProps) {
  const [open, setOpen] = useState(false);
  const [activeLang, setActiveLang] = useState<LanguageCode>("ja");
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function selectLanguage(lang: LanguageCode) {
    setActiveLang(lang);
    setNotice(null);

    if (lang === "ja") {
      setTranslation(null);
      return;
    }

    // 事前生成済みタイトル（即時表示用）があれば先に出す
    if (prebuiltTitles?.[lang]) {
      setTranslation(prebuiltTitles[lang] ?? null);
    }

    // キャッシュ確認
    const cached = getCached(resource, resourceId, lang);
    if (cached) {
      setTranslation(cached);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/translate/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          targetLang: lang,
          resource,
          resourceId,
        }),
      });
      const data = (await res.json()) as { text: string; source: string; notice?: string };
      setTranslation(data.text);
      if (data.notice) setNotice(data.notice);
      if (data.source === "gemini") {
        setCached(resource, resourceId, lang, data.text);
      }
    } catch {
      setNotice("翻訳に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-900">他の言語で読む</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-semibold text-emerald-700 hover:underline"
        >
          {open ? "閉じる" : "開く"}
        </button>
      </div>

      {open && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => selectLanguage(l.code)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  activeLang === l.code
                    ? "border-emerald-500 bg-emerald-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                aria-pressed={activeLang === l.code}
              >
                <span className="mr-1" aria-hidden="true">
                  {l.flag}
                </span>
                {l.label}
              </button>
            ))}
          </div>

          {loading && (
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              翻訳中...
            </p>
          )}

          {notice && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              {notice}
            </p>
          )}

          {translation && activeLang !== "ja" && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="whitespace-pre-wrap text-xs leading-6 text-slate-700">
                {translation}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
