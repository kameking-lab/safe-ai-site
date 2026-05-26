/**
 * KY作業内容 → 類似労災事例への導線ヒント（Phase B P1-1・純粋関数）。
 *
 * 化学物質の work-chemical-hints と同方針。KYの作業内容から、事故DB（/accidents）の
 * AI注意喚起・類似事例検索へ誘導するためのクエリを組み立てる。規制/事故の断定はせず、
 * 「この作業の類似労災事例を見る」ナビゲーションのみ提供する。
 */

/** 事故リスクが想起される代表作業キーワード（建設・製造の頻出作業）。 */
const WORK_KEYWORDS: readonly string[] = [
  "足場", "高所", "屋根", "はしご", "脚立", "墜落", "解体", "掘削", "土止め", "型枠",
  "鉄筋", "鉄骨", "建方", "クレーン", "玉掛", "揚重", "重機", "バックホウ", "フォークリフト",
  "溶接", "切断", "研削", "プレス", "機械", "回転", "コンベヤ", "塗装", "防水", "電気",
  "活線", "感電", "運搬", "積込", "荷役", "倉庫", "伐採", "草刈", "くん蒸", "酸欠",
];

export interface AccidentWorkHint {
  matched: boolean;
  keywords: string[];
  /** /accidents?work=… 用のクエリ（作業内容そのもの、トリム済み）。 */
  query: string;
}

/**
 * KY作業内容テキストから事故DB誘導ヒントを得る。
 * 作業内容に意味のある語が含まれれば matched=true（労災はあらゆる作業に関係するため広めに拾う）。
 */
export function detectAccidentWork(text: string | null | undefined): AccidentWorkHint {
  const t = typeof text === "string" ? text.trim() : "";
  if (t.length < 2) return { matched: false, keywords: [], query: "" };
  const keywords = WORK_KEYWORDS.filter((k) => t.includes(k));
  // 代表キーワードが無くても、作業内容があれば類似事例検索は有用なので matched=true。
  return { matched: true, keywords, query: t.slice(0, 60) };
}

/** /accidents への誘導URL（work クエリで AI注意喚起プリフィル）。 */
export function accidentsHref(hint: AccidentWorkHint): string {
  return hint.query ? `/accidents?work=${encodeURIComponent(hint.query)}` : "/accidents";
}
