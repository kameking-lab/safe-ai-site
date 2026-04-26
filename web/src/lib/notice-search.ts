import { mhlwNotices, type MhlwNotice } from "@/data/mhlw-notices";

const TOPIC_SYNONYMS: Record<string, string[]> = {
  熱中症: ["熱中症", "WBGT", "暑熱"],
  化学物質: ["化学物質", "SDS", "GHS", "リスクアセスメント", "ばく露"],
  石綿: ["石綿", "アスベスト"],
  メンタルヘルス: ["メンタルヘルス", "ストレスチェック", "心の健康"],
  健康診断: ["健康診断", "健診"],
  足場: ["足場", "墜落", "フルハーネス"],
  粉じん: ["粉じん", "じん肺"],
  電離放射線: ["電離放射線", "放射線"],
  外国人労働者: ["外国人労働者", "外国人"],
  高年齢: ["高年齢", "エイジフレンドリー", "エイジアクション"],
  フリーランス: ["フリーランス", "一人親方", "個人事業者"],
  リスクアセスメント: ["リスクアセスメント", "RA"],
  教育: ["教育", "安全衛生教育", "職長教育"],
  受動喫煙: ["受動喫煙", "喫煙"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s　]/g, "")
    .replace(/[、,。．.「」『』（）()【】\[\]?？!！]/g, "");
}

function expandQuery(q: string): string[] {
  const tokens = new Set<string>();
  const nq = normalize(q);
  tokens.add(nq);
  for (const [, synonyms] of Object.entries(TOPIC_SYNONYMS)) {
    if (synonyms.some((s) => nq.includes(normalize(s)))) {
      synonyms.forEach((s) => tokens.add(normalize(s)));
    }
  }
  // notice number heuristic e.g. 基発0220
  const numMatch = q.match(/(基発|基安発|健発|職発|基収|告示)[\s　]*(\d{2,4})/);
  if (numMatch) tokens.add(normalize(numMatch[0]));
  // explicit categories from notice DB
  for (const cat of [
    "熱中症",
    "化学物質",
    "石綿",
    "メンタルヘルス",
    "健康診断",
    "建設",
    "林業",
    "粉じん",
    "電離放射線",
    "騒音",
    "受動喫煙",
    "外国人",
    "高年齢",
    "フリーランス",
    "感染症",
    "教育",
    "リスクアセスメント",
    "機械",
  ]) {
    if (nq.includes(normalize(cat))) tokens.add(normalize(cat));
  }
  return [...tokens].filter((t) => t.length >= 2);
}

function scoreNotice(n: MhlwNotice, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const haystack = normalize(
    [n.title, n.noticeNumber || "", n.issuer || "", n.category, n.lawRef || ""].join(" "),
  );
  let score = 0;
  for (const t of tokens) {
    if (haystack.includes(t)) {
      score += 1;
      if (n.title && normalize(n.title).includes(t)) score += 0.5;
    }
  }
  // newer notices slightly preferred
  if (n.issuedDate) {
    const y = parseInt(n.issuedDate.slice(0, 4), 10);
    if (!Number.isNaN(y) && y >= 2020) score += 0.2;
  }
  // 告示 (binding) gets a small boost so legally binding sources surface first
  if (n.bindingLevel === "binding") score += 0.3;
  return score;
}

export type NoticeHit = {
  id: string;
  docType: MhlwNotice["docType"];
  title: string;
  noticeNumber: string | null;
  issuedDateRaw: string | null;
  issuer: string | null;
  bindingLevel: MhlwNotice["bindingLevel"];
  detailUrl: string;
  category: string;
};

export function searchRelevantNotices(query: string, k = 3): NoticeHit[] {
  const tokens = expandQuery(query);
  if (tokens.length === 0) return [];
  const ranked = mhlwNotices
    .map((n) => ({ n, s: scoreNotice(n, tokens) }))
    .filter(({ s }) => s >= 1)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map(({ n }) => ({
      id: n.id,
      docType: n.docType,
      title: n.title,
      noticeNumber: n.noticeNumber,
      issuedDateRaw: n.issuedDateRaw,
      issuer: n.issuer,
      bindingLevel: n.bindingLevel,
      detailUrl: n.detailUrl,
      category: n.category,
    }));
  return ranked;
}

export const NOTICE_BINDING_LABELS: Record<MhlwNotice["bindingLevel"], string> = {
  binding: "告示（拘束力あり）",
  indirect: "通達（行政解釈・間接拘束）",
  reference: "指針（参考）",
};
