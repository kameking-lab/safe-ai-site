/**
 * 両立支援プラン作成ツールの結論（柱0・ビジュアルファースト）
 *
 * フォーム最上部に置く「いまの状態」1メッセージを純関数で組み立てる。
 * このツールは病態・職種・症状・希望勤務形態の4項目が常に既定値で埋まっており、
 * 「未入力で生成できない」状態は存在しない。よって結論カードは
 * 「記入のこり項数」ではなく "生成の前後" を1メッセージで示す:
 *   - 未生成 = 青（指示・案内: 下で選んで生成する／責めない色）
 *   - 生成済 = 緑（完了: 印刷して回覧・主治医依頼に使える）
 *
 * conditionName など生成結果の文言は plan-builder-client（generateSupportPlan）が
 * 単一ソース。ここでは言い換えをせず受け取った名称をそのまま使う。
 */

import type { SafetyTone } from "@/lib/design/safety-tone";

export interface PlanBuilderConclusion {
  tone: SafetyTone;
  /** 状態の短ラベル（体言止め） */
  title: string;
  /** 1行の補足 */
  description: string;
  /** プランを生成済みか */
  settled: boolean;
  /** 次にやること（同一ビュー内アンカー） */
  action: { href: string; label: string };
}

export function planBuilderConclusion(input: {
  submitted: boolean;
  conditionName?: string | null;
}): PlanBuilderConclusion {
  if (!input.submitted || !input.conditionName) {
    return {
      tone: "info",
      title: "プラン未作成",
      description: "病態・職種・希望勤務形態を選び、下のボタンでプランを生成します。",
      settled: false,
      action: { href: "#plan-form", label: "入力する" },
    };
  }
  return {
    tone: "safe",
    title: "プラン作成完了",
    description: `${input.conditionName} の両立支援プランを生成しました。印刷して社内回覧・主治医依頼に使えます。`,
    settled: true,
    action: { href: "#plan-output", label: "プランを見る" },
  };
}
