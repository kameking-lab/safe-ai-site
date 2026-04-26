/**
 * 全AIルートで共有する免責・出典明示テンプレート
 *
 * 佐藤指摘（AIが断定的に法解釈を述べる）への対応:
 * - 全AIレスポンスに法的免責フッターを自動付与
 * - 拘束力レベルを明示するバッジ用定数を一元管理
 */

/** システムプロンプト末尾に追加する免責指示 */
export const AI_DISCLAIMER_SYSTEM_INSTRUCTION = `
【重要：免責・表現ルール】
- 回答は「～と考えられます」「～とされています」等の表現を使い、断定を避けること
- 法令解釈が行政・判例によって異なる可能性がある場合は必ずその旨を明記すること
- 回答の最後に必ず以下の免責文を付記すること：

---
⚠️ 本回答はAIによる情報提供であり、法的助言・法令解釈の確定ではありません。具体的な法的判断・実務対応は、労働安全コンサルタント・弁護士等の専門家にご相談ください。`;

/** レスポンスJSONやUI表示に付与する標準免責テキスト */
export const AI_LEGAL_DISCLAIMER =
  "本回答はAIによる情報提供であり、法的助言・法令解釈の確定ではありません。具体的な法的判断・実務対応は、労働安全コンサルタント・弁護士等の専門家にご相談ください。";

/**
 * 出典の拘束力レベル定義
 * notice-search.ts の MhlwNotice["bindingLevel"] と同一値
 */
export type SourceBindingLevel = "law" | "binding" | "indirect" | "reference";

export const BINDING_BADGE: Record<
  SourceBindingLevel,
  { label: string; color: string }
> = {
  law: { label: "法令", color: "bg-red-100 text-red-900 border-red-300" },
  binding: { label: "告示", color: "bg-amber-100 text-amber-900 border-amber-300" },
  indirect: { label: "通達", color: "bg-blue-100 text-blue-900 border-blue-300" },
  reference: { label: "指針", color: "bg-emerald-100 text-emerald-900 border-emerald-300" },
};
