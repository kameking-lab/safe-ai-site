"use client";

import type { MailDeliverySettings } from "@/lib/types/operations";

type MailDeliveryPanelProps = {
  value: MailDeliverySettings;
  onChange: (next: MailDeliverySettings) => void;
  onSave: () => void;
  onBuildPreview: () => void;
  previewText: string;
  savedLabel?: string;
};

export function MailDeliveryPanel({
  value,
  onChange,
  onSave,
  onBuildPreview,
  previewText,
  savedLabel,
}: MailDeliveryPanelProps) {
  const update = (patch: Partial<MailDeliverySettings>) => onChange({ ...value, ...patch });
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">メール配信設定</h2>
      <div className="mt-3 space-y-3 text-sm">
        <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
          <span>メール配信を有効化</span>
          <input checked={value.enabled} onChange={(event) => update({ enabled: event.target.checked })} type="checkbox" />
        </label>
        <div>
          <label className="block text-xs font-semibold text-slate-700" htmlFor="mail-email">宛先メール</label>
          <input
            id="mail-email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => update({ email: event.target.value })}
            placeholder="safety-team@example.com"
            type="email"
            value={value.email}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700" htmlFor="mail-frequency">配信頻度</label>
          <select
            id="mail-frequency"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => update({ frequency: event.target.value as MailDeliverySettings["frequency"] })}
            value={value.frequency}
          >
            <option value="daily">毎日</option>
            <option value="weekly">週次</option>
            <option value="only-alert">警報時のみ</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label><input checked={value.includeWeather} onChange={(event) => update({ includeWeather: event.target.checked })} type="checkbox" /> 警報注意報</label>
          <label><input checked={value.includeLaws} onChange={(event) => update({ includeLaws: event.target.checked })} type="checkbox" /> 法改正</label>
          <label><input checked={value.includeAccidents} onChange={(event) => update({ includeAccidents: event.target.checked })} type="checkbox" /> 事故DB更新</label>
          <label><input checked={value.includeLearning} onChange={(event) => update({ includeLearning: event.target.checked })} type="checkbox" /> 学習テーマ</label>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white" onClick={onSave} type="button">
          配信設定を保存
        </button>
        <button className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white" onClick={onBuildPreview} type="button">
          配信プレビューを更新
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{savedLabel}</p>
      <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{previewText}</pre>
    </section>
  );
}
