/**
 * 安全衛生日誌のlocalStorage境界。
 *
 * このschemaはブラウザbundleからZodを外すための小さな手書きvalidatorである。
 * Zod v4は実行環境判定で Function("") を試すため、厳格なproduction CSPでは
 * DevTools Issueを発生させる。外部入力をfail-closedで検証する挙動と
 * parse/safeParse APIは維持する。
 */

/** 業種プリセットID */
export const INDUSTRY_PRESETS = [
  "construction",
  "manufacturing",
  "healthcare",
  "transport",
  "it",
  "other",
] as const;
export type IndustryPreset = (typeof INDUSTRY_PRESETS)[number];

/** 天候 */
export const WEATHER_OPTIONS = [
  "晴れ",
  "曇り",
  "雨",
  "雪",
  "強風",
  "猛暑",
  "厳寒",
] as const;
export type Weather = (typeof WEATHER_OPTIONS)[number];

export type RequiredFields = {
  date: string;
  weather: Weather;
  siteName: string;
  workContent: string;
  kyResult: string;
  nearMissOccurred: boolean;
  nearMissDetail?: string;
};

export type OptionalFields = {
  contractorWorks: Array<{ name: string; work: string }>;
  requiredQualifications: string[];
  plannedPeopleCount?: number;
  predictedDisasters: string[];
  riskAssessment?: {
    severity: number;
    likelihood: number;
    summary?: string;
  };
  safetyInstructions?: string;
  patrolRecord?: string;
  nextDayPlan?: string;
};

export type SafetyDiaryEntry = {
  id: string;
  industry: IndustryPreset;
  required: RequiredFields;
  optional: OptionalFields;
  weatherAlerts: string[];
  similarAccidentIds: string[];
  relatedLawRevisionIds: string[];
  createdAt: string;
  updatedAt: string;
};

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

type Schema<T> = {
  parse(value: unknown): T;
  safeParse(value: unknown): SafeParseResult<T>;
};

function schema<T>(parse: (value: unknown) => T): Schema<T> {
  return {
    parse,
    safeParse(value) {
      try {
        return { success: true, data: parse(value) };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error("validation failed"),
        };
      }
    },
  };
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}はオブジェクトで指定してください`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string, allowEmpty = true): string {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label}を正しく入力してください`);
  }
  return value;
}

function optionalString(
  value: unknown,
  label: string,
): string | undefined {
  return value === undefined ? undefined : stringValue(value, label);
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label}は文字列配列で指定してください`);
  }
  return [...value];
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  options: T,
  label: string,
): T[number] {
  if (typeof value !== "string" || !options.includes(value)) {
    throw new Error(`${label}が選択肢にありません`);
  }
  return value as T[number];
}

export const industryPresetSchema = schema<IndustryPreset>((value) =>
  enumValue(value, INDUSTRY_PRESETS, "業種"),
);

export const weatherSchema = schema<Weather>((value) =>
  enumValue(value, WEATHER_OPTIONS, "天候"),
);

export const requiredFieldsSchema = schema<RequiredFields>((value) => {
  const input = objectValue(value, "必須項目");
  const date = stringValue(input.date, "日付");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("日付は YYYY-MM-DD 形式で入力してください");
  }
  if (typeof input.nearMissOccurred !== "boolean") {
    throw new Error("ヒヤリハット有無が不正です");
  }
  const nearMissDetail = optionalString(
    input.nearMissDetail,
    "ヒヤリハット内容",
  );
  return {
    date,
    weather: weatherSchema.parse(input.weather),
    siteName: stringValue(input.siteName, "現場名", false),
    workContent: stringValue(input.workContent, "作業内容", false),
    kyResult: stringValue(input.kyResult, "KY結果"),
    nearMissOccurred: input.nearMissOccurred,
    ...(nearMissDetail === undefined ? {} : { nearMissDetail }),
  };
});

export const optionalFieldsSchema = schema<OptionalFields>((value) => {
  const input = objectValue(value ?? {}, "任意項目");
  const contractorWorksRaw = input.contractorWorks ?? [];
  if (!Array.isArray(contractorWorksRaw)) {
    throw new Error("業者別作業は配列で指定してください");
  }
  const contractorWorks = contractorWorksRaw.map((item) => {
    const work = objectValue(item, "業者別作業");
    return {
      name: stringValue(work.name, "業者名"),
      work: stringValue(work.work, "作業内容"),
    };
  });

  const plannedPeopleCount = input.plannedPeopleCount;
  if (
    plannedPeopleCount !== undefined &&
    (!Number.isInteger(plannedPeopleCount) || Number(plannedPeopleCount) < 0)
  ) {
    throw new Error("予定人数は0以上の整数で指定してください");
  }

  let riskAssessment: OptionalFields["riskAssessment"];
  if (input.riskAssessment !== undefined) {
    const risk = objectValue(input.riskAssessment, "リスク評価");
    if (
      !Number.isInteger(risk.severity) ||
      Number(risk.severity) < 1 ||
      Number(risk.severity) > 5 ||
      !Number.isInteger(risk.likelihood) ||
      Number(risk.likelihood) < 1 ||
      Number(risk.likelihood) > 5
    ) {
      throw new Error("リスク評価は1〜5の整数で指定してください");
    }
    const summary = optionalString(risk.summary, "リスク評価要約");
    riskAssessment = {
      severity: Number(risk.severity),
      likelihood: Number(risk.likelihood),
      ...(summary === undefined ? {} : { summary }),
    };
  }

  const safetyInstructions = optionalString(
    input.safetyInstructions,
    "安全指示事項",
  );
  const patrolRecord = optionalString(input.patrolRecord, "巡視記録");
  const nextDayPlan = optionalString(input.nextDayPlan, "翌日予定");

  return {
    contractorWorks,
    requiredQualifications: stringArray(
      input.requiredQualifications ?? [],
      "必要資格",
    ),
    predictedDisasters: stringArray(
      input.predictedDisasters ?? [],
      "予想災害",
    ),
    ...(plannedPeopleCount === undefined
      ? {}
      : { plannedPeopleCount: Number(plannedPeopleCount) }),
    ...(riskAssessment === undefined ? {} : { riskAssessment }),
    ...(safetyInstructions === undefined ? {} : { safetyInstructions }),
    ...(patrolRecord === undefined ? {} : { patrolRecord }),
    ...(nextDayPlan === undefined ? {} : { nextDayPlan }),
  };
});

export const safetyDiaryEntrySchema = schema<SafetyDiaryEntry>((value) => {
  const input = objectValue(value, "安全衛生日誌");
  const id = stringValue(input.id, "ID");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new Error("IDはUUID形式で指定してください");
  }
  return {
    id,
    industry: industryPresetSchema.parse(input.industry ?? "construction"),
    required: requiredFieldsSchema.parse(input.required),
    optional: optionalFieldsSchema.parse(input.optional ?? {}),
    weatherAlerts: stringArray(input.weatherAlerts ?? [], "気象警報"),
    similarAccidentIds: stringArray(
      input.similarAccidentIds ?? [],
      "類似事故事例ID",
    ),
    relatedLawRevisionIds: stringArray(
      input.relatedLawRevisionIds ?? [],
      "関連法改正ID",
    ),
    createdAt: stringValue(input.createdAt, "作成日時"),
    updatedAt: stringValue(input.updatedAt, "更新日時"),
  };
});
