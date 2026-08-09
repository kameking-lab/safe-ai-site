/**
 * 法令チャット全経路で共通利用する時点管理。
 *
 * 将来の施行状態は、質問文だけから推測しない。検索・RAG・生成より前に
 * 保留へ分岐し、通常回答にも回答基準日を必ず付ける。
 */

/**
 * Legal answers are limited to the latest corpus date that completed primary-
 * source verification. Runtime clock time must not silently extend this legal
 * assurance window.
 */
export const LEGAL_ANSWER_BASIS_DATE_JST = "2026-08-09";
const LEGAL_ANSWER_BASIS_INSTANT = `${LEGAL_ANSWER_BASIS_DATE_JST}T00:00:00+09:00`;

export function legalAnswerBasisNow(): Date {
  return new Date(LEGAL_ANSWER_BASIS_INSTANT);
}

export function legalAnswerAsOf(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function validIsoDate(year: number, month: number, day: number): string | null {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function eraGregorianYear(era: string, value: string): number | null {
  const eraYear = value === "元" ? 1 : Number(value);
  const maximum = era === "昭和" ? 64 : era === "平成" ? 31 : Infinity;
  if (!Number.isInteger(eraYear) || eraYear < 1 || eraYear > maximum) {
    return null;
  }
  const base = era === "令和" ? 2018 : era === "平成" ? 1988 : 1925;
  return base + eraYear;
}

/** Parse a date explicitly written in official Japanese legal metadata. */
export function legalDateTextToGregorian(value: string): string | null {
  const normalized = value.normalize("NFKC");
  const gregorian = normalized.match(
    /(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
  );
  if (gregorian) {
    return validIsoDate(
      Number(gregorian[1]),
      Number(gregorian[2]),
      Number(gregorian[3]),
    );
  }

  const era = normalized.match(
    /(令和|平成|昭和)\s*(元|\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
  );
  if (!era) return null;
  return (
    eraPeriodFor(
      era[1]!,
      era[2]!,
      Number(era[3]),
      Number(era[4]),
    )?.start ?? null
  );
}

export type LegalDatePrecision = "day" | "month" | "year";

export type LegalRequestedPeriod = {
  start: string;
  end: string;
  precision: LegalDatePrecision;
};

function periodFor(
  year: number,
  month: number | undefined,
  day: number | undefined,
): LegalRequestedPeriod | null {
  const precision: LegalDatePrecision = day
    ? "day"
    : month
      ? "month"
      : "year";
  const start = validIsoDate(year, month ?? 1, day ?? 1);
  if (!start) return null;
  if (precision === "day") return { start, end: start, precision };
  if (precision === "month") {
    const finalDay = new Date(Date.UTC(year, month!, 0)).getUTCDate();
    return {
      start,
      end: validIsoDate(year, month!, finalDay)!,
      precision,
    };
  }
  return { start, end: `${year}-12-31`, precision };
}

const ERA_BOUNDS: Record<string, { start: string; end: string }> = {
  昭和: { start: "1926-12-25", end: "1989-01-07" },
  平成: { start: "1989-01-08", end: "2019-04-30" },
  令和: { start: "2019-05-01", end: "9999-12-31" },
};

function eraPeriodFor(
  era: string,
  eraYearText: string,
  month: number | undefined,
  day: number | undefined,
): LegalRequestedPeriod | null {
  const year = eraGregorianYear(era, eraYearText);
  const bounds = ERA_BOUNDS[era];
  if (year === null || !bounds) return null;
  const period = periodFor(year, month, day);
  if (!period) return null;
  const start = period.start < bounds.start ? bounds.start : period.start;
  const end = period.end > bounds.end ? bounds.end : period.end;
  return start > end ? null : { ...period, start, end };
}

export function requestedLegalPeriod(
  query: string,
): LegalRequestedPeriod | null {
  const normalized = query.normalize("NFKC");
  const canonicalPeriod = normalized.match(
    /対象期間\((年|月)\):(\d{4})-(\d{2})-(\d{2})〜(\d{4})-(\d{2})-(\d{2})/,
  );
  if (canonicalPeriod) {
    const start = validIsoDate(
      Number(canonicalPeriod[2]),
      Number(canonicalPeriod[3]),
      Number(canonicalPeriod[4]),
    );
    const end = validIsoDate(
      Number(canonicalPeriod[5]),
      Number(canonicalPeriod[6]),
      Number(canonicalPeriod[7]),
    );
    if (!start || !end || start > end) return null;
    return {
      start,
      end,
      precision: canonicalPeriod[1] === "年" ? "year" : "month",
    };
  }
  const fullDate = normalized.match(
    /(20\d{2})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})\s*日?/,
  );
  if (fullDate) {
    return periodFor(
      Number(fullDate[1]),
      Number(fullDate[2]),
      Number(fullDate[3]),
    );
  }

  const gregorianMonth = normalized.match(
    /(20\d{2})\s*[年/.-]\s*(\d{1,2})\s*月?/,
  );
  if (gregorianMonth) {
    return periodFor(
      Number(gregorianMonth[1]),
      Number(gregorianMonth[2]),
      undefined,
    );
  }

  const gregorianYear = normalized.match(/(20\d{2})\s*年/);
  if (gregorianYear) {
    return periodFor(Number(gregorianYear[1]), undefined, undefined);
  }

  const era = normalized.match(
    /(令和|平成|昭和)\s*(元|\d{1,2})\s*年(?:\s*(\d{1,2})\s*月)?(?:\s*(\d{1,2})\s*日)?/,
  );
  if (!era) return null;
  return eraPeriodFor(
    era[1]!,
    era[2]!,
    era[3] ? Number(era[3]) : undefined,
    era[4] ? Number(era[4]) : undefined,
  );
}

export function requestedGregorianDate(query: string): string | null {
  return requestedLegalPeriod(query)?.start ?? null;
}

export function hasFutureLegalPremise(
  query: string,
  now: Date = new Date(),
): boolean {
  const answerAsOf = legalAnswerAsOf(now);
  const requested = requestedLegalPeriod(query);
  // A dated phrase such as "2026年8月1日施行予定" is no longer future on
  // 2026年8月2日. Once an explicit date is present it is the source of
  // truth; generic words such as "予定" must not override the calendar.
  if (requested) return requested.start > answerAsOf;

  const normalized = query.normalize("NFKC").replace(/\s+/g, "");
  return /将来|来年|再来年|施行予定|施行前|今後(?:施行|公布|発出|改正)|改正予定|公布予定|適用予定/.test(
    normalized,
  );
}

export type LegalQuestionTemporalStatus = {
  status: "current" | "future" | "past" | "unknown";
  asOf: string;
  requestedDate?: string;
};

/**
 * Classify the time point requested by a legal question against the current
 * JST date. This describes the question's target time, not whether a
 * particular provision is in force; provision status remains source-led.
 */
export function classifyLegalQuestionTime(
  query: string,
  now: Date = new Date(),
): LegalQuestionTemporalStatus {
  const asOf = legalAnswerAsOf(now);
  const requested = requestedLegalPeriod(query);
  if (requested) {
    const requestedDate = requested.start;
    if (requested.start > asOf) {
      return { status: "future", asOf, requestedDate };
    }
    if (requested.end < asOf) {
      return { status: "past", asOf, requestedDate };
    }
    return { status: "current", asOf, requestedDate };
  }

  const normalized = query.normalize("NFKC").replace(/\s+/g, "");
  if (/将来|来年|再来年|施行予定|施行前|今後(?:施行|公布|発出|改正)|改正予定|公布予定|適用予定/.test(normalized)) {
    return { status: "future", asOf };
  }
  if (/過去|当時|改正前|施行前の|旧法|旧規定/.test(normalized)) {
    return { status: "past", asOf };
  }
  return { status: "current", asOf };
}

export function ensureLegalAnswerAsOf(
  answer: string,
  now: Date = new Date(),
): string {
  const line = `回答基準日: ${legalAnswerAsOf(now)} JST`;
  if (/回答基準日:\s*\d{4}-\d{2}-\d{2}\s+JST/.test(answer)) {
    return answer.replace(
      /回答基準日:\s*\d{4}-\d{2}-\d{2}\s+JST/g,
      line,
    );
  }
  return `${answer.trimEnd()}\n\n${line}`;
}

export function buildFutureLegalHoldAnswer(
  query: string,
  now: Date = new Date(),
): string {
  return [
    "将来時点の法令内容は、確認済みの公式改正資料と施行日を特定できないため回答を保留します。",
    "将来の義務・適用範囲・罰則を、現在の条文や質問文から推測して案内することはしません。",
    `確認対象: ${query}`,
    "e-Gov法令検索、所管省庁の公布資料・改正履歴・施行日を確認してください。",
    `回答基準日: ${legalAnswerAsOf(now)} JST`,
  ].join("\n");
}
