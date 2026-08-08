import {
  searchCrossIndex,
  normalizeArticleQuery,
  expandLawAliases,
  chemicalDetailUrl,
} from "./cross-search";
import { foldKana, normalizeSearchText } from "./fuzzy-search";
import { isPublicRouteAvailable } from "./public-content-policy";

export type SearchCategory =
  | "law"
  | "plain"
  | "revision"
  | "notice"
  | "chemical"
  | "equipment"
  | "education"
  | "accident"
  | "precedent"
  | "glossary"
  | "faq"
  | "sign"
  | "article"
  | "feature";

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: SearchCategory;
  url: string;
  /**
   * 追加のマッチ用キーワード（title/subtitle に出ない別名・分類ラベル・関連語）。
   * 複数語 AND クエリ「石綿 事前調査」「クレーン 過負荷」を条文へ収束させるために使う。
   */
  keywords?: string[];
  /** 条文見出し等。一般語の照会を代表的な根拠へ収束させる。 */
  headings?: string[];
  /** 情報の性格。カテゴリ（事故/法令等）とは別に、公式・解説・教材・ツールを区別する。 */
  informationKind?:
    | "primary"
    | "secondary"
    | "siteExplanation"
    | "officialAccident"
    | "editedCase"
    | "synthetic"
    | "preliminary"
    | "tool"
    | "guide";
  provenance?:
    | "official"
    | "curated"
    | "synthetic"
    | "preliminary"
    | "internal"
    | "unknown";
  verification?: "humanVerified" | "pending" | "quarantine";
  freshness?: "current" | "stale" | "unknown";
  asOf?: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  /**
   * 結果の内部ページから確認できる公式着地点。評価用の別正解ではなく、
   * 検索結果UIと詳細ページが案内する一次資料URLの固定メタデータ。
   */
  officialDestinations?: string[];
  /** query/hash派生結果が所属する親canonical。 */
  canonicalUrl?: string | null;
  /** 制度・改正の施行日。未確認値は推測して埋めない。 */
  effectiveDate?: string | null;
  /** 原文・人手整理・AI・syntheticを結果一覧で区別する。 */
  summaryKind?: "source" | "human-curated" | "ai" | "synthetic";
}

const OFFICIAL_DESTINATIONS_BY_SEARCH_ID: Readonly<
  Record<string, readonly string[]>
> = {
  "law-労働安全衛生法|第14条": [
    "https://elaws.e-gov.go.jp/document?lawid=347AC0000000057",
  ],
  "law-酸素欠乏症等防止規則|第12条": [
    "https://www.mhlw.go.jp/web/t_doc?dataId=74105000&dataType=0&pageNo=1",
  ],
  "law-労働安全衛生規則|第36条": [
    "https://www.mhlw.go.jp/web/t_doc?dataId=74085000&dataType=0&pageNo=1",
  ],
  "page-/accidents": [
    "https://anzeninfo.mhlw.go.jp/yougo/yougo20_1.html",
    "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_FND.aspx",
  ],
  "chem-mock-cs-001": [
    "https://anzeninfo.mhlw.go.jp/anzen/gmsds/71-43-2.html",
  ],
  "chem-mock-cs-003": [
    "https://anzeninfo.mhlw.go.jp/anzen/gmsds/1330-20-7.html",
  ],
  "education-skill-st-forklift": [
    "https://www.mhlw.go.jp/web/t_doc?dataId=00tb9284&dataType=1&pageNo=1",
  ],
  "education-special-se-36-5-forklift": [
    "https://www.mhlw.go.jp/web/t_doc?dataId=74085000&dataType=0&pageNo=1",
  ],
  "education-special-se-36-26-shokucho-sanso": [
    "https://www.mhlw.go.jp/web/t_doc?dataId=74105000&dataType=0&pageNo=1",
    "https://www.mhlw.go.jp/web/t_doc?dataId=74106000&dataType=0&pageNo=1",
  ],
  "education-special-se-36-3-arch": [
    "https://www.mhlw.go.jp/web/t_doc?dataId=74085000&dataType=0&pageNo=1",
  ],
  "page-/training/visual-ky": [
    "https://anzeninfo.mhlw.go.jp/yougo/yougo40_1.html",
    "https://www.jisha.or.jp/info/field/zerosai/kyt/file04.html",
  ],
  "page-/ky-examples": [
    "https://anzeninfo.mhlw.go.jp/yougo/yougo40_1.html",
    "https://www.jisha.or.jp/info/field/zerosai/kyt/file04.html",
  ],
  "page-/ky/paper": [
    "https://anzeninfo.mhlw.go.jp/yougo/yougo40_1.html",
    "https://www.jisha.or.jp/info/field/zerosai/kyt/file04.html",
  ],
};

export type SearchIndexStatus = "complete" | "partial" | "blocked";

export interface SearchIndexBuild {
  items: SearchItem[];
  status: SearchIndexStatus;
  failedSources: string[];
  builtAt: string;
}

export type SearchMatchedField =
  | "title"
  | "heading"
  | "keywords"
  | "summary"
  | "expanded";

export function getSearchMatchDetails(
  item: SearchItem,
  query: string,
): { field: SearchMatchedField; snippet: string } {
  const terms = foldKana(normalizeSearchText(query))
    .split(/\s+/)
    .filter(Boolean);
  const includesAny = (value: string) => {
    const normalized = foldKana(normalizeSearchText(value));
    return terms.some((term) => normalized.includes(term));
  };
  if (includesAny(item.title)) return { field: "title", snippet: item.title };
  const heading = item.headings?.find(includesAny);
  if (heading) return { field: "heading", snippet: heading };
  const keyword = item.keywords?.find(includesAny);
  if (keyword) return { field: "keywords", snippet: keyword };
  if (includesAny(item.subtitle))
    return { field: "summary", snippet: item.subtitle };
  return { field: "expanded", snippet: item.subtitle };
}

export function getSearchTrustState(item: SearchItem): {
  label: string;
  className: string;
  description: string;
} {
  if (item.verification === "quarantine") {
    return {
      label: "隔離・利用不可",
      className: "border-rose-400 bg-rose-50 text-rose-900",
      description:
        "出典または内容の確認が完了していないため、判断や帳票転記に利用できません。",
    };
  }
  if (item.informationKind === "synthetic" || item.provenance === "synthetic") {
    return {
      label: "教材用synthetic",
      className: "border-violet-300 bg-violet-50 text-violet-900",
      description: "実在事故の記録ではない教材用モデルケースです。",
    };
  }
  if (
    item.informationKind === "preliminary" ||
    item.provenance === "preliminary"
  ) {
    return {
      label: "速報集計由来",
      className: "border-amber-300 bg-amber-50 text-amber-950",
      description:
        "確定個票ではありません。確定資料と対象時点を確認してください。",
    };
  }
  if (
    item.informationKind === "primary" ||
    item.informationKind === "officialAccident"
  ) {
    return {
      label:
        item.verification === "humanVerified"
          ? "一次資料・確認済み"
          : "一次資料・内容確認待ち",
      className: "border-sky-300 bg-sky-50 text-sky-950",
      description:
        item.verification === "humanVerified"
          ? "登録された一次資料を人手確認済みです。適用時点は原文でも確認してください。"
          : "一次資料への導線がありますが、本文一致の人手確認記録は未登録です。",
    };
  }
  if (item.informationKind === "tool") {
    return {
      label: "サイト内ツール",
      className: "border-slate-300 bg-slate-50 text-slate-800",
      description:
        "安全判断を補助するサイト内機能です。公式判断を置き換えません。",
    };
  }
  return {
    label:
      item.verification === "humanVerified"
        ? "サイト解説・確認済み"
        : "サイト解説・確認待ち",
    className: "border-slate-300 bg-white text-slate-800",
    description:
      "サイト独自の整理・解説です。一次資料と適用条件を確認してください。",
  };
}

