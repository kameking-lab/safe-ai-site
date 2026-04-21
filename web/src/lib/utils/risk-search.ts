/**
 * 作業内容からの事故事例検索ユーティリティ
 * TF-IDFライクなスコアリングと同義語展開で関連度順に並べる
 */
import type { AccidentCase, AccidentType } from "@/lib/types/domain";

// リスクレベル: 重傷/死亡 → 高、中等傷 → 中、軽傷 → 低
export type RiskLevel = "高" | "中" | "低";

export type ScoredAccidentCase = AccidentCase & {
  score: number;
  riskLevel: RiskLevel;
  matchedKeywords: string[];
};

// 同義語グループ: 入力語からリスクカテゴリへ展開
const SYNONYM_GROUPS: Array<{ input: string[]; expand: string[] }> = [
  {
    input: ["高所", "屋根", "上空", "上部", "はしご", "梯子", "ラダー", "高い", "上階"],
    expand: ["墜落", "転落", "高所", "落下", "墜落防止", "安全帯"],
  },
  {
    input: ["足場", "仮設", "スキャフォールド"],
    expand: ["足場", "墜落", "転倒", "足場崩壊"],
  },
  {
    input: ["電気", "配電", "電線", "高圧", "低圧", "電工", "配線", "ケーブル"],
    expand: ["感電", "電気", "高圧", "電流", "アーク"],
  },
  {
    input: ["鉄骨", "組立", "建方", "鉄筋", "コンクリート"],
    expand: ["墜落", "飛来落下", "挟まれ", "建設", "重量物"],
  },
  {
    input: ["クレーン", "重機", "フォークリフト", "バックホー", "ユンボ", "ショベル", "建設機械"],
    expand: ["車両", "挟まれ", "飛来落下", "クレーン", "重機"],
  },
  {
    input: ["解体", "取壊し", "取り壊し", "撤去"],
    expand: ["崩壊", "飛来落下", "墜落", "解体", "粉塵"],
  },
  {
    input: ["掘削", "土留め", "土工", "埋設"],
    expand: ["崩壊", "埋没", "酸欠", "掘削"],
  },
  {
    input: ["溶接", "溶断", "切断", "グラインダー"],
    expand: ["火災", "飛来落下", "眼", "溶接", "火花"],
  },
  {
    input: ["屋内", "地下", "トンネル", "坑内", "密閉"],
    expand: ["酸欠", "中毒", "火災", "爆発"],
  },
  {
    input: ["化学", "薬品", "塗料", "有機溶剤", "有害物質", "塗装"],
    expand: ["中毒", "化学物質", "爆発", "火災", "皮膚"],
  },
  {
    input: ["夏", "暑い", "猛暑", "炎天下", "高温"],
    expand: ["熱中症", "脱水", "高温"],
  },
  {
    input: ["雨", "雨天", "濡れた", "湿った", "スリップ"],
    expand: ["転倒", "感電", "滑落"],
  },
  {
    input: ["雪", "凍結", "氷", "冬", "寒い", "低温"],
    expand: ["転倒", "凍結", "低体温"],
  },
  {
    input: ["夜間", "深夜", "暗い"],
    expand: ["車両", "転倒", "視認性"],
  },
  {
    input: ["搬送", "運搬", "荷役", "積み下ろし", "倉庫"],
    expand: ["挟まれ", "飛来落下", "車両", "腰部"],
  },
  {
    input: ["転倒", "滑った", "つまずき"],
    expand: ["転倒", "転落", "骨折"],
  },
  {
    input: ["製造", "工場", "ライン", "機械"],
    expand: ["挟まれ", "巻き込まれ", "製造", "機械"],
  },
];

// 事故の型とリスクレベルの対応
const TYPE_BASE_RISK: Record<AccidentType, number> = {
  墜落: 5,
  転倒: 2,
  "はさまれ・巻き込まれ": 4,
  "切れ・こすれ": 3,
  "飛来・落下": 3,
  感電: 4,
  車両: 3,
  交通事故: 4,
  "崩壊・倒壊": 5,
  火災: 4,
  爆発: 5,
  "高温・低温の物との接触": 3,
  "有害物等との接触": 3,
  酸素欠乏: 5,
  溺水: 5,
  熱中症: 3,
  低体温症: 2,
  有害光線: 2,
  有害物質: 3,
  激突され: 3,
  振動障害: 1,
  "動作の反動・無理な動作": 1,
};

