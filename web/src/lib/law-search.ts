import type { LawArticle } from "@/data/laws";
import {
  expandLawAliases,
  normalizeArticleQuery,
  searchCrossIndex,
  type ScorableItem,
} from "@/lib/cross-search";
import { normalizeArticleNumToKey } from "@/lib/article-number-normalize";
import { isLawNameEquivalent } from "@/lib/law-name-registry";

export type LawMatchedField =
  | "law"
  | "lawShort"
  | "articleNum"
  | "articleTitle"
  | "keywords"
  | "text";

export type LawSearchHit = {
  article: LawArticle;
  stableKey: string;
  matchedFields: LawMatchedField[];
  matchedSnippet: string;
};

type IndexedLawArticle = ScorableItem & {
  article: LawArticle;
  stableKey: string;
};

type LawIntentPin = {
  matches: (query: string) => boolean;
  lawShort: string;
  articleNum: string;
};

const LAW_INTENT_PINS: readonly LawIntentPin[] = [
  {
    matches: (query) => /^(?:石綿|アスベスト)$/.test(query.trim()),
    lawShort: "石綿則",
    articleNum: "第2条",
  },
  {
    matches: (query) =>
      /(?:電気作業|電気工事|配線(?:工事|作業)?|活線|充電(?:部|電路))/.test(
        query,
      ) && query.includes("作業主任者"),
    lawShort: "安衛法",
    articleNum: "第14条",
  },
  {
    matches: (query) =>
      /(?:電気作業|電気工事|配線(?:工事|作業)?|活線|充電(?:部|電路))/.test(
        query,
      ) && query.includes("作業主任者"),
    lawShort: "安衛令",
    articleNum: "第6条",
  },
  {
    matches: (query) =>
      /(?:電気作業|電気工事|配線(?:工事|作業)?|活線|充電(?:部|電路))/.test(
        query,
      ) && query.includes("作業主任者"),
    lawShort: "安衛則",
    articleNum: "第350条",
  },
  {
    matches: (query) =>
      /(?:電気作業|電気工事|配線(?:工事|作業)?|活線|充電(?:部|電路))/.test(
        query,
      ) && /(?:資格|教育|特別教育|特教|講習)/.test(query),
    lawShort: "安衛法",
    articleNum: "第59条",
  },
  {
    matches: (query) =>
      /(?:電気作業|電気工事|配線(?:工事|作業)?|活線|充電(?:部|電路))/.test(
        query,
      ) && /(?:資格|教育|特別教育|特教|講習)/.test(query),
    lawShort: "安衛則",
    articleNum: "第36条",
  },
  {
    matches: (query) =>
      /(?:電気作業|電気工事|配線(?:工事|作業)?)/.test(query) &&
      /(?:資格|免許)/.test(query) &&
      !query.includes("作業主任者"),
    lawShort: "電気工事士法",
    articleNum: "第3条",
  },
  {
    matches: (query) =>
      /(?:電気作業|電気工事|配線(?:工事|作業)?)/.test(query) &&
      /(?:資格|免許)/.test(query) &&
      !query.includes("作業主任者"),
    lawShort: "電気工事士法",
    articleNum: "第2条",
  },
  {
    matches: (query) =>
      /(?:開口部|床の穴)/.test(query) && /(?:手すり|手摺|養生)/.test(query),
    lawShort: "安衛則",
    articleNum: "第519条",
  },
  {
    matches: (query) =>
      /(?:手すり|手摺)/.test(query) &&
      !/(?:開口部|床の穴|架設通路|階段|作業構台|高所作業車)/.test(query),
    lawShort: "安衛則",
    articleNum: "第563条",
  },
  {
    matches: (query) =>
      /(?:手すり|手摺)/.test(query) &&
      !/(?:開口部|床の穴|架設通路|階段|作業構台|高所作業車)/.test(query),
    lawShort: "安衛則",
    articleNum: "第552条",
  },
  ...(["安衛法:第59条", "安衛則:第36条", "安衛法:第61条", "安衛令:第20条", "安衛則:第41条"] as const).map(
    (key): LawIntentPin => {
      const [lawShort, articleNum] = key.split(":") as [string, string];
      return {
        matches: (query) =>
          /(?:フォークリフト|フォークリフ卜)/.test(query) &&
          /(?:資格|免許|技能講習|特別教育|特教|講習|乗る)/.test(query),
        lawShort,
        articleNum,
      };
    },
  ),
  ...(["有機則:第5条", "有機則:第6条", "有機則:第8条", "有機則:第9条"] as const).map(
    (key): LawIntentPin => {
      const [lawShort, articleNum] = key.split(":") as [string, string];
      return {
        matches: (query) =>
          /(?:有機溶剤|シンナー|塗装|ペンキ)/.test(query) &&
          /(?:屋内|室内|建物内|タンク内)/.test(query) &&
          /(?:使|使用|扱|塗|作業)/.test(query),
        lawShort,
        articleNum,
      };
    },
  ),
  {
    matches: (query) => query.includes("特別有機溶剤"),
    lawShort: "特化則",
    articleNum: "第38条の8",
  },
  {
    matches: (query) => query.includes("足場") && query.includes("特別教育"),
    lawShort: "安衛則",
    articleNum: "第36条",
  },
  {
    matches: (query) => query.includes("フルハーネス"),
    lawShort: "安衛則",
    articleNum: "第36条",
  },
  {
    matches: (query) =>
      query.includes("事業者") &&
      (query.includes("義務") || query.includes("責務")),
    lawShort: "安衛法",
    articleNum: "第3条",
  },
];

