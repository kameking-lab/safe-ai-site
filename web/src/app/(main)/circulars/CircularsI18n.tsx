"use client";

import { useLanguage } from "@/contexts/language-context";

export function CircularsHeader({ total, shown }: { total: number; shown: number }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <header className="mb-5">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
        {isEn
          ? "MHLW directives, notices, and guidelines"
          : "厚労省通達・告示・指針 一覧"}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {isEn ? (
          <>
            Total entries: <strong>{total.toLocaleString("en-US")}</strong> (showing latest {shown})
          </>
        ) : (
          <>
            収録件数: <strong>{total.toLocaleString("ja-JP")}件</strong>（直近{shown}件を表示）
          </>
        )}
      </p>
    </header>
  );
}

export function CircularsFooter() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <p className="mt-6 text-xs text-slate-500">
      {isEn
        ? "* Source: Japan Industrial Safety & Health Association (jaish.gr.jp). This list is organized by ANZEN AI Portal from public information with a last-verified date attached."
        : "※ 出典: 中央労働災害防止協会 安全衛生情報センター（jaish.gr.jp）。本一覧は 安全AIポータル が公開情報を整理し、最終確認日を付与したものです。"}
    </p>
  );
}
