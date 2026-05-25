import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildHazardPrompt,
  parseHazardSuggestions,
  generateHazardsWithGemini,
  fallbackHazardSuggestions,
  isGeminiConfigured,
} from "@/lib/ky/gemini-suggest";
import type { KySuggestionResult } from "@/lib/ky-suggestion";
import type { KyExample } from "@/types/ky-example";

function ex(hazards: string[], keywords: string[] = []): KySuggestionResult {
  return {
    example: { id: "x", title: "テスト事例", hazards, keywords, risks: [], countermeasures: [] } as unknown as KyExample,
    score: 50,
    matchedOn: ["keyword"],
  };
}

const EXAMPLES = [ex(["墜落・転落（足場端部）"], ["足場", "高所"])];

describe("parseHazardSuggestions", () => {
  it("正常なJSONを解析し評価値・ラベルを補完する", () => {
    const text = JSON.stringify({
      hazards: [{ hazard: "足場からの墜落", reduction: "親綱使用", likelihood: 3, severity: 3, basis: "事例1" }],
    });
    const r = parseHazardSuggestions(text, EXAMPLES);
    expect(r).toHaveLength(1);
    expect(r[0].likelihood).toBe(3);
    expect(r[0].severity).toBe(3);
    expect(r[0].evaluation).toBeGreaterThan(0);
    expect(r[0].riskLabel).toBeTruthy();
    expect(r[0].grounded).toBe(true);
  });

  it("```json フェンス付きでも解析できる", () => {
    const text = "```json\n" + JSON.stringify({ hazards: [{ hazard: "感電", reduction: "検電", likelihood: 2, severity: 3 }] }) + "\n```";
    const r = parseHazardSuggestions(text, EXAMPLES);
    expect(r).toHaveLength(1);
    expect(r[0].hazard).toBe("感電");
  });

  it("前後に説明文があっても最初のJSONを抽出する", () => {
    const text = 'はい、以下が提案です。\n{"hazards":[{"hazard":"転倒","reduction":"整理整頓","likelihood":1,"severity":1}]}\nご確認ください。';
    const r = parseHazardSuggestions(text, EXAMPLES);
    expect(r).toHaveLength(1);
    expect(r[0].hazard).toBe("転倒");
  });

  it("可能性・重大性を1〜3にクランプする", () => {
    const text = JSON.stringify({
      hazards: [
        { hazard: "A", likelihood: 0, severity: 9 },
        { hazard: "B", likelihood: 2.4, severity: -3 },
      ],
    });
    const r = parseHazardSuggestions(text, EXAMPLES);
    expect(r[0].likelihood).toBe(1);
    expect(r[0].severity).toBe(3);
    expect(r[1].likelihood).toBe(2);
    expect(r[1].severity).toBe(1);
  });

  it("hazard が空の要素はスキップする", () => {
    const text = JSON.stringify({ hazards: [{ hazard: "", reduction: "x" }, { hazard: "有効", reduction: "y" }] });
    const r = parseHazardSuggestions(text, EXAMPLES);
    expect(r).toHaveLength(1);
    expect(r[0].hazard).toBe("有効");
  });

  it("reduction 欠落時は空文字になる", () => {
    const r = parseHazardSuggestions(JSON.stringify({ hazards: [{ hazard: "X" }] }), EXAMPLES);
    expect(r[0].reduction).toBe("");
  });

  it("hazards が配列でなければ空配列", () => {
    expect(parseHazardSuggestions(JSON.stringify({ hazards: "no" }), EXAMPLES)).toEqual([]);
  });

  it("不正JSON・空文字は空配列", () => {
    expect(parseHazardSuggestions("not json at all", EXAMPLES)).toEqual([]);
    expect(parseHazardSuggestions("", EXAMPLES)).toEqual([]);
  });

  it("過去事例と無関係な危険は grounded=false", () => {
    const r = parseHazardSuggestions(JSON.stringify({ hazards: [{ hazard: "宇宙線被曝" }] }), EXAMPLES);
    expect(r[0].grounded).toBe(false);
  });

  it("最大5件に制限する", () => {
    const hazards = Array.from({ length: 8 }, (_, i) => ({ hazard: `h${i}`, likelihood: 1, severity: 1 }));
    const r = parseHazardSuggestions(JSON.stringify({ hazards }), EXAMPLES);
    expect(r).toHaveLength(5);
  });
});

describe("buildHazardPrompt", () => {
  it("作業内容と事例をプロンプトに含める", () => {
    const { system, user } = buildHazardPrompt("鉄骨建方", EXAMPLES);
    expect(system).toContain("JSON");
    expect(user).toContain("鉄骨建方");
    expect(user).toContain("墜落");
  });

  it("事例ゼロなら一般的知見の注記を含める", () => {
    const { user } = buildHazardPrompt("作業", []);
    expect(user).toContain("一般的知見");
  });
});

describe("generateHazardsWithGemini (generate 注入でネット無しテスト)", () => {
  it("有効な応答で提案を返す", async () => {
    const generate = vi.fn(async () =>
      JSON.stringify({ hazards: [{ hazard: "墜落", reduction: "親綱", likelihood: 3, severity: 3 }] })
    );
    const r = await generateHazardsWithGemini("高所作業", EXAMPLES, generate);
    expect(r).toHaveLength(1);
    expect(generate).toHaveBeenCalledOnce();
  });

  it("解析不能な応答は throw（→ ルートで擬似AIへフォールバック）", async () => {
    const generate = vi.fn(async () => "ゴミ応答");
    await expect(generateHazardsWithGemini("x", EXAMPLES, generate)).rejects.toThrow();
  });

  it("generate が例外を投げたら伝播する", async () => {
    const generate = vi.fn(async () => {
      throw new Error("quota_exceeded");
    });
    await expect(generateHazardsWithGemini("x", EXAMPLES, generate)).rejects.toThrow("quota_exceeded");
  });
});

describe("fallbackHazardSuggestions (擬似AI)", () => {
  it("提案を生成し grounded=false・評価値付き", () => {
    const r = fallbackHazardSuggestions("足場での高所作業", "construction");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].grounded).toBe(false);
    expect(r[0].evaluation).toBeGreaterThan(0);
    expect(r[0].basis).toContain("フォールバック");
  });
});

describe("isGeminiConfigured", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });

  it("キーが無ければ false", () => {
    expect(isGeminiConfigured()).toBe(false);
  });
  it('"dummy" は false', () => {
    process.env.GEMINI_API_KEY = "dummy";
    expect(isGeminiConfigured()).toBe(false);
  });
  it("実キーがあれば true（GOOGLE_API_KEY でも可）", () => {
    process.env.GOOGLE_API_KEY = "AIza-xxxx";
    expect(isGeminiConfigured()).toBe(true);
  });
});
