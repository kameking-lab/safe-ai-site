"use client";

import { Printer } from "lucide-react";

type PDFPrintHeaderProps = {
  industryLabel: string;
  sizeLabel: string;
  hazardLabels: string[];
};

/**
 * 印刷時にのみ表示されるヘッダー（ロゴ・日付・診断サマリー）。
 * 税理士・社労士に渡せる体裁にするため、A4縦向き想定で先頭に1度だけ配置する。
 */
export function PDFPrintHeader({ industryLabel, sizeLabel, hazardLabels }: PDFPrintHeaderProps) {
  const today = new Date();
  const dateLabel = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  return (
    <div className="hidden print:mb-6 print:block">
      <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            ANZEN AI
          </p>
          <p className="text-lg font-bold text-slate-900">
            安衛法コンプライアンス診断結果
          </p>
          <p className="mt-1 text-xs text-slate-600">
            監修：労働安全コンサルタント（登録番号260022・土木区分）
          </p>
        </div>
        <div className="text-right text-xs text-slate-700">
          <p>
            <span className="font-semibold">発行日：</span>
            {dateLabel}
          </p>
          <p className="mt-0.5">
            <span className="font-semibold">業種：</span>
            {industryLabel}
          </p>
          <p>
            <span className="font-semibold">規模：</span>
            {sizeLabel}
          </p>
          {hazardLabels.length > 0 && (
            <p>
              <span className="font-semibold">取扱・作業：</span>
              {hazardLabels.join(" / ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 画面表示用 PDF出力ボタン（クリックで window.print() 起動）。
 */
export function PDFExportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex flex-col rounded-2xl border border-slate-300 bg-white p-5 text-left shadow-sm transition hover:bg-slate-50 print:hidden"
    >
      <Printer className="h-5 w-5 text-slate-700" />
      <p className="mt-2 text-sm font-bold text-slate-900">PDF出力（印刷）</p>
      <p className="mt-1 text-[11px] text-slate-500">
        ブラウザの印刷機能でPDF保存。日付・ロゴ・診断サマリー入りで税理士・社労士に渡せる体裁
      </p>
    </button>
  );
}
