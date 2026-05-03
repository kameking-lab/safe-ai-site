import { z } from "zod";

/** 業種プリセットID */
export const INDUSTRY_PRESETS = [
  "construction", // 建設
  "manufacturing", // 製造
  "healthcare", // 医療福祉
  "transport", // 運輸
  "it", // IT
  "other", // その他
] as const;

export const industryPresetSchema = z.enum(INDUSTRY_PRESETS);
export type IndustryPreset = z.infer<typeof industryPresetSchema>;

/** 天候 */
export const WEATHER_OPTIONS = ["晴れ", "曇り", "雨", "雪", "強風", "猛暑", "厳寒"] as const;
export const weatherSchema = z.enum(WEATHER_OPTIONS);
export type Weather = z.infer<typeof weatherSchema>;

/** 必須5項目 */
export const requiredFieldsSchema = z.object({
  /** 日付（YYYY-MM-DD） */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力"),
  /** 天候 */
  weather: weatherSchema,
  /** 現場名 */
  siteName: z.string().min(1, "現場名は必須"),
  /** 作業内容 */
  workContent: z.string().min(1, "作業内容は必須"),
  /** KY結果（/ky から転記される文字列または手入力。未実施の場合は空文字） */
  kyResult: z.string(),
  /** ヒヤリハット有無 */
  nearMissOccurred: z.boolean(),
  /** ヒヤリハット内容（有の場合） */
  nearMissDetail: z.string().optional(),
});
export type RequiredFields = z.infer<typeof requiredFieldsSchema>;

/** 任意8項目 */
export const optionalFieldsSchema = z.object({
  /** 業者別作業（業者名と作業内容のリスト） */
  contractorWorks: z
    .array(z.object({ name: z.string(), work: z.string() }))
    .default([]),
  /** 必要資格（自動推定 or 手入力） */
  requiredQualifications: z.array(z.string()).default([]),
  /** 予定人数 */
  plannedPeopleCount: z.number().int().nonnegative().optional(),
  /** 予想災害 */
  predictedDisasters: z.array(z.string()).default([]),
  /** リスク評価（5x5マトリクス想定） */
  riskAssessment: z
    .object({
      severity: z.number().int().min(1).max(5),
      likelihood: z.number().int().min(1).max(5),
      summary: z.string().optional(),
    })
    .optional(),
  /** 安全指示事項 */
  safetyInstructions: z.string().optional(),
  /** 巡視記録 */
  patrolRecord: z.string().optional(),
  /** 翌日予定 */
  nextDayPlan: z.string().optional(),
});
export type OptionalFields = z.infer<typeof optionalFieldsSchema>;

/** 安全衛生日誌エントリ（必須＋任意） */
export const safetyDiaryEntrySchema = z.object({
  id: z.string().uuid(),
  industry: industryPresetSchema.default("construction"),
  required: requiredFieldsSchema,
  optional: optionalFieldsSchema.default(() => optionalFieldsSchema.parse({})),
  /** 関連する気象警報（/signage から取り込み） */
  weatherAlerts: z.array(z.string()).default([]),
  /** 類似事故事例ID（/accidents から取り込み） */
  similarAccidentIds: z.array(z.string()).default([]),
  /** 関連法改正ID（/laws から取り込み） */
  relatedLawRevisionIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SafetyDiaryEntry = z.infer<typeof safetyDiaryEntrySchema>;
