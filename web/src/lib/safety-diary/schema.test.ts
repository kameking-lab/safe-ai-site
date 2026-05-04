import { describe, it, expect } from "vitest";
import {
  requiredFieldsSchema,
  safetyDiaryEntrySchema,
  industryPresetSchema,
  weatherSchema,
} from "./schema";

describe("safety-diary zod schemas", () => {
  describe("industryPresetSchema", () => {
    it("有効な業種を受理する", () => {
      expect(industryPresetSchema.parse("construction")).toBe("construction");
      expect(industryPresetSchema.parse("manufacturing")).toBe("manufacturing");
      expect(industryPresetSchema.parse("healthcare")).toBe("healthcare");
    });

    it("未定義の業種を拒否する", () => {
      expect(() => industryPresetSchema.parse("unknown")).toThrow();
    });
  });

  describe("weatherSchema", () => {
    it("有効な天候を受理する", () => {
      expect(weatherSchema.parse("晴れ")).toBe("晴れ");
      expect(weatherSchema.parse("猛暑")).toBe("猛暑");
    });

    it("半角ひらがな等は拒否される", () => {
      expect(() => weatherSchema.parse("はれ")).toThrow();
    });
  });

  describe("requiredFieldsSchema", () => {
    const validBase = {
      date: "2026-04-25",
      weather: "晴れ" as const,
      siteName: "渋谷駅前タワー",
      workContent: "鉄筋組立",
      kyResult: "",
      nearMissOccurred: false,
    };

    it("正しい必須項目を受理する", () => {
      const parsed = requiredFieldsSchema.parse(validBase);
      expect(parsed.siteName).toBe("渋谷駅前タワー");
    });

    it("日付が YYYY-MM-DD 以外の形式なら拒否する", () => {
      expect(() => requiredFieldsSchema.parse({ ...validBase, date: "2026/04/25" })).toThrow();
      expect(() => requiredFieldsSchema.parse({ ...validBase, date: "26-4-25" })).toThrow();
    });

    it("siteName が空文字なら拒否する", () => {
      expect(() => requiredFieldsSchema.parse({ ...validBase, siteName: "" })).toThrow();
    });

    it("workContent が空文字なら拒否する", () => {
      expect(() => requiredFieldsSchema.parse({ ...validBase, workContent: "" })).toThrow();
    });

    it("nearMissDetail は任意項目（省略可）", () => {
      const parsed = requiredFieldsSchema.parse(validBase);
      expect(parsed.nearMissDetail).toBeUndefined();
    });
  });

  describe("safetyDiaryEntrySchema", () => {
    it("最小構成のエントリを受理する（optional はデフォルト値で補完）", () => {
      const minimal = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        industry: "construction",
        required: {
          date: "2026-04-25",
          weather: "晴れ",
          siteName: "テスト現場",
          workContent: "テスト作業",
          kyResult: "",
          nearMissOccurred: false,
        },
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T17:00:00.000Z",
      };
      const parsed = safetyDiaryEntrySchema.parse(minimal);
      // optional は default で空配列・空オブジェクト相当が補完される
      expect(parsed.optional.contractorWorks).toEqual([]);
      expect(parsed.optional.requiredQualifications).toEqual([]);
      expect(parsed.weatherAlerts).toEqual([]);
    });

    it("不正な UUID を拒否する", () => {
      const invalid = {
        id: "not-a-uuid",
        industry: "construction",
        required: {
          date: "2026-04-25",
          weather: "晴れ",
          siteName: "test",
          workContent: "test",
          kyResult: "",
          nearMissOccurred: false,
        },
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
      };
      expect(() => safetyDiaryEntrySchema.parse(invalid)).toThrow();
    });

    it("リスク評価 severity の範囲外を拒否する（1-5）", () => {
      const withInvalidRisk = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        industry: "construction",
        required: {
          date: "2026-04-25",
          weather: "晴れ",
          siteName: "test",
          workContent: "test",
          kyResult: "",
          nearMissOccurred: false,
        },
        optional: {
          contractorWorks: [],
          requiredQualifications: [],
          predictedDisasters: [],
          riskAssessment: { severity: 6, likelihood: 3 }, // 上限超
        },
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
      };
      expect(() => safetyDiaryEntrySchema.parse(withInvalidRisk)).toThrow();
    });
  });
});
