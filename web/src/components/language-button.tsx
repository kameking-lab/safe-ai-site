"use client";

import { useState } from "react";
import { Globe, ShieldAlert } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from "@/lib/translation-cache";

type LanguageButtonProps = {
  sourceText: string;
  resource: string;
  resourceId: string;
  prebuiltTitles?: Partial<Record<LanguageCode, string>>;
};

export function LanguageButton(props: LanguageButtonProps) {
  const { prebuiltTitles } = props;
  const [open, setOpen] = useState(false);
  const [activeLang, setActiveLang] = useState<LanguageCode>("ja");

  const prebuiltTitle =
    activeLang === "ja" ? null : prebuiltTitles?.[activeLang] ?? null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950">
          <Globe className="h-4 w-4 text-slate-600" aria-hidden="true" />
          他の言語で読む
        </h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
          aria-expanded={open}
        >
          {open ? "閉じる" : "開く"}
        </button>
      </div>

      {open ? (
        <div className="mt-3">
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
            <p className="flex items-start gap-2 font-bold">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              未監修の本文機械翻訳は停止しています
            </p>
            <p className="mt-1">
              誤訳による安全上の判断を防ぐため、本文は日本語原文を正本として表示します。必要な場合は通訳者・安全衛生担当者と公式資料を確認してください。
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2" aria-label="表示言語">
            {SUPPORTED_LANGUAGES.map((language) => (
              <button
                key={language.code}
                type="button"
                onClick={() => setActiveLang(language.code)}
                className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-2 text-xs font-semibold ${
                  activeLang === language.code
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
                aria-pressed={activeLang === language.code}
              >
                <span className="mr-1" aria-hidden="true">
                  {language.flag}
                </span>
                {language.label}
              </button>
            ))}
          </div>

          {activeLang !== "ja" ? (
            <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3">
              {prebuiltTitle ? (
                <>
                  <p className="text-[11px] font-bold text-slate-700">
                    事前収載タイトル（本文訳ではありません）
                  </p>
                  <p className="mt-1 text-sm text-slate-900">{prebuiltTitle}</p>
                </>
              ) : (
                <p className="text-xs leading-5 text-slate-700">
                  この言語の確認済み表示はありません。日本語原文を参照してください。
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
