/**
 * 条文番号の正規化ユーティリティ。
 *
 * Phase 1a で article-registry および Phase 2 の Post-generation 照合の
 * 基盤として使う。漢数字／算用数字／枝番（条の2）／項（第○項）／号（第○号）の
 * 表記ゆれを単一の正規化キーへ畳み込む。
 *
 * 設計方針:
 * - 取り込み時のみ適用。 UI/API の元データ表記は維持する（取り込み側の責務）。
 * - 数値以外の文字（"の"、"第"、"条"、"項"、"号" 等）は維持し、漢数字部分のみを
 *   算用数字へ正規化する。
 * - 漢数字変換は 1〜9999 範囲を想定（既存安衛則最大は 600 条台、安全側で 4 桁）。
 */

const KANJI_DIGIT: Record<string, number> = {
  〇: 0,
  零: 0,
  一: 1,
  壱: 1,
  二: 2,
  弐: 2,
  三: 3,
  参: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const KANJI_UNIT: Record<string, number> = {
  十: 10,
  拾: 10,
  百: 100,
  千: 1000,
};

const KANJI_ANY = /[〇零一壱二弐三参四五六七八九十拾百千]+/g;

/**
 * 漢数字（1〜9999 程度）を算用数字文字列に変換する。
 * 「二十一」→「21」、「百二十三」→「123」、「千五百」→「1500」。
 * 解釈不能な並び（重複単位など）は元文字列をそのまま返す。
 */
export function kanjiToArabic(kanji: string): string {
  let total = 0;
  let current = 0;
  let consumedAny = false;
  for (const ch of kanji) {
    if (ch in KANJI_DIGIT) {
      current = current * 10 + KANJI_DIGIT[ch];
      consumedAny = true;
    } else if (ch in KANJI_UNIT) {
      const unit = KANJI_UNIT[ch];
      total += (current === 0 ? 1 : current) * unit;
      current = 0;
      consumedAny = true;
    } else {
      return kanji;
    }
  }
  total += current;
  return consumedAny ? String(total) : kanji;
}

/**
 * 文字列内のすべての漢数字片を算用数字に置換する（混在文字列対応）。
 * 「第二十一条第三項第五号」→「第21条第3項第5号」。
 */
export function normalizeKanjiNumbers(text: string): string {
  return text.replace(KANJI_ANY, (m) => kanjiToArabic(m));
}

/**
 * 全角英数字を半角化する。
 * eslint: no-control-regex を避けるため U+FF01〜U+FF5E のみを対象。
 */
export function normalizeFullwidthAlnum(text: string): string {
  return text.replace(/[！-～]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );
}

/** 構造化された条文参照。 */
export type ArticleRef = {
  /** 算用数字に正規化された条番号（例: 21） */
  article: number;
  /** 枝番（"条の2" の 2 部分。 なければ undefined） */
  branch?: number;
  /** 項番号（第○項）。 なければ undefined */
  paragraph?: number;
  /** 号番号（第○号）。 なければ undefined */
  item?: number;
};

const ARTICLE_REGEX =
  /第?([0-9]+)条(?:の([0-9]+))?(?:\s*第?([0-9]+)項)?(?:\s*第?([0-9]+)号)?/;

/**
 * 条文番号文字列を構造化参照へパースする。
 * 入力は事前に normalizeKanjiNumbers / normalizeFullwidthAlnum を通すことを推奨。
 * パース失敗時は undefined を返す。
 */
export function parseArticleNum(raw: string): ArticleRef | undefined {
  if (!raw) return undefined;
  const normalized = normalizeKanjiNumbers(normalizeFullwidthAlnum(raw));
  const m = ARTICLE_REGEX.exec(normalized);
  if (!m) return undefined;
  const ref: ArticleRef = { article: Number(m[1]) };
  if (m[2]) ref.branch = Number(m[2]);
  if (m[3]) ref.paragraph = Number(m[3]);
  if (m[4]) ref.item = Number(m[4]);
  return ref;
}

/**
 * 構造化参照を正規化キー文字列に変換する。
 * 同一条文の様々な表記ゆれを単一キーへ畳み込むのに使う。
 * 例: { article: 21, branch: 2, paragraph: 3 } → "21-2-3-"
 */
export function refToKey(ref: ArticleRef): string {
  return `${ref.article}-${ref.branch ?? ""}-${ref.paragraph ?? ""}-${ref.item ?? ""}`;
}

/**
 * 条文番号文字列を一発で正規化キーへ。 パース失敗時は undefined。
 */
export function normalizeArticleNumToKey(raw: string): string | undefined {
  const ref = parseArticleNum(raw);
  return ref ? refToKey(ref) : undefined;
}

/**
 * 「第○条」「第○条の○」までの基底表記を算用数字で再構築する。
 * eGov アンカー URL 構築に使う想定（項・号は含めない）。
 */
export function canonicalArticleLabel(ref: ArticleRef): string {
  const branch = ref.branch ? `の${ref.branch}` : "";
  return `第${ref.article}条${branch}`;
}
