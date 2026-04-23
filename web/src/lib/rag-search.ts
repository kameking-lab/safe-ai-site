import { allLawArticles } from "@/data/laws";
import type { LawArticle } from "@/data/laws";
import { normalizeSearchText } from "@/lib/fuzzy-search";

/**
 * トピック別の必須条文プライン（キーワードに該当する場合、RAG 検索結果の先頭に
 * 強制的に差し込む）。安衛法第60条のように「政令で定めるもの」で参照切れに
 * なる条文はスコアだけでは十分に引けないため、施行令・規則とセットで返す。
 */
type PinnedTopic = {
  /** このトピックに該当させるキーワード（いずれか1つが query に含まれれば適用） */
  triggers: string[];
  /** 先頭に差し込む条文の { law, articleNum } ペア */
  pins: { law: string; articleNum: string }[];
};

const PINNED_TOPICS: PinnedTopic[] = [
  {
    // 職長教育：安衛法第60条＋施行令第19条（対象業種）をセットで返す
    triggers: ["職長教育", "職長", "第60条", "60条", "第六十条"],
    pins: [
      { law: "労働安全衛生法", articleNum: "第60条" },
      { law: "労働安全衛生法施行令", articleNum: "第19条" },
    ],
  },
  {
    // 熱中症：令和7年6月1日施行の安衛則第612条の2
    triggers: ["熱中症", "WBGT", "暑熱", "第612条の2", "612条の2"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第612条の2" }],
  },
];

function applyPinnedTopics(
  query: string,
  articles: LawArticle[]
): { articles: LawArticle[]; hadPins: boolean } {
  const lowered = query.toLowerCase();
  const pinned: LawArticle[] = [];
  const seen = new Set<string>();
  for (const topic of PINNED_TOPICS) {
    if (!topic.triggers.some((t) => query.includes(t) || lowered.includes(t.toLowerCase()))) {
      continue;
    }
    for (const pin of topic.pins) {
      const found = allLawArticles.find(
        (a) => a.law === pin.law && a.articleNum === pin.articleNum
      );
      if (!found) continue;
      const key = `${found.law}:${found.articleNum}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pinned.push(found);
    }
  }
  if (pinned.length === 0) return { articles, hadPins: false };
  const pinnedKeys = new Set(pinned.map((a) => `${a.law}:${a.articleNum}`));
  const rest = articles.filter((a) => !pinnedKeys.has(`${a.law}:${a.articleNum}`));
  return { articles: [...pinned, ...rest], hadPins: true };
}

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
  // 正規化の分母: 25 (タイトル一致6 + キーワード完全一致5 + テキスト一致数回 + 共起ボーナスで
  // 現実的な上限がおよそ25点になるため)。以前は30だったが、日本語助詞で分割した後の
  // 3トークン質問でも上位条文が 0.7 を十分に超えるよう緩和。
  const normalizedScore = Math.min(topScore / 25, 1.0);

  const scoredArticles = filtered.slice(0, topK).map((item) => item.article);
  const { articles: pinnedArticles, hadPins } = applyPinnedTopics(query, scoredArticles);
  const finalArticles = pinnedArticles.slice(0, topK);

  // 強制ピンが刺さった場合は、ヒット扱いで信頼度を最低 0.7 まで引き上げる
  // （ピンは明示的トピックでの確定ソースのため、キーワードスコア不足でも
  //  「関連条文なし」扱いにならないようにする）
  const adjustedScore = hadPins ? Math.max(normalizedScore, 0.7) : normalizedScore;

  return {
    articles: finalArticles,
    topScore,
    normalizedScore: adjustedScore,
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
