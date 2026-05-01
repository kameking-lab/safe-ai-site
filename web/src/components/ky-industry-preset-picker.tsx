"use client";

import { useEffect, useState } from "react";
import { KY_INDUSTRY_PRESETS, getPresetById, type KyIndustryPreset } from "@/data/mock/ky-industry-presets";

type Props = {
  onApply: (preset: KyIndustryPreset) => void;
};

const LAST_PRESET_KEY = "ky-last-preset-id";

export function KyIndustryPresetPicker({ onApply }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [applied, setApplied] = useState(false);
  const [lastPresetId, setLastPresetId] = useState<string>("");

  // マウント後に前回選択業種を localStorage から復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_PRESET_KEY);
      if (saved && getPresetById(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント直後の一度きりのlocalStorage hydration
        setLastPresetId(saved);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const preset = getPresetById(selectedId);
  const lastPreset = lastPresetId ? getPresetById(lastPresetId) : null;

  const handleApply = () => {
    if (!preset) return;
    onApply(preset);
    setApplied(true);
    try {
      localStorage.setItem(LAST_PRESET_KEY, preset.id);
      setLastPresetId(preset.id);
    } catch {
      // localStorage unavailable
    }
    setTimeout(() => setApplied(false), 2000);
  };

  const handleReapplyLast = () => {
    if (!lastPreset) return;
    onApply(lastPreset);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
      <p className="mb-2 text-xs font-bold text-emerald-800">業種別プリセット</p>
      {lastPreset && selectedId === "" && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
          <span>前回：<span className="font-semibold">{lastPreset.label}</span></span>
          <button
            type="button"
            onClick={handleReapplyLast}
            className="rounded-md bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-700"
          >
            再適用
          </button>
          <button
            type="button"
            onClick={() => setSelectedId(lastPreset.id)}
            className="text-[11px] font-semibold text-amber-800 underline hover:text-amber-900"
          >
            変更する
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none"
          aria-label="業種を選択"
        >
          <option value="">業種を選択...</option>
          {KY_INDUSTRY_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleApply}
          disabled={!preset}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {applied ? "適用しました ✓" : "プリセットを適用"}
        </button>
      </div>

      {preset && (
        <div className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-white p-2.5 text-[11px]">
          <p className="font-semibold text-slate-700">{preset.label}：作業例・想定リスク</p>
          <div>
            <p className="font-semibold text-slate-600">作業例</p>
            <ul className="mt-0.5 space-y-0.5 text-slate-600">
              {preset.workExamples.map((ex, i) => (
                <li key={i}>・{ex}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-600">想定リスクと対策</p>
            <ul className="mt-0.5 space-y-1.5 text-slate-600">
              {preset.risks.map((r, i) => (
                <li key={i} className="rounded border border-slate-100 bg-slate-50 p-1.5">
                  <span className="font-semibold text-red-700">危険：</span>{r.hazard}
                  <br />
                  <span className="font-semibold text-emerald-700">対策：</span>{r.reduction}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
