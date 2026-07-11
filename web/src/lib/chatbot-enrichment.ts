import type { LawArticle } from "@/data/laws";
import { getLawMetadata, getArticleEffectiveDate } from "@/data/law-metadata";
import { LAW_SHORT_SET, LAW_FULL_NAME_SET } from "@/lib/law-name-registry";

/**
 * Structured citation for a single law article, exposing the
 * "条文番号 + 施行日 + 発出機関" triple to the chatbot UI.
 */
export type StructuredCitation = {
  lawShort: string;
  fullName: string;
  articleNum: string;
  articleTitle: string;
  issuer: string;
  effectiveDate: string;
  /** /law-search deep link */
  searchHref: string;
  /** e-Gov 法令本文へのリンク（取得できる場合） */
  egovHref?: string;
};

export type RelatedLawLink = {
  lawShort: string;
  fullName: string;
  reason: string;
  searchHref: string;
};

export type DigDeeperLink = {
  kind: "accidents" | "circulars" | "report" | "law-search" | "education" | "ky";
  label: string;
  href: string;
  description: string;
};

const KEYWORD_TO_INDUSTRY_SLUG: Array<{
  keywords: string[];
  slug: "construction" | "manufacturing" | "transport" | "healthcare" | "service";
  label: string;
}> = [
  {
    keywords: ["建設", "足場", "墜落", "高所", "解体", "鳶", "型枠"],
    slug: "construction",
    label: "建設業",
  },
  {
    keywords: ["製造", "プレス", "工場", "切断", "研削", "ロボット", "化学プラント"],
    slug: "manufacturing",
    label: "製造業",
  },
  {
    keywords: ["運輸", "トラック", "フォークリフト", "倉庫", "荷役", "陸運", "配送"],
    slug: "transport",
    label: "運輸交通業",
  },
  {
    keywords: ["医療", "看護", "介護", "病院", "保健", "腰痛"],
    slug: "healthcare",
    label: "医療福祉",
  },
  {
    keywords: ["小売", "サービス", "飲食", "清掃", "オフィス"],
    slug: "service",
    label: "サービス業",
  },
];

const TOPIC_TO_ACCIDENT_QUERY: Array<{ triggers: string[]; query: string; label: string }> = [
  { triggers: ["熱中症", "WBGT", "暑熱"], query: "熱中症", label: "熱中症の事故事例" },
  { triggers: ["フォークリフト", "車両系建設機械"], query: "フォークリフト", label: "フォークリフト関連の事故事例" },
  { triggers: ["クレーン", "玉掛け", "デリック"], query: "クレーン", label: "クレーン・玉掛けの事故事例" },
  { triggers: ["足場", "墜落", "高所作業", "わく組"], query: "墜落", label: "墜落・足場の事故事例" },
  { triggers: ["酸欠", "酸素欠乏"], query: "酸素欠乏", label: "酸素欠乏の事故事例" },
  { triggers: ["有機溶剤", "塗装", "脱脂"], query: "有機溶剤", label: "有機溶剤の事故事例" },
  { triggers: ["石綿", "アスベスト"], query: "石綿", label: "石綿関連の事故事例" },
  { triggers: ["感電", "電気取扱"], query: "感電", label: "感電の事故事例" },
  { triggers: ["はさまれ", "巻き込まれ", "プレス", "ロボット"], query: "はさまれ", label: "はさまれ・巻き込まれの事故事例" },
  { triggers: ["粉じん", "じん肺"], query: "粉じん", label: "粉じん・じん肺の事故事例" },
];

