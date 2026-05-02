/**
 * 各詳細ページ（通達・事故・保護具・記事）から横断的に関連コンテンツを取り出す
 * 共通スコアリングロジック。`RelatedContent` コンポーネントから呼び出す。
 *
 * ねらい:
 *   - SEO: ページ間内部リンクを増やしてクロール深度・滞在時間を上げる
 *   - UX: 通達 → 関連事故 → 推奨保護具 のように具体行動へ橋渡し
 *
 * スコアリング方針: シンプルな日本語トークン抽出 + キーワード一致 + ハザード/カテゴリ重み付け。
 * RAG ほど精緻ではないが、ETL が走らないクライアント生成 SSG ページでも軽量に動く。
 */

import { mhlwNotices, type MhlwNotice } from "@/data/mhlw-notices";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { safetyGoodsItems, type SafetyGoodsItem } from "@/data/mock/safety-goods";
import { getAllEquipment, type EquipmentItem } from "@/lib/equipment-recommendation";
import type { AccidentCase } from "@/lib/types/domain";

export type RelatedContentItem = {
  /** 内部URL */
  href: string;
  /** カード上部の小さなラベル（カテゴリ等） */
  category: string;
  /** タイトル */
  title: string;
  /** 説明文（2行クランプ想定） */
  description: string;
  /** 種別: notice/accident/equipment/article */
  kind: "notice" | "accident" | "equipment" | "article";
  /** 拘束力・重大度などのバッジ */
  badge?: string;
};

/** 日本語トークン化（2文字以上の漢字・かな・英数字） */
function tokenize(text: string): string[] {
  return (text.match(/[一-龥ぁ-んァ-ヶa-zA-Z0-9]{2,}/g) ?? []).filter((t) => t.length >= 2);
}

/** ハザード ID → 自然言語キーワード（事故・通達タイトル本文との一致用） */
const HAZARD_KEYWORDS: Record<string, string[]> = {
  fall: ["墜落", "転落", "足場", "ハーネス", "高所"],
  heat: ["熱中症", "高温", "WBGT", "暑熱"],
  cold: ["寒冷", "凍傷"],
  chemical: ["化学", "有機溶剤", "特化", "中毒", "SDS"],
  dust: ["粉じん", "粉塵", "石綿", "じん肺"],
  noise: ["騒音", "難聴"],
  electric: ["感電", "電気", "電撃"],
  cut: ["切創", "切断"],
  collision: ["衝突", "激突", "はさまれ"],
  entanglement: ["巻き込まれ", "巻込"],
};

function hazardKeywordsFor(hazards: string[]): string[] {
  return hazards.flatMap((h) => HAZARD_KEYWORDS[h] ?? []);
}

/** 業種ID → 自然言語キーワード（事故 workCategory との一致用） */
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  construction: ["建設", "土木"],
  manufacturing: ["製造", "工場"],
  forestry: ["林業", "伐木"],
  transport: ["運輸", "陸上貨物"],
  healthcare: ["医療", "保健衛生", "介護"],
  agriculture: ["農業"],
  retail: ["小売", "商業"],
};

function industryKeywordsFor(industries: string[]): string[] {
  return industries.flatMap((i) => INDUSTRY_KEYWORDS[i] ?? []);
}

// ---------- スコアリング: ベース実装 ----------

function scoreNotice(
  notice: MhlwNotice,
  tokens: Set<string>,
  category: string | undefined,
  hazardKeywords: string[]
): number {
  const haystack = `${notice.title} ${notice.category} ${notice.lawRef ?? ""}`;
  let score = 0;
  tokens.forEach((t) => {
    if (haystack.includes(t)) score += 1;
  });
  hazardKeywords.forEach((kw) => {
    if (haystack.includes(kw)) score += 2;
  });
  if (category && notice.category === category) score += 3;
  return score;
}

function scoreAccident(
  c: AccidentCase,
  tokens: Set<string>,
  hazardKeywords: string[],
  industryKeywords: string[]
): number {
  const haystack = `${c.title} ${c.summary} ${c.workCategory} ${c.type} ${(c.mainCauses ?? []).join(" ")}`;
  let score = 0;
  tokens.forEach((t) => {
    if (haystack.includes(t)) score += 1;
  });
  hazardKeywords.forEach((kw) => {
    if (haystack.includes(kw)) score += 2;
  });
  industryKeywords.forEach((kw) => {
    if (haystack.includes(kw)) score += 1;
  });
  return score;
}

