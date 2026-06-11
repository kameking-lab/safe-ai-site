"use client";

import type { SignageConclusion, SignageConclusionTone } from "@/lib/signage/signage-conclusion";

const TONE_FRAME: Record<SignageConclusionTone, string> = {
  red: "border-rose-400 bg-rose-700 text-white",
  amber: "border-amber-300 bg-amber-500 text-amber-950",
  green: "border-emerald-400 bg-emerald-700 text-white",
  slate: "border-slate-600 bg-slate-800 text-slate-200",
};

const TONE_ICON: Record<SignageConclusionTone, string> = {
  red: "🚨",
  amber: "⚠️",
  green: "✅",
  slate: "⏳",
};

const CHIP_CLASS: Record<"red" | "amber", string> = {
  red: "bg-rose-600 text-white border border-rose-300/60",
  amber: "bg-amber-400 text-amber-950 border border-amber-200/80",
};

type Props = {
  conclusion: SignageConclusion;
};

/**
 * サイネージ最上部の結論ストリップ（柱0）。数メートル先のTVから3秒で
 * 「いまの状態」が分かるよう、JIS安全色の色帯＋デカ文字1本に集約する。
 * 状態の決定ロジックは buildSignageConclusion（純関数）側に置く。
 */
export function SignageConclusionStrip({ conclusion }: Props) {
  return (
    <section
      role="status"
      aria-live="polite"
      data-signage-conclusion
      data-tone={conclusion.tone}
      className={`flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border-2 px-3 py-2 sm:rounded-2xl sm:px-4 xl:py-3 ${TONE_FRAME[conclusion.tone]}`}
    >
      <span aria-hidden="true" className="text-2xl sm:text-3xl xl:text-5xl">
        {TONE_ICON[conclusion.tone]}
      </span>
      <p
        data-signage-conclusion-label
        className="text-2xl font-extrabold leading-none tracking-wide sm:text-3xl xl:text-5xl"
      >
        {conclusion.label}
      </p>
      {conclusion.chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="そのほかの状態">
          {conclusion.chips.map((chip) => (
            <li
              key={chip.text}
              className={`rounded-full px-3 py-1 text-sm font-bold xl:text-lg ${CHIP_CLASS[chip.tone]}`}
            >
              {chip.text}
            </li>
          ))}
        </ul>
      )}
      {conclusion.sub && (
        <p className="line-clamp-2 w-full text-xs font-semibold leading-snug opacity-90 sm:text-sm xl:w-auto xl:flex-1 xl:text-lg">
          {conclusion.sub}
        </p>
      )}
    </section>
  );
}
