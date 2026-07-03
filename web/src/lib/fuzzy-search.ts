/**
 * 表記ゆれを吸収するファジー検索ユーティリティ
 *
 * 対応する正規化:
 * - カタカナ長音符の統一（ー/−/ｰ/‐ → ー）
 * - 全角半角統一（ＡＢＣ→ABC、０１２→012）
 * - 小書き文字統一（ァ→ア等）
 * - NFKC正規化（濁点分離・合成文字の統一）
 * - スペース・記号の正規化
 *
 * なお「ひらがな↔カタカナ」の畳み込みは、UIの部分一致マッチ（{@link fuzzyMatch} /
 * {@link fuzzyMatchAll}）でのみ {@link foldKana} を追加適用する。チャットボットRAG
 * （rag-search.ts）と横断検索スコアリング（cross-search/score.ts）が共有する
 * {@link normalizeSearchText} 自体は byte-identical に保ち、法令コーパスの
 * かな畳み込みでランキングが変わる回帰を避ける。
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
 * ひらがな → カタカナ（コードポイントを +0x60 シフト。U+3041〜U+3096 のみ）。
 * モバイルでかな入力する現場ユーザー（現場監督・一人親方）が、カタカナ表記の
 * 保護具・化学物質・標識・通達（フルハーネス/ベンゼン/クレーン等）を
 * 「ふるはーねす」等のひらがなでも引けるようにする（日本語検索の標準的なかな畳み込み）。
 *
 * これは UIの部分一致マッチ（{@link fuzzyMatch} / {@link fuzzyMatchAll}）専用の
 * 追加正規化。クエリ・ターゲット双方に対称適用するため recall を広げるだけで
 * false negative は生まない。RAG/横断検索スコアリングが共有する
 * {@link normalizeSearchText} には組み込まない（法令コーパスのランキング回帰回避）。
 */
export function foldKana(text: string): string {
  return text.replace(/[ぁ-ゖ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + 0x60)
  );
}

/** normalizeSearchText に加えてかな畳み込みまで適用する、UI部分一致専用の正規化。 */
function normalizeForFuzzyMatch(text: string): string {
  return foldKana(normalizeSearchText(text));
}

/**
 * クエリがターゲット文字列に部分一致するか判定する。
 * 両方を正規化＋かな畳み込みしてから比較する（かな入力の表記ゆれを吸収）。
 */
export function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeForFuzzyMatch(query);
  const normalizedTarget = normalizeForFuzzyMatch(target);
  return normalizedTarget.includes(normalizedQuery);
}

/**
 * クエリを空白で分割し、全トークンがターゲットに含まれるか判定する（AND検索）。
 * かな畳み込みまで適用し、ひらがな入力でカタカナ表記の対象に当たるようにする。
 */
export function fuzzyMatchAll(query: string, target: string): boolean {
  if (!query.trim()) return true;
  const tokens = normalizeForFuzzyMatch(query).split(/\s+/).filter(Boolean);
  const normalizedTarget = normalizeForFuzzyMatch(target);
  return tokens.every((token) => normalizedTarget.includes(token));
}
