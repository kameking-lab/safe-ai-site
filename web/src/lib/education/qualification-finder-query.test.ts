import { describe, expect, it } from "vitest";
import {
  QUALIFICATION_FINDER_INDUSTRY_POLICY,
  QUALIFICATION_FINDER_ROLE_POLICY,
  QUALIFICATION_FINDER_TERM_POLICY,
  createEmptyQualificationFinderInitialState,
  parseQualificationFinderQuery,
  type QualificationFinderSearchParams,
} from "./qualification-finder-query";

describe("parseQualificationFinderQuery", () => {
  it.each(Object.keys(QUALIFICATION_FINDER_TERM_POLICY))(
    "reviewed q termを完全一致で引き継ぐ: %s",
    (term) => {
      const parsed = parseQualificationFinderQuery(
        new URLSearchParams({ q: term }),
      );

      expect(parsed.prefill.status).toBe("accepted");
      expect(parsed.freeText).toBe(term);
      expect(parsed.selectedCategories).toEqual([]);
      expect(parsed.prefill.inheritedItems).toEqual([
        `作業・テーマ: ${term}`,
      ]);
    },
  );

  it.each(
    Object.entries(QUALIFICATION_FINDER_INDUSTRY_POLICY).map(
      ([queryValue, policy]) =>
        [queryValue, policy.category, policy.label] as const,
    ),
  )(
    "industry=%sを明示カテゴリ%sへだけ変換する",
    (queryValue, category, label) => {
      const parsed = parseQualificationFinderQuery({
        industry: queryValue,
      });

      expect(parsed.prefill.status).toBe("accepted");
      expect(parsed.selectedCategories).toEqual([category]);
      expect(parsed.prefill.inheritedItems).toEqual([`業種: ${label}`]);
    },
  );

  it.each(
    Object.entries(QUALIFICATION_FINDER_ROLE_POLICY).map(
      ([queryValue, policy]) =>
        [queryValue, policy.conditionValue, policy.label] as const,
    ),
  )(
    "role=%sを明示した構造化条件%sへだけ変換する",
    (queryValue, conditionValue, label) => {
      const parsed = parseQualificationFinderQuery({ role: queryValue });

      expect(parsed.prefill.status).toBe("accepted");
      expect(parsed.conditions.role).toBe(conditionValue);
      expect(parsed.prefill.inheritedItems).toEqual([`立場: ${label}`]);
    },
  );

  it("q・industry・roleの安全な組合せをtyped stateへ変換する", () => {
    const parsed = parseQualificationFinderQuery({
      q: "フォークリフト",
      industry: "transport",
      role: "solo",
    });

    expect(parsed).toMatchObject({
      selectedCategories: ["logistics"],
      freeText: "フォークリフト",
      conditions: { role: "一人親方・個人事業主" },
      prefill: {
        status: "accepted",
        termCoverage: "candidate",
      },
    });
    expect(parsed.stateKey).toBe(
      "accepted:フォークリフト:transport:solo",
    );
  });

  it("専用ガイドがある旧URLを候補検索と混同せず案内する", () => {
    const parsed = parseQualificationFinderQuery({ q: "熱中症" });

    expect(parsed.prefill).toMatchObject({
      status: "accepted",
      termCoverage: "topicGuide",
      guideHref: "/heat-illness-prevention",
      guideLabel: "熱中症予防の実務ガイドを開く",
    });
  });

  it("queryなしは空のdirect stateにする", () => {
    expect(parseQualificationFinderQuery({})).toEqual(
      createEmptyQualificationFinderInitialState(),
    );
    expect(parseQualificationFinderQuery(null)).toEqual(
      createEmptyQualificationFinderInitialState(),
    );
  });

  it.each([
    ["未知キー", new URLSearchParams("query=フォークリフト")],
    ["未知値", new URLSearchParams("q=存在しない資格")],
    ["空値", new URLSearchParams("q=")],
    ["前後空白", new URLSearchParams("q=%20フォークリフト%20")],
    ["大文字小文字差", new URLSearchParams("q=haccp")],
    ["全角化", new URLSearchParams("industry=ｃｏｎｓｔｒｕｃｔｉｏｎ")],
    [
      "validとunknownの混在",
      new URLSearchParams("q=足場&unknown=campaign"),
    ],
    [
      "prototype風キー",
      new URLSearchParams("__proto__=polluted&q=足場"),
    ],
    [
      "constructorキー",
      new URLSearchParams("constructor=x&q=足場"),
    ],
    ["prototype由来q値", new URLSearchParams("q=toString")],
    [
      "prototype由来industry値",
      new URLSearchParams("industry=constructor"),
    ],
    ["prototype由来role値", new URLSearchParams("role=__proto__")],
  ])("%sをfail-closedで全拒否する", (_label, query) => {
    const parsed = parseQualificationFinderQuery(query);

    expect(parsed.prefill.status).toBe("rejected");
    expect(parsed.selectedCategories).toEqual([]);
    expect(parsed.freeText).toBe("");
    expect(parsed.conditions.role).toBe("");
  });

  it("reviewed UTM attribution is ignored without discarding safe prefill", () => {
    const parsed = parseQualificationFinderQuery(
      new URLSearchParams(
        "q=足場&utm_source=campaign&utm_medium=cta&utm_campaign=summer",
      ),
    );

    expect(parsed.prefill.status).toBe("accepted");
    expect(parsed.freeText).toBe("足場");
    expect(JSON.stringify(parsed)).not.toContain("campaign");
  });

  it.each([
    new URLSearchParams("q=足場&q=石綿"),
    new URLSearchParams("industry=construction&industry=manufacturing"),
    new URLSearchParams("role=solo&role=safety-manager"),
  ])("URLSearchParamsの重複値を拒否する", (query) => {
    expect(parseQualificationFinderQuery(query).prefill.status).toBe(
      "rejected",
    );
  });

  it("Next.js searchParamsのstring[]を単一要素でも拒否する", () => {
    const duplicated: QualificationFinderSearchParams = {
      q: ["足場", "石綿"],
    };
    const ambiguousSingleArray: QualificationFinderSearchParams = {
      industry: ["construction"],
    };

    expect(parseQualificationFinderQuery(duplicated).prefill.status).toBe(
      "rejected",
    );
    expect(
      parseQualificationFinderQuery(ambiguousSingleArray).prefill.status,
    ).toBe("rejected");
  });

  it.each([
    new URLSearchParams({ q: "あ".repeat(33) }),
    new URLSearchParams("q=%00HACCP"),
    new URLSearchParams("q=HACCP%0A"),
    new URLSearchParams("industry=construction%7F"),
    new URLSearchParams("role=solo%C2%85"),
  ])("過長値と制御文字を拒否しraw値をstateへ残さない", (query) => {
    const parsed = parseQualificationFinderQuery(query);

    expect(parsed.prefill.status).toBe("rejected");
    expect(JSON.stringify(parsed)).not.toContain(query.toString());
  });

  it("許可数を超えるquery keyを値の評価前に拒否する", () => {
    const parsed = parseQualificationFinderQuery(
      new URLSearchParams(
        "q=足場&industry=construction&role=solo&extra=value",
      ),
    );

    expect(parsed.prefill.status).toBe("rejected");
  });

  it("入力URLSearchParamsとrecordを変更しない純関数である", () => {
    const params = new URLSearchParams({
      q: "玉掛け",
      industry: "construction",
    });
    const record = {
      q: "玉掛け",
      industry: "construction",
    } satisfies QualificationFinderSearchParams;
    const paramsBefore = params.toString();
    const recordBefore = JSON.stringify(record);

    parseQualificationFinderQuery(params);
    parseQualificationFinderQuery(record);

    expect(params.toString()).toBe(paramsBefore);
    expect(JSON.stringify(record)).toBe(recordBefore);
  });
});