/**
 * 空白のない自然文を、利用者が実際に入力した現場概念へ分ける。
 * 関連語展開だけで一致した条文（例: 足場→作業主任者）が原語を含む条文を
 * 追い越さないよう、2概念以上を抽出できる場合に限ってAND検索へ渡す。
 */
const LAW_NATURAL_QUERY_CONCEPTS: ReadonlyArray<{
  pattern: RegExp;
  term: string;
}> = [
  {
    pattern:
      /(?:電気作業|電気工事|配線(?:工事|作業)?|活線|充電(?:部|電路)|電路の近接)/,
    term: "電気作業",
  },
  { pattern: /作業主任者/, term: "作業主任者" },
  { pattern: /(?:足場|あしば)/, term: "足場" },
  { pattern: /(?:手すり|手摺|てすり)/, term: "手すり" },
  { pattern: /(?:フォークリフト|フォークリフ卜)/, term: "フォークリフト" },
  { pattern: /(?:資格|免許)/, term: "資格" },
  { pattern: /(?:特別教育|特教)/, term: "特別教育" },
  { pattern: /講習/, term: "講習" },
  { pattern: /(?<!特別)教育/, term: "教育" },
  { pattern: /(?:有機溶剤|シンナー|塗装|ペンキ)/, term: "有機溶剤" },
  { pattern: /(?:屋内|室内|建物内|タンク内)/, term: "屋内" },
  { pattern: /(?:開口部|床の穴)/, term: "開口部" },
];

function buildLawCrossSearchQuery(normalizedQuery: string): string {
  const canonicalQuery = normalizedQuery.replace(/衞/g, "衛");
  // 条番号・法令名を明示した検索は従来の完全一致経路を優先する。
  if (/第?\d+条|第[一二三四五六七八九十百千万]+条/.test(canonicalQuery)) {
    // 項・号は条文レコード内の位置であり独立レコードではない。AND語に残すと
    // 「安衞則36条4号」が0件になるため、取得単位である法令名+条番号へ丸める。
    return canonicalQuery
      .replace(/\s*第?[0-9一二三四五六七八九十百千万]+(?:項|号)/g, "")
      .trim();
  }
  const concepts = LAW_NATURAL_QUERY_CONCEPTS.flatMap(({ pattern, term }) =>
    pattern.test(canonicalQuery) ? [term] : [],
  );
  const unique = [...new Set(concepts)];
  if (unique.length >= 2) return unique.join(" ");
  if (unique[0] === "手すり") return unique[0];
  return canonicalQuery;
}

export function lawArticleStableKey(article: LawArticle): string {
  const articleKey =
    normalizeArticleNumToKey(article.articleNum) ?? article.articleNum;
  return article.sourceLawId
    ? `${article.sourceLawId}:${articleKey}`
    : `${article.law}:${articleKey}`;
}