const TOPIC_TO_CIRCULAR_CATEGORY: Array<{
  triggers: string[];
  category: string;
  label: string;
}> = [
  { triggers: ["熱中症", "WBGT"], category: "heat-stroke", label: "熱中症関連の通達" },
  { triggers: ["化学物質", "SDS", "リスクアセスメント", "GHS"], category: "chemicals", label: "化学物質関連の通達" },
  { triggers: ["石綿", "アスベスト"], category: "asbestos", label: "石綿関連の通達" },
  { triggers: ["メンタル", "ストレスチェック", "心の健康"], category: "mental", label: "メンタルヘルス関連の通達" },
  { triggers: ["健康診断", "健診"], category: "health-check", label: "健康診断関連の通達" },
];

const RELATED_LAW_GROUPS: Array<{
  laws: string[];
  related: { lawShort: string; fullName: string; reason: string }[];
}> = [
  // 化学物質群: 安衛法⇄SDS/RA、特化則・有機則・石綿則・粉じん則・鉛則・四アルキル鉛則は互いに参照する
  {
    laws: ["特化則", "有機則", "石綿則", "粉じん則", "鉛則", "四アルキル鉛則"],
    related: [
      { lawShort: "安衛法", fullName: "労働安全衛生法", reason: "化学物質規制の母法。SDS/RAは安衛法第57条の2・第57条の3。" },
      { lawShort: "作環測法", fullName: "作業環境測定法", reason: "気中濃度測定・管理区分判定の根拠法。" },
      { lawShort: "化学物質RA指針", fullName: "化学物質等による危険性又は有害性等の調査等に関する指針", reason: "リスクアセスメントの実施方法の指針。" },
    ],
  },
  // 安衛則・足場・クレーン・ゴンドラ
  {
    laws: ["安衛則", "クレーン則", "ゴンドラ則", "ボイラー則"],
    related: [
      { lawShort: "安衛法", fullName: "労働安全衛生法", reason: "規則の根拠法（就業制限・特別教育の親条文）。" },
      { lawShort: "安衛令", fullName: "労働安全衛生法施行令", reason: "就業制限業務・作業主任者選任業務の指定。" },
    ],
  },
  // 酸欠
  {
    laws: ["酸欠則"],
    related: [
      { lawShort: "安衛法", fullName: "労働安全衛生法", reason: "酸欠作業の根拠法（第14条 作業主任者・第59条 特別教育）。" },
      { lawShort: "安衛則", fullName: "労働安全衛生規則", reason: "事業場全体の安全衛生管理体制を定める。" },
    ],
  },
  // 健康診断・じん肺
  {
    laws: ["じん肺法"],
    related: [
      { lawShort: "粉じん則", fullName: "粉じん障害防止規則", reason: "粉じん作業時の発散源対策と作業環境管理。" },
      { lawShort: "安衛法", fullName: "労働安全衛生法", reason: "健康診断義務の母法（第66条群）。" },
    ],
  },
  // 電離
  {
    laws: ["電離則"],
    related: [
      { lawShort: "安衛法", fullName: "労働安全衛生法", reason: "電離放射線業務の根拠法。" },
      { lawShort: "じん肺法", fullName: "じん肺法", reason: "特殊健診の枠組みは類似（じん肺健診も参照）。" },
    ],
  },
  // 労基系
  {
    laws: ["労基法", "労契法", "最賃法", "パート有期法"],
    related: [
      { lawShort: "労基則", fullName: "労働基準法施行規則", reason: "労基法の運用を定める下位規則。" },
      { lawShort: "労災保険法", fullName: "労働者災害補償保険法", reason: "労働災害の補償スキーム。" },
    ],
  },
  // 育介・均等
  {
    laws: ["育介法", "均等法"],
    related: [
      { lawShort: "労基法", fullName: "労働基準法", reason: "母性保護規定（第64条の3等）と一体運用。" },
    ],
  },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s　]/g, "");
}

/**
 * 質問文と RAG ヒット条文から、関連法令の自動サジェスト候補を返す。
 * 重複は lawShort で排除、最大 4 件。
 */
