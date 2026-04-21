import { allLawArticles } from "@/data/laws";
import type { LawArticle } from "@/data/laws";
import { normalizeSearchText } from "@/lib/fuzzy-search";

/** キーワードマッチングによる関連条文のRAG検索 */
export function searchRelevantArticles(query: string, topK = 10): LawArticle[] {
  return searchRelevantArticlesWithScore(query, topK).articles;
}

/**
 * RAG検索結果と最高スコアを返す（信頼度計算用）
 * normalizedScore: topScore / 30 を [0,1] にクランプした値
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
  // スコア閾値を30に上げて信頼度をより厳しく評価
  const normalizedScore = Math.min(topScore / 30, 1.0);

  return {
    articles: filtered.slice(0, topK).map((item) => item.article),
    topScore,
    normalizedScore,
  };
}

/**
 * 日本語テキストをトークン化（形態素解析の代替として単純分割）
 * normalizeSearchText で表記ゆれを吸収してからトークン化する。
 *
 * 日本語の助詞（は・が・を・に・で・の・も・と・へ・や・か）でも分割し、
 * スペース無しで続けて入力された質問でも意味単位に分解できるようにする。
 */
function tokenize(text: string): string[] {
  const fuzzyNormalized = normalizeSearchText(text);

  const normalized = fuzzyNormalized
    .replace(/[？?！!。、.,\s　]/g, " ")
    .replace(/[（）()「」『』【】\[\]]/g, " ")
    // 主要な日本語助詞・助動詞で分割（これらの前後は別トークン扱い）
    .replace(/(は|が|を|に|で|の|も|と|へ|や|か|から|まで|より|など|について|に関する)/g, " ");

  const tokens = normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  return [...new Set(tokens)];
}

/**
 * 条文と検索トークンのマッチングスコアを計算
 * 改善点:
 * - 複数トークン共起ボーナス（文脈スコアリング）
 * - キーワード完全一致で追加ボーナス
 * - 法令名完全一致で高スコア
 */
function calcScore(article: LawArticle, queryTokens: string[]): number {
  let score = 0;
  const textNorm = normalizeSearchText(article.text);
  const titleNorm = normalizeSearchText(article.articleTitle);
  const articleNumLower = article.articleNum.toLowerCase();
  const lawNorm = normalizeSearchText(article.law + article.lawShort);

  let matchedTokenCount = 0;

  for (const token of queryTokens) {
    const tokenLower = token.toLowerCase();
    let tokenMatched = false;

    // 条文テキスト内のマッチ（出現回数に応じてスコア、最大5回分）
    const textOccurrences = Math.min(countOccurrences(textNorm, tokenLower), 5);
    if (textOccurrences > 0) {
      score += textOccurrences;
      tokenMatched = true;
    }

    // 条文タイトルのマッチ（高スコア）
    if (titleNorm.includes(tokenLower)) {
      score += 6;
      tokenMatched = true;
    }

    // 条文番号のマッチ（高スコア）
    if (articleNumLower.includes(tokenLower)) {
      score += 10;
      tokenMatched = true;
    }

    // キーワードリストのマッチ（完全一致=5点、部分一致=3点、どちらか最大のみ加算）
    let keywordBest = 0;
    for (const keyword of article.keywords) {
      const keyNorm = normalizeSearchText(keyword);
      if (keyNorm === tokenLower) {
        keywordBest = 5;
        break;
      } else if (keyNorm.includes(tokenLower) || tokenLower.includes(keyNorm)) {
        if (keywordBest < 3) keywordBest = 3;
      }
    }
    if (keywordBest > 0) {
      score += keywordBest;
      tokenMatched = true;
    }

    // 法令名のマッチ
    if (lawNorm.includes(tokenLower)) {
      score += 4;
      tokenMatched = true;
    }

    if (tokenMatched) matchedTokenCount++;
  }

  // 複数トークン共起ボーナス（文脈スコアリング）
  // 2トークン以上マッチした場合、マッチ数の二乗でボーナス付与
  if (matchedTokenCount >= 2) {
    score += matchedTokenCount * matchedTokenCount;
  }

  return score;
}

/** テキスト中の文字列の出現回数をカウント */
function countOccurrences(text: string, search: string): number {
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(search, index)) !== -1) {
    count++;
    index += search.length;
  }
  return count;
}

/** 条文を「○○法第XX条」形式の引用文字列にフォーマット */
export function formatCitation(article: LawArticle): string {
  return `${article.lawShort}${article.articleNum}`;
}

/** 複数の条文からチャットボット末尾用の出典文字列を生成 */
export function formatSourceCitations(articles: LawArticle[]): string {
  if (articles.length === 0) return "";
  const citations = [
    ...new Set(articles.map((a) => `${a.law}${a.articleNum}`)),
  ].slice(0, 5);
  return `\n\n📎 参照: ${citations.join("、")}`;
}

/** 検索結果をGeminiへ渡すコンテキスト文字列に変換 */
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