function severityScore(severity: AccidentCase["severity"]): number {
  switch (severity) {
    case "死亡": return 4;
    case "重傷": return 3;
    case "中等傷": return 2;
    case "軽傷": return 1;
  }
}

function toRiskLevel(score: number, severity: AccidentCase["severity"]): RiskLevel {
  if (severity === "死亡" || score >= 8) return "高";
  if (severity === "重傷" || score >= 4) return "中";
  return "低";
}

/**
 * テキストをトークン（単語）リストに分解
 */
function tokenize(text: string): string[] {
  // ひらがな・カタカナ・漢字・英数字ごとに分割
  return text
    .replace(/[。、・「」『』【】〔〕（）()[\]]/g, " ")
    .split(/[\s,，]+/)
    .filter((t) => t.length > 0);
}

/**
 * 入力テキストからキーワードを展開（同義語展開含む）
 */
function expandKeywords(input: string): Set<string> {
  const tokens = tokenize(input);
  const keywords = new Set<string>(tokens);

  for (const token of tokens) {
    for (const group of SYNONYM_GROUPS) {
      const matchesInput = group.input.some(
        (kw) => token.includes(kw) || kw.includes(token)
      );
      if (matchesInput) {
        for (const expanded of group.expand) {
          keywords.add(expanded);
        }
      }
    }
  }

  return keywords;
}

/**
 * 1件の事故事例に対してスコアを計算する
 */
function scoreCase(
  acc: AccidentCase,
  keywords: Set<string>,
  rawTokens: string[]
): { score: number; matchedKeywords: string[] } {
  const matched = new Set<string>();
  const searchableText = [
    acc.title,
    acc.type,
    acc.workCategory,
    acc.summary,
    ...(acc.mainCauses ?? []),
    ...(acc.preventionPoints ?? []),
  ]
    .join(" ")
    .toLowerCase();

  // キーワードマッチング（展開済み）
  for (const kw of keywords) {
    if (searchableText.includes(kw.toLowerCase())) {
      matched.add(kw);
    }
  }

  // 事故の型ベーススコア
  const typeBase = TYPE_BASE_RISK[acc.type] ?? 2;

  // 重大度ボーナス
  const sevBonus = severityScore(acc.severity);

  // マッチ数スコア
  const matchScore = matched.size * 2;

  // 完全一致ボーナス（タイトルに生トークンが含まれるか）
  let exactBonus = 0;
  for (const token of rawTokens) {
    if (token.length >= 2 && acc.title.includes(token)) {
      exactBonus += 3;
    }
  }

  const totalScore = matchScore + exactBonus + sevBonus + (matched.size > 0 ? typeBase : 0);

  return {
    score: totalScore,
    matchedKeywords: [...matched],
  };
}

/**
 * 事故DBを入力テキストで検索し、関連度順に返す
 */
