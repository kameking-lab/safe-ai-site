import dictionary from "./ruby-dictionary.json";

// キー（漢字）を長い順にソートして部分置換を防ぐ
const sortedEntries: [string, string][] = (
  Object.entries(dictionary) as [string, string][]
).sort((a, b) => b[0].length - a[0].length);

/**
 * テキスト中の漢字語にルビ（ふりがな）を付与してHTML文字列を返す
 */
export function applyRuby(text: string): string {
  // XSS対策：テキストをエスケープしてからルビタグを挿入
  let result = escapeHtml(text);

  for (const [kanji, reading] of sortedEntries) {
    const escaped = escapeHtml(kanji);
    // すでにルビタグ内にある語は置換しない
    const regex = new RegExp(
      `(?<!<[^>]*)${escapeRegex(escaped)}(?![^<]*>)`,
      "g"
    );
    result = result.replace(
      regex,
      `<ruby>${escaped}<rt>${escapeHtml(reading)}</rt></ruby>`
    );
  }

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
