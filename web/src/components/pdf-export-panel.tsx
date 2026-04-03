"use client";

import type { PdfExportTarget } from "@/lib/types/operations";

type PdfExportPanelProps = {
  target: PdfExportTarget;
  onTargetChange: (target: PdfExportTarget) => void;
  onRefreshPreview: () => void;
  previewText: string;
};

export function PdfExportPanel({ target, onTargetChange, onRefreshPreview, previewText }: PdfExportPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">PDF出力</h2>
      <p className="mt-1 text-xs text-slate-600">軽量版として、出力対象の整理・プレビュー・印刷導線を提供します。</p>
      <div className="mt-3">
        <label className="block text-xs font-semibold text-slate-700" htmlFor="pdf-target">出力対象</label>
        <select
          id="pdf-target"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => onTargetChange(event.target.value as PdfExportTarget)}
          value={target}
        >
          <option value="ky-sheet">KY用紙</option>
          <option value="morning-briefing">朝礼要点</option>
        </select>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white" onClick={onRefreshPreview} type="button">
          プレビュー更新
        </button>
        <button className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => window.print()} type="button">
          印刷 / PDF保存
        </button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{previewText}</pre>
    </section>
  );
}
