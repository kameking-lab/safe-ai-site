/**
 * P1-5「該当条文無し」応答パターン改革（chatbot-completion 2026-05-28）
 *
 * 社長壁打ち要件:
 *   Before: 「該当する条文は見つかりませんでした」で突き放す
 *   After : 「直接規定する条文は特定できませんが、関連法令として以下が該当します。
 *            最低限必要な措置として…。具体的な手順は公式ガイドラインで確認を」
 *
 * 設計原則（ハルシネーション対策の維持）:
 * - 提示する条文は RAG が拾った実在条文（低スコアでも実在）のみ。架空条文は作らない。
 * - 直接の規定ではないことを必ず「参考として」「関連法令として」と明示し、断定しない。
 * - 一般原則（事業者の安全配慮義務＝安衛法第3条等の実在条文）に基づく最低限の措置を
 *   「参考・一般原則として」提示し、具体的数値・個別義務は断定しない。
 * - 必ず e-Gov・厚労省・所轄労働基準監督署・専門家相談へ誘導する。
 *
 * 2系統:
 * - Gemini 利用可 かつ 関連条文あり → buildNoHitGeminiPrompt で根拠付きプロンプト生成
 * - Gemini 不可 or 関連条文ゼロ      → buildNoHitTemplate で決定的テンプレ生成
 */

import type { LawArticle } from "@/data/laws";
import type { FallbackLawSuggestion } from "@/lib/chatbot-fallback-logic";
import type { AllowedCitation } from "@/lib/chatbot-prompt-builder";
import { formatAllowedCitationsSection } from "@/lib/chatbot-prompt-builder";

/** 公式情報への誘導リンク（全 no-hit 応答の末尾に必ず付与） */
export const OFFICIAL_GUIDANCE_LINKS: ReadonlyArray<{ label: string; url: string }> = [
  { label: "e-Gov 法令検索（条文の最新・正確な原文）", url: "https://laws.e-gov.go.jp/" },
  { label: "厚労省 職場のあんぜんサイト（通達・指針・災害事例）", url: "https://anzeninfo.mhlw.go.jp/" },
  { label: "全国の労働基準監督署（個別事案の相談窓口）", url: "https://www.mhlw.go.jp/kouseiroudoushou/shozaiannai/roudoukyoku/" },
];

/** 関連条文（低スコア含む）を「参考」リストの Markdown に整形する。最大5件。 */
export function formatRelatedArticlesList(articles: readonly LawArticle[]): string {
  if (articles.length === 0) return "";
  const lines: string[] = ["", "📚 関連する可能性のある条文（参考・直接の規定ではありません）："];
  for (const a of articles.slice(0, 5)) {
    const title = a.articleTitle ? `「${a.articleTitle}」` : "";
    lines.push(`- ${a.law}（${a.lawShort}）${a.articleNum}${title}`);
  }
  return lines.join("\n");
}

/** 関連法令カテゴリ候補（searchPartialMatches 由来）を Markdown に整形する。 */
export function formatPartialMatchesList(
  suggestions: readonly FallbackLawSuggestion[]
): string {
  if (suggestions.length === 0) return "";
  const lines: string[] = ["", "🔗 関連する分野・法令カテゴリ："];
  for (const s of suggestions) {
    const hint = s.articleHint ? `（${s.articleHint}）` : "";
    const src = s.source ? ` [出典: ${s.source}]` : "";
    lines.push(`- ${s.lawName}${hint}${src}`);
    if (s.reason) lines.push(`  ${s.reason}`);
  }
  return lines.join("\n");
}

/** 公式リンク群の Markdown。 */
export function formatOfficialLinks(): string {
  const lines: string[] = ["", "✅ 公式情報で必ずご確認ください："];
  for (const l of OFFICIAL_GUIDANCE_LINKS) {
    lines.push(`- ${l.label}: ${l.url}`);
  }
  return lines.join("\n");
}

/**
 * Gemini 利用不可、または関連条文ゼロのときの決定的テンプレ応答。
 * 推測の断定を一切含まず、一般原則＋公式誘導に徹する。
 */
export function buildNoHitTemplate(args: {
  query: string;
  relatedArticles: readonly LawArticle[];
  partialMatches: readonly FallbackLawSuggestion[];
  disclaimer: string;
}): string {
  const { query, relatedArticles, partialMatches, disclaimer } = args;
  const topic = query.length > 40 ? query.slice(0, 40) + "…" : query;

  const parts: string[] = [
    `ご質問の「${topic}」を直接規定する条文は、本ツールの収録データからは特定できませんでした。`,
    `ただし、関連する可能性のある法令・一般原則をご案内します（参考情報です。確定的な法令解釈ではありません）。`,
  ];

  const related = formatRelatedArticlesList(relatedArticles);
  if (related) parts.push(related);

  const partial = formatPartialMatchesList(partialMatches);
  if (partial) parts.push(partial);

  parts.push(
    [
      "",
      "🛡 一般原則としての最低限の対応（参考）：",
      "- 労働安全衛生法は、事業者に対し労働者の危険・健康障害を防止する一般的な措置義務を定めています（安衛法第3条＝事業者等の責務、安衛法第22条＝健康障害防止措置 等）。",
      "- まず作業のリスクアセスメント（危険性・有害性の調査）を実施し、その結果に基づく低減措置を検討してください。",
      "- 具体的な基準・手順は、下記の公式ガイドライン・通達および所管省庁の最新情報でご確認ください。",
    ].join("\n")
  );

  parts.push(formatOfficialLinks());
  parts.push("", disclaimer);
  return parts.join("\n");
}

/**
 * Gemini 利用可＋関連条文ありのときの「直接ヒットなし」プロンプト。
 * 関連条文ホワイトリストを同梱し、根拠付きで「関連＋最低限措置」を生成させる。
 * 通常プロンプト（buildPromptWithWhitelist）と異なり「直接規定が無い前提」を明示する。
 */
export function buildNoHitGeminiPrompt(args: {
  question: string;
  context: string;
  allowed: readonly AllowedCitation[];
}): string {
  const { question, context, allowed } = args;
  const whitelist = formatAllowedCitationsSection(allowed);

  return `次の質問について、本ツールの収録データには「直接規定する条文」が高い確信度では見つかりませんでした。\
そのうえで、収録済みの関連条文と労働安全衛生の一般原則に基づき、現場担当者に役立つ「参考情報」を提示してください。

${whitelist}

【関連する可能性のある条文（参考。直接の規定ではない）】
${context}

【質問】
${question}

回答の必須構成（この順序・この趣旨を守る）:
1. 冒頭で「ご質問の〇〇を直接規定する条文は、本ツールの収録データからは特定できませんでした」と正直に述べる。
2. 「関連する法令として以下が参考になります」とし、上記ホワイトリスト内の条文のみを「参考として」引用する（必ず法令名＋条番号）。
3. 「一般原則としての最低限の措置（参考）」を箇条書きで示す。労働安全衛生法の事業者の一般的責務（安衛法第3条等）とリスクアセスメントの考え方に基づく一般的な内容に限る。
4. 末尾で「正確・最新の基準は e-Gov 法令検索・厚生労働省の公式情報・所轄の労働基準監督署でご確認ください。個別判断は労働安全コンサルタント等の専門家にご相談ください」と必ず案内する。

厳守事項:
- ホワイトリストに無い条文番号・架空の通達番号を引用してはならない。
- 関連条文に書かれていない具体的数値・個別の法的義務を断定してはならない（「参考として」「一般的には」と明示する）。
- 「絶対に安全」等の断定や、根拠のない手順の創作をしてはならない。`;
}
