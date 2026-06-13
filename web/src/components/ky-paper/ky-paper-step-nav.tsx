import { Check } from "lucide-react";
import type { KyPaperStep } from "@/lib/ky/paper-status";
import { SAFETY_TONE } from "@/lib/design/safety-tone";

/**
 * 柱C-9・A2: KY記入の進行ナビ（基本情報→危険→対策→確認）。
 *
 * 用紙ファースト設計は不変。用紙の上に「いま何段目・のこり何項目」を
 * 色の文法（緑=記入済み / 青=いまここ / 灰=未着手）で一目化し、各段は
 * タップでその欄へジャンプする（最初の未記入欄へ scroll-mt アンカー移動）。
 * 無読テスト: 本文を読まず3秒で「自分がどこまで進んだか・次にどこを書くか」が分かる。
 */
export function KyPaperStepNav({ steps }: { steps: KyPaperStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <nav aria-label="KY記入の進行" className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs font-bold text-slate-500">記入の進み方</p>
        <p className="text-xs font-semibold text-slate-500">
          <span className="text-sm font-bold text-slate-800">{doneCount}</span>
          <span className="mx-0.5">/</span>
          {steps.length} 段 完了
        </p>
      </div>
      <ol className="flex items-stretch gap-1.5">
        {steps.map((step, i) => {
          const tone = step.done ? "safe" : step.current ? "info" : "neutral";
          const t = SAFETY_TONE[tone];
          return (
            <li key={step.key} className="flex-1">
              <a
                href={step.anchor}
                aria-current={step.current ? "step" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center transition ${t.soft} ${step.current ? "ring-2 ring-sky-400" : ""} hover:opacity-90`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    step.done ? `${t.solid}` : step.current ? `${t.solid}` : "bg-slate-200 text-slate-500"
                  }`}
                  aria-hidden="true"
                >
                  {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={`text-[11px] font-bold leading-tight ${t.text}`}>{step.label}</span>
                {step.remaining > 0 ? (
                  <span className="text-[10px] font-semibold text-slate-500">のこり{step.remaining}</span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-700">記入済み</span>
                )}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
