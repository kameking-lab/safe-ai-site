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

/** MHLW の PDF 由来 (R4/R5 省令改正・通達等) から抽出した条文群。RAG の補完ソース。 */
export const mhlwLawArticles: LawArticle[] = payload.articles.map((a) => ({
  law: a.law,
  lawShort: a.lawShort,
  articleNum: a.articleNum,
  articleTitle: a.articleTitle,
  text: a.text,
  keywords: a.keywords,
}));
