import type { IndustryTag, LawRevisionCore } from "@/lib/types/domain";
import { ALL_INDUSTRY_TAGS } from "@/lib/types/domain";

/**
 * 業種タグ推定用の強キーワード。
 * industry_detail / タイトル / 要約本文に含まれれば高確度でマッチとみなす。
 * キーワードはフォールバック扱い（明示的 industry_tags が最優先）。
 */
const STRONG_KEYWORDS: Record<IndustryTag, string[]> = {
  construction: [
    "建設業",
    "建設工事",
    "建築工事",
    "土木工事",
    "建設現場",
    "足場",
    "高所作業",
    "解体工事",
    "石綿",
    "アスベスト",
    "型枠",
    "鉄骨",
    "掘削",
    "コンクリート工事",
  ],
  manufacturing: [
    "製造業",
    "工場",
    "機械工作",
    "プレス機械",
    "ボイラー",
    "粉じん障害",
    "溶接作業",
    "鋳造",
    "研削盤",
    "爆発物",
  ],
  healthcare: [
    "医療機関",
    "福祉施設",
    "介護施設",
    "介護事業",
    "看護",
    "病院",
    "腰痛予防",
    "職業感染",
    "針刺し",
    "医療従事者",
  ],
  transport: [
    "陸運",
    "運輸業",
    "自動車運転",
    "トラック運転",
    "バス運転",
    "荷役作業",
    "港湾",
    "物流センター",
  ],
  forestry: ["林業", "伐木", "チェーンソー", "立木の伐倒", "造材", "架線集材"],
  food: ["食品製造業", "飲食店", "厨房", "冷凍冷蔵", "調理業務", "食料品"],
  retail: ["小売業", "百貨店", "スーパーマーケット", "商業施設", "販売業", "接客業"],
  cleaning: ["清掃業", "廃棄物処理", "し尿処理", "ごみ処理", "環境衛生"],
  chemical: [
    "化学物質",
    "有機溶剤",
    "特定化学物質",
    "危険物",
    "リスクアセスメント対象物",
    "ばく露濃度基準",
    "SDS",
    "化学品",
  ],
  electrical: ["電気工事", "感電", "高圧電気", "低圧電気", "アーク溶接", "送配電", "特別高圧"],
};

/** industry_detail の代表文字列からタグへの対応付け。 */
function tagsFromIndustryDetail(industryDetail: string): IndustryTag[] {
  const normalized = industryDetail.toLowerCase();
  if (normalized.includes("全業種") || normalized.includes("全産業")) {
    return [...ALL_INDUSTRY_TAGS];
  }
  const map: Record<IndustryTag, string[]> = {
    construction: ["建設"],
    manufacturing: ["製造"],
    healthcare: ["医療", "福祉", "介護"],
    transport: ["運輸", "物流", "陸運"],
    forestry: ["林業"],
    food: ["食品", "飲食"],
    retail: ["小売", "商業"],
    cleaning: ["清掃"],
    chemical: ["化学"],
    electrical: ["電気"],
  };
  const result: IndustryTag[] = [];
  for (const tag of ALL_INDUSTRY_TAGS) {
    if (map[tag].some((needle) => normalized.includes(needle.toLowerCase()))) {
      result.push(tag);
    }
  }
  return result;
}

/**
 * 法改正1件から業種タグを推定する。
 * 優先順位: 明示的 industry_tags > industry_detail > 強キーワード。
 * いずれもマッチしない（全業種対象の一般的改正など）場合は全業種タグを返す。
 */
export function deriveIndustryTags(revision: LawRevisionCore): IndustryTag[] {
  if (revision.industry_tags && revision.industry_tags.length > 0) {
    return revision.industry_tags;
  }
  if (revision.industry_detail && revision.industry_detail.trim().length > 0) {
    const fromDetail = tagsFromIndustryDetail(revision.industry_detail);
    if (fromDetail.length > 0) return fromDetail;
  }
  const haystack = `${revision.title} ${revision.summary} ${revision.category ?? ""}`;
  const result: IndustryTag[] = [];
  for (const tag of ALL_INDUSTRY_TAGS) {
    if (STRONG_KEYWORDS[tag].some((kw) => haystack.includes(kw))) {
      result.push(tag);
    }
  }
  if (result.length > 0) return result;
  return [...ALL_INDUSTRY_TAGS];
}

/** 単一業種マッチ判定（フィルタ用）。 */
export function revisionMatchesIndustry(revision: LawRevisionCore, tag: IndustryTag): boolean {
  const tags = deriveIndustryTags(revision);
  return tags.includes(tag);
}
