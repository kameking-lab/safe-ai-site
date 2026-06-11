/**
 * NITE政府版GHS分類 → GhsHazard[] 変換（柱0付随是正・AI不通時のフォールバック強化）
 *
 * 背景: GEMINI_API_KEY未設定・AI失敗時のRAフォールバックは ghsHazards が空で、
 * 結論カードが「参考」になっていた。MHLW統合DBには NITE 政府版GHS分類
 * （niteGhsClassifications・2,729物質）が既に収録されており、AIなしでも
 * 物質固有の危険有害性を提示できる。区分の値は NITE データそのまま（判定しない）。
 *
 * 注意喚起語（危険/警告）は GHS（JIS Z 7253 / 国連GHS文書）の標準割当:
 *   発がん性・変異原性・生殖毒性: 区分1(A/B)=危険, 区分2=警告
 *   呼吸器感作性: 区分1=危険 / 皮膚感作性: 区分1=警告
 *   皮膚腐食性・刺激性: 区分1=危険, 区分2・3=警告
 *   眼損傷性・眼刺激性: 区分1=危険, 区分2(A/B)=警告
 *   特定標的臓器毒性(単回・反復): 区分1=危険, 区分2・3=警告
 *   誤えん有害性: 区分1=危険, 区分2=警告
 */

import type { GhsHazard } from "@/app/api/chemical-ra/route";
import type { NiteGhsClassifications } from "@/lib/mhlw-chemicals";

type FieldDef = {
  key: keyof NiteGhsClassifications;
  category: string;
  /** 最も重い区分番号 → 注意喚起語 */
  signal: (severest: number) => "危険" | "警告";
};

const FIELDS: FieldDef[] = [
  { key: "carcinogen", category: "発がん性", signal: (n) => (n <= 1 ? "危険" : "警告") },
  { key: "mutagen", category: "生殖細胞変異原性", signal: (n) => (n <= 1 ? "危険" : "警告") },
  { key: "reproTox", category: "生殖毒性", signal: (n) => (n <= 1 ? "危険" : "警告") },
  { key: "respSens", category: "呼吸器感作性", signal: () => "危険" },
  { key: "skinSens", category: "皮膚感作性", signal: () => "警告" },
  { key: "skinCorrIrr", category: "皮膚腐食性・刺激性", signal: (n) => (n <= 1 ? "危険" : "警告") },
  {
    key: "eyeDamageIrr",
    category: "眼に対する重篤な損傷性・眼刺激性",
    signal: (n) => (n <= 1 ? "危険" : "警告"),
  },
  {
    key: "stotSingle",
    category: "特定標的臓器毒性（単回ばく露）",
    signal: (n) => (n <= 1 ? "危険" : "警告"),
  },
  {
    key: "stotRepeat",
    category: "特定標的臓器毒性（反復ばく露）",
    signal: (n) => (n <= 1 ? "危険" : "警告"),
  },
  { key: "aspiration", category: "誤えん有害性", signal: (n) => (n <= 1 ? "危険" : "警告") },
];

/** 「区分1（中枢神経系）、区分3（気道刺激性）」等から最も重い（小さい）区分番号を取る。 */
export function severestCategoryNumber(value: string): number | null {
  const half = value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const nums = [...half.matchAll(/区分\s*(\d+)/g)].map((m) => parseInt(m[1], 10));
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

/**
 * NITE政府版GHS分類から GhsHazard 配列を組み立てる。
 * 区分番号が読めない値（「分類できない」「区分に該当しない」等）は採用しない。
 */
export function buildGhsHazardsFromNite(
  nite: NiteGhsClassifications | undefined | null,
): GhsHazard[] {
  if (!nite) return [];
  const out: GhsHazard[] = [];
  for (const f of FIELDS) {
    const value = nite[f.key];
    if (!value) continue;
    if (/該当しない|分類できない|分類対象外/.test(value)) continue;
    const severest = severestCategoryNumber(value);
    if (severest === null) continue;
    out.push({
      category: f.category,
      classification: value,
      signal: f.signal(severest),
    });
  }
  // 危険が先（結論カード・要点抽出と同じ重み付け）
  return out.sort((a, b) => (a.signal === b.signal ? 0 : a.signal === "危険" ? -1 : 1));
}
