import type { SafetyTone } from "@/lib/design/safety-tone";

/**
 * /risk リスク管理ハブの結論カード判定（柱0・脱テキスト）。
 *
 * 「台風前日の元請安全担当」が画面を3秒見て、全国の気象警報の有無と
 * 次にやることが言えることが役目。色の文法はサイネージ結論ストリップと同一:
 *   警報・特別警報あり = 赤（どちらかのソースで検知できれば即・取得途中でも出す）
 *   取得失敗          = 黄「確認不能」（確認できない状態を緑にも赤にもしない）
 *   注意報相当あり     = 黄
 *   確認中            = 無彩
 *   警報・注意報なし   = 緑（全ソース取得成功時のみ宣言できる）
 */

export type RiskWeatherLevel = "none" | "advisory" | "warning" | "special";

export type RiskRegionInput = {
  /** 地域ブロック名（例: 関東） */
  label: string;
  /** Open-Meteo 予報ベースの今日のレベル（取得前/失敗は undefined） */
  forecastLevel?: "none" | "advisory" | "warning";
  /** 気象庁警報データの今日のレベル（取得前/失敗は undefined） */
  jmaLevel?: RiskWeatherLevel;
};

export type RiskWeatherSourceStatus = "loading" | "error" | "ok";

export type RiskWeatherInput = {
  /** Open-Meteo 予報 (/api/weather-forecast) の取得状態 */
  forecastStatus: RiskWeatherSourceStatus;
  /** 気象庁警報 (/api/signage-weather) の取得状態 */
  jmaStatus: RiskWeatherSourceStatus;
  regions: RiskRegionInput[];
};

export type RiskWeatherConclusion = {
  tone: SafetyTone;
  /** 該当ブロック数（タイトルの主役デカ数字。0件系・確認中系では undefined） */
  value?: number;
  unit?: string;
  title: string;
  description?: string;
};

const LEVEL_RANK: Record<RiskWeatherLevel, number> = {
  none: 0,
  advisory: 1,
  warning: 2,
  special: 3,
};

function regionLevel(region: RiskRegionInput): RiskWeatherLevel {
  const forecast: RiskWeatherLevel = region.forecastLevel ?? "none";
  const jma: RiskWeatherLevel = region.jmaLevel ?? "none";
  return LEVEL_RANK[forecast] >= LEVEL_RANK[jma] ? forecast : jma;
}

function joinLabels(labels: string[]): string {
  return labels.join("・");
}

export function buildRiskWeatherConclusion(input: RiskWeatherInput): RiskWeatherConclusion {
  const { forecastStatus, jmaStatus, regions } = input;

  const special = regions.filter((r) => regionLevel(r) === "special");
  const warning = regions.filter((r) => LEVEL_RANK[regionLevel(r)] >= LEVEL_RANK.warning);
  const advisory = regions.filter((r) => regionLevel(r) === "advisory");

  // 1) 警報・特別警報は取得途中・片方失敗でも検知できた時点で最優先で出す
  if (warning.length > 0) {
    const isSpecial = special.length > 0;
    return {
      tone: "danger",
      value: warning.length,
      unit: "地域",
      title: isSpecial ? "特別警報あり" : "警報相当あり",
      description: `${joinLabels(warning.map((r) => r.label))}で${
        isSpecial ? "特別警報級" : "警報相当"
      }。屋外作業は中止判断を。`,
    };
  }

  // 2) 両ソースとも失敗 = 何も確認できない（緑にも赤にもしない）
  if (forecastStatus === "error" && jmaStatus === "error") {
    return {
      tone: "warning",
      title: "気象情報 取得失敗",
      description: "警報の有無を確認できません。気象庁公式サイトで直接確認してください。",
    };
  }

  // 3) どちらかがまだ取得中（警報未検知の段階では断定しない）
  if (forecastStatus === "loading" || jmaStatus === "loading") {
    return { tone: "neutral", title: "気象情報 確認中" };
  }

  // 4) 注意報相当（片方失敗でも、取れている情報は出す方が有用）
  if (advisory.length > 0) {
    const partialFail = forecastStatus === "error" || jmaStatus === "error";
    return {
      tone: "warning",
      value: advisory.length,
      unit: "地域",
      title: "注意報相当あり",
      description: `${joinLabels(advisory.map((r) => r.label))}で注意報相当。${
        partialFail ? "一部データ取得失敗のため気象庁公式サイトでも確認を。" : "作業前に風・雨を確認。"
      }`,
    };
  }

  // 5) 片方失敗で「なし」は宣言できない = 確認不能（黄）
  if (forecastStatus === "error" || jmaStatus === "error") {
    return {
      tone: "warning",
      title: "一部 確認不能",
      description: "気象データの一部が取得できません。気象庁公式サイトで確認してください。",
    };
  }

  // 6) 全ソース取得成功・全ブロック異常なし = 緑
  return {
    tone: "safe",
    title: "警報・注意報なし",
    description: "全国8ブロックで警報・注意報相当の予報はありません。",
  };
}
