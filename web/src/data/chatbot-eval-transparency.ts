/**
 * NIQ-TOOL1: /chatbot の公開eval透明性表示のための単一ソース。
 *
 * スコアカード§3-5「評価の第三者性なし（構造上の弱点）」の緩和策。
 * 「安衛法特化で精度を公開しているチャットボット」であることを、誇張なく可視化する。
 *
 * ここに置く値は docs/chatbot-genquality-51q-final-2026-07-11.json（本番51問・機械採点の
 * 一次記録）から手で転記した確定スナップショット。ナイトリーで書き換わる
 * src/data/chatbot-genquality-latest.json（23問projection）とは別物＝クロバーされない。
 *
 * === 更新手順（NIQ-OPS1 四半期再計測と連動） ===
 * 1. `CHATBOT_EVAL_BASE_URL=https://www.anzen-ai-portal.jp CHATBOT_EVAL_INTERVAL_MS=18000 npm run eval:chatbot-gen`
 * 2. 生成された一次記録の要点を docs/chatbot-genquality-<N>q-<date>.json に保存
 * 3. 下記 CHATBOT_EVAL_TRANSPARENCY の数値・measuredAt・sourceDoc を更新
 * 4. 既知の重大欠陥が出た場合は knownDefects に1行で追記（空配列＝現時点で既知欠陥なし）
 *
 * 誇張禁止の約束: strictAccuracy は「自作の公開評価セット」での値。第三者検証はない。
 * 網（質問数）を広げれば下がり得る（23問→51問拡張で一時95.7%へ低下→retrieval是正で
 * 100%回復の実績あり）。数字より「検出網＋ratchet台帳がある」ことが本質差。
 */

export interface ChatbotEvalTransparency {
  /** 公開eval全問数（範囲外質問を含む） */
  totalQuestions: number;
  /** うち採点対象（範囲内で正誤を採点した問） */
  scorableQuestions: number;
  /** 採点対象のうち完全正答 */
  correct: number;
  /** strictAccuracy（correct / scorable、0〜1） */
  strictAccuracy: number;
  /** 範囲外質問（正しく棄却できたか）: handled / total */
  outOfScopeHandled: number;
  outOfScopeTotal: number;
  /** 最終本番実測日時（ISO・記録の generated_at） */
  measuredAt: string;
  /** 実測対象の本番URL */
  baseUrl: string;
  /** 一次記録ドキュメントのパス */
  sourceDoc: string;
  /** 既知の重大欠陥（ratchet台帳）。空＝現時点で既知欠陥なし。 */
  knownDefects: readonly string[];
}

export const CHATBOT_EVAL_TRANSPARENCY: ChatbotEvalTransparency = {
  totalQuestions: 51,
  scorableQuestions: 47,
  correct: 47,
  strictAccuracy: 1.0,
  outOfScopeHandled: 4,
  outOfScopeTotal: 4,
  measuredAt: "2026-07-11T16:48:57.181Z",
  baseUrl: "https://www.anzen-ai-portal.jp",
  sourceDoc: "docs/chatbot-genquality-51q-final-2026-07-11.json",
  knownDefects: [],
};

/** strictAccuracy を百分率整数（丸め）で返す。 */
export function evalAccuracyPercent(e: ChatbotEvalTransparency = CHATBOT_EVAL_TRANSPARENCY): number {
  return Math.round(e.strictAccuracy * 100);
}

/** measuredAt を「YYYY-MM-DD」に（表示用・不正値は空文字）。 */
export function evalMeasuredOnDate(e: ChatbotEvalTransparency = CHATBOT_EVAL_TRANSPARENCY): string {
  const m = e.measuredAt.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}
