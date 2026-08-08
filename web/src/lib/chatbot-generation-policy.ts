/**
 * 安衛法チャットの外部生成AI利用境界。
 *
 * クライアント表示とAPIの判定を同じ定数へ寄せる。秘密値や環境変数は含めない。
 * 主張単位の引用支持を自動証明できるまでは、質問・履歴を外部生成AIへ送らず、
 * サイト内の法令本文検索と公式原文への案内だけを提供する。
 */
export const LEGAL_GENERATION_ENABLED = false;

export const LEGAL_GENERATION_OFF_NOTICE = {
  ja: "現在、生成AIによる法的回答は停止しています。質問と履歴を外部生成AIへ送信せず、サイト内の法令本文から確認用の根拠候補だけを検索します。結果は判定済みではありません。",
  en: "Generative legal answers are currently disabled. Questions and history are not sent to an external generative-AI provider; the tool only searches the site's law-text corpus for evidence candidates. Results are not verified decisions.",
} as const;

export const LEGAL_GENERATION_ALTERNATIVES =
  "AIを使わない法令検索とe-Gov公式原文を利用し、個別適用は現場責任者・専門家が確認してください。";

export function legalGenerationUnavailableMessage(reason: string): string {
  return (
    `生成AIによる法的回答は利用できません（${reason}）。` +
    "「安全」「問題なし」「判定済み」を意味しません。関連する法令本文の候補だけを案内します。" +
    LEGAL_GENERATION_ALTERNATIVES
  );
}
