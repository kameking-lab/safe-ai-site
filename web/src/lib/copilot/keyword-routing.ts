/**
 * Keyword-based routing helpers used by the Copilot layer to map free-form
 * user text (chatbot questions, recent searches) to canonical industry slugs
 * and to suggest plan-generator focus areas.
 *
 * Kept separate from chatbot-enrichment so it can be imported safely from
 * server pages, client components, and unit tests without dragging the full
 * RAG dependency graph in.
 */
import type { IndustrySlug } from "@/lib/industry-slugs";
import type { MeasureCategory } from "@/types/safety-plan";

export interface IndustryKeywordMatch {
  slug: IndustrySlug;
  /** First trigger keyword that matched */
  matched: string;
  label: string;
}

const INDUSTRY_KEYWORDS: Array<{ slug: IndustrySlug; label: string; keywords: string[] }> = [
  {
    slug: "construction",
    label: "建設業",
    keywords: ["建設", "建築", "土木", "足場", "墜落", "高所", "解体", "鳶", "型枠", "とび"],
  },
  {
    slug: "manufacturing",
    label: "製造業",
    keywords: [
      "製造",
      "プレス",
      "工場",
      "切断",
      "研削",
      "ロボット",
      "化学プラント",
      "金属加工",
      "射出成形",
    ],
  },
  {
    slug: "transport",
    label: "運輸交通業",
    keywords: ["運輸", "トラック", "フォークリフト", "荷役", "陸運", "配送", "倉庫", "物流"],
  },
  {
    slug: "healthcare",
    label: "医療福祉",
    keywords: ["医療", "看護", "介護", "病院", "保健", "腰痛", "感染", "福祉", "施設"],
  },
  {
    slug: "service",
    label: "サービス業",
    keywords: ["小売", "サービス", "飲食", "清掃", "オフィス", "コンビニ", "店舗", "ホテル"],
  },
];

const FOCUS_KEYWORDS: Array<{ focus: MeasureCategory; keywords: string[]; concern: string }> = [
  {
    focus: "education",
    concern: "安全衛生教育",
    keywords: ["特別教育", "技能講習", "教育", "資格", "新入", "雇入"],
  },
  {
    focus: "ky",
    concern: "危険予知（KY）",
    keywords: ["KY", "危険予知", "ヒヤリハット", "KYT"],
  },
  {
    focus: "health-check",
    concern: "健康診断",
    keywords: ["健康診断", "健診", "特殊健診", "ストレスチェック", "メンタル"],
  },
  {
    focus: "ra",
    concern: "リスクアセスメント",
    keywords: ["リスクアセスメント", "RA", "化学物質", "SDS", "GHS"],
  },
  {
    focus: "inspection",
    concern: "職場巡視・点検",
    keywords: ["巡視", "点検", "始業前", "自主点検"],
  },
  {
    focus: "drill",
    concern: "訓練",
    keywords: ["訓練", "避難", "消火", "救急", "防災"],
  },
  {
    focus: "equipment-check",
    concern: "設備・機械点検",
    keywords: ["設備点検", "機械", "クレーン", "玉掛け", "プレス点検"],
  },
  {
    focus: "industry-specific",
    concern: "業種特有事項",
    keywords: ["足場", "墜落", "酸欠", "石綿", "粉じん", "有機溶剤", "騒音", "振動"],
  },
];

const CONCERN_KEYWORDS: Array<{ concern: string; keywords: string[] }> = [
  { concern: "熱中症", keywords: ["熱中症", "WBGT", "暑熱"] },
  { concern: "墜落", keywords: ["墜落", "高所作業", "足場"] },
  { concern: "フォークリフト", keywords: ["フォークリフト", "車両系"] },
  { concern: "クレーン・玉掛け", keywords: ["クレーン", "玉掛け", "デリック"] },
  { concern: "酸素欠乏", keywords: ["酸欠", "酸素欠乏"] },
  { concern: "有機溶剤", keywords: ["有機溶剤", "塗装", "脱脂"] },
  { concern: "石綿", keywords: ["石綿", "アスベスト"] },
  { concern: "感電", keywords: ["感電", "電気取扱"] },
  { concern: "はさまれ・巻き込まれ", keywords: ["はさまれ", "巻き込まれ", "プレス", "ロボット"] },
  { concern: "粉じん・じん肺", keywords: ["粉じん", "じん肺"] },
  { concern: "腰痛", keywords: ["腰痛", "重量物"] },
  { concern: "メンタルヘルス", keywords: ["メンタル", "ストレス", "ハラスメント"] },
  { concern: "化学物質RA", keywords: ["化学物質", "SDS", "GHS", "ラベル"] },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

/**
 * Return the first industry whose keyword list intersects with the input.
 * Returns null when no slug can be inferred — callers should fall back to
 * SafetyContext.industry or prompt the user.
 */
export function detectIndustry(text: string): IndustryKeywordMatch | null {
  const q = normalize(text);
  for (const it of INDUSTRY_KEYWORDS) {
    for (const k of it.keywords) {
      if (q.includes(normalize(k))) {
        return { slug: it.slug, matched: k, label: it.label };
      }
    }
  }
  return null;
}

/**
 * Return all matching plan-generator focus categories. Multiple categories
 * can match (e.g. "化学物質RA + 健康診断") — caller decides how many to
 * surface in the UI.
 */
export function detectFocusAreas(text: string): MeasureCategory[] {
  const q = normalize(text);
  const out: MeasureCategory[] = [];
  for (const f of FOCUS_KEYWORDS) {
    if (f.keywords.some((k) => q.includes(normalize(k)))) {
      if (!out.includes(f.focus)) out.push(f.focus);
    }
  }
  return out;
}

/**
 * Return human-readable concern labels detected in the text. Used to
 * populate SafetyContext.keyConcerns from chatbot turns and report visits.
 */
export function detectConcerns(text: string): string[] {
  const q = normalize(text);
  const out: string[] = [];
  for (const c of CONCERN_KEYWORDS) {
    if (c.keywords.some((k) => q.includes(normalize(k)))) {
      if (!out.includes(c.concern)) out.push(c.concern);
    }
  }
  return out;
}
