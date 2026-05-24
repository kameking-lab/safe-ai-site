/**
 * Phase 2 Layer 1: Pre-generation 同梱（プロンプトに条文ホワイトリストを注入）
 *
 * 設計参照: docs/chatbot-quality-research-2026-05-23/04-hallucination-prevention-design.md
 *
 * 目的:
 * - Gemini に「出力可能な条文番号リスト」を構造化セクションで明示し、
 *   範囲外の条文番号引用を抑止する第一防壁。
 * - itemNumberMap（号番号→対象業務）をホワイトリスト化して同梱し、
 *   号番号誤りも抑止する。
 *
 * 設計方針:
 * - allLawArticles を直接見ない。RAG 検索ヒット articles のみから
 *   ホワイトリストを構築する（コンテキスト圧迫を避け、回答の集中を促す）。
 * - article-registry の正規化キーと同じ buildKey ロジックで照合可能にする
 *   （Layer 2 で再利用）。
 * - 元 LawArticle を破壊変更しない（読み取り専用）。
 */

import type { LawArticle } from "@/data/laws";
import { LAW_METADATA } from "@/data/laws";
import {
  normalizeArticleNumToKey,
  parseArticleNum,
} from "@/lib/article-number-normalize";

/**
 * Layer 1 がプロンプトに同梱する許可条文の構造。
 * Layer 2 の照合キー（lawShort|articleKey）と整合する。
 */
export type AllowedCitation = {
  lawShort: string;
  lawFullName: string;
  articleNum: string;
  articleTitle: string;
  /** article-registry と同形式の正規化キー（lawShort|article-branch-paragraph-item） */
  key: string;
  /** 号番号マップ（漢数字キー → 対象業務） */
  itemNumberMap?: Record<string, string>;
};

/**
 * RAG ヒット articles から重複排除済みの AllowedCitation 配列を生成する。
 * 重複（同一 lawShort + articleNum の正規化キー）は先勝ちで保持。
 *
 * 設計メモ: 検索ヒットの順序（スコア降順）を保ったまま重複排除する。
 * 上位条文を必ずホワイトリスト先頭に置き、Gemini に「この順で重要」を伝える。
 */
export function buildAllowedCitations(articles: LawArticle[]): AllowedCitation[] {
  const seen = new Set<string>();
  const out: AllowedCitation[] = [];
  for (const a of articles) {
    const articleKey =
      normalizeArticleNumToKey(a.articleNum) ?? a.articleNum;
    const key = `${a.lawShort}|${articleKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = LAW_METADATA[a.lawShort];
    out.push({
      lawShort: a.lawShort,
      lawFullName: meta?.fullName ?? a.law,
      articleNum: a.articleNum,
      articleTitle: a.articleTitle,
      key,
      itemNumberMap: a.itemNumberMap,
    });
  }
  return out;
}

/**
 * AllowedCitation 配列をプロンプト用のテキストセクションに整形する。
 * Gemini が一目で「許可リスト」と認識できるよう、章立てを明示する。
 */
export function formatAllowedCitationsSection(
  citations: readonly AllowedCitation[]
): string {
  if (citations.length === 0) {
    return "【出力可能な条文番号リスト】\n（該当条文なし。条文番号の引用は禁止します）";
  }
  const lines: string[] = ["【出力可能な条文番号リスト（これ以外の条文番号を引用してはならない）】"];
  for (const c of citations) {
    const titlePart = c.articleTitle ? `「${c.articleTitle}」` : "";
    lines.push(`- ${c.lawFullName}（${c.lawShort}）${c.articleNum}${titlePart}`);
    if (c.itemNumberMap) {
      const items = Object.entries(c.itemNumberMap).slice(0, 12);
      for (const [k, v] of items) {
        lines.push(`    ・第${k}号 = ${v}`);
      }
    }
  }
  return lines.join("\n");
}

/**
 * 完成プロンプトを組み立てる。
 *
 * 構成:
 *   1. 【出力可能な条文番号リスト】（Layer 1 ホワイトリスト）
 *   2. 【参照法令条文】（既存の RAG context）
 *   3. （任意）【関連する所管省庁の公式ガイドライン・通達】
 *   4. 【質問】
 *   5. 回答ルール（先頭の system prompt と二重がけ）
 */
export function buildPromptWithWhitelist(args: {
  question: string;
  context: string;
  mlitContext?: string;
  allowed: readonly AllowedCitation[];
}): string {
  const { question, context, mlitContext, allowed } = args;
  const whitelistSection = formatAllowedCitationsSection(allowed);
  const mlitSection =
    mlitContext && mlitContext.trim().length > 0
      ? `\n\n【関連する所管省庁の公式ガイドライン・通達（参考）】\n${mlitContext}\n\nこれらの資料が直接該当する場合のみ、回答末尾に所管省庁名と資料名を明示してください。`
      : "";

  return `以下の法令条文を参照して、質問に答えてください。

${whitelistSection}

⚠️ 重要: 上記「出力可能な条文番号リスト」に含まれない条文番号（例: 存在しない枝番、誤った号番号、別法令の条文番号）を引用することは禁止です。リストに無い論点については「本ツールの提供データ範囲外」と明示してください。

【参照法令条文】
${context}${mlitSection}

【質問】
${question}

上記の法令条文のみに基づいて回答してください。
- 結論を本文先頭に断定形で1〜2文で書き、直後に法令名・条番号を括弧付きで併記してください。
- 引用する条文番号は必ず「出力可能な条文番号リスト」内の表記を使ってください（号番号は条文表記をそのまま、自分で変換しない）。
- 参照条文に質問への明確な答えがある場合に「明確な規定は見つかりませんでした」とぼかすことは禁止です。参照条文を引用して結論を出してください。
- 参照条文を読んでも該当論点の規定が本当に見つからない場合に限り、その旨を述べた上で e-Gov での確認を案内してください。`;
}

/**
 * デバッグ・テスト用: AllowedCitation の正規化キーだけを Set として返す。
 * Layer 2 で Gemini 応答から抽出した参照を照合する際に直接使える形。
 */
export function allowedCitationKeySet(
  citations: readonly AllowedCitation[]
): Set<string> {
  return new Set(citations.map((c) => c.key));
}