export function suggestRelatedLaws(
  query: string,
  articles: LawArticle[]
): RelatedLawLink[] {
  if (articles.length === 0) return [];
  const hitLawShorts = new Set(articles.map((a) => a.lawShort));
  const out: RelatedLawLink[] = [];
  const seen = new Set<string>();

  for (const group of RELATED_LAW_GROUPS) {
    const overlap = group.laws.some((law) => hitLawShorts.has(law));
    if (!overlap) continue;
    for (const r of group.related) {
      // ヒット済みの法令は「関連」として再提示しない（既に出典に出ているため）
      if (hitLawShorts.has(r.lawShort)) continue;
      if (seen.has(r.lawShort)) continue;
      seen.add(r.lawShort);
      out.push({
        lawShort: r.lawShort,
        fullName: r.fullName,
        reason: r.reason,
        searchHref: `/law-search?q=${encodeURIComponent(r.lawShort)}`,
      });
      if (out.length >= 4) return out;
    }
  }

  // フォールバック: ヒットが安衛則のみ等の場合、安衛法・安衛令を補完
  if (out.length === 0 && hitLawShorts.has("安衛則") && !hitLawShorts.has("安衛法")) {
    out.push({
      lawShort: "安衛法",
      fullName: "労働安全衛生法",
      reason: "安衛則の根拠法。義務の出所を遡って確認する際に有用です。",
      searchHref: `/law-search?q=${encodeURIComponent("労働安全衛生法")}`,
    });
  }
  // 質問語が "教育" を含む場合は職能法を関連サジェスト
  const q = normalize(query);
  if (q.includes("特別教育") || q.includes("技能講習") || q.includes("資格")) {
    if (!seen.has("職能法") && !hitLawShorts.has("職能法")) {
      out.push({
        lawShort: "職能法",
        fullName: "職業能力開発促進法",
        reason: "教育訓練・技能評価制度（公共職業訓練・技能検定）の根拠法。",
        searchHref: `/law-search?q=${encodeURIComponent("職業能力開発促進法")}`,
      });
    }
  }
  return out.slice(0, 4);
}

/**
 * 質問内容に応じた事故事例ハブ・通達ハブ・業種別レポートへの動線を返す。
 */
export function suggestDigDeeperLinks(
  query: string,
  articles: LawArticle[]
): DigDeeperLink[] {
  const out: DigDeeperLink[] = [];
  const q = normalize(query);

  // 事故事例: トピックマッチがあれば該当クエリ、なければ汎用 /accidents
  let accidentAdded = false;
  for (const topic of TOPIC_TO_ACCIDENT_QUERY) {
    if (topic.triggers.some((t) => q.includes(normalize(t)))) {
      out.push({
        kind: "accidents",
        label: topic.label,
        href: `/accidents?q=${encodeURIComponent(topic.query)}`,
        description: `関連する厚労省「職場のあんぜんサイト」事例を一覧表示します。`,
      });
      accidentAdded = true;
      break;
    }
  }
  if (!accidentAdded && articles.length > 0) {
    const fallback = articles[0]?.articleTitle || query.slice(0, 20);
    out.push({
      kind: "accidents",
      label: `「${fallback}」関連の事故事例`,
      href: `/accidents?q=${encodeURIComponent(fallback)}`,
      description: `この条文に関連する事故事例を検索します。`,
    });
  }

  // 通達カテゴリ: 一致があれば /circulars?category=...
  for (const topic of TOPIC_TO_CIRCULAR_CATEGORY) {
    if (topic.triggers.some((t) => q.includes(normalize(t)))) {
      out.push({
        kind: "circulars",
        label: topic.label,
        href: `/circulars?category=${encodeURIComponent(topic.category)}`,
        description: `厚労省一次資料DBから該当カテゴリの通達・告示を表示します。`,
      });
      break;
    }
  }

  // 業種レポート: 質問語に業種ヒントがあれば /accidents-reports/[industry]
  for (const ind of KEYWORD_TO_INDUSTRY_SLUG) {
    if (ind.keywords.some((k) => q.includes(normalize(k)))) {
      out.push({
        kind: "report",
        label: `${ind.label}の労働災害分析レポート`,
        href: `/accidents-reports/${ind.slug}`,
        description: `${ind.label}の事故事例・原因 Top10・推奨対策チェックリストを表示します。`,
      });
      break;
    }
  }

  // 上位条文の e-Gov 直接リンクを law-search 経由で常に 1 つ添える
  if (articles.length > 0) {
    const top = articles[0];
    const meta = getLawMetadata(top.lawShort);
    out.push({
      kind: "law-search",
      label: `${meta.fullName}${top.articleNum} の条文を確認`,
      href: `/law-search?q=${encodeURIComponent(top.lawShort + top.articleNum)}`,
      description: `条文の全文と関連条文を法令検索で確認します。`,
    });
  }

  return out.slice(0, 4);
}

