import { describe, expect, it } from "vitest";
import {
  buildFutureLegalHoldAnswer,
  classifyLegalQuestionTime,
  ensureLegalAnswerAsOf,
  hasFutureLegalPremise,
  LEGAL_ANSWER_BASIS_DATE_JST,
  legalAnswerAsOf,
  legalAnswerBasisNow,
  legalDateTextToGregorian,
  requestedGregorianDate,
  requestedLegalPeriod,
} from "./legal-answer-temporal";

const NOW = new Date("2026-07-28T03:00:00Z");

describe("法令回答の共通時点管理", () => {
  it("一次資料の監査済み上限を実行時計と独立した基準日にする", () => {
    expect(LEGAL_ANSWER_BASIS_DATE_JST).toBe("2026-08-09");
    expect(legalAnswerAsOf(legalAnswerBasisNow())).toBe("2026-08-09");
    expect(hasFutureLegalPremise("2026年8月10日時点の義務", legalAnswerBasisNow())).toBe(
      true,
    );
  });

  it("JSTの回答基準日を決定的に生成する", () => {
    expect(legalAnswerAsOf(NOW)).toBe("2026-07-28");
    expect(ensureLegalAnswerAsOf("回答本文", NOW)).toBe(
      "回答本文\n\n回答基準日: 2026-07-28 JST",
    );
  });

  it.each([
    ["令和7年6月1日施行", "2025-06-01"],
    ["平成21年6月1日施行", "2009-06-01"],
    ["昭和47年9月30日施行", "1972-09-30"],
    ["2026年8月1日施行", "2026-08-01"],
  ])("公式メタデータの日付を比較可能な日付へ変換する: %s", (value, expected) => {
    expect(legalDateTextToGregorian(value)).toBe(expected);
  });

  it("存在しない日付や日付のない説明を推測しない", () => {
    expect(legalDateTextToGregorian("令和7年2月30日施行")).toBeNull();
    expect(legalDateTextToGregorian("施行日を確認中")).toBeNull();
  });

  it.each([
    ["令和元年5月1日", "2019-05-01", "day"],
    ["平成30年6月", "2018-06-01", "month"],
    ["平成30年", "2018-01-01", "year"],
    ["昭和47年9月30日", "1972-09-30", "day"],
    ["昭和元年", "1926-12-25", "year"],
  ] as const)("和暦の日・月・年と元年を期間粒度付きで変換する: %s", (query, start, precision) => {
    expect(requestedGregorianDate(query)).toBe(start);
    expect(requestedLegalPeriod(query)?.precision).toBe(precision);
  });

  it("年・月の指定を1日へ潰さず期間の末日まで保持する", () => {
    expect(requestedLegalPeriod("2019年")).toEqual({
      start: "2019-01-01",
      end: "2019-12-31",
      precision: "year",
    });
    expect(requestedLegalPeriod("平成30年2月")).toEqual({
      start: "2018-02-01",
      end: "2018-02-28",
      precision: "month",
    });
  });

  it.each([
    "平成32年",
    "昭和65年",
    "昭和64年1月8日",
    "平成31年5月1日",
    "令和元年4月30日",
    "令和7年2月30日",
  ])(
    "存在しない和暦・日付を推測しない: %s",
    (query) => expect(requestedLegalPeriod(query)).toBeNull(),
  );

  it.each([
    "2030年4月1日の義務",
    "2030/04/01の施行内容",
    "2027年4月には安全管理者の選任義務はどうなりますか",
    "2027年の改正内容",
    "令和9年4月の施行内容",
    "来年の改正予定",
    "将来の施行予定",
    "今後公布される通達の義務",
  ])("PF-012: 将来前提を検出する: %s", (query) => {
    expect(hasFutureLegalPremise(query, NOW)).toBe(true);
  });

  it("現在以前の日付だけでは将来扱いにしない", () => {
    expect(hasFutureLegalPremise("2026年7月28日現在の条文", NOW)).toBe(false);
    expect(hasFutureLegalPremise("2026年7月の現行条文", NOW)).toBe(false);
    expect(hasFutureLegalPremise("令和7年の施行内容", NOW)).toBe(false);
    expect(hasFutureLegalPremise("2025年6月1日の施行内容", NOW)).toBe(false);
  });

  it("基準日前日に施行済みの日付を予定という語だけで将来扱いしない", () => {
    const now = new Date("2026-08-02T00:30:00+09:00");
    const query = "2026年8月1日施行予定の規定はもう施行されていますか？";

    expect(hasFutureLegalPremise(query, now)).toBe(false);
    expect(classifyLegalQuestionTime(query, now)).toEqual({
      status: "past",
      asOf: "2026-08-02",
      requestedDate: "2026-08-01",
    });
  });

  it("JST境界で当日は現在、翌日は将来として区別する", () => {
    const now = new Date("2026-08-02T00:30:00+09:00");
    expect(classifyLegalQuestionTime("2026年8月2日の規定", now).status).toBe(
      "current",
    );
    expect(classifyLegalQuestionTime("2026年8月3日の規定", now).status).toBe(
      "future",
    );
  });

  it("既存の基準日を現在のJST日付へ更新し、重複させない", () => {
    expect(
      ensureLegalAnswerAsOf(
        "回答\n回答基準日: 2025-01-01 JST",
        NOW,
      ).match(/回答基準日:/g),
    ).toHaveLength(1);
    expect(
      ensureLegalAnswerAsOf(
        "回答\n回答基準日: 2025-01-01 JST",
        NOW,
      ),
    ).toContain("回答基準日: 2026-07-28 JST");
  });

  it("将来回答保留は推測せず、公式確認と基準日を示す", () => {
    const answer = buildFutureLegalHoldAnswer(
      "2030年4月1日の義務",
      NOW,
    );
    expect(answer).toContain("回答を保留");
    expect(answer).toContain("推測");
    expect(answer).toContain("e-Gov");
    expect(answer).toContain("回答基準日: 2026-07-28 JST");
  });
});