function scoreEquipment(
  it: EquipmentItem,
  tokens: Set<string>,
  hazards: string[],
  industries: string[]
): number {
  const haystack = `${it.name} ${it.spec} ${it.recommendReason ?? ""}`;
  let score = 0;
  tokens.forEach((t) => {
    if (haystack.includes(t)) score += 1;
  });
  // 直接マッチが最強シグナル（ハザードID共有）
  hazards.forEach((h) => {
    if (it.hazards.includes(h)) score += 5;
    else if (it.hazards.includes("all")) score += 1;
  });
  industries.forEach((i) => {
    if (it.industries.includes(i)) score += 2;
  });
  return score;
}

// ---------- 公開 API: 各オリジン別ヘルパ ----------

export type RelatedFromNoticeOptions = {
  /** 表示件数上限。各種別ごと（最大10） */
  limit?: number;
};

/** 通達 → 関連通達・事故・保護具 */
export function relatedFromNotice(
  notice: MhlwNotice,
  opts: RelatedFromNoticeOptions = {}
): {
  notices: RelatedContentItem[];
  accidents: RelatedContentItem[];
  equipment: RelatedContentItem[];
} {
  const limit = Math.max(1, Math.min(10, opts.limit ?? 5));
  const tokens = new Set<string>([
    ...tokenize(notice.title),
    ...tokenize(notice.category),
    ...tokenize(notice.lawRef ?? ""),
  ]);
  // 通達カテゴリから推定されるハザード
  const hazardGuess: string[] = [];
  if (notice.category === "heat-stroke") hazardGuess.push("heat");
  if (notice.category.includes("chemical")) hazardGuess.push("chemical");
  if (/(墜落|足場|高所|ハーネス)/.test(notice.title)) hazardGuess.push("fall");
  if (/(粉じん|粉塵|石綿|じん肺)/.test(notice.title)) hazardGuess.push("dust");
  if (/(感電|電気)/.test(notice.title)) hazardGuess.push("electric");
  const hazardKeywords = hazardKeywordsFor(hazardGuess);

  const noticeHits = mhlwNotices
    .filter((n) => n.id !== notice.id)
    .map((n) => ({ n, s: scoreNotice(n, tokens, notice.category, hazardKeywords) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map<RelatedContentItem>(({ n }) => ({
      href: `/circulars/${n.id}`,
      category: `${n.docType}・${n.category}`,
      title: n.title,
      description: `${n.noticeNumber ?? ""} ${n.issuer ?? ""} ${n.issuedDateRaw ?? ""}`.trim(),
      kind: "notice",
      badge: n.bindingLevel === "binding" ? "拘束力あり" : n.bindingLevel === "indirect" ? "間接的拘束" : "参考",
    }));

  const accidentHits = getAccidentCasesDataset()
    .map((c) => ({ c, s: scoreAccident(c, tokens, hazardKeywords, []) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map<RelatedContentItem>(({ c }) => ({
      href: `/accidents`,
      category: c.workCategory,
      title: c.title,
      description: c.summary,
      kind: "accident",
      badge: c.severity,
    }));

  const equipmentHits = getAllEquipment()
    .map((it) => ({ it, s: scoreEquipment(it, tokens, hazardGuess, []) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map<RelatedContentItem>(({ it }) => ({
      href: `/equipment/${it.id}`,
      category: `${it.categoryIcon} ${it.categoryName}`,
      title: it.name,
      description: it.recommendReason ?? it.spec,
      kind: "equipment",
      badge: it.priceLabel,
    }));

  return { notices: noticeHits, accidents: accidentHits, equipment: equipmentHits };
}

/** 事故 → 類似事故・保護具・通達 */
export function relatedFromAccident(
  c: AccidentCase,
  opts: RelatedFromNoticeOptions = {}
): {
  accidents: RelatedContentItem[];
  equipment: RelatedContentItem[];
  notices: RelatedContentItem[];
} {
  const limit = Math.max(1, Math.min(10, opts.limit ?? 5));
  const tokens = new Set<string>([
    ...tokenize(c.title),
    ...tokenize(c.summary),
    ...tokenize(c.workCategory),
    ...tokenize(c.type),
    ...tokenize((c.mainCauses ?? []).join(" ")),
  ]);
  // 事故タイプ → ハザード推定
  const hazardGuess: string[] = [];
  if (c.type === "墜落") hazardGuess.push("fall");
  if (c.type.includes("感電")) hazardGuess.push("electric");
  if (c.type.includes("中毒") || c.type.includes("化学")) hazardGuess.push("chemical");
  if (c.type.includes("熱中症") || /熱中症/.test(c.summary)) hazardGuess.push("heat");
  if (c.type.includes("はさまれ") || c.type.includes("巻き込まれ")) hazardGuess.push("entanglement");
  const hazardKeywords = hazardKeywordsFor(hazardGuess);

  const similarAccidents = getAccidentCasesDataset()
    .filter((x) => x.id !== c.id)
    .map((x) => {
      let s = scoreAccident(x, tokens, hazardKeywords, []);
      if (x.type === c.type) s += 5;
      if (x.workCategory === c.workCategory) s += 3;
      return { x, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map<RelatedContentItem>(({ x }) => ({
      href: `/accidents`,
      category: x.workCategory,
      title: x.title,
      description: x.summary,
      kind: "accident",
      badge: x.severity,
    }));

  const equipmentHits = getAllEquipment()
    .map((it) => ({ it, s: scoreEquipment(it, tokens, hazardGuess, []) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map<RelatedContentItem>(({ it }) => ({
      href: `/equipment/${it.id}`,
      category: `${it.categoryIcon} ${it.categoryName}`,
      title: it.name,
      description: it.recommendReason ?? it.spec,
      kind: "equipment",
      badge: it.priceLabel,
    }));

  const noticeHits = mhlwNotices
    .map((n) => ({ n, s: scoreNotice(n, tokens, undefined, hazardKeywords) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map<RelatedContentItem>(({ n }) => ({
      href: `/circulars/${n.id}`,
      category: `${n.docType}・${n.category}`,
      title: n.title,
      description: `${n.noticeNumber ?? ""} ${n.issuer ?? ""}`.trim(),
      kind: "notice",
      badge: n.bindingLevel === "binding" ? "拘束力あり" : n.bindingLevel === "indirect" ? "間接的拘束" : "参考",
    }));

  return { accidents: similarAccidents, equipment: equipmentHits, notices: noticeHits };
}

/** 保護具 → 関連事故・通達・記事（記事は将来用に空配列） */
export function relatedFromEquipment(
  item: EquipmentItem,
  opts: RelatedFromNoticeOptions = {}
): {
  accidents: RelatedContentItem[];
  notices: RelatedContentItem[];
  equipment: RelatedContentItem[];
} {
  const limit = Math.max(1, Math.min(10, opts.limit ?? 5));
  const tokens = new Set<string>([
    ...tokenize(item.name),
    ...tokenize(item.spec),
    ...tokenize(item.categoryName),
  ]);
  const hazardKeywords = hazardKeywordsFor(item.hazards);
  const industryKeywords = industryKeywordsFor(item.industries);

  const accidentHits = getAccidentCasesDataset()
    .map((c) => ({ c, s: scoreAccident(c, tokens, hazardKeywords, industryKeywords) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map<RelatedContentItem>(({ c }) => ({
      href: `/accidents`,
      category: c.workCategory,
      title: c.title,
      description: c.summary,
      kind: "accident",
      badge: c.severity,
    }));

  const noticeHits = mhlwNotices
    .map((n) => ({ n, s: scoreNotice(n, tokens, undefined, hazardKeywords) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map<RelatedContentItem>(({ n }) => ({
      href: `/circulars/${n.id}`,
      category: `${n.docType}・${n.category}`,
      title: n.title,
      description: `${n.noticeNumber ?? ""} ${n.issuer ?? ""}`.trim(),
      kind: "notice",
      badge: n.bindingLevel === "binding" ? "拘束力あり" : n.bindingLevel === "indirect" ? "間接的拘束" : "参考",
    }));

  // 同カテゴリ・近接価格の他保護具
  const sameCategoryHits = getAllEquipment()
    .filter((it) => it.id !== item.id && it.categoryId === item.categoryId)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, limit)
    .map<RelatedContentItem>((it) => ({
      href: `/equipment/${it.id}`,
      category: `${it.categoryIcon} ${it.categoryName}`,
      title: it.name,
      description: it.recommendReason ?? it.spec,
      kind: "equipment",
      badge: it.priceLabel,
    }));

  return { accidents: accidentHits, notices: noticeHits, equipment: sameCategoryHits };
}

/**
 * 任意のテキスト（記事タイトル＋本文や、業種・キーワードフリーテキスト）から
 * 関連保護具を引く軽量ヘルパ。D10「この場面で必要な保護具」セクション用。
 */
export function relatedSafetyGoodsByText(
  text: string,
  opts: { limit?: number } = {}
): SafetyGoodsItem[] {
  const limit = Math.max(1, Math.min(10, opts.limit ?? 4));
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];
  const scored = safetyGoodsItems.map((g) => {
    const haystack = `${g.name} ${g.description} ${g.tags.join(" ")}`;
    let score = 0;
    tokens.forEach((t) => {
      if (haystack.includes(t)) score += 1;
    });
    return { g, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 0)
    .slice(0, limit)
    .map((s) => s.g);
}
