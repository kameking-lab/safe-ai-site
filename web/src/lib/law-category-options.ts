/**
 * チャットボットの法令カテゴリフィルタ（UI 選択肢）。
 *
 * C-1（モバイル実速度の構造是正）: 以前は rag-search.ts に定義されており、
 * client の chatbot-panel がこの小さな選択肢配列のためだけに rag-search →
 * @/data/laws（法令コーパス全体・チャンク生 約1.4MB）を import していた。
 * /chatbot へ Link する全ページのプリフェッチでもこのチャンクが落ちてくるため、
 * サイト全域の LCP を悪化させていた。UI 定数だけをこの独立モジュールに分離する。
 * rag-search.ts（サーバー側 RAG）からは re-export して既存 import を壊さない。
 */

/** チャットボットの法令カテゴリフィルタ（lawShort と完全一致） */
export type LawCategoryFilter =
  | "all"
  | "安衛法"
  | "安衛則"
  | "クレーン則"
  | "有機則"
  | "特化則"
  | "酸欠則";

export const LAW_CATEGORY_OPTIONS: { value: LawCategoryFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "安衛法", label: "安衛法" },
  { value: "安衛則", label: "安衛則" },
  { value: "クレーン則", label: "クレーン則" },
  { value: "有機則", label: "有機則" },
  { value: "特化則", label: "特化則" },
  { value: "酸欠則", label: "酸欠則" },
];
