import { allLawArticles } from "@/data/laws";
import type { LawArticle } from "@/data/laws";
import { normalizeSearchText } from "@/lib/fuzzy-search";

/**
 * キーワードマッチングによる関連条文のRAG検索
 */
export function searchRelevantArticles(query: string, topK = 10): LawArticle[] {
  return searchRelevantArticlesWithScore(query, topK).articles;
}

/**
 * RAG検索結果と最高スコアを返す（信頼度計算用）
 * normalizedScore: topScore / 20 を [0,1] にクランプした値
 */
export function searchRelevantArticlesWithScore(
  query: string,
  topK = 10
): { articles: LawArticle[]; topScore: number; normalizedScore: number } {
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return { articles: [], topScore: 0, normalizedScore: 0 };
  }

  const scored = allLawArticles.map((article) => ({
    article,
    score: calcScore(article, queryTokens),
  }));

  const filtered = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const topScore = filtered[0]?.score ?? 0;
  const normalizedScore = Math.min(topScore / 20, 1.0);

  return {
    articles: filtered.slice(0, topK).map((item) => item.article),
    topScore,
    normalizedScore,
  };
}

/**
 * 日本語テキストをトークン化（形態素解析の代替として単純分割）
 * normalizeSearchText で表記ゆれを吸収してからトークン化する。
 */
function tokenize(text: string): string[] {
  // 表記ゆれ正規化（長音符・全角半角・小書き等）
  const fuzzyNormalized = normalizeSearchText(text);

  // 記号・空白で分割し、2文字以上のトークンを抽出
  const normalized = fuzzyNormalized
    .replace(/[？?！!。、.,\s　]/g, " ")
    .replace(/[（）()「」『』【】\[\]]/g, " ");

  const tokens = normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  // 重複排除
  return [...new Set(tokens)];
}

/**
 * 条文と検索トークンのマッチングスコアを計算
 */
function calcScore(article: LawArticle, queryTokens: string[]): number {
  let score = 0;
  // 条文テキストも正規化してスコア計算
  const textLower = normalizeSearchText(article.text);
  const titleLower = normalizeSearchText(article.articleTitle);
  const articleNumLower = article.articleNum.toLowerCase();

  for (const token of queryTokens) {
    const tokenLower = token.toLowerCase();

    // 条文テキスト内のマッチ（基本スコア）
    const textOccurrences = countOccurrences(textLower, tokenLower);
    score += textOccurrences * 1;

    // 条文タイトルのマッチ（高スコア）
    if (titleLower.includes(tokenLower)) {
      score += 5;
    }

    // 条文番号のマッチ（高スコア）
    if (articleNumLower.includes(tokenLower)) {
      score += 8;
    }

    // キーワードリストのマッチ（中スコア）
    for (const keyword of article.keywords) {
      if (keyword.includes(token) || token.includes(keyword)) {
        score += 3;
        break;
      }
    }

    // 法令名のマッチ
    if (article.lawShort.includes(token) || article.law.includes(token)) {
      score += 4;
    }
  }

  return score;
}

/**
 * テキスト中の文字列の出現回数をカウント
 */
function countOccurrences(text: string, search: string): number {
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(search, index)) !== -1) {
    count++;
    index += search.length;
  }
  return count;
}

/**
 * 検索結果をGeminiへ渡すコンテキスト文字列に変換
 */
export function buildContextFromArticles(articles: LawArticle[]): string {
  if (articles.length === 0) {
    return "（関連する法令条文が見つかりませんでした）";
  }

  return articles
    .map(
      (a) =>
        `【${a.law}（${a.lawShort}）${a.articleNum}「${a.articleTitle}」】\n${a.text}`
    )
    .join("\n\n---\n\n");
}
