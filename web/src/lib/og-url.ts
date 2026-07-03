export function ogImageUrl(title: string, desc?: string, lang?: "ja" | "en"): string {
  const p = new URLSearchParams({ title });
  if (desc) p.set("desc", desc);
  if (lang && lang !== "ja") p.set("lang", lang);
  return `/api/og?${p.toString()}`;
}

/**
 * OGP画像(1200×630)へ描画して縦溢れしない title の上限文字数。
 * 記事/事故/通達など data 由来の title は長さが不定で、@vercel/og(Satori)は
 * overflow をクリップしないため、上限超過は 630px キャンバスを縦に溢れて
 * 透かしドメインや desc へ重なる。実測の最長 title は 39 字（記事一覧）のため
 * 通常コンテンツは畳まず、病的に長い入力だけを安全側へ丸める余裕を持たせる。
 */
export const OG_TITLE_MAX = 56;

/** OGP画像へ描画して縦溢れしない desc の上限文字数（title と同趣旨の安全網）。 */
export const OG_DESC_MAX = 110;

/**
 * OGP画像へ描画するテキストを安全長へ畳む。**コードポイント単位**で数え
 * （サロゲートペア・結合文字を分断しない）、上限超過時のみ末尾を「…」へ丸める。
 * 上限以下のテキストはそのまま返す（既存の短いラベルは byte-identical）。
 */
export function clampOgText(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return chars.slice(0, max - 1).join("") + "…";
}

/**
 * 畳んだ後の title 長に応じた描画フォントサイズ(px)。
 * 既存挙動（20字以下=52px・21〜36字=40px）を保ちつつ、過長域（37字以上）だけ
 * 32px へ落として 1200×630 の縦溢れを防ぐ（36字以下の出力は不変）。
 */
export function ogTitleFontSize(len: number): number {
  if (len <= 20) return 52;
  if (len <= 36) return 40;
  return 32;
}