/**
 * 検索結果で法的な位置付けをカテゴリとは別に明示する。
 * `law` は法律・政令・省令を含むため、単に「法令」と表示すると利用者が
 * 拘束力や役割を取り違えやすい。タイトルと情報種別から保守的に分類し、
 * 判定できないものは上位概念へ戻す。
 */
export function getSearchDocumentTypeLabel(item: SearchItem): string {
  if (item.category === "plain" || item.informationKind === "siteExplanation") {
    if (item.category !== "law") return "解説";
  }
  if (item.category === "notice") return "通達・通知";
  if (item.category === "revision") return "改正記録";
  if (item.category === "article" || item.category === "faq") return "解説";
  if (item.category !== "law") {
    if (item.informationKind === "primary") return "一次資料";
    return "サイト情報";
  }

  const title = normalizeSearchText(item.title);
  if (/安衛令|施行令|政令/.test(title)) return "政令";
  if (
    /安衛則|規則|省令|クレーン則|有機則|特化則|酸欠則|電離則|石綿則|粉じん則|ボイラー則|ゴンドラ則/.test(
      title,
    )
  ) {
    return "省令";
  }
  if (/安衛法|労基法|法律/.test(title)) return "法律";
  return item.informationKind === "primary" ? "一次法令資料" : "法令解説";
}

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;
  if (left === right) return true;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) i += 1;
    else if (right.length > left.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  if (i < left.length || j < right.length) edits += 1;
  return edits <= 1;
}

/**
 * ゼロ件時だけ表示する保守的な候補。結果へ自動混入させず、4文字以上・編集距離1以内に限定する。
 */
export function findConservativeSearchSuggestion(
  items: SearchItem[],
  query: string,
): string | null {
  const normalizedQuery = foldKana(normalizeSearchText(query));
  if (
    normalizedQuery.length < 4 ||
    normalizedQuery.includes(" ") ||
    /[0-9]/.test(normalizedQuery)
  ) {
    return null;
  }
  const candidates = new Map<string, string>();
  const publicItems = items.filter((item) =>
    isPublicRouteAvailable(item.url),
  );

  for (const item of publicItems) {
    if (
      item.verification === "quarantine" ||
      item.informationKind === "synthetic"
    )
      continue;
    for (const raw of [item.title, ...(item.keywords ?? [])]) {
      const normalized = foldKana(normalizeSearchText(raw));
      if (
        normalized.length < 4 ||
        normalized.length > 30 ||
        normalized.includes(" ") ||
        normalized === normalizedQuery
      ) {
        continue;
      }
      candidates.set(normalized, raw);
    }
  }
  const matches = [...candidates.entries()]
    .filter(([normalized]) =>
      editDistanceAtMostOne(normalizedQuery, normalized),
    )
    .sort(
      ([left], [right]) =>
        left.length - right.length || left.localeCompare(right),
    );
  return matches[0]?.[1] ?? null;
}

/**
 * 同点時のカテゴリ優先度（先頭ほど上位）。目的条文・教育導線を上位に寄せる。
 * cross-search の searchCrossIndex に渡す（このリストに無いカテゴリは末尾扱い）。
 */
const SEARCH_CATEGORY_PRIORITY: readonly SearchCategory[] = [
  "law",
  // 現場ことば版（条文の言い換え）は法令本文の派生コンテンツ。原文条文（law）の権威は
  // 奪わず、同点タイブレークでは law の直下（教育の上）に置く。
  "plain",
  "education",
  // FAQ は高意図の疑問（「衛生管理者は何人？」「SDS交付は義務？」）へ即答を返すため、
  // 同点時は判例・通達より上位に寄せる（条文・教育の次点）。
  "faq",
  // 法改正記事（監修済みの解説コンテンツ）は法改正の背景・実装ガイドを平易にまとめる。
  // 同点時は判例・通達より上位（FAQ の次点）に寄せ、条文・教育・FAQ には譲る。
  "article",
  // 法改正記録（法令・省令・通達の構造化改正レコード）は監修解説記事（article）に次ぐ
  // 権威系。特定の改正名クエリではタイトル一致で上位に来るが、bare な法令概念クエリの
  // 同点解決では条文本文（law）の権威を奪わないよう判例・通達の直上（記事の次点）に置く。
  "revision",
  "precedent",
  "notice",
  "glossary",
  // 安全標識（立入禁止・保護具着用など）は特定名の直接照会。用語と同じ参照系の
  // ティアに置き、法令・教育・FAQ より下位・化学物質より上位で同点解決する。
  "sign",
  "chemical",
  "accident",
  // 機能・ツールの目的地ページ（サイネージ・KY・作業環境測定…）。機能名クエリでは
  // タイトル一致のスコアで上位に来るが、コンテンツ系（条文・通達・判例…）の高意図クエリの
  // 同点解決では権威を奪わないよう保護具の直上（下位ティア）に置く。
  "feature",
  // 保護具は商品レコメンド（アフィリエイト）＝法令・通達・判例より権威が低いため、
  // 同点タイブレークでは最下位に置き、権威コンテンツの上位を決して奪わない。
  "equipment",
];

export const CATEGORY_META: Record<
  SearchCategory,
  { label: string; bgColor: string; textColor: string }
