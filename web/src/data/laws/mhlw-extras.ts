import compact from "@/data/laws-mhlw/compact.json";
import type { LawArticle } from "./law-types";

type CompactArticle = {
  law: string;
  lawShort: string;
  articleNum: string;
  articleTitle: string;
  text: string;
  keywords: string[];
  sourceFile: string;
  page: number;
};

type CompactPayload = {
  generatedAt: string;
  total: number;
  skipped: number;
  sources: string[];
  articles: CompactArticle[];
};

const payload = compact as unknown as CompactPayload;

/**
 * MHLW の PDF 由来 (R4/R5 省令改正・通達等) から抽出した条文群。RAG の補完ソース。
 *
 * compact.json には PDF テキスト抽出に伴うノイズ（極端に短い断片、見出し無し・本文ほぼ空、
 * 同一条番号の重複断片など）が含まれており、RAG 検索結果上で curated 33 法令の本来引くべき
 * 条文を押し退けてしまう問題があった。100問ベンチマークで顕在化したため、ここで段階的に
 * フィルタする。
 *
 * 採用条件（すべて満たす）:
 *   - 本文が 30 文字以上
 *   - 条文タイトルがあれば本文 60 文字以上、無ければ本文 150 文字以上
 *   - 条文番号が漢数字表記（PDF 抽出による断片の可能性大）なら本文 200 文字以上
 *     （curated 安衛則と条番号が重複し、より高品質な curated 側を上位に出すため）
 */
const KANJI_DIGIT = /[一二三四五六七八九十百千]/;

export const mhlwLawArticles: LawArticle[] = payload.articles
  .filter((a) => {
    const len = a.text.trim().length;
    if (len < 30) return false;
    const hasTitle = !!(a.articleTitle && a.articleTitle.trim().length > 0);
    if (hasTitle) {
      if (len < 60) return false;
    } else {
      if (len < 150) return false;
    }
    if (KANJI_DIGIT.test(a.articleNum)) {
      return len >= 200;
    }
    return true;
  })
  .map((a) => ({
    law: a.law,
    lawShort: a.lawShort,
    articleNum: a.articleNum,
    articleTitle: a.articleTitle,
    text: a.text,
    keywords: a.keywords,
  }));
