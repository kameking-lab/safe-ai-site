import { describe, expect, it } from "vitest";
import { buildSignageConclusion } from "./signage-conclusion";
import type { SignageConclusionInput } from "./signage-conclusion";
import type { WeatherWarningPanelState } from "./weather-warning-panel-state";

const none: WeatherWarningPanelState = { kind: "none", headline: null };
const loading: WeatherWarningPanelState = { kind: "loading", headline: null };
const error: WeatherWarningPanelState = { kind: "error", headline: null };
const headline: WeatherWarningPanelState = {
  kind: "headline",
  headline: "東京都では、土砂災害や河川の増水に警戒してください。",
};

function input(partial: Partial<SignageConclusionInput>): SignageConclusionInput {
  return { warningPanel: none, risks: [], siteSafety: null, ...partial };
}

describe("buildSignageConclusion: 主文の優先順位", () => {
  it("警報発表中は最優先で赤・ヘッドラインを補足に出す", () => {
    const c = buildSignageConclusion(
      input({
        warningPanel: headline,
        risks: [{ level: "高", label: "熱中症リスク" }],
        siteSafety: { overdueCount: 2, alertCount: 1 },
      }),
    );
    expect(c.tone).toBe("red");
    expect(c.label).toBe("警報 発表中");
    expect(c.sub).toBe(headline.headline);
  });

  it("警報なしでも期限超過があれば赤", () => {
    const c = buildSignageConclusion(
      input({ siteSafety: { overdueCount: 3, alertCount: 0 } }),
    );
    expect(c.tone).toBe("red");
    expect(c.label).toBe("期限超過 3件");
    expect(c.sub).toContain("記録キット");
  });

  it("気象取得失敗は黄（確認不能＝誤った安心も停止も出さない）", () => {
    const c = buildSignageConclusion(input({ warningPanel: error }));
    expect(c.tone).toBe("amber");
    expect(c.label).toBe("気象 確認不能");
    expect(c.sub).toContain("気象庁");
  });

  it("取得失敗より期限超過（赤）が優先される", () => {
    const c = buildSignageConclusion(
      input({ warningPanel: error, siteSafety: { overdueCount: 1, alertCount: 0 } }),
    );
    expect(c.tone).toBe("red");
    expect(c.label).toBe("期限超過 1件");
    expect(c.chips).toEqual([{ tone: "amber", text: "気象 取得失敗" }]);
  });

  it("高リスク予測のみなら黄・ラベルを補足に列挙", () => {
    const c = buildSignageConclusion(
      input({
        risks: [
          { level: "高", label: "熱中症リスク" },
          { level: "高", label: "雨天による転倒・感電リスク" },
          { level: "中", label: "週明け注意力低下" },
        ],
      }),
    );
    expect(c.tone).toBe("amber");
    expect(c.label).toBe("高リスク 2件");
    expect(c.sub).toBe("熱中症リスク・雨天による転倒・感電リスク");
  });

  it("要対応のみなら黄", () => {
    const c = buildSignageConclusion(
      input({ siteSafety: { overdueCount: 0, alertCount: 4 } }),
    );
    expect(c.tone).toBe("amber");
    expect(c.label).toBe("要対応 4件");
  });

  it("取得中かつ他の状態なしは無彩の確認中", () => {
    const c = buildSignageConclusion(input({ warningPanel: loading }));
    expect(c.tone).toBe("slate");
    expect(c.label).toBe("状態 確認中…");
    expect(c.chips).toEqual([]);
  });

  it("取得中でも期限超過が分かっていれば赤を出す（既知の停止級を隠さない）", () => {
    const c = buildSignageConclusion(
      input({ warningPanel: loading, siteSafety: { overdueCount: 1, alertCount: 0 } }),
    );
    expect(c.tone).toBe("red");
    expect(c.label).toBe("期限超過 1件");
  });

  it("何もなければ緑の警報なし", () => {
    const c = buildSignageConclusion(input({}));
    expect(c.tone).toBe("green");
    expect(c.label).toBe("本日 警報なし");
    expect(c.sub).toBeNull();
    expect(c.chips).toEqual([]);
  });

  it("緑のとき中リスクは注意の補足として文言のみ（黄に昇格させない）", () => {
    const c = buildSignageConclusion(
      input({
        risks: [
          { level: "中", label: "週明け注意力低下" },
          { level: "中", label: "凍結・低体温リスク" },
          { level: "低", label: "花粉" },
        ],
      }),
    );
    expect(c.tone).toBe("green");
    expect(c.sub).toBe("注意: 週明け注意力低下・凍結・低体温リスク");
  });

  it("低リスクのみでも緑（補足なし）", () => {
    const c = buildSignageConclusion(input({ risks: [{ level: "低", label: "花粉" }] }));
    expect(c.tone).toBe("green");
    expect(c.sub).toBeNull();
  });

  it("記録キット未使用端末（siteSafety=null）は記録系チップを出さない", () => {
    const c = buildSignageConclusion(input({ warningPanel: headline, siteSafety: null }));
    expect(c.chips).toEqual([]);
  });
});

describe("buildSignageConclusion: チップ（主文以外の状態スコアボード）", () => {
  it("主文と同じ状態はチップに重複させない", () => {
    const c = buildSignageConclusion(
      input({
        warningPanel: headline,
        risks: [{ level: "高", label: "熱中症リスク" }],
        siteSafety: { overdueCount: 2, alertCount: 1 },
      }),
    );
    expect(c.chips).toEqual([
      { tone: "red", text: "期限超過 2件" },
      { tone: "amber", text: "高リスク 1件" },
      { tone: "amber", text: "要対応 1件" },
    ]);
    expect(c.chips.map((x) => x.text)).not.toContain("気象警報");
  });

  it("チップの並びは深刻度順（赤→黄）", () => {
    const c = buildSignageConclusion(
      input({
        warningPanel: headline,
        siteSafety: { overdueCount: 1, alertCount: 2 },
      }),
    );
    expect(c.chips[0].tone).toBe("red");
    expect(c.chips[c.chips.length - 1].tone).toBe("amber");
  });

  it("単独状態のときチップは空", () => {
    const c = buildSignageConclusion(input({ warningPanel: error }));
    expect(c.chips).toEqual([]);
  });
});