export function searchAccidentCases(
  query: string,
  allCases: AccidentCase[],
  maxResults = 20
): ScoredAccidentCase[] {
  if (!query.trim()) return [];

  const keywords = expandKeywords(query);
  const rawTokens = tokenize(query);

  const scored = allCases
    .map((acc) => {
      const { score, matchedKeywords } = scoreCase(acc, keywords, rawTokens);
      return {
        ...acc,
        score,
        riskLevel: toRiskLevel(score, acc.severity),
        matchedKeywords,
      } as ScoredAccidentCase;
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored;
}

// ----- 季節・曜日・天気ベースのリスク予測 -----

export type SeasonalRisk = {
  type: string;
  label: string;
  reason: string;
  level: RiskLevel;
  icon: string;
};

function getSeasonFromMonth(month: number): "春" | "夏" | "秋" | "冬" {
  if (month >= 3 && month <= 5) return "春";
  if (month >= 6 && month <= 8) return "夏";
  if (month >= 9 && month <= 11) return "秋";
  return "冬";
}

/**
 * 現在日時・天気から自動でリスク一覧を生成
 */
export function computeTodayRisks(opts: {
  date?: Date;
  temperatureCelsius?: number;
  precipitationMm?: number;
  isMonday?: boolean;
}): SeasonalRisk[] {
  const date = opts.date ?? new Date();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay(); // 0=日、1=月
  const season = getSeasonFromMonth(month);
  const temp = opts.temperatureCelsius ?? 20;
  const precip = opts.precipitationMm ?? 0;
  const isMonday = opts.isMonday ?? dayOfWeek === 1;

  const risks: SeasonalRisk[] = [];

  // 月曜リスク
  if (isMonday || dayOfWeek === 1) {
    risks.push({
      type: "週明け注意",
      label: "週明け注意力低下",
      reason: "週明けは注意力・集中力が低下しやすく、ヒヤリハット発生率が高い傾向があります",
      level: "中",
      icon: "⚠️",
    });
  }

  // 熱中症リスク（夏・高温）
  if (season === "夏" || temp >= 28) {
    const level: RiskLevel = temp >= 35 ? "高" : temp >= 28 ? "中" : "低";
    risks.push({
      type: "熱中症",
      label: "熱中症リスク",
      reason: `気温${temp}℃。WBGT（暑さ指数）が高く、屋外作業での熱中症に要注意。こまめな水分・塩分補給と休憩を徹底してください`,
      level,
      icon: "🌡",
    });
  }

  // 降雨・転倒・感電リスク
  if (precip > 0) {
    risks.push({
      type: "転倒・感電",
      label: "雨天による転倒・感電リスク",
      reason: "降雨により足場・床面が濡れ、転倒・滑落リスクが増大します。また電気工具・仮設電気の漏電・感電に注意",
      level: precip >= 10 ? "高" : "中",
      icon: "🌧",
    });
  }

  // 冬・凍結リスク
  if (season === "冬" || temp <= 5) {
    risks.push({
      type: "凍結・低体温",
      label: "凍結・低体温リスク",
      reason: `気温${temp}℃。路面・足場の凍結による転倒・滑落、および長時間作業での低体温症に注意してください`,
      level: temp <= 0 ? "高" : "中",
      icon: "❄",
    });
  }

  // 春秋・強風リスク
  if (season === "春" || season === "秋") {
    risks.push({
      type: "強風",
      label: "強風による飛来落下リスク",
      reason: "春・秋は季節の変わり目で強風が発生しやすい時期です。高所作業・資材の固定を確認してください",
      level: "中",
      icon: "💨",
    });
  }

  // 年末年始（12月・1月）リスク
  if (month === 12 || month === 1) {
    risks.push({
      type: "年末年始",
      label: "繁忙期リスク",
      reason: "工期末・年末の追い込みによる無理な作業、焦りによる安全確認省略に注意が必要です",
      level: "中",
      icon: "📅",
    });
  }

  // デフォルト: 高所作業リスク（常時）
  risks.push({
    type: "墜落・転落",
    label: "高所作業の墜落・転落",
    reason: "墜落・転落は死亡災害の最多原因。安全帯の使用・手すりの設置・開口部養生を必ず確認してください",
    level: "高",
    icon: "⛑",
  });

  return risks;
}

// ----- 季節・業種別トレンド分析 -----

export type MonthlyTrend = {
  month: number;
  label: string;
  count: number;
  topType: AccidentType | null;
};

export type IndustryTrend = {
  category: string;
  count: number;
  deathCount: number;
  topType: AccidentType | null;
};

/**
 * 事故DBから月別トレンドを集計
 */
export function computeMonthlyTrends(cases: AccidentCase[]): MonthlyTrend[] {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  return months.map((month) => {
    const monthCases = cases.filter((c) => {
      const d = new Date(c.occurredOn);
      return d.getMonth() + 1 === month;
    });

    const typeCount: Partial<Record<AccidentType, number>> = {};
    for (const c of monthCases) {
      typeCount[c.type] = (typeCount[c.type] ?? 0) + 1;
    }
    const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] as AccidentType | undefined;

    return {
      month,
      label: MONTH_LABELS[month - 1],
      count: monthCases.length,
      topType: topType ?? null,
    };
  });
}

/**
 * 事故DBから業種別トレンドを集計
 */
export function computeIndustryTrends(cases: AccidentCase[]): IndustryTrend[] {
  const catMap = new Map<string, { count: number; deaths: number; types: Partial<Record<AccidentType, number>> }>();

  for (const c of cases) {
    const cat = c.workCategory;
    if (!catMap.has(cat)) {
      catMap.set(cat, { count: 0, deaths: 0, types: {} });
    }
    const entry = catMap.get(cat)!;
    entry.count++;
    if (c.severity === "死亡") entry.deaths++;
    entry.types[c.type] = (entry.types[c.type] ?? 0) + 1;
  }

  return [...catMap.entries()]
    .map(([category, { count, deaths, types }]) => {
      const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0]?.[0] as AccidentType | undefined;
      return { category, count, deathCount: deaths, topType: topType ?? null };
    })
    .sort((a, b) => b.count - a.count);
}

