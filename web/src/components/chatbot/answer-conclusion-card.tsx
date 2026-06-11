import type { ReactNode } from "react";
import { SAFETY_TONE, type SafetyTone } from "@/lib/design/safety-tone";
import { TONE_DEFAULT_ICON } from "@/components/ui/status-badge";

/**
 * チャットボット回答の結論カード（柱0・結論ファースト）。
 * 回答冒頭の結論1〜2文（verbatim・splitAnswerConclusion で切り出し）を
 * デカ文字＋トーン色帯で最初に見せる。色は「根拠の確かさ」の文法
 * （赤=範囲外参照・黄=AI推論・青=法令DB根拠）— chatbot-answer-visual.ts 参照。
 *
 * 共通 ConclusionCard は「デカ数字＋漢字短ラベル」用のためここでは使わず、
 * 文章主役の専用カードにする（1画面1メッセージの思想と色トークンは共通）。
 */

type AnswerConclusionCardProps = {
  tone: SafetyTone;
  /** 結論文（回答本文からの verbatim 抽出。言い換え禁止） */
  conclusion: ReactNode;
  /** 根拠チップ・出典件数チップなど（StatusBadge を想定） */
  children?: ReactNode;
};

export function AnswerConclusionCard({
  tone,
  conclusion,
  children,
}: AnswerConclusionCardProps) {
  const t = SAFETY_TONE[tone];
  const Icon = TONE_DEFAULT_ICON[tone];
  return (
    <section
      role="status"
      aria-label="回答の結論"
      className={`rounded-xl border-2 ${t.soft} p-3 sm:p-4`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${t.icon}`} aria-hidden="true" />
        <p className="min-w-0 whitespace-pre-wrap text-base font-bold leading-relaxed sm:text-lg">
          {conclusion}
        </p>
      </div>
      {children && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">{children}</div>
      )}
    </section>
  );
}
