"use client";

import { InputWithVoice, TextareaWithVoice } from "@/components/voice-input-field";
import type { KySheetDraft } from "@/lib/types/operations";

type KySheetPanelProps = {
  value: KySheetDraft;
  onChange: (next: KySheetDraft) => void;
  onSave: () => void;
  onBuildPdfPreview: () => void;
  savedLabel?: string;
  briefingLines: string[];
};

export function KySheetPanel({ value, onChange, onSave, onBuildPdfPreview, savedLabel, briefingLines }: KySheetPanelProps) {
  const update = (patch: Partial<KySheetDraft>) => onChange({ ...value, ...patch });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">KY用紙（簡易版・PDF用）</h2>
      <p className="mt-1 text-xs text-slate-600">PDFプレビュー用の簡易フォームです。本紙様式は「KY用紙」ページをご利用ください。</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">
          日付
          <InputWithVoice
            className="mt-1 w-full"
            type="date"
            value={value.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          現場名
          <InputWithVoice
            className="mt-1 w-full"
            value={value.siteName}
            onChange={(e) => update({ siteName: e.target.value })}
          />
        </label>
      </div>
      <div className="mt-3 space-y-3">
        {[
          { key: "workSummary", label: "作業内容" },
          { key: "expectedRisks", label: "想定危険" },
          { key: "countermeasures", label: "対策" },
          { key: "callAndResponse", label: "指差呼称・確認事項" },
          { key: "notes", label: "補足メモ" },
        ].map((field) => (
          <label key={field.key} className="block text-xs font-semibold text-slate-700">
            {field.label}
            <TextareaWithVoice
              className="mt-1 min-h-20"
              onChange={(event) => update({ [field.key]: event.target.value } as Partial<KySheetDraft>)}
              value={value[field.key as keyof KySheetDraft] as string}
            />
          </label>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-800">朝礼要点（/signage 連携想定）</p>
        <ul className="mt-1 space-y-1 text-xs text-amber-900">
          {briefingLines.slice(0, 3).map((line) => (
            <li key={line}>- {line}</li>
          ))}
        </ul>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
          onClick={onSave}
          type="button"
        >
          KY用紙を保存
        </button>
        <button
          className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
          onClick={onBuildPdfPreview}
          type="button"
        >
          PDFプレビューを更新
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{savedLabel}</p>
    </section>
  );
}
