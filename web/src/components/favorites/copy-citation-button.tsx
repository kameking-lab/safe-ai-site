"use client";

/**
 * P0-016 (usability-audit-day3-2026-05-24):
 * 条文・通達の引用テキストをクリップボードにコピーするボタン。
 *
 * navigator.clipboard.writeText を使い、成功時に 1.5 秒間「✓ コピー済」
 * 表示に切り替える。Clipboard API が使えない環境 (古いブラウザ・iframe等)
 * では console.error のみで黙って fallback。
 */

import { useCallback, useState } from "react";
import { Clipboard, Check } from "lucide-react";

type CopyCitationButtonProps = {
  /** 整形済みの引用テキスト (formatArticleCitation / formatNoticeCitation 通過後) */
  text: string;
  /** ボタンサイズ。compact = アイコンのみ、normal = アイコン + ラベル */
  variant?: "compact" | "normal";
  label?: string;
};

export function CopyCitationButton({
  text,
  variant = "compact",
  label = "引用をコピー",
}: CopyCitationButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      console.error("[copy-citation] Clipboard API unavailable");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("[copy-citation] copy failed:", err);
    }
  }, [text]);

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={copied ? "コピーしました" : label}
        title={copied ? "コピーしました" : label}
        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border transition ${
          copied
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-400 hover:border-emerald-300 hover:text-emerald-700"
        }`}
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Clipboard className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? "コピーしました" : label}
      title={label}
      className={`inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-3 py-1 text-[11px] font-semibold transition ${
        copied
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
      }`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> コピー済
        </>
      ) : (
        <>
          <Clipboard className="h-3.5 w-3.5" aria-hidden="true" /> {label}
        </>
      )}
    </button>
  );
}