function toIndexItem(article: LawArticle): IndexedLawArticle {
  const stableKey = lawArticleStableKey(article);
  return {
    id: stableKey,
    stableKey,
    article,
    category: "law",
    title: `${article.law} ${article.articleNum} ${article.articleTitle}`,
    headings: [
      `${article.lawShort} ${article.articleNum}`,
      article.articleTitle,
    ],
    subtitle: article.text,
    keywords: [
      article.law,
      article.lawShort,
      article.articleNum,
      ...article.keywords,
    ],
    url: "/law-search",
  };
}

function matchedFields(article: LawArticle, rawQuery: string): LawMatchedField[] {
  const normalized = expandLawAliases(normalizeArticleQuery(rawQuery))
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const fields: Array<[LawMatchedField, string]> = [
    ["law", article.law],
    ["lawShort", article.lawShort],
    ["articleNum", article.articleNum],
    ["articleTitle", article.articleTitle],
    ["keywords", article.keywords.join(" ")],
    ["text", article.text],
  ];
  const hits = fields
    .filter(([, value]) =>
      normalized.some((term) => value.toLowerCase().includes(term)),
    )
    .map(([field]) => field);
  return hits;
}

function matchedSnippet(article: LawArticle, rawQuery: string): string {
  const terms = normalizeArticleQuery(rawQuery)
    .normalize("NFKC")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
  const index = terms.reduce((best, term) => {
    const found = article.text.indexOf(term);
    if (found < 0) return best;
    return best < 0 ? found : Math.min(best, found);
  }, -1);
  if (index < 0) {
    const keywordMatches = article.keywords.filter((keyword) =>
      terms.some(
        (term) => keyword.includes(term) || term.includes(keyword),
      ),
    );
    const prefix =
      keywordMatches.length > 0
        ? `一致キーワード: ${keywordMatches.slice(0, 3).join("・")}\n`
        : "";
    return `${prefix}${article.text.slice(0, Math.max(0, 220 - prefix.length))}`;
  }
  const start = Math.max(0, index - 70);
  const end = Math.min(article.text.length, start + 220);
  return `${start > 0 ? "…" : ""}${article.text.slice(start, end)}${
    end < article.text.length ? "…" : ""
  }`;
}

function intentPinnedArticles(
  articles: LawArticle[],
  rawQuery: string,
): LawArticle[] {
  const query = normalizeArticleQuery(rawQuery).normalize("NFKC");
  return LAW_INTENT_PINS.flatMap((pin) => {
    if (!pin.matches(query)) return [];
    const article = articles.find(
      (candidate) =>
        candidate.lawShort === pin.lawShort &&
        candidate.articleNum === pin.articleNum,
    );
    return article ? [article] : [];
  });
}

export function searchLawArticles(
  articles: LawArticle[],
  rawQuery: string,
  selectedLaw = "all",
  limit = 500,
): LawSearchHit[] {
  const eligible = articles.filter(
    (article) =>
      selectedLaw === "all" ||
      isLawNameEquivalent(selectedLaw, article.law) ||
      isLawNameEquivalent(selectedLaw, article.lawShort),
  );
  const normalizedQuery = expandLawAliases(normalizeArticleQuery(rawQuery));
  const query = buildLawCrossSearchQuery(normalizedQuery);
  const indexed = eligible.map(toIndexItem);
  const found =
    query.trim() === ""
      ? indexed
      : searchCrossIndex(indexed, query, {
          category: "law",
          categoryPriority: ["law"],
          limit,
        });
  const pinned = intentPinnedArticles(eligible, rawQuery).map(toIndexItem);
  const ordered = [...pinned, ...found];
  const seen = new Set<string>();
  return ordered.flatMap((item) => {
    if (seen.has(item.stableKey)) return [];
    if (seen.size >= limit) return [];
    seen.add(item.stableKey);
    return [
      {
        article: item.article,
        stableKey: item.stableKey,
        matchedFields: matchedFields(item.article, query),
        matchedSnippet: matchedSnippet(item.article, query),
      },
    ];
  });
}