/**
 * RAG ヒット条文を構造化シティション（条文番号＋施行日＋発出機関）に変換する。
 * 重複（同一 lawShort + articleNum）は除外し、最大 5 件まで。
 */
export function buildStructuredCitations(articles: LawArticle[]): StructuredCitation[] {
  const seen = new Set<string>();
  const out: StructuredCitation[] = [];
  for (const a of articles) {
    const key = `${a.lawShort}|${a.articleNum}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = getLawMetadata(a.lawShort);
    const effective =
      getArticleEffectiveDate(a.lawShort, a.articleNum) ?? meta.enactedOn;
    out.push({
      lawShort: a.lawShort,
      fullName: meta.fullName || a.law,
      articleNum: a.articleNum,
      articleTitle: a.articleTitle,
      issuer: meta.issuer,
      effectiveDate: effective,
      searchHref: `/law-search?q=${encodeURIComponent(a.lawShort + a.articleNum)}`,
      egovHref: meta.egovLawId
        ? `https://laws.e-gov.go.jp/law/${meta.egovLawId}`
        : undefined,
    });
    if (out.length >= 5) break;
  }
  return out;
}

// formatCitationTriples（📎出典テールの本文追記）は 2026-07-11 に廃止。
// 出典は構造化フィールド citations のみで返し、UI が折りたたみカードで表示する
// （本文追記は二重表示＝「ごちゃごちゃブロック」の主因だった）。

// lawShort⇄正式名称の既知集合は law-name-registry.ts（data/laws を単一ソースに自動生成）
// を再利用する。以前はここに手動の重複リストを持っており、50法令体制拡張後に
// 追加された法令（過労死防止法・化審法・毒劇法ほか）が未登録のまま漏れ、
// 正当な引用まで「範囲外」警告してしまう既知のドリフトがあった。
// 正式名称は短縮名と字面が重ならないことが多い（例: 「労働安全衛生法」⊅「安衛法」、
// 「酸素欠乏症等防止規則」⊅「酸欠則」）ため、substring 照合とは別に完全一致で
// 判定する集合を用意する。
const KNOWN_LAW_SHORTS = LAW_SHORT_SET;
const KNOWN_LAW_FULL_NAMES = LAW_FULL_NAME_SET;

/**
 * 回答中に出現する「○○法/則/規則/指針/通達 + 第N条」表現を抽出し、
 * RAGコーパスに含まれない法令名を引用しているかどうかを判定する。
 * フィードバック: 範囲外なら明示的に警告ノートを追記してハルシネーション抑制。
 */
