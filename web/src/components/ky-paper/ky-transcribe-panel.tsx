"use client";

/**
 * KY転記支援パネル（柱1是正）: 元請指定のExcel様式への「手転記」を「貼り付け」にする。
 * - 項目別コピー: 相手様式のセル配置は会社ごとに違うため項目単位でコピー。
 * - 危険と対策の表コピー: タブ区切りでExcelの表へ複数セル一括貼り付け（見出しなし）。
 * - CSVダウンロード: 控え・集計用にExcelでそのまま開ける1ファイル。
 * 印刷プレビューと同じオーバーレイ型。既存の印刷・保存・承認フローには触れない。
 */

import { useEffect, useRef, useState } from "react";
import type { KyInstructionRecordState } from "@/lib/types/operations";
import {
  buildTranscribeFields,
  riskRowsToTsv,
  kyRecordToCsv,
  kyCsvFileName,
} from "@/lib/ky/transcribe-export";

/** クリップボード書き込み。非対応ブラウザ（社用Android内蔵ブラウザ等）はテキストエリア経由。 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // http環境・権限拒否などは下のフォールバックへ
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function KyTranscribePanel({
  record,
  onClose,
}: {
  record: KyInstructionRecordState;
  onClose: () => void;
}) {
  const fields = buildTranscribeFields(record);
  const riskTsv = riskRowsToTsv(record);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  async function handleCopy(key: string, text: string) {
    const ok = await copyText(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    setCopiedKey(ok ? key : null);
    setFailedKey(ok ? null : key);
    timerRef.current = setTimeout(() => {
      setCopiedKey(null);
      setFailedKey(null);
    }, 2000);
  }

  function handleCsv() {
    // Excelで文字化けさせないためのUTF-8 BOM
    const blob = new Blob(["﻿" + kyRecordToCsv(record)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = kyCsvFileName(record);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function copyLabel(key: string): string {
    if (copiedKey === key) return "✓ コピーしました";
    if (failedKey === key) return "コピーできませんでした";
    return "コピー";
  }

  return (
    <div
      className="fixed inset-0 z-40 overflow-auto bg-slate-700/70 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Excel転記支援"
    >
      <div className="mx-auto max-w-2xl rounded bg-white p-4 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">Excel転記支援（元請様式への貼り付け）</p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] whitespace-nowrap rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            閉じる
          </button>
        </div>
        <p className="mb-1 text-xs text-slate-600">
          元請指定のExcel様式・帳票に書き写す代わりに、項目ごとにコピーして貼り付けられます。
        </p>
        <p className="mb-3 text-[11px] text-slate-500">
          ExcelがPCにある場合は、PCでこのページを開いて「クラウド最新取得」または「別端末で共有」の6桁コードでこのKYを呼び出してからコピーしてください。
        </p>

        {/* 一括出力 */}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCsv}
            className="min-h-[44px] rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
          >
            CSVをダウンロード（控え・集計用）
          </button>
          <button
            type="button"
            onClick={() => void handleCopy("riskTable", riskTsv)}
            disabled={!riskTsv}
            className="min-h-[44px] rounded-lg border border-emerald-300 bg-white px-4 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
            title="タブ区切りでコピーします。Excelの「危険のポイント」先頭セルを選んで貼り付けると表ごと入ります"
          >
            {copiedKey === "riskTable" ? "✓ コピーしました" : failedKey === "riskTable" ? "コピーできませんでした" : "危険と対策の表をコピー（Excel貼り付け用）"}
          </button>
        </div>
        <p className="mb-3 text-[11px] text-slate-500">
          表コピーは「No・危険のポイント・可能性・重大性・評価値・対策」の順。Excelで左上のセルを1つ選んで貼り付けてください（見出しは付きません）。
        </p>

        {/* 項目別コピー */}
        <ul className="divide-y divide-slate-200 rounded border border-slate-200">
          {fields.map((f) => (
            <li key={f.key} className="flex items-start gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-500">{f.label}</p>
                {f.value ? (
                  <p className="whitespace-pre-wrap break-words text-xs text-slate-800">{f.value}</p>
                ) : (
                  <p className="text-xs text-slate-400">未記入</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleCopy(f.key, f.value)}
                disabled={!f.value}
                className={`min-h-[44px] shrink-0 rounded-lg border px-3 py-1 text-[11px] font-semibold disabled:opacity-40 ${
                  copiedKey === f.key
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-sky-300 bg-white text-sky-700 hover:bg-sky-50"
                }`}
              >
                {copyLabel(f.key)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
