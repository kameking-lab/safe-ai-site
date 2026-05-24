import { describe, it, expect } from "vitest";
import {
  describeTopic,
  INDUSTRY_PARAM_TO_PRESET,
  mapIndustryParamToPresetId,
} from "./ky-deep-link";
import { getPresetById, KY_INDUSTRY_PRESETS } from "@/data/mock/ky-industry-presets";

// /industries/<id> から /ky?industry=<id>&topic=<key> へ遷移したときに、
// 該当する KY プリセットが必ず存在することを保証する回帰テスト。
// 以前は industryToPreset の値が "construction-scaffolding" 等になっていて
// getPresetById で常に undefined が返り、業種プリセットが当たらない潜在バグがあった。
describe("mapIndustryParamToPresetId / KY deep-link mapping", () => {
  it("null/undefined/空文字には undefined を返す", () => {
    expect(mapIndustryParamToPresetId(null)).toBeUndefined();
    expect(mapIndustryParamToPresetId(undefined)).toBeUndefined();
    expect(mapIndustryParamToPresetId("")).toBeUndefined();
  });

  it("未知の業種IDは undefined を返す", () => {
    expect(mapIndustryParamToPresetId("nonexistent-industry")).toBeUndefined();
  });

  const cases: { input: string; expectedPreset: string }[] = [
    { input: "construction", expectedPreset: "construction" },
    { input: "manufacturing", expectedPreset: "manufacturing" },
    { input: "healthcare", expectedPreset: "medical" },
    { input: "transport", expectedPreset: "transport" },
    { input: "food", expectedPreset: "food" },
    { input: "retail", expectedPreset: "retail" },
  ];

  for (const c of cases) {
    it(`industry='${c.input}' → preset='${c.expectedPreset}' が存在する`, () => {
      const presetId = mapIndustryParamToPresetId(c.input);
      expect(presetId).toBe(c.expectedPreset);
      const preset = getPresetById(presetId!);
      expect(preset).toBeDefined();
      expect(preset?.workExamples.length).toBeGreaterThan(0);
      expect(preset?.risks.length).toBeGreaterThan(0);
    });
  }

  it("マップの全エントリは実在する KY プリセットを指す（孤児マッピング検出）", () => {
    const presetIds = new Set(KY_INDUSTRY_PRESETS.map((p) => p.id));
    for (const [industry, presetId] of Object.entries(INDUSTRY_PARAM_TO_PRESET)) {
      expect(
        presetIds.has(presetId),
        `industry=${industry} → preset=${presetId} が KY_INDUSTRY_PRESETS に存在しない`,
      ).toBe(true);
    }
  });
});

describe("describeTopic", () => {
  it("null/undefined には undefined を返す", () => {
    expect(describeTopic(null)).toBeUndefined();
    expect(describeTopic(undefined)).toBeUndefined();
  });

  it("既知のトピックには日本語ラベルを返す", () => {
    expect(describeTopic("scaffold")).toBe("足場の組立て・解体作業");
    expect(describeTopic("fall")).toBe("高所作業（屋根・梁上）");
    expect(describeTopic("crane")).toBe("クレーン・玉掛け作業");
    expect(describeTopic("demolition")).toBe("解体・はつり作業");
    expect(describeTopic("heat")).toBe("夏季屋外作業");
    expect(describeTopic("ladder")).toBe("脚立・はしご作業");
  });

  it("未知のトピックには undefined を返す（落ちずに無視）", () => {
    expect(describeTopic("unknown-topic-xxxxx")).toBeUndefined();
  });
});
