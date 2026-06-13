"use client";

import { useState } from "react";
import { Download, ClipboardCopy, Share2, Printer, Check } from "lucide-react";

/**
 * 集計データの出力ツールバー（柱C-7「事故統計の出力手段」）。
 * 元請の「月例安全会議の資料に貼る」を完了させる4手段＝
 * CSVダウンロード（Excel控え）／要点コピー（議事録に貼る）／共有（URL）／印刷。
 * CSV・テキストは純関数で生成済みの文字列を受け取るだけ（このファイルはブラウザAPIのみ担当）。
 * 印刷物には出さない（print:hidden）。
 */

type DataExportToolbarProps = {
  /** ダウンロードファイル名（.csv 込み） */
  filename: string;
  /** CSV 本文（先頭 BOM はこの部品が付与＝Excel の文字化け防止） */
  csv: string;
  /** 「要点をコピー」で渡すプレーンテキスト */
  text: string;
  /** 共有ダイアログのタイトル */
  shareTitle: string;
  /** 共有URL（省略時は現在ページのURL） */
  shareUrl?: string;
  className?: string;
};

type Feedback = "csv" | "copy" | "share" | null;

export function DataExportToolbar({
  filename,
  csv,
  text,
  shareTitle,
  shareUrl,
  className = "",
}: DataExportToolbarProps) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [message, setMessage] = useState("");

  const flash = (kind: Feedback, msg: string) => {
    setFeedback(kind);
    setMessage(msg);
    window.setTimeout(() => {
      setFeedback(null);
      setMessage("");
    }, 2000);
  };

  const copyToClipboard = async (value: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      /* フォールバックへ */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCsv = () => {
    // 先頭 BOM で Excel の日本語文字化けを防ぐ
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash("csv", "CSVをダウンロードしました");
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    flash("copy", ok ? "要点をコピーしました" : "コピーできませんでした");
  };

  const handleShare = async () => {
    const url = shareUrl ?? window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url });
        return;
      } catch {
        // ユーザーがキャンセル／非対応 → URLコピーへフォールバック
      }
    }
    const ok = await copyToClipboard(url);
    flash("share", ok ? "URLをコピーしました" : "コピーできませんでした");
  };

  const btn =
    "inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50";

  return (
    <div
      className={`flex flex-wrap items-center gap-2 print:hidden ${className}`}
      aria-label="この集計データの出力"
    >
      <span className="text-xs font-semibold text-slate-500">会議資料に：</span>
      <button type="button" onClick={handleCsv} className={btn}>
        {feedback === "csv" ? (
          <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        CSVダウンロード
      </button>
      <button type="button" onClick={handleCopy} className={btn}>
        {feedback === "copy" ? (
          <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        ) : (
          <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
        )}
        要点をコピー
      </button>
      <button type="button" onClick={handleShare} className={btn}>
        {feedback === "share" ? (
          <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        ) : (
          <Share2 className="h-4 w-4" aria-hidden="true" />
        )}
        共有
      </button>
      <button type="button" onClick={() => window.print()} className={btn}>
        <Printer className="h-4 w-4" aria-hidden="true" />
        印刷
      </button>
      {/* 操作結果をスクリーンリーダーへ通知 */}
      <span role="status" aria-live="polite" className="sr-only">
        {message}
      </span>
    </div>
  );
}