// ----- 安全スコア計算 -----

export type SafetyScore = {
  overall: number; // 0-100
  breakdown: {
    label: string;
    score: number;
    maxScore: number;
    color: string;
  }[];
  riskLevel: RiskLevel;
  comment: string;
};

/**
 * 作業内容・天気・季節から安全スコアを計算する
 * スコアが高いほど「注意すべきリスクが多い」
 */
export function computeSafetyScore(opts: {
  query: string;
  matchedCases: ScoredAccidentCase[];
  temp?: number;
  precip?: number;
  isMonday?: boolean;
  date?: Date;
}): SafetyScore {
  const { query, matchedCases, temp = 20, precip = 0, isMonday = false } = opts;
  const date = opts.date ?? new Date();
  const month = date.getMonth() + 1;
  const season = getSeasonFromMonth(month);

  // カテゴリ別スコア
  const accidentRisk = Math.min(
    matchedCases.filter((c) => c.severity === "死亡" || c.severity === "重傷").length * 10,
    40
  );

  const weatherRisk =
    (precip > 0 ? 15 : 0) +
    (temp >= 35 ? 20 : temp >= 28 ? 10 : 0) +
    (temp <= 0 ? 20 : temp <= 5 ? 10 : 0);

  const seasonRisk =
    season === "夏" ? 10 : season === "冬" ? 10 : 5;

  const mondayRisk = isMonday ? 10 : 0;

  const highRiskWork =
    ["高所", "足場", "電気", "感電", "墜落", "解体"].some((kw) => query.includes(kw)) ? 15 : 0;

  const total = Math.min(accidentRisk + weatherRisk + seasonRisk + mondayRisk + highRiskWork, 100);

  const riskLevel: RiskLevel = total >= 60 ? "高" : total >= 30 ? "中" : "低";

  const comment =
    riskLevel === "高"
      ? "本日の作業は複数の高リスク要因が重なっています。TBM・KYを十分に実施し、危険を感じたら作業を中止してください"
      : riskLevel === "中"
        ? "いくつかのリスク要因があります。朝礼で周知し、こまめな安全確認を行ってください"
        : "比較的リスクが低い状況ですが、常に安全確認を怠らないようにしてください";

  return {
    overall: total,
    breakdown: [
      { label: "事故事例リスク", score: accidentRisk, maxScore: 40, color: "bg-rose-500" },
      { label: "気象リスク", score: Math.min(weatherRisk, 35), maxScore: 35, color: "bg-amber-500" },
      { label: "季節リスク", score: seasonRisk, maxScore: 10, color: "bg-yellow-500" },
      { label: "曜日リスク", score: mondayRisk, maxScore: 10, color: "bg-blue-500" },
      { label: "作業種別リスク", score: highRiskWork, maxScore: 15, color: "bg-violet-500" },
    ],
    riskLevel,
    comment,
  };
}

// ----- リスクマトリクス -----

export type RiskMatrixCell = {
  frequency: number; // 1-5 (低→高)
  severity: number;  // 1-5 (軽微→致命)
  count: number;
  cases: ScoredAccidentCase[];
};

/**
 * 検索結果をリスクマトリクス（頻度×重大性）に分類する
 */
export function buildRiskMatrix(cases: ScoredAccidentCase[]): RiskMatrixCell[][] {
  // 5x5 マトリクスを初期化
  const matrix: RiskMatrixCell[][] = Array.from({ length: 5 }, (_, si) =>
    Array.from({ length: 5 }, (_, fi) => ({
      frequency: fi + 1,
      severity: si + 1,
      count: 0,
      cases: [],
    }))
  );

  for (const c of cases) {
    // severity: 死亡=5, 重傷=4, 中等傷=3, 軽傷=1
    const sev =
      c.severity === "死亡" ? 4
        : c.severity === "重傷" ? 3
          : c.severity === "中等傷" ? 2
            : 0; // index (0-4)

    // frequency: スコアを1-5に正規化
    const freq = Math.min(4, Math.max(0, Math.floor(c.score / 5)));

    matrix[sev][freq].count++;
    if (matrix[sev][freq].cases.length < 3) {
      matrix[sev][freq].cases.push(c);
    }
  }

  return matrix;
}