export function detectOutOfScopeLawReferences(
  answer: string,
  hitLawShorts: Iterable<string>
): string[] {
  const hits = new Set(hitLawShorts);
  // 長音「ー」「々」を文字クラスに含めないと「クレーン等安全規則」のような
  // 長音入り法令名が「ン等安全規則」等に分断され、既知法令なのに偽の範囲外
  // 警告が出る（実測: 正答の25%で誤発火）。
  const lawPattern = /([一-龥ぁ-んァ-ヴー々A-Za-z0-9]{2,12}(?:法|則|規則|指針|通達|告示|条例))第\s*[一二三四五六七八九十百0-9]+条/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = lawPattern.exec(answer))) {
    const name = match[1];
    // 「同法」「本法」「上記法令」等の指示語は除外
    if (/^(同|本|上記|該当|当該|該|本件|先述|次の|前述)/.test(name)) continue;
    // KNOWN_LAW_SHORTS/KNOWN_LAW_FULL_NAMES に完全一致すれば安全。
    // それ以外は簡易チェックとして「含む」関係（略記の一部表記ゆれ等）でも安全とみなす。
    // 正式名称の包含も安全側に判定する: 「労働安全衛生法附則第4条」のような
    // 既知法令の附則・付随表記が短縮名照合をすり抜けて範囲外扱いされ、
    // 正答に偽の範囲外警告が付く事故を防ぐ（2026-07-11 GQ12: ストレスチェック
    // 50人未満の努力義務の根拠＝安衛法附則（平成26年法律第82号）への誤発火）。
    const safe =
      KNOWN_LAW_SHORTS.has(name) ||
      KNOWN_LAW_FULL_NAMES.has(name) ||
      [...KNOWN_LAW_SHORTS].some((k) => name.includes(k) || k.includes(name)) ||
      [...KNOWN_LAW_FULL_NAMES].some((k) => name.includes(k)) ||
      [...hits].some((k) => name.includes(k) || k.includes(name));
    if (!safe) found.add(name);
  }
  return [...found];
}

// SYSTEM_PROMPT の引用フォーマット例「（施行：YYYY年MM月、所管：厚生労働省）」を
// Geminiがテンプレートのまま出力してしまう事故（本番実測で1問中3箇所）を防ぐ後処理。
const PLACEHOLDER_ENACTMENT_RE = /施行[：:]\s*YYYY年(?:MM月)?(?:DD日)?[、，]?\s*/g;
const PLACEHOLDER_ARTICLE_RE = /第XX条/g;
const PLACEHOLDER_TOKEN_RE = /YYYY|第XX条/;
const PLACEHOLDER_PAREN_RE = /[（(][^（）()]*YYYY[^（）()]*[）)]/g;

/**
 * 応答中に残った「YYYY年MM月」「第XX条」等の未置換プレースホルダを除去する。
 * まず日付句のみを狙い撃ちで除去（所管等の実データは残す）、それでも
 * トークンが残る場合は該当する丸括弧ごと除去するフォールバックを適用する。
 */
export function sanitizePlaceholderCitations(answer: string): string {
  if (!answer || !PLACEHOLDER_TOKEN_RE.test(answer)) return answer;
  let sanitized = answer.replace(PLACEHOLDER_ENACTMENT_RE, "");
  sanitized = sanitized.replace(PLACEHOLDER_PAREN_RE, "");
  sanitized = sanitized.replace(PLACEHOLDER_ARTICLE_RE, "");
  // 除去後に空になった丸括弧を整理
  sanitized = sanitized.replace(/[（(]\s*[）)]/g, "");
  return sanitized;
}

/**
 * Geminiが出力した可能性のある不確実表現（断定なし・推測表現）を
 * 注記とともに残すための検出ヘルパー。
 */
export function detectUngroundedAssertions(answer: string): boolean {
  // 「〜と考えられます」「〜と思われます」「〜のはずです」が連発している場合、
  // 根拠不十分の可能性が高い。
  const weasels = [
    /と考えられます/g,
    /と思われます/g,
    /のはずです/g,
    /であるとされていますが/g,
    /おそらく/g,
    /多分/g,
  ];
  let count = 0;
  for (const w of weasels) {
    const m = answer.match(w);
    if (m) count += m.length;
  }
  return count >= 2;
}
