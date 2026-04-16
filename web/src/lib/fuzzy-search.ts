/**
 * 表記ゆれを吸収するファジー検索ユーティリティ
 *
 * 対応する正規化:
 * - カタカナ長音符の統一（ー/−/ｰ/‐ → ー）
 * - 全角半角統一（ＡＢＣ→ABC、０１２→012）
 * - 小書き文字統一（ァ→ア等）
 * - NFKC正規化（濁点分離・合成文字の統一）
 * - スペース・記号の正規化
 */

/** カタカナ小書き → 大文字の変換マップ */
const SMALL_TO_LARGE: Record<string, string> = {
  ァ: "ア",
  ィ: "イ",
  ゥ: "ウ",
  ェ: "エ",
  ォ: "オ",
  ッ: "ツ",
  ャ: "ヤ",
  ュ: "ユ",
  ョ: "ヨ",
  ヮ: "ワ",
  ヵ: "カ",
  ヶ: "ケ",
};

/**
 * 検索テキストを正規化する。
 * 表記ゆれ（長音符・全角半角・小書き・濁点分離）を統一し、比較しやすくする。
 */
export function normalizeSearchText(text: string): string {
  // NFKC正規化：全角英数→半角、濁点分離→合成文字
  let result = text.normalize("NFKC");

  // カタカナ長音符の統一（様々な長音符・ハイフン類 → ー）
  result = result.replace(/[−ｰ‐‑‒–—]/g, "ー");

  // 小書きカタカナ → 大文字カタカナ
  result = result.replace(/[ァィゥェォッャュョヮヵヶ]/g, (c) => SMALL_TO_LARGE[c] ?? c);

  // 小書きひらがな → 大文字ひらがな
  result = result
    .replace(/ぁ/g, "あ")
    .replace(/ぃ/g, "い")
    .replace(/ぅ/g, "う")
    .replace(/ぇ/g, "え")
    .replace(/ぉ/g, "お")
    .replace(/っ/g, "つ")
    .replace(/ゃ/g, "や")
    .replace(/ゅ/g, "ゆ")
    .replace(/ょ/g, "よ")
    .replace(/ゎ/g, "わ");

  // スペース類を半角スペースに統一
  result = result.replace(/[\u3000\t\r\n]+/g, " ").trim();

  // 小文字化（英字）
  result = result.toLowerCase();

  return result;
}

/**
 * クエリがターゲット文字列に部分一致するか判定する。
 * 両方を normalizeSearchText で正規化してから比較する。
 */
export function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTarget = normalizeSearchText(target);
  return normalizedTarget.includes(normalizedQuery);
}

/**
 * クエリを空白で分割し、全トークンがターゲットに含まれるか判定する（AND検索）。
 */
export function fuzzyMatchAll(query: string, target: string): boolean {
  if (!query.trim()) return true;
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  const normalizedTarget = normalizeSearchText(target);
  return tokens.every((token) => normalizedTarget.includes(token));
}
