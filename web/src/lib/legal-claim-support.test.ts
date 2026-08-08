import type { LawArticle } from "@/data/laws";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import {
  buildServiceFirstLegalAnswer,
  citedLegalAnswerArticles,
  expandVerifiedLegalEvidenceArticles,
} from "@/lib/legal-extractive-answer";
import { validateServiceFirstLegalClaimSupport } from "@/lib/legal-claim-support";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-08-02T00:00:00+09:00");

function article(lawShort: string, articleNum: string): LawArticle {
  const found = verifiedLawArticles.find(
    (candidate) =>
      candidate.lawShort === lawShort && candidate.articleNum === articleNum,
  );
  if (!found) throw new Error(`${lawShort}${articleNum} is missing`);
  return found;
}

describe("サービス先行の定型回答に対する主張単位の引用支持", () => {
  it.each([
    "電気作業の資格は？",
    "電気作業で作業主任者の選任が必要か",
    "フォークリフトの資格は？",
    "足場の手すり高さは？",
    "玉掛けは何トンから？",
    "高所作業車は特別教育いる？",
    "高所作業車の作業床における安全帯使用等の条文は？",
    "酸欠作業の監視人は必要？",
    "有機溶剤を屋内で使う",
    "手すりは？",
  ])("必須通常ケースをruntime同順の取得・展開・引用絞込み後にも強検証する: %s", (query) => {
    const now = new Date("2026-08-03T12:00:00+09:00");
    const searched = searchRelevantArticlesWithScore(query, 10).articles;
    const expanded = expandVerifiedLegalEvidenceArticles(query, searched);
    const initialAnswer = buildServiceFirstLegalAnswer({
      query,
      articles: expanded,
      now,
    });
    const cited = citedLegalAnswerArticles(initialAnswer, expanded);
    const answer = buildServiceFirstLegalAnswer({ query, articles: cited, now });
    const result = validateServiceFirstLegalClaimSupport({
      answer,
      query,
      articles: cited,
      now,
    });

    expect(cited.length).toBeGreaterThan(0);
    expect(result.markersValid).toBe(true);
    expect(result.supported, `${answer}\n${result.failures.join(", ")}`).toBe(
      true,
    );
  });

  it.each([
    {
      query: "電気作業の資格は？",
      articles: [
        article("電気工事士法", "第2条"),
        article("電気工事士法", "第3条"),
        article("安衛法", "第59条"),
        article("安衛則", "第36条"),
      ],
    },
    {
      query: "電気作業で作業主任者の選任が必要か",
      articles: [
        article("安衛法", "第14条"),
        article("安衛令", "第6条"),
        article("安衛則", "第339条"),
        article("安衛則", "第341条"),
        article("安衛則", "第342条"),
        article("安衛則", "第344条"),
        article("安衛則", "第345条"),
        article("安衛則", "第350条"),
        article("安衛則", "第36条"),
      ],
    },
    {
      query: "酸欠則第12条第1項第1号から第5号の科目は？",
      articles: [article("酸欠則", "第12条")],
    },
    {
      query: "第2種有機溶剤を屋内で使う時は？",
      articles: [article("有機則", "第5条")],
    },
    {
      query: "酸欠作業の監視人は必要？",
      articles: [article("酸欠則", "第13条")],
    },
    {
      query: "フルハーネスはいつ必要？",
      articles: [
        article("安衛則", "第518条"),
        article("安衛則", "第519条"),
        article("安衛則", "第520条"),
      ],
    },
    {
      query: "高所作業車の作業床における安全帯使用等の条文は？",
      articles: [article("安衛則", "第194条の22")],
    },
  ])("$query の各主張を引用条文が直接支持する", ({ query, articles }) => {
    const answer = buildServiceFirstLegalAnswer({ query, articles, now: NOW });
    const result = validateServiceFirstLegalClaimSupport({
      answer,
      query,
      articles,
      now: NOW,
    });

    expect(result.markersValid).toBe(true);
    expect(result.supported, result.failures.join(", ")).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it.each(["?", ".", ";", "！", "？", "；"])(
    "句読点を変えても危険な逆主張を後段引用で隠せない: %s",
    (boundary) => {
      const query = "フォークリフトの資格は？";
      const articles = [
        article("安衛法", "第59条"),
        article("安衛則", "第36条"),
        article("安衛法", "第61条"),
        article("安衛令", "第20条"),
      ];
      const answer = buildServiceFirstLegalAnswer({ query, articles, now: NOW });
      const tampered = answer.replace(
        "結論\n",
        `結論\nフォークリフトは無資格で運転できます${boundary} `,
      );

      const result = validateServiceFirstLegalClaimSupport({
        answer: tampered,
        query,
        articles,
        now: NOW,
      });
      expect(result.supported).toBe(false);
      expect(result.failures).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /結論:(?:dangerous-contradiction|unregistered-claim)/,
          ),
        ]),
      );
    },
  );

  it.each([
    {
      query: "フォークリフトの資格は？",
      articles: [
        article("安衛法", "第59条"),
        article("安衛則", "第36条"),
        article("安衛法", "第61条"),
        article("安衛令", "第20条"),
      ],
      falsePremise: "資格区分は車体重量で決まります",
    },
    {
      query: "玉掛けは何トンから？",
      articles: [
        article("安衛令", "第10条"),
        article("安衛令", "第20条"),
        article("クレーン則", "第221条"),
        article("クレーン則", "第222条"),
      ],
      falsePremise: "玉掛けの区分は実際の荷の重さで決まります",
    },
    {
      query: "雇い入れ時教育は必要？",
      articles: [article("安衛法", "第59条"), article("安衛則", "第35条")],
      falsePremise: "雇い入れ時教育は正社員だけが対象です",
    },
  ])(
    "$query のcanonical句へ同一文の前置き・後置き主張を混ぜても引用を借用できない",
    ({ query, articles, falsePremise }) => {
      const answer = buildServiceFirstLegalAnswer({ query, articles, now: NOW });
      for (const separator of ["が、", "、また、", "：", " / ", " "]) {
        const premise = falsePremise.replace(/です$/u, "");
        const prefixed = answer.replace(
          "結論\n",
          `結論\n${premise}${separator}`,
        );
        const prefixResult = validateServiceFirstLegalClaimSupport({
          answer: prefixed,
          query,
          articles,
          now: NOW,
        });
        expect(prefixResult.supported, `${separator}: ${prefixed}`).toBe(false);
        expect(prefixResult.failures).toContain(
          "answer:non-canonical-claim-sequence",
        );
      }

      const suffixed = answer.replace(
        /(結論\n[^\n]*?)(［\d+］)/u,
        `$1 ${falsePremise}$2`,
      );
      expect(suffixed).not.toBe(answer);
      const suffixResult = validateServiceFirstLegalClaimSupport({
        answer: suffixed,
        query,
        articles,
        now: NOW,
      });
      expect(suffixResult.supported).toBe(false);
      expect(suffixResult.failures).toContain(
        "answer:non-canonical-claim-sequence",
      );
    },
  );

  it("追加holdoutの法的主張を改変した場合はsemantic supportを拒否する", () => {
    const query = "酸欠則第12条第1項第1号から第5号の科目は？";
    const articles = [article("酸欠則", "第12条")];
    const answer = buildServiceFirstLegalAnswer({ query, articles, now: NOW });
    const tampered = answer.replace("空気呼吸器等の使用方法", "防毒マスクの選定方法");
    expect(tampered).not.toBe(answer);
    const result = validateServiceFirstLegalClaimSupport({
      answer: tampered,
      query,
      articles,
      now: NOW,
    });

    expect(result.supported).toBe(false);
    expect(result.failures).toContain("結論:reviewed-template-evidence");
  });

  it.each([
    {
      query: "フォークリフトの資格は？",
      articles: [
        article("安衛法", "第59条"),
        article("安衛則", "第36条"),
        article("安衛法", "第61条"),
        article("安衛令", "第20条"),
      ],
      injected: "フォークリフトは無資格で運転できます。",
    },
    {
      query: "玉掛けは何トンから？",
      articles: [
        article("安衛令", "第10条"),
        article("安衛令", "第20条"),
        article("クレーン則", "第221条"),
        article("クレーン則", "第222条"),
      ],
      injected: "玉掛けは無資格で行えます。",
    },
    {
      query: "雇い入れ時教育は必要？",
      articles: [article("安衛法", "第59条"), article("安衛則", "第35条")],
      injected: "雇い入れ時の教育は不要です。",
    },
  ])("後段の正しい引用で危険な逆主張を隠せない: $query", ({
    query,
    articles,
    injected,
  }) => {
    const answer = buildServiceFirstLegalAnswer({ query, articles, now: NOW });
    const tampered = answer.replace("結論\n", `結論\n${injected} `);
    expect(tampered).not.toBe(answer);

    const result = validateServiceFirstLegalClaimSupport({
      answer: tampered,
      query,
      articles,
      now: NOW,
    });
    expect(result.supported).toBe(false);
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /結論:(?:dangerous-contradiction|unregistered-claim)/,
        ),
      ]),
    );
  });

  it("適用時点は施行日を持つ条文へ直接対応し、別出典への付け替えを拒否する", () => {
    const query = "フルハーネス型墜落制止用器具の特別教育はいつ必要？";
    const articles = [article("安衛法", "第59条"), article("安衛則", "第36条")];
    const answer = buildServiceFirstLegalAnswer({ query, articles, now: NOW });

    expect(answer).toMatch(
      /適用時点\n・現在施行中（平成31年2月1日施行[^\n]*）［2］/,
    );
    expect(
      validateServiceFirstLegalClaimSupport({ answer, query, articles, now: NOW })
        .supported,
    ).toBe(true);

    const wrongMarker = answer.replace(
      /(適用時点\n・現在施行中（平成31年2月1日施行[^\n]*）)［2］/,
      "$1［1］",
    );
    const rejected = validateServiceFirstLegalClaimSupport({
      answer: wrongMarker,
      query,
      articles,
      now: NOW,
    });
    expect(rejected.supported).toBe(false);
    expect(rejected.failures).toContain("適用時点:evidence-marker");
  });

  it("将来の対象日版が未収録なら現行基準を結論にせず保留する", () => {
    const query = "2027年4月1日時点の足場の手すり基準は？";
    const articles = [article("安衛則", "第563条")];
    const answer = buildServiceFirstLegalAnswer({ query, articles, now: NOW });

    expect(answer).toContain("回答を保留します");
    expect(answer).toContain("確認不能（2027-04-01・対象日版未収録）");
    expect(answer).not.toContain("85cm以上");
    expect(
      validateServiceFirstLegalClaimSupport({ answer, query, articles, now: NOW })
      .supported,
    ).toBe(true);
  });

  it.each([
    {
      query: "酸欠場所は先に換気する？",
      articles: [article("酸欠則", "第5条")],
    },
    {
      query: "熱中症の報告体制は義務？",
      articles: [article("安衛則", "第612条の2")],
    },
    {
      query: "開口部の養生は？",
      articles: [article("安衛則", "第519条")],
    },
    {
      query:
        "墜落制止用器具使用 墜落制止用器具 7メートル 特別教育 フルハーネス 教育 作業床を設けにくい高さ7メートルの作業です",
      articles: [article("安衛則", "第36条"), article("安衛法", "第59条")],
    },
    {
      query: "足場の作業床の幅についてです",
      articles: [article("安衛則", "第563条")],
    },
  ])(
    "$query の結論・条件を引用本文の必須語へ狭く対応付ける",
    ({ query, articles }) => {
      const answer = buildServiceFirstLegalAnswer({ query, articles, now: NOW });
      const result = validateServiceFirstLegalClaimSupport({
        answer,
        query,
        articles,
        now: NOW,
      });

      expect(result.supported, `${answer}\n${result.failures.join(", ")}`).toBe(
        true,
      );
    },
  );

  it.each([
    ["有機溶剤健診は何条？", "有機則", "第29条"],
    ["石綿事前調査の根拠は？", "石綿則", "第3条"],
    ["SDS交付の根拠条文は？", "安衛法", "第57条の2"],
    ["化学ぶっしつRAの根拠は？", "安衛法", "第57条の3"],
    ["化学物質かんり者の条文は？", "安衛則", "第12条の5"],
    ["労災の死傷病報告は何条？", "安衛則", "第97条"],
    ["ストレスチェックの根拠は？", "安衛法", "第66条の10"],
    ["さぎょう環境そく定の根拠は？", "安衛法", "第65条"],
    ["雇い入れ時きょういくは何条？", "安衛法", "第59条"],
  ])(
    "根拠条文一覧をmarker先の記事locatorと一対一で検証する: %s",
    (query, lawShort, articleNum) => {
      const articles = [article(lawShort, articleNum)];
      const answer = buildServiceFirstLegalAnswer({ query, articles, now: NOW });
      const result = validateServiceFirstLegalClaimSupport({
        answer,
        query,
        articles,
        now: NOW,
      });

      expect(answer).toContain("取得した主な根拠条文は");
      expect(result.supported, `${answer}\n${result.failures.join(", ")}`).toBe(
        true,
      );
    },
  );

  it("根拠条文一覧の表示locatorとmarker先の記事が違えば拒否する", () => {
    const query = "作業環境測定の根拠は？";
    const articles = [article("安衛法", "第65条")];
    const answer = buildServiceFirstLegalAnswer({ query, articles, now: NOW });
    const tampered = answer.replace("安衛法65条［1］", "安衛法66条［1］");
    const result = validateServiceFirstLegalClaimSupport({
      answer: tampered,
      query,
      articles,
      now: NOW,
    });

    expect(result.supported).toBe(false);
    expect(result.failures).toContain("結論:reviewed-template-evidence");
  });
});
