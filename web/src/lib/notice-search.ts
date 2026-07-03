import { mhlwNotices, type MhlwNotice } from "@/data/mhlw-notices";

// トピック語のシノニム展開表。1つのグループ内のどれか1語がクエリに含まれれば、
// その全語をトークンに加える（双方向展開）。現場・一人親方が使う「うろ覚え／口語／
// 旧法令名」を、通達 DB のタイトルで実際に使われている正式表記へ橋渡しして取り逃しを防ぐ。
// **各語は @/data/mhlw-notices に実在するタイトル表記に裏付けを持たせる**（捏造しない）。
const TOPIC_SYNONYMS: Record<string, string[]> = {
  熱中症: ["熱中症", "WBGT", "暑熱"],
  化学物質: ["化学物質", "SDS", "GHS", "リスクアセスメント", "ばく露"],
  石綿: ["石綿", "アスベスト"],
  メンタルヘルス: ["メンタルヘルス", "ストレスチェック", "心の健康"],
  健康診断: ["健康診断", "健診"],
  足場: ["足場", "墜落", "フルハーネス"],
  // 墜落・転落の PPE。現場は 2019 年の法令改称前の旧称「安全帯」を今も口語で使うが、
  // 通達タイトルの正式表記は「墜落制止用器具」。旧称・略称から正式表記へ橋渡しする。
  墜落制止用器具: ["墜落制止用器具", "安全帯", "フルハーネス", "墜落", "転落"],
  粉じん: ["粉じん", "じん肺"],
  // 現場口語「酸欠」は通達タイトルに一切現れず（正式表記は「酸素欠乏」）そのままでは 0 件。
  // 酸欠 → 酸素欠乏症・硫化水素中毒の通達群へ橋渡しする。
  酸素欠乏: ["酸素欠乏", "酸欠", "硫化水素"],
  // 林業・造園のチェーンソー振動ばく露。健康障害名「振動障害／白ろう病」から
  // 原因作業「チェーンソー」の通達群へ橋渡しする（障害名は通達タイトルに現れない）。
  チェーンソー: ["チェーンソー", "振動障害", "白ろう病", "振動工具"],
  電離放射線: ["電離放射線", "放射線"],
  外国人労働者: ["外国人労働者", "外国人"],
  高年齢: ["高年齢", "エイジフレンドリー", "エイジアクション"],
  フリーランス: ["フリーランス", "一人親方", "個人事業者"],
  リスクアセスメント: ["リスクアセスメント", "RA"],
  教育: ["教育", "安全衛生教育", "職長教育", "職長"],
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
