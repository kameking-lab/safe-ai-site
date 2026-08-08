import type { LawArticle } from "@/data/laws";
import { kanjiToArabic } from "@/lib/article-number-normalize";

export type ExtractedLegalItem = {
  item: string;
  text: string;
  snippet: string;
};

export type ExtractedLegalParagraph = {
  paragraph: string;
  text: string;
  snippet: string;
};

const ITEM_NUMBER = "0-9０-９一二三四五六七八九十百千";
const ITEM_BOUNDARY =
  /(?:第\s*)?([0-9０-９一二三四五六七八九十百千]+(?:の[0-9０-９一二三四五六七八九十百千]+)*)(?:号)?[　\s]+/g;

function toItemNumber(value: string): number | null {
  const normalized = value.normalize("NFKC");
  const number = /^\d+$/.test(normalized)
    ? Number(normalized)
    : Number(kanjiToArabic(normalized));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function toItemKey(value: string): string | null {
  const parts = value.normalize("NFKC").split("の");
  const numbers = parts.map(toItemNumber);
  return numbers.every((number): number is number => number !== null)
    ? numbers.join("-")
    : null;
}

function itemLabel(key: string): string {
  const [head, ...branches] = key.split("-");
  return `第${head}号${branches.map((branch) => `の${branch}`).join("")}`;
}

function paragraphNumber(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  const matched = value
    .normalize("NFKC")
    .match(/(?:第\s*)?([0-9一二三四五六七八九十百千]+)\s*項?/);
  if (!matched?.[1]) return null;
  return toItemNumber(matched[1]);
}

/**
 * Extract one paragraph from e-Gov's flat article text. Paragraph 1 has no
 * numeric heading; subsequent paragraphs use Arabic/full-width numerals.
 * Item headings remain kanji and therefore are not treated as paragraphs.
 */
export function extractLegalParagraph(
  article: LawArticle,
  requestedParagraph: string | number,
): ExtractedLegalParagraph | null {
  const requested = paragraphNumber(requestedParagraph);
  if (requested === null) return null;
  const text = article.text;
  const boundaries = [
    ...text.matchAll(
      /(^|[^0-9０-９\s　])([2-9２-９][0-9０-９]*)[　 \t]+/g,
    ),
  ].flatMap((match) => {
    const number = match[2] ? toItemNumber(match[2]) : null;
    return number === null
      ? []
      : [
          {
            number,
            headerStart: (match.index ?? 0) + match[1]!.length,
            contentStart: (match.index ?? 0) + match[0].length,
          },
        ];
  });
  const entries = [
    { number: 1, contentStart: 0, headerStart: 0 },
    ...boundaries,
  ];
  const selectedIndex = entries.findIndex(({ number }) => number === requested);
  if (selectedIndex < 0) return null;
  const selected = entries[selectedIndex]!;
  const next = entries[selectedIndex + 1];
  const end = next ? Math.min(text.length, next.headerStart) : text.length;
  const paragraphText = text.slice(selected.contentStart, end).trim();
  if (!paragraphText) return null;
  const paragraph = `第${requested}項`;
  return {
    paragraph,
    text: paragraphText,
    snippet: `${paragraph}　${paragraphText.slice(0, 200)}`,
  };
}

export function requestedLegalItemNumber(query: string): number | null {
  const match = query
    .normalize("NFKC")
    .match(new RegExp(`第?\\s*([${ITEM_NUMBER}]+)\\s*号`));
  return match?.[1] ? toItemNumber(match[1]) : null;
}

function requestedLegalItemKey(query: string): string | null {
  const match = query
    .normalize("NFKC")
    .match(
      new RegExp(
        `第?\\s*([${ITEM_NUMBER}]+)\\s*号((?:の[${ITEM_NUMBER}]+)*)`,
      ),
    );
  if (!match?.[1]) return null;
  return toItemKey(`${match[1]}${match[2] ?? ""}`);
}

/** 公式フラット本文または「第11号」形式から、全ての号を境界どおりに分割する。 */
export function extractLegalItems(article: LawArticle): ExtractedLegalItem[] {
  const matches = [...article.text.matchAll(ITEM_BOUNDARY)].filter((match) =>
    match[1] ? toItemKey(match[1]) !== null : false,
  );
  return matches.flatMap((selected, index) => {
    const key = selected[1] ? toItemKey(selected[1]) : null;
    if (key === null) return [];
    const start = (selected.index ?? 0) + selected[0].length;
    const end = matches[index + 1]?.index ?? article.text.length;
    const text = article.text.slice(start, end).trim();
    return text
      ? [{ item: itemLabel(key), text, snippet: `${itemLabel(key)}　${text.slice(0, 280)}` }]
      : [];
  });
}

/**
 * 公式条文のフラット本文から、質問で明示された「第○号」だけを取り出す。
 * e-Gov本文は各号が句点なしで連結される場合があるため、句点ではなく号見出しを境界にする。
 */
export function extractRequestedLegalItem(
  article: LawArticle,
  query: string,
): ExtractedLegalItem | null {
  const requested = requestedLegalItemKey(query);
  if (requested === null) return null;

  const selected = extractLegalItems(article).find(
    (item) => item.item === itemLabel(requested),
  );
  if (selected) return selected;

  for (const [number, text] of Object.entries(article.itemNumberMap ?? {})) {
    if (toItemKey(number) !== requested || !text.trim()) continue;
    return {
      item: itemLabel(requested),
      text: text.trim(),
      snippet: `${itemLabel(requested)}　${text.trim().slice(0, 280)}`,
    };
  }
  return null;
}
