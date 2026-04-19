"use client";

import { useEffect, useState } from "react";
import { KY_INDUSTRY_PRESETS, type KyIndustryPreset } from "@/data/mock/ky-industry-presets";

const DISMISSED_KEY = "ky-wizard-dismissed";

type WizardStep = "industry" | "work";

type Props = {
  onApply: (preset: KyIndustryPreset, selectedWork: string) => void;
};

export function KyInitialWizard({ onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("industry");
  const [selectedIndustry, setSelectedIndustry] = useState<KyIndustryPreset | null>(null);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (!dismissed) setOpen(true);
    } catch {
      // localStorage unavailable: default to shown
      setOpen(true);
    }
  }, []);

  const markDismissed = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
  };

  const handleClose = () => {
    markDismissed();
    setOpen(false);
  };

  const handlePickIndustry = (preset: KyIndustryPreset) => {
    setSelectedIndustry(preset);
    setStep("work");
  };

  const handlePickWork = (workExample: string) => {
    if (!selectedIndustry) return;
    onApply(selectedIndustry, workExample);
    markDismissed();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="KY用紙 業種・工種の2クリックウィザード"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-2 top-2 min-h-[48px] min-w-[48px] rounded-full text-slate-400 hover:text-slate-700"
          aria-label="閉じる"
        >
          ✕
        </button>

        <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <span className={`rounded-full px-2 py-0.5 ${step === "industry" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"}`}>
            1. 業種
          </span>
          <span className="text-slate-300">›</span>
          <span className={`rounded-full px-2 py-0.5 ${step === "work" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"}`}>
            2. 工種
          </span>
        </div>

        {step === "industry" ? (
          <>
            <h2 className="mb-1 text-lg font-bold text-slate-900">今日の作業はどの業種ですか？</h2>
            <p className="mb-3 text-xs text-slate-600">
              業種を選ぶと、その業種でよくある工種・想定リスクがKY用紙に自動入力されます。
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {KY_INDUSTRY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePickIndustry(preset)}
                  className="min-h-[56px] rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-900 transition hover:border-emerald-400 hover:bg-emerald-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
            >
              スキップして白紙から始める
            </button>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              {selectedIndustry?.label}：今日やる工種を選んでください
            </h2>
            <p className="mb-3 text-xs text-slate-600">
              選んだ工種が作業内容欄に入ります。想定リスクは3件すべて反映されます。
            </p>
            <div className="space-y-2">
              {selectedIndustry?.workExamples.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePickWork(example)}
                  className="flex min-h-[56px] w-full items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-left text-sm font-semibold text-sky-900 transition hover:border-sky-400 hover:bg-sky-100"
                >
                  <span className="rounded-full bg-sky-600 px-2 py-0.5 text-xs text-white">{idx + 1}</span>
                  <span className="flex-1">{example}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep("industry")}
                className="min-h-[48px] rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← 業種を選び直す
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[48px] rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
              >
                スキップして白紙から始める
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
