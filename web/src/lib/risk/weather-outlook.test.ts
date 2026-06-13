import { describe, expect, it } from "vitest";
import {
  buildRiskWeatherOutlook,
  type OutlookAlertLevel,
  type RiskWeatherOutlookInput,
} from "./weather-outlook";

/** 8地域 × N日分の予報を組み立てるヘルパー。levels[regionIdx][dayIdx] = レベル */
function build(levels: OutlookAlertLevel[][]): RiskWeatherOutlookInput[] {
  return levels.map((dayLevels) => ({
    days: dayLevels.map((alertLevel, i) => ({
      date: `2026-06-${String(14 + i).padStart(2, "0")}`,
      alertLevel,
    })),
  }));
}

/** 全地域・全日「異常なし」の8ブロック雛形（days日分） */
function calm(days: number): RiskWeatherOutlookInput[] {
  return build(Array.from({ length: 8 }, () => Array.from({ length: days }, () => "none")));
}

describe("buildRiskWeatherOutlook: 明日以降の見通しストリップ", () => {
  it("既定で明日起点・3日分を返す（今日は含めない＝結論カードと重複させない）", () => {
    const out = buildRiskWeatherOutlook(calm(7));
    expect(out).toHaveLength(3);
    expect(out[0].offset).toBe(1);
    expect(out[0].dayLabel).toBe("明日");
    expect(out[1].dayLabel).toBe("明後日");
    expect(out[2].dayLabel).toBe(""); // 3日後は相対語なし
    // 明日の日付は配列の index1（今日の翌日）
    expect(out[0].date).toBe("2026-06-15");
  });

  it("全国おおむね良好 = 緑・警報/注意報0件", () => {
    const out = buildRiskWeatherOutlook(calm(7));
    expect(out[0].tone).toBe("safe");
    expect(out[0].level).toBe("none");
    expect(out[0].levelLabel).toBe("概ね良好");
    expect(out[0].warningCount).toBe(0);
    expect(out[0].advisoryCount).toBe(0);
    expect(out[0].totalRegions).toBe(8);
  });

  it("明日に1地域でも警報相当があれば赤・該当数を数える（台風前日の本命ケース）", () => {
    const levels = Array.from({ length: 8 }, () => ["none", "none", "none"] as OutlookAlertLevel[]);
    levels[2][1] = "warning"; // 関東相当・明日
    levels[4][1] = "warning"; // 近畿相当・明日
    const out = buildRiskWeatherOutlook(build(levels));
    expect(out[0].tone).toBe("danger");
    expect(out[0].level).toBe("warning");
    expect(out[0].levelLabel).toBe("警報相当");
    expect(out[0].warningCount).toBe(2);
  });

  it("注意報相当のみ = 黄（警報には昇格しない）", () => {
    const levels = Array.from({ length: 8 }, () => ["none", "none", "none"] as OutlookAlertLevel[]);
    levels[0][1] = "advisory";
    const out = buildRiskWeatherOutlook(build(levels));
    expect(out[0].tone).toBe("warning");
    expect(out[0].level).toBe("advisory");
    expect(out[0].advisoryCount).toBe(1);
    expect(out[0].warningCount).toBe(0);
  });

  it("警報と注意報が混在する日は最悪レベル（警報=赤）を採る・両方の地域数を保持", () => {
    const levels = Array.from({ length: 8 }, () => ["none", "none", "none"] as OutlookAlertLevel[]);
    levels[0][1] = "warning";
    levels[1][1] = "advisory";
    levels[2][1] = "advisory";
    const out = buildRiskWeatherOutlook(build(levels));
    expect(out[0].tone).toBe("danger");
    expect(out[0].warningCount).toBe(1);
    expect(out[0].advisoryCount).toBe(2);
  });

  it("startOffset=0 で今日を含められる（テスト/将来用途）", () => {
    const out = buildRiskWeatherOutlook(calm(7), { startOffset: 0, days: 2 });
    expect(out).toHaveLength(2);
    expect(out[0].offset).toBe(0);
    expect(out[0].dayLabel).toBe(""); // 今日は相対語マップ外
    expect(out[0].date).toBe("2026-06-14");
  });

  it("予報日数が足りなければ取れる分だけ返す（範囲外で打ち切り）", () => {
    const out = buildRiskWeatherOutlook(calm(2)); // 今日+明日のみ
    expect(out).toHaveLength(1); // 明日(index1)だけ
    expect(out[0].offset).toBe(1);
  });

  it("地域配列が空なら空配列（クラッシュしない）", () => {
    expect(buildRiskWeatherOutlook([])).toEqual([]);
  });
});