> = {
  law: { label: "法令", bgColor: "bg-teal-100", textColor: "text-teal-700" },
  plain: {
    label: "現場ことば",
    bgColor: "bg-amber-100",
    textColor: "text-amber-800",
  },
  revision: {
    label: "法改正",
    bgColor: "bg-cyan-100",
    textColor: "text-cyan-700",
  },
  notice: { label: "通達", bgColor: "bg-blue-100", textColor: "text-blue-700" },
  chemical: {
    label: "化学物質",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
  },
  equipment: {
    label: "保護具",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
  },
  education: {
    label: "教育",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  accident: { label: "事故", bgColor: "bg-red-100", textColor: "text-red-700" },
  precedent: {
    label: "判例",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-700",
  },
  glossary: {
    label: "用語",
    bgColor: "bg-indigo-100",
    textColor: "text-indigo-700",
  },
  faq: { label: "FAQ", bgColor: "bg-sky-100", textColor: "text-sky-700" },
  sign: { label: "標識", bgColor: "bg-amber-100", textColor: "text-amber-700" },
  article: {
    label: "記事",
    bgColor: "bg-violet-100",
    textColor: "text-violet-700",
  },
  feature: {
    label: "機能",
    bgColor: "bg-slate-100",
    textColor: "text-slate-700",
  },
};

/**
 * 横断検索UIが描画するカテゴリタブの表示順（単一ソース）。
 *
 * `/search`（結果ページのタブ）と ⌘K（コマンドパレットのフィルタ）は本配列を import して
 * タブを生成する。かつては両UIが同一の配列をハンド重複で持ち、カテゴリ追加（faq/sign/equipment…）
 * の度に両方を手で更新する必要があった＝片方を忘れるとそのUIだけ新カテゴリのタブが欠落する
 * ドリフト源だったため、ここへ一本化した。
 *
 * 並びは現場の利用頻度・重要度で決めた表示順であり、同点スコアのタイブレーク順
 * （{@link SEARCH_CATEGORY_PRIORITY}）とは別軸。**集合としては {@link CATEGORY_META} の全キーと
 * 一致しなければならない**（回帰 search-index.test.ts で機械固定＝メタに足したのにタブへ出し
 * 忘れる／タブにあるのにメタが無い、の両方向のドリフトを検知）。
 */
export const SEARCH_CATEGORIES: readonly SearchCategory[] = [
  "law",
  "plain",
  "revision",
  "faq",
  "article",
  "precedent",
  "notice",
  "feature",
  "chemical",
  "equipment",
  "education",
  "accident",
  "glossary",
  "sign",
];

const OSH_ARTICLE_61_PRIMARY_ID = "law-労働安全衛生法|第61条";
const OSH_ARTICLE_61_RELATED_IDS = [
  "law-労働安全衛生法施行令|第20条",
  "law-navi-beppyo-anei-soku-beppyo-3",
  "plain-347AC0000000057-第61条",
] as const;

const FORKLIFT_SKILL_ID = "education-skill-st-forklift";
const FORKLIFT_SPECIAL_ID = "education-special-se-36-5-forklift";
const FORKLIFT_LAW_IDS = [
  "law-労働安全衛生法|第61条",
  "law-労働安全衛生法施行令|第20条",
] as const;

function isForkliftQualificationIntent(query: string): boolean {
  const compact = foldKana(normalizeSearchText(query)).replace(/\s+/g, "");
  const forklift = foldKana(normalizeSearchText("フォークリフト")).replace(
    /\s+/g,
    "",
  );
  return (
    compact.includes(forklift) &&
    /(資格|免許|技能講習|特別教育|最大荷重|無資格|就業制限)/.test(compact)
  );
}

function rankForkliftQualificationResults(
  items: SearchItem[],
  expandedQuery: string,
  query: string,
  limit: number,
): SearchItem[] {
  const compact = foldKana(normalizeSearchText(query)).replace(/\s+/g, "");
  const raw = searchCrossIndex(items, expandedQuery, {
    category: "all",
    limit: Math.max(limit, 50),
    categoryPriority: SEARCH_CATEGORY_PRIORITY,
  });
  const preferredIds = /1トン未満/.test(compact)
    ? [
        FORKLIFT_SPECIAL_ID,
        "law-労働安全衛生規則|第36条",
        "page-/education-certification/finder",
        ...FORKLIFT_LAW_IDS,
      ]
    : [
        ...(/(事故|無資格)/.test(compact) ? ["page-/accidents"] : []),
        FORKLIFT_SKILL_ID,
        ...FORKLIFT_LAW_IDS,
        "page-/education-certification/finder",
      ];
  const byId = new Map(items.map((item) => [item.id, item]));
  const preferred = preferredIds
    .map((id) => byId.get(id))
    .filter((item): item is SearchItem => Boolean(item))
    .filter(isTrustedSearchResult);
  const used = new Set(preferred.map((item) => item.id));
  return deduplicateCanonicalResults([
    ...preferred,
    ...raw.filter((item) => !used.has(item.id) && isTrustedSearchResult(item)),
  ]).slice(0, limit);
}

function isForemanEducationIntent(query: string): boolean {
  const compact = foldKana(normalizeSearchText(query)).replace(/\s+/g, "");
  return /職長/.test(compact) && /教育/.test(compact);
}

function rankForemanEducationResults(
  items: SearchItem[],
  expandedQuery: string,
  limit: number,
): SearchItem[] {
  const preferredIds = [
    "law-労働安全衛生法|第60条",
    "notice-mhlw-notice-0201",
    "notice-mhlw-notice-0198",
    "notice-mhlw-notice-0357",
    "law-労働安全衛生法施行令|第19条",
    "plain-347AC0000000057-第60条",
    "plain-347CO0000000318-第19条",
  ];
  const byId = new Map(items.map((item) => [item.id, item]));
  const preferred = preferredIds
    .map((id) => byId.get(id))
    .filter((item): item is SearchItem => Boolean(item))
    .filter(isTrustedSearchResult);
  const used = new Set(preferred.map((item) => item.id));
  const remainder = searchCrossIndex(items, expandedQuery, {
    category: "all",
    limit: Math.max(limit, 50),
    categoryPriority: SEARCH_CATEGORY_PRIORITY,
  }).filter((item) => !used.has(item.id) && isTrustedSearchResult(item));
  return [...preferred, ...remainder].slice(0, limit);
}

function preserveFieldTopicBeforeStructuredEducation(
  results: SearchItem[],
): SearchItem[] {
  const topicIndex = results.findIndex((item) =>
    item.id.startsWith("law-navi-topic-"),
  );
  const educationIndex = results.findIndex((item) =>
    item.id.startsWith("education-"),
  );
  if (
    topicIndex < 0 ||
    educationIndex < 0 ||
    educationIndex > topicIndex ||
    topicIndex < 3
  ) {
    return results;
  }
  const topic = results[topicIndex]!;
  const withoutTopic = results.filter((_, index) => index !== topicIndex);
  return [
    ...withoutTopic.slice(0, educationIndex),
    topic,
    ...withoutTopic.slice(educationIndex),
  ];
}

/**
 * 法令名がない「第六十一条」「法第61条」は本サイトの安全衛生実務という文脈では
 * 安衛法61条を既定着地点にする。一方、別の法令名が明示された照会は奪わない。
 */
function isOshArticle61Intent(query: string): boolean {
  const normalized = expandLawAliases(normalizeArticleQuery(query));
  const compact = foldKana(normalizeSearchText(normalized)).replace(/\s+/g, "");
  if (!/(?:第)?61条/.test(compact)) return false;

  const explicitlyOtherLaw =
    /(労基法|労働基準法|クレーン則|クレーン等安全規則|電離則|電離放射線障害防止規則|ボイラー則|育介法|育児介護休業法|派遣法)/.test(
      compact,
    );
  if (explicitlyOtherLaw) return false;

  const oshContext =
    /(安衛法|労働安全衛生法|就業制限|技能講習|免許|資格|フォークリフト|玉掛け|高所作業車|ガス溶接|車両系建設機械)/.test(
      compact,
    );
  const articleOnly = /^(?:法)?(?:第)?61条$/.test(compact);
  return oshContext || articleOnly;
}

/**
 * 「クレーン 第61条」のように法令名も資格文脈もない照会は、安衛法61条へ
 * 一意に決め打ちできない。クレーン則61条を先頭にし、安衛法61条も公式の
 * 別候補として残すための判定。
 */
function isAmbiguousCraneArticle61Intent(query: string): boolean {
  const normalized = expandLawAliases(normalizeArticleQuery(query));
  const compact = foldKana(normalizeSearchText(normalized)).replace(/\s+/g, "");
  return (
    /クレーン/.test(compact) &&
    /(?:第)?61条/.test(compact) &&
    !/(クレーン則|クレーン等安全規則)/.test(compact) &&
    !/(安衛法|労働安全衛生法|就業制限|技能講習|免許|資格)/.test(compact)
  );
}

function isTrustedSearchResult(item: SearchItem): boolean {
  return (
    item.verification !== "quarantine" &&
    item.informationKind !== "synthetic" &&
    item.provenance !== "synthetic"
  );
}

function rankAmbiguousCraneArticle61Results(
  items: SearchItem[],
  expandedQuery: string,
  limit: number,
): SearchItem[] {
  const raw = searchCrossIndex(items, expandedQuery, {
    category: "all",
    limit: Math.max(limit, 50),
    categoryPriority: SEARCH_CATEGORY_PRIORITY,
  });
  const craneRule = items.find(
    (item) => item.category === "law" && item.title === "クレーン則 第61条",
  );
  const oshArticle = items.find((item) => item.id === OSH_ARTICLE_61_PRIMARY_ID);
  const preferred = [craneRule, oshArticle].filter(
    (item): item is SearchItem =>
      item !== undefined && isTrustedSearchResult(item),
  );
  const used = new Set(preferred.map((item) => item.id));
  const remainder = raw.filter(
    (item) =>
      !used.has(item.id) &&
      item.category !== "plain" &&
      isTrustedSearchResult(item),
  );
  return [...preferred, ...remainder].slice(0, limit);
}

/**
 * 安衛法61条の明示意図では、本文だけに「第61条」が現れる別法令や、
 * plain の重複が公式着地点を押し流さないよう小さな専用順位層を適用する。
 */
function rankOshArticle61Results(
  items: SearchItem[],
  expandedQuery: string,
  limit: number,
): SearchItem[] {
  const raw = searchCrossIndex(items, expandedQuery, {
    category: "all",
    limit: Math.max(limit, 50),
    categoryPriority: SEARCH_CATEGORY_PRIORITY,
  });
  const byId = new Map(items.map((item) => [item.id, item]));
  const preferredIds = [
    OSH_ARTICLE_61_PRIMARY_ID,
    ...OSH_ARTICLE_61_RELATED_IDS,
  ];
  const preferred = preferredIds
    .map((id) => byId.get(id))
    .filter((item): item is SearchItem => Boolean(item))
    .filter(
      (item) =>
        item.verification !== "quarantine" &&
        item.informationKind !== "synthetic" &&
        item.provenance !== "synthetic",
    );
  const used = new Set(preferred.map((item) => item.id));
  const unrelatedArticle61 = (item: SearchItem) =>
    / 第61条(?:（現場ことば）)?$/.test(item.title) &&
    item.id !== OSH_ARTICLE_61_PRIMARY_ID &&
    item.id !== "plain-347AC0000000057-第61条";

  const remainder = raw.filter(
    (item) =>
      !used.has(item.id) &&
      item.category !== "plain" &&
      !unrelatedArticle61(item) &&
      item.verification !== "quarantine" &&
      item.informationKind !== "synthetic" &&
      item.provenance !== "synthetic",
  );
  return [...preferred, ...remainder].slice(0, limit);
}

/**
 * 名称+CASの同一物質が「詳細レコード」と「厚労省compact索引」の2経路から
 * 同じcanonical URLへ着地する場合、検索枠を二重に消費させない。
 * 詳細レコードを表示代表にし、compact索引は同じ着地点の重複として抑制する。
 */
function deduplicateExactChemicalCanonical(
  results: SearchItem[],
  query: string,
): SearchItem[] {
  const normalized = normalizeSearchText(query);
  if (!/\b\d{2,7}-\d{2}-\d\b/.test(normalized)) return results;

  const deduplicated: SearchItem[] = [];
  const indexByUrl = new Map<string, number>();
  for (const item of results) {
    if (item.category !== "chemical") {
      deduplicated.push(item);
      continue;
    }
    const priorIndex = indexByUrl.get(item.url);
    if (priorIndex === undefined) {
      indexByUrl.set(item.url, deduplicated.length);
      deduplicated.push(item);
      continue;
    }
    const prior = deduplicated[priorIndex];
    if (
      prior.id.startsWith("chem-mhlw-") &&
      item.id.startsWith("chem-mock-")
    ) {
      deduplicated[priorIndex] = item;
    }
  }
  return deduplicated;
}

/** 同じ親canonicalへ着地する重複結果で検索枠を消費しない。 */
function deduplicateCanonicalResults(results: SearchItem[]): SearchItem[] {
  const seen = new Set<string>();
  const output: SearchItem[] = [];
  for (const item of results) {
    // 化学物質はcompact索引と詳細レコードが同一物質canonicalへ重なる。
    // 法令・資格のquery着地点は同じ親canonicalでも別条文・別制度を表すため、
    // 完全に同じURLでない限りまとめない。
    const key =
      item.category === "chemical"
        ? (item.canonicalUrl ?? item.url.replace(/[?#].*$/, ""))
        : item.url;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

/**
 * インデックスをクエリで絞り込みスコア順に返す。
 *
 * マッチ規約は cross-search エンジン（{@link searchCrossIndex}）に一本化している:
 * 空白区切りの各語を AND で扱い（全語がどこかに当たった項目のみ採用）、シノニム展開
 * （アスベスト→石綿則 等）と keywords 重み付けを行う。これにより「石綿 事前調査」
 * 「クレーン 過負荷」「足場 作業床」のような 2 語クエリが目的条文へ収束する
 * （従来はクエリ全体を 1 つの部分文字列として扱い、2 語クエリが全滅していた）。
 *
 * さらに条番号クエリ（{@link normalizeArticleQuery}）を前処理で正規化し、地続きの
 * 「安衛法61条」を「安衛法 第61条」へ、漢数字「第六十一条」を「第61条」へ、枝番
 * 「61-2条」を「第61条の2」へ書き換えてから AND エンジンへ渡す。これにより e-Gov でも
 * 0 件になる生クエリが該当条文をトップ表示できる（診断書 05-search-egov.md 比較 a,b）。
 *
 * 加えて法令名のかな読み・別表記（{@link expandLawAliases}）を正略称へ展開する＝条番号
 * 分解の後段で「あんえいほう 第88条」→「安衛法 第88条」へ、「じんぱいほう」→「じん肺法」へ。
 * かな読みはインデックスにもコンテンツにも現れず 0 件だった取り逃し（比較 c）を、既存ヒットを
 * 一切奪わずに拾う（正式名称・別略称は O8-a で解決済みのため対象外）。
 *
 * @param limit 返却上限。コマンドパレット(⌘K)は既定10、/search 結果ページは全件表示のため大きめを渡す。
 */
export function searchItems(
  items: SearchItem[],
  query: string,
  category: "all" | SearchCategory,
  limit = 10,
): SearchItem[] {
  const expandedQuery = expandLawAliases(normalizeArticleQuery(query));
  if (category !== "all") {
    return deduplicateExactChemicalCanonical(
      searchCrossIndex(items, expandedQuery, {
        category,
        limit: Math.max(limit, 20),
        categoryPriority: SEARCH_CATEGORY_PRIORITY,
      }),
      query,
    ).slice(0, limit);
  }
  if (isAmbiguousCraneArticle61Intent(query)) {
    return rankAmbiguousCraneArticle61Results(items, expandedQuery, limit);
  }
  if (isOshArticle61Intent(query)) {
    return rankOshArticle61Results(items, expandedQuery, limit);
  }
  if (isForemanEducationIntent(query)) {
    return rankForemanEducationResults(items, expandedQuery, limit);
  }
  if (isForkliftQualificationIntent(query)) {
    return rankForkliftQualificationResults(
      items,
      expandedQuery,
      query,
      limit,
    );
  }
  // 'all' 集約時も原文条文を先に採用する。現場ことば版（plain）が同じ条文へ
  // 完全に対応するときだけ、その原文の直後へ1件差し込む。これにより、広い
  // クエリで非 plain が10件を占有しても、利用者は一次情報を先に確認したうえで
  // 対応する平易版へ移れる。無関係な plain は従来どおり余り枠だけを使う。
  const nonPlain = items.filter((i) => i.category !== "plain");
  const primary = searchCrossIndex(nonPlain, expandedQuery, {
    category: "all",
    limit,
    categoryPriority: SEARCH_CATEGORY_PRIORITY,
  });
  const plainOnly = items.filter((i) => i.category === "plain");
  const plainHits = searchCrossIndex(plainOnly, expandedQuery, {
    category: "all",
    limit,
    categoryPriority: SEARCH_CATEGORY_PRIORITY,
  });
  if (plainHits.length === 0)
    return preserveFieldTopicBeforeStructuredEducation(
      deduplicateExactChemicalCanonical(primary, query),
    );

  const pairKey = (title: string) =>
    foldKana(
      normalizeSearchText(title.replace(/（現場ことば）$/, "")),
    );
  const plainBySourceTitle = new Map<string, SearchItem[]>();
  for (const item of plainHits) {
    const key = pairKey(item.title);
    const paired = plainBySourceTitle.get(key);
    if (paired) paired.push(item);
    else plainBySourceTitle.set(key, [item]);
  }

  const merged: SearchItem[] = [];
  const usedPlainIds = new Set<string>();
  // 上位3件は検索エンジンが選んだ原文・公式結果の順位を固定する。
  // 対応する平易版はその直後の帯へ置き、重要条文を4位以下へ押し出さない。
  const protectedPrimary = primary.slice(0, 3);
  const protectedCategoryCount = new Set(
    protectedPrimary.map((item) => item.category),
  ).size;
  if (protectedCategoryCount <= 1) {
    // 単一カテゴリの専門検索は、原文とplainを同じスコア空間で比較する従来順位を維持する。
    // 例: 「騒音 耳栓」では本文一致の第588条（または対応plain）が上位5件に残る。
    return preserveFieldTopicBeforeStructuredEducation(
      deduplicateExactChemicalCanonical(
        searchCrossIndex(items, expandedQuery, {
          category: "all",
          limit: Math.max(limit, 20),
          categoryPriority: SEARCH_CATEGORY_PRIORITY,
        }),
        query,
      ).slice(0, limit),
    );
  }
  for (const item of protectedPrimary) {
    if (merged.length >= limit) break;
    merged.push(item);
  }
  for (const item of protectedPrimary) {
    if (merged.length >= limit) break;
    const paired = plainBySourceTitle.get(pairKey(item.title))?.[0];
    if (paired) {
      merged.push(paired);
      usedPlainIds.add(paired.id);
    }
  }
  for (const item of primary.slice(protectedPrimary.length)) {
    if (merged.length >= limit) break;
    merged.push(item);
    const paired = plainBySourceTitle.get(pairKey(item.title))?.[0];
    if (paired && merged.length < limit) {
      merged.push(paired);
      usedPlainIds.add(paired.id);
    }
  }
  for (const item of plainHits) {
    if (merged.length >= limit) break;
    if (!usedPlainIds.has(item.id)) merged.push(item);
  }
  return preserveFieldTopicBeforeStructuredEducation(
    deduplicateExactChemicalCanonical(merged, query),
  );
}

/** カテゴリ別に件数を集計する（/search 結果ページのタブ件数バッジ用）。 */
export function countByCategory(
  items: SearchItem[],
  query: string,
): Record<"all" | SearchCategory, number> {
  const counts: Record<"all" | SearchCategory, number> = {
    all: 0,
    law: 0,
    plain: 0,
    revision: 0,
    notice: 0,
    chemical: 0,
    equipment: 0,
    education: 0,
    accident: 0,
    precedent: 0,
    glossary: 0,
    faq: 0,
    sign: 0,
    article: 0,
    feature: 0,
  };
  if (!query.trim()) return counts;
  // 上限なしで全件マッチを採り、カテゴリ別に集計する。
  const all = searchItems(items, query, "all", Number.MAX_SAFE_INTEGER);
  counts.all = all.length;
  for (const item of all) counts[item.category] += 1;
  return counts;
}

// 完全構築だけをmodule cacheへ保存する。部分索引は次回呼出しで必ず再試行する。
let cachedIndexBuild: SearchIndexBuild | null = null;

const SEARCH_SOURCE_NAMES = [
  "laws",
  "law-revisions",
  "court-cases",
  "accidents",
  "chemicals-curated",
  "chemicals-mhlw",
  "education-certifications",
  "notices",
  "glossary",
  "faq",
  "articles",
  "site-pages",
  "construction-calculators",
  "hazard-slides",
  "illness-guides",
  "law-navi-topics",
  "law-navi-appendices",
  "plain-language-laws",
] as const;

const HIGH_RISK_SEARCH_SOURCES = new Set([
  "laws",
  "accidents",
  "chemicals-mhlw",
  "education-certifications",
  "notices",
]);

export function classifySearchIndexFailures(
  failedSources: readonly string[],
): SearchIndexStatus {
  if (failedSources.length === 0) return "complete";
  return failedSources.some((source) => HIGH_RISK_SEARCH_SOURCES.has(source))
    ? "blocked"
    : "partial";
}

interface CompactEntry {
  name: string;
  cas: string | null;
  category: string;
  categoryLabel: string;
}

export async function buildSearchIndexWithStatus(): Promise<SearchIndexBuild> {
  if (cachedIndexBuild) return cachedIndexBuild;

  const items: SearchItem[] = [];

  const sourceResults = await Promise.allSettled([
    // 公開検索では、hash検証済みe-Gov抜粋を一次資料、それ以外の既存curated条文を
    // 「サイト整理・内容確認待ち」として明示的に分離して収載する。未確認を確認済みに
    // 昇格させず、AI引用経路（verified-corpus）とも混ぜない。
    import("@/data/laws").then(
      ({ allLawArticles, mhlwLawArticles, LAW_METADATA }) => {
        const quarantinedMhlw = new Set<unknown>(mhlwLawArticles);
        const seen = new Set<string>();
        for (const a of allLawArticles) {
          if (quarantinedMhlw.has(a)) continue;
          const key = `${a.law}|${a.articleNum}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const isSnapshotExact =
            a.sourceKind === "egov-fulltext-snapshot" &&
            a.verificationStatus === "snapshot-hash-verified";
          const heading = [a.articleTitle, a.text]
            .map((s) => (s ?? "").trim())
            .filter(Boolean)
            .join("　");
          items.push({
            id: `law-${key}`,
            title: a.articleNum ? `${a.lawShort} ${a.articleNum}` : a.lawShort,
            subtitle: `${a.law}　${heading}`.slice(0, 90),
            category: "law",
            // 略称・正式名称・条番号・見出し・条文キーワードのいずれの語でも AND マッチさせる
            // （例: 「石綿 事前調査」「クレーン 過負荷」「足場 作業床」が目的条文へ収束）。
            keywords: [
              ...a.keywords,
              a.articleTitle,
              a.law,
              a.lawShort,
              a.articleNum,
            ].filter(Boolean),
            headings: [a.articleTitle].filter(Boolean),
            url: a.articleNum
              ? `/law-search?law=${encodeURIComponent(a.law)}&art=${encodeURIComponent(a.articleNum)}`
              : `/law-search?law=${encodeURIComponent(a.law)}`,
            informationKind: isSnapshotExact
              ? "primary"
              : "siteExplanation",
            provenance: isSnapshotExact ? "official" : "curated",
            verification: "pending",
            freshness: "unknown",
            asOf:
              a.sourceFetchedAt ?? LAW_METADATA[a.lawShort]?.auditedAt ?? null,
            sourceTitle: isSnapshotExact
              ? "e-Gov法令検索の取得済み本文"
              : "e-Gov法令検索（本文一致の再確認待ち）",
            sourceUrl:
              a.sourceUrl ?? LAW_METADATA[a.lawShort]?.eGovUrl ?? null,
          });
        }
      },
    ),
    // 法改正レコード（法令・省令・通達の構造化改正エントリ＝正本 lawRevisionCores）。
    // これまで法改正は /laws 一覧・/whats-new・/feed/law-revisions.xml に載っているのに
    // 横断検索(/search・⌘K)から丸ごと 0 件だった＝「フリーランス新法」「石綿則 改正」
    // 「化学物質 自律的管理」等の法改正クエリで発見できない穴（accident/equipment/sign と同型）。
    // lawRevisionCores は JSON＋純関数のみのブラウザ安全モジュール（node:fs 非依存）で、
    // NEXT_PUBLIC_REVISIONS_INGEST_SOURCE で source を切替（server 専用 payload 環境変数は
    // ブラウザでは undefined＝sample+egov+real の統合パスへフォールバックし常にデータを返す）。
    // 個別の法改正詳細ページは未実装のため url は /laws 一覧ハブへ寄せる（glossary→/glossary・
    // faq→/faq と同方針）。読込失敗時の placeholder（lr-fallback-*）は索引に載せない。
    // kind は英語コード（law/ordinance/notice…）のため keywords から除外＝日本語検索のノイズ回避。
    import("@/data/mock/law-revisions").then(({ lawRevisionCores }) => {
      const seen = new Set<string>();
      for (const r of lawRevisionCores) {
        if (r.id.startsWith("lr-fallback")) continue;
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        items.push({
          id: `revision-${r.id}`,
          title: r.title,
          subtitle: `${r.category}　${r.summary}`.slice(0, 90),
          category: "revision",
          keywords: [
            r.category,
            r.revisionNumber,
            r.issuer,
            r.official_notice_number ?? "",
            r.industry_detail ?? "",
          ].filter(Boolean),
          url: "/laws",
        });
      }
    }),
    // 労災・労働判例（争点・分野で横断検索できるよう全件をインデックス化）
    import("@/data/court-cases").then(({ COURT_CASES }) => {
      for (const c of COURT_CASES) {
        items.push({
          id: `precedent-${c.id}`,
          title: c.name,
          subtitle: `${c.court}　${c.dateLabelJa}　${c.oneLine}`,
          category: "precedent",
          keywords: [c.field, ...c.issues, c.court],
          url: `/court-cases/${c.id}`,
        });
      }
    }),
    // ローカル事故個票は一次資料との本文一致を再検証中。URL形式だけで
    // 「公式事故」と分類しないため、検索ソース枠は維持しつつ0件でfail-closedにする。
    Promise.resolve(),

    // 50 mock chemical substances with full detail。
    // canonical な個別詳細 /chemical-database/[cas] が実在する CAS はそこへ深リンクし
    // （sitemap-chemicals.xml 収載＝サイト最大級の独自コンテンツへ内部リンクを通す）、
    // 濃度基準DB 未収載の CAS のみ従来の一覧クエリページへフォールバックする（幽霊URL 0）。
    // 事故 /accidents/[id]・保護具 /equipment/[id]・通達 /circulars/[id] と同型の深リンク方針。
    import("@/data/mock/chemical-substances-db").then(
      ({ chemicalSubstances }) => {
        for (const c of chemicalSubstances) {
          items.push({
            id: `chem-mock-${c.id}`,
            title: c.name,
            subtitle: `CAS ${c.cas}${c.name_en ? ` / ${c.name_en}` : ""}`,
            category: "chemical",
            keywords: [
              "CAS",
              "CAS番号",
              "SDS",
              "安全データシート",
              c.cas,
              c.name_en ?? "",
              ...(c.synonyms ?? []),
            ].filter(Boolean),
            url: chemicalDetailUrl(c.cas, c.name),
            informationKind: "siteExplanation",
            provenance: "curated",
            verification: "pending",
            freshness: "unknown",
            sourceTitle:
              "厚生労働省 職場のあんぜんサイト／NITE等の一次資料を要確認",
            sourceUrl: null,
          });
        }
      },
    ),

    // ~919 MHLW chemical substances from compact index
    import("@/data/chemicals-mhlw/compact.json").then((mod) => {
      const data = mod as unknown as {
        entries?: CompactEntry[];
        default?: { entries?: CompactEntry[] };
      };
      const entries: CompactEntry[] =
        data.entries ?? data.default?.entries ?? [];
      const seen = new Set<string>();
      for (const e of entries) {
        if (e.name && !seen.has(e.name)) {
          seen.add(e.name);
          items.push({
            id: `chem-mhlw-${e.cas ?? "no-cas"}-${e.category}`,
            title: e.name,
            subtitle: `${e.cas ? `CAS ${e.cas}` : "CAS未登録"} / ${e.categoryLabel}`,
            category: "chemical",
            keywords: [
              "CAS",
              "CAS番号",
              "SDS",
              "安全データシート",
              e.cas ?? "",
              e.categoryLabel,
            ].filter(Boolean),
            url: e.cas
              ? chemicalDetailUrl(e.cas, e.name)
              : `/chemical-database?q=${encodeURIComponent(e.name)}`,
            informationKind: "secondary",
            provenance: "curated",
            verification: "pending",
            freshness: "unknown",
            sourceTitle: "厚生労働省 化学物質情報",
            sourceUrl:
              "https://anzeninfo.mhlw.go.jp/user/anzen/kag/kagaku_index.html",
          });
        }
      }
    }),

    // 法定教育・技能講習・免許の構造化正本。旧Eラーニング設問とは分離し、
    // sourceLocated の制度候補として資格finderへ着地させる。修了や受講済みを意味しない。
    import("@/data/education-rules").then(({ ALL_CERTS }) => {
      const typePrefix = {
        special_education: "special",
        skill_training: "skill",
        job_chief: "job-chief",
        license: "license",
      } as const;
      const typeLabel = {
        special_education: "特別教育",
        skill_training: "技能講習",
        job_chief: "職長教育",
        license: "免許",
      } as const;
      for (const cert of ALL_CERTS) {
        const source = cert.primarySources?.[0];
        items.push({
          id: `education-${typePrefix[cert.certType]}-${cert.id}`,
          // 制度レコードであることをタイトル先頭に明示する。現場語だけの照会では
          // 法令ナビ分野ページを奪わず、正式名称は headings のexact一致で拾う。
          title: `資格・教育｜${cert.name}`,
          subtitle:
            `${typeLabel[cert.certType]}　${cert.targetWork}　${cert.duration}`.slice(
              0,
              140,
            ),
          category: "education",
          headings: [
            cert.name,
            cert.targetWork,
            cert.relatedLaw,
            cert.duration,
          ],
          keywords: [
            cert.name,
            typeLabel[cert.certType],
            cert.targetWork,
            cert.relatedLaw,
            cert.duration,
            ...(cert.keywords ?? []),
            ...(cert.workCategories ?? []),
            cert.legalStatus ?? "",
            cert.notes ?? "",
          ].filter(Boolean),
          url: `/education-certification/finder?cert=${encodeURIComponent(cert.id)}`,
          canonicalUrl: "/education-certification/finder",
          informationKind: "guide",
          provenance: "curated",
          verification:
            cert.sourceVerification === "humanVerified"
              ? "humanVerified"
              : "pending",
          freshness: "current",
          asOf: cert.sourceCheckedAt ?? null,
          effectiveDate: cert.effectiveDate ?? null,
          sourceTitle: source?.title ?? "一次資料の個別確認が必要",
          sourceUrl: source?.url ?? null,
          summaryKind: "human-curated",
        });
      }
    }),

    // 未検証の商品レコードは検索結果にも出さない。商品名・メーカー・規格適合・
    // 価格・評価を一次資料へ追跡できるレコードだけを将来、明示的に追加する。

    // 二次索引候補は「内容確認待ち」として検索導線へ収載する。AI回答根拠、
    // indexable詳細、sitemapには昇格させず、原文一致・現行性を確認済みと表示しない。
    import("@/data/public-mhlw-notices").then(
      ({ publicMhlwNotices: mhlwNotices }) => {
        for (const n of mhlwNotices) {
          items.push({
            id: `notice-${n.id}`,
            title: n.title,
            subtitle:
              `${n.noticeNumber ?? n.docType} ${n.issuedDateRaw ?? ""}`.trim(),
            category: "notice",
            keywords: [
              n.docType,
              n.noticeNumber ?? "",
              n.category,
              n.issuer ?? "",
            ].filter(Boolean),
            url: `/circulars/${n.id}`,
            informationKind: "secondary",
            provenance: "curated",
            verification: "pending",
            freshness: "unknown",
            asOf: n.issuedDate,
            sourceTitle: "安全衛生情報センター掲載資料",
            sourceUrl: n.detailUrl || n.sourceUrl,
          });
        }
      },
    ),

    // 旧Eラーニング設問は法令・資格の誤答を確認したため全件quarantine。
    // 検証済みallowlistができるまで検索結果、Course JSON-LD、採点へ収載しない。

    // 旧有料教育12コースは共有コンテキストの法令・指針境界が未検証のため
    // redirect/quarantineし、検索・Course JSON-LD・sitemapから除外する。

    // 用語集（@/data/glossary の 4 バッチ＝高意図の「○○とは」語を横断検索へ収載）。
    // ※ /glossary 本体に直書きされた基礎語は当班所有外のため対象外。読み・定義冒頭も
    //   subtitle に載せ、読み（かな）や定義語からのヒットと結果一覧での即答を可能にする。
    import("@/data/glossary").then(({ EXTRA_TERMS }) => {
      for (const t of EXTRA_TERMS) {
        items.push({
          id: `glossary-${t.term}`,
          title: t.term,
          subtitle: `${t.reading}　${t.definition.slice(0, 60)}`,
          category: "glossary",
          keywords: [t.reading].filter(Boolean),
          url: `/glossary`,
        });
      }
    }),

    // FAQ（@/data/faqs の 4 バッチ＝高意図の疑問文クエリ「衛生管理者 何人」「SDS 交付 義務」
    // 「特別教育 オンライン」等を横断検索へ収載）。これまで FAQ 200問は /faq/[category] に
    // しか無く ⌘K・/search から 0 件で、用語(glossary=「○○とは」)とも別軸の質問インテント
    // が丸ごと欠落していた。各結果は回答冒頭を subtitle に載せ検索結果一覧で即答し、リンクは
    // カテゴリ一覧 /faq/<category>（sitemap 収載・自己canonical の実在ページ）へ寄せる＝
    // faq.category は law-system/management/chemical/health-education のいずれかで必ず解決
    // （幽霊リンク 0）。keywords に tags・関連法令を補い分類語・条番号からも引ける。
    // 個別 FAQ への深リンク（/faq/<category>#<id>）は FAQItem にアンカー＋hashオープンが要る＝
    // /faq ページ本文所有の UI 班マター（要・他班）のため今回はカテゴリ一覧へ寄せる（glossary と同方針）。
    import("@/data/faqs").then(({ ALL_FAQS }) => {
      for (const f of ALL_FAQS) {
        items.push({
          id: `faq-${f.id}`,
          // 質問文の頭に「Q. 」を付す（FAQ 結果である旨の慣用表記）。表示上の意味に加えて
          // ランキング上の意味も持つ＝概念名で始まる質問（例「就業制限（安衛法第61条）は…」）が
          // タイトル前方一致(65点)で当該条文のキーワード完全一致(55点＝articleTitle=就業制限)を
          // 上回り、bare な法令概念クエリの1位を FAQ が奪う退行（O8-a/T8 の locked 不変条件
          // 「就業制限」1位=安衛法61条）を防ぐ。頭に「Q. 」が入ると概念名は前方一致(65)ではなく
          // 部分一致(45)になり、権威ある条文本文が上位を保つ（FAQ は下位で引き続き発見可能）。
          title: `Q. ${f.question}`,
          subtitle: f.answer.slice(0, 80),
          category: "faq",
          keywords: [...(f.tags ?? []), ...(f.relatedLaws ?? [])].filter(
            Boolean,
          ),
          url: `/faq/${f.category}`,
        });
      }
    }),

    // 旧安全標識110件は法令・指針・JIS・独自推奨の境界が未検証のため全件quarantine。

    // 法改正記事（src/data/articles/*.json＝監修済みの法改正・実装ガイド解説）。
    // 正本 getPublishedArticleIndex は node:fs 依存でブラウザ非安全のため、client 検索は
    // ブラウザ安全な射影源 `@/lib/articles-search-source` から引く（本文除外の軽量エントリ・
    // drift ガードで実在ファイル集合と同期）。これまで法改正記事は /articles 一覧と
    // sitemap-articles.xml に載っているのに横断検索(/search・⌘K)から 0 件だった発見性の穴
    // （site-critique 01 S-1）を是正。url は /articles/<slug> 深リンク＝/articles/[slug] の
    // generateStaticParams が公開済み slug 全件を解決するため必ず着地する（幽霊URL 0）。
    // 時限公開（publishedAt が未来）の記事は実行時 now で除外する（正本と同セマンティクス）。
    import("@/lib/articles-search-source").then(
      ({ getPublishedArticleSearchEntries }) => {
        for (const a of getPublishedArticleSearchEntries()) {
          items.push({
            id: `article-${a.slug}`,
            title: a.title,
            subtitle: a.description.slice(0, 90),
            category: "article",
            // タグ・キーワードから引ける（例「熱中症 WBGT」「フルハーネス 墜落制止」）。
            keywords: [
              ...a.tags,
              ...a.keywords,
              ...(a.tags.some((tag) =>
                /墜落|転落|転倒|はさまれ|巻き込まれ|感電|爆発|火災/.test(
                  tag,
                ),
              )
                ? ["事故の型", "災害の種類"]
                : []),
            ].filter(Boolean),
            url: `/articles/${a.slug}`,
          });
        }
      },
    ),

    // 機能・ツールの目的地ページ（FLAGSHIP_FEATURES 正本の射影）。これまで横断検索は
    // コンテンツレコードのみ収載し、サイネージ・KY用紙・化学物質RA・作業環境測定・事故DB…
    // の **機能ページそのもの** が 0 件ヒットだった（機能名を打っても目的地へ検索経由で
    // 着けない発見性の穴）。⌘K の空クエリ用ショートカット4件とは別に、検索対象として収載する。
    // url はベースパスで実在ルートへ解決（幽霊URL 0＝drift ガードで機械固定）。title=機能名で
    // 打鍵一致を狙い、subtitle=カード見出し/配下説明で 2 語 AND を補助する。
    import("@/lib/site-pages-search-source").then(
      ({ getSitePageSearchEntries }) => {
        for (const p of getSitePageSearchEntries()) {
          items.push({
            id: p.id,
            title: p.title,
            subtitle: p.subtitle.slice(0, 90),
            category: "feature",
            keywords: p.keywords,
            url: p.url,
          });
        }
      },
    ),

    // 建設計算コーナーの各計算機（/construction-calc/[slug]＝registry 駆動の射影）。これまで
    // 横断検索(/search・⌘K)から各計算機は 0 件ヒットで、発見手段はハブ回遊のみだった＝「あだ巻き」
    // 「朝顔」「側圧」「安全ネット」等の現場語で目的の計算機へ検索経由で着けない発見性の穴を是正。
    // 各計算機の keywords（現場語 alias を含む）＋分類束ラベルで着地し、url は [slug] の
    // generateStaticParams が registry 全 slug を解決＝収載集合＝解決集合で必ず着地する（幽霊URL 0）。
    // 目的地ページ扱いで feature（機能）カテゴリ（法令ナビ分野ページ・災害スライドと同方針）。
    import("@/lib/construction-calc/search-source").then(
      ({ getCalcSearchEntries }) => {
        for (const e of getCalcSearchEntries()) {
          items.push({
            id: e.id,
            title: e.title,
            subtitle: e.subtitle.slice(0, 90),
            category: "feature",
            keywords: e.keywords,
            url: e.url,
          });
        }
      },
    ),

    // 災害の型別 教育スライド（/education/hazard-slides/[slug]＝21分類。generateStaticParams
    // dynamicParams=false で収載集合＝解決集合＝幽霊URL 0）。「墜落 教育」「熱中症 スライド」
    // 「朝礼 ネタ 型」のような教育教材クエリで着地させる。
    import("@/lib/accidents/type-normalization").then(
      ({ CANONICAL_HAZARD_TYPES }) => {
        items.push({
          id: "hazard-slides-hub",
          title: "災害の型別 安全教育スライド",
          subtitle:
            "厚労省21分類の統計→原因→対策→クイズを自動生成。投影16:9・A4横印刷対応",
          category: "feature",
          keywords: [
            "安全教育",
            "スライド",
            "教材",
            "朝礼",
            "型別",
            "雇入れ時教育",
            "職長教育",
          ],
          url: "/education/hazard-slides",
        });
        for (const t of CANONICAL_HAZARD_TYPES) {
          items.push({
            id: `hazard-slide-${t.slug}`,
            title: `${t.label}の安全教育スライド`,
            subtitle:
              "統計・多い原因・対策チェックリスト（根拠条文つき）・確認クイズの6枚構成",
            category: "feature",
            keywords: [
              t.label,
              t.mhlwLabel,
              t.short,
              "事故の型",
              "災害の種類",
              "安全教育",
              "スライド",
              "対策",
              "教材",
            ],
            url: `/education/hazard-slides/${t.slug}`,
          });
        }
      },
    ),

    // 治療と仕事の両立支援 病態別ガイド（/treatment-work-balance/illness-guide/[illness]＝
    // がん/脳卒中/心疾患/糖尿病/メンタルヘルス/難病の6疾患。自己canonical・OGP付・PageJsonLd
    // の実在 indexable ページで sitemap 収載済み）。親ハブ /treatment-work-balance は FLAGSHIP
    // ナビ subItem として feature 収載済みだが、**疾患別の6ガイドは横断検索から 0 件**だった＝
    // 「がん 両立支援」「脳卒中 復職」「糖尿病 就業配慮」と打った安全担当/産業医が疾患名で
    // 個別ガイドへ検索経由で着けない発見性の穴を是正（#561 等と同型・目的地ページ扱いで feature へ）。
    // url は generateStaticParams（dynamicParams=false）が ILLNESS_CATEGORIES 全 id を解決＝
    // 収載集合＝解決集合で必ず着地する（幽霊URL 0）。関連法令は 条文の権威クエリを汚さぬよう
    // keywords へ入れない（保護具/機能ページと同方針）。
    import("@/data/illness-considerations").then(({ ILLNESS_CATEGORIES }) => {
      for (const c of ILLNESS_CATEGORIES) {
        items.push({
          id: `illness-guide-${c.id}`,
          title: `${c.shortLabel}と仕事の両立支援ガイド`,
          subtitle: c.summary.slice(0, 90),
          category: "feature",
          // 疾患名（正式名/短縮名）・両立支援の頻用語・病態別リスク（症状語で引ける）から着地。
          keywords: [
            c.label,
            "両立支援",
            "治療と仕事の両立支援",
            "復職",
            "就業配慮",
            "労務配慮",
            ...c.riskHighlights,
          ].filter(Boolean),
          url: `/treatment-work-balance/illness-guide/${c.id}`,
        });
      }
    }),

    // 法令ナビ 分野ページ（/law-navi/topics/[id]＝分野・機械・作業→条文群の着地面。
    // docs/horei-navi-foundation-2026-07-11 §2-3）。診断 2026-07-11 で「フォークリフト」は
    // 通達タイトルの前方一致が条文を押し流し、「爪のやつ」は 0 件だった。分野ページを
    // title=代表名（完全一致100点）+ keywords=現場語 alias（部分一致は variant.includes(k)
    // を許すエンジン仕様＝「爪のやつ」⊇「爪」で当たる）で収載し、俗称からの着地面にする。
    // url は generateStaticParams（dynamicParams=false）が LAW_NAVI_TOPICS 全 id を解決＝
    // 幽霊URL 0。目的地ページ扱いで feature（機能）カテゴリ（疾患別ガイドと同方針）。
    import("@/data/law-navi/topics").then(({ LAW_NAVI_TOPICS }) => {
      for (const t of LAW_NAVI_TOPICS) {
        items.push({
          id: `law-navi-topic-${t.id}`,
          title: t.name,
          subtitle: `法令ナビ｜${t.fieldGroup}の条文${t.articles.length}件＋通達${t.circularIds.length}件を体系順に`,
          category: "feature",
          keywords: [
            ...t.aliases,
            t.fieldGroup,
            "法令ナビ",
            ...t.articles.map((a) => a.articleNum),
          ],
          url: `/law-navi/topics/${t.id}`,
        });
      }
    }),

    // 別表の意味インデックス（/law-navi/beppyo#id＝「別表第3=特定化学物質」の逆引き。
    // 同 §2-5）。診断 2026-07-11 で「別表第3」は粉じん則27条等の言及条文しか出ず、
    // 「何の表か」に着地できなかった。label（別表第3）と意味名・俗称 keywords で収載し、
    // 条番号パーサの別表正規化（別表第三→別表第3）と合わせて表記ゆらぎも吸収する。
    // 法令内容そのものなので category は law（条文と同じ権威ティア）。
    import("@/data/law-navi/beppyo").then(({ BEPPYO_ENTRIES }) => {
      for (const b of BEPPYO_ENTRIES) {
        items.push({
          id: `law-navi-beppyo-${b.id}`,
          title: `${b.lawShort} ${b.label}（${b.name}）`,
          subtitle: b.summary.slice(0, 90),
          category: "law",
          keywords: [b.label, b.name, b.lawShort, ...b.keywords],
          url: `/law-navi/beppyo#${b.id}`,
        });
      }
    }),

    // 現場ことば版（条文のやさしい言い換え）。これまで /search・⌘K から丸ごと不可視で、
    // 条文ヒットは law-search 着地のみだった（酷評01縫い目3）。表示可否の判定は
    // getFreshPlainArticle に一元化（fidelity verified ＋ 原文ハッシュ一致のみ表示＝
    // stale/draft は索引にも出さない）。curated 条（LAW_NAVI_ENTRIES）に対してのみ判定し、
    // 各ヒットは条文原文ではなく法令ナビの言い換え条ページへ深リンクする
    // （幽霊URL 0＝LAW_NAVI_ENTRIES.path は generateStaticParams の生成集合に含まれる）。
    // カテゴリは law と別立ての 'plain' にし、T1/T2/T3（本番インデックス回帰）の
    // 「1位は原文条文」という既存アサーションを一切揺らさない。
    Promise.all([
      import("@/data/plain"),
      import("@/lib/law-navi/permalink"),
    ]).then(([{ getFreshPlainArticle }, { LAW_NAVI_ENTRIES }]) => {
      for (const entry of LAW_NAVI_ENTRIES) {
        const a = entry.article;
        const plain = getFreshPlainArticle(entry.egovLawId, a);
        if (!plain) continue;
        items.push({
          id: `plain-${entry.egovLawId}-${a.articleNum}`,
          title: `${a.lawShort} ${a.articleNum}（現場ことば）`,
          subtitle: plain.plainText.slice(0, 90),
          category: "plain",
          keywords: [
            ...a.keywords,
            a.articleTitle,
            a.law,
            a.lawShort,
            a.articleNum,
            "現場ことば",
            "やさしい言い換え",
          ].filter(Boolean),
          url: entry.path,
        });
      }
    }),
  ]);

  const publicItems = items.filter((item) =>
    isPublicRouteAvailable(item.url),
  );

  for (const item of publicItems) {
    if (!item.informationKind) {
      item.informationKind =
        item.category === "law"
          ? "primary"
          : item.category === "feature"
            ? "tool"
            : item.category === "notice" ||
                item.category === "revision" ||
                item.category === "precedent"
              ? "secondary"
              : item.category === "education" ||
                  item.category === "article" ||
                  item.category === "faq"
                ? "guide"
                : "siteExplanation";
    }
    item.provenance ??= item.category === "law" ? "official" : "internal";
    item.verification ??= "pending";
    item.freshness ??= "unknown";
    item.asOf ??= null;
    item.sourceTitle ??= null;
    item.sourceUrl ??= null;
    item.officialDestinations ??=
      OFFICIAL_DESTINATIONS_BY_SEARCH_ID[item.id]?.slice() ?? [];
    item.canonicalUrl ??= item.url.replace(/[?#].*$/, "");
    item.effectiveDate ??= null;
    item.summaryKind ??=
      item.informationKind === "primary"
        ? "source"
        : item.informationKind === "synthetic"
          ? "synthetic"
          : "human-curated";
  }

  const failedSources: string[] = sourceResults.flatMap((result, index) =>
    result.status === "rejected"
      ? [SEARCH_SOURCE_NAMES[index] ?? `source-${index + 1}`]
      : [],
  );
  if (sourceResults.length !== SEARCH_SOURCE_NAMES.length)
    failedSources.push("source-manifest");
  const status = classifySearchIndexFailures(failedSources);
  const build: SearchIndexBuild = {
    items: publicItems,
    status,
    failedSources,
    builtAt: new Date().toISOString(),
  };
  if (status === "complete") cachedIndexBuild = build;
  return build;
}

/** 後方互換API。状態を扱えるUIは buildSearchIndexWithStatus を使用する。 */
export async function buildSearchIndex(): Promise<SearchItem[]> {
  return (await buildSearchIndexWithStatus()).items;
}
