"use client";

import { InputWithVoice } from "@/components/voice-input-field";
import type { NotificationSettings } from "@/lib/types/operations";

type NotificationSettingsPanelProps = {
  value: NotificationSettings;
  onChange: (next: NotificationSettings) => void;
  onSave: () => void;
  savedLabel?: string;
};

export function NotificationSettingsPanel({ value, onChange, onSave, savedLabel }: NotificationSettingsPanelProps) {
  const update = (patch: Partial<NotificationSettings>) => onChange({ ...value, ...patch });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">通知設定</h2>
      <p className="mt-1 text-xs text-slate-600">現場で必要な通知だけをONにし、朝礼運用に合わせたリマインドを設定します。</p>
      <div className="mt-3 space-y-2 text-sm">
        {[
          { key: "weatherAlerts", label: "警報・注意報" },
          { key: "lawRevisions", label: "法改正" },
          { key: "accidentUpdates", label: "事故DB更新" },
          { key: "morningReminder", label: "朝礼リマインド" },
        ].map((item) => (
          <label key={item.key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <span>{item.label}</span>
            <input
              checked={value[item.key as keyof NotificationSettings] as boolean}
              onChange={(event) => update({ [item.key]: event.target.checked } as Partial<NotificationSettings>)}
              type="checkbox"
            />
          </label>
        ))}
      </div>
      <div className="mt-3">
        <label className="block text-xs font-semibold text-slate-700" htmlFor="reminder-time">朝礼リマインド時刻</label>
        <InputWithVoice
          id="reminder-time"
          className="mt-1 w-full"
          onChange={(event) => update({ reminderTime: event.target.value })}
          type="time"
          value={value.reminderTime}
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white" onClick={onSave} type="button">
          設定を保存
        </button>
        <p className="text-[11px] text-slate-500">{savedLabel}</p>
      </div>
    </section>
  );
}
