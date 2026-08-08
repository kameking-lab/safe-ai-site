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

function joinLabels(labels: string[]): string {
  return labels.join("・");
}

export function buildRiskWeatherConclusion(input: RiskWeatherInput): RiskWeatherConclusion {
  const { forecastStatus, jmaStatus, regions } = input;

  const special = regions.filter((r) => r.jmaLevel === "special");
  const officialWarning = regions.filter((r) => LEVEL_RANK[r.jmaLevel ?? "none"] >= LEVEL_RANK.warning);
  const officialAdvisory = regions.filter((r) => r.jmaLevel === "advisory");
  const forecastWarning = regions.filter((r) => r.forecastLevel === "warning");
  const forecastAdvisory = regions.filter((r) => r.forecastLevel === "advisory");

  // 1) 警報・特別警報は取得途中・片方失敗でも検知できた時点で最優先で出す
  if (officialWarning.length > 0) {
    const isSpecial = special.length > 0;
    return {
      tone: "danger",
      value: officialWarning.length,
      unit: "地域",
      title: isSpecial ? "気象庁 特別警報あり" : "気象庁 警報あり",
      description: `${joinLabels(officialWarning.map((r) => r.label))}で${
        isSpecial ? "特別警報" : "警報"
      }が発表されています。公式情報と現場手順を確認してください。`,
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

  // 4) 気象庁の注意報。独自しきい値とは表示を混ぜない。
  if (officialAdvisory.length > 0) {
    return {
      tone: "warning",
      value: officialAdvisory.length,
      unit: "地域",
      title: "気象庁 注意報あり",
      description: `${joinLabels(officialAdvisory.map((r) => r.label))}で注意報が発表されています。気象庁公式情報を確認してください。`,
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

  // 6) Open-Meteo の独自しきい値は、公式警報・注意報と明確に分離する。
  if (forecastWarning.length > 0 || forecastAdvisory.length > 0) {
    const severe = forecastWarning.length > 0;
    const targets = severe ? forecastWarning : forecastAdvisory;
    return {
      tone: severe ? "danger" : "warning",
      value: targets.length,
      unit: "地域",
      title: severe ? "独自目安・強い雨風" : "独自目安・雨風に注意",
      description: `${joinLabels(targets.map((r) => r.label))}がOpen-Meteo予報の独自しきい値に該当。気象庁の警報・注意報を意味しません。`,
    };
  }

  // 7) 全ソース取得成功。安全宣言ではなく、発表状況だけを示す。
  return {
    tone: "neutral",
    title: "気象庁の警報・注意報 発表なし",
    description: "取得時点の47都道府県データでは発表を検知していません。現場条件と最新の公式情報は別途確認してください。",
  };
}
