import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import { isLawShortEquivalent } from "@/lib/rag/synonyms";

type GoldCitation = {
  lawShort: string;
  articleNum: string;
};

type SafeDisposition =
  | "clarification-required"
  | "wrong-premise"
  | "source-gap";

type FreshQuestion = {
  id: number;
  topic: string;
  question: string;
  gold: GoldCitation[];
  requiredAll?: true;
  disposition?: SafeDisposition;
};

type FreshFixture = {
  total: number;
  questions: FreshQuestion[];
};

const fixture = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "test/chatbot-fresh-100.json"),
    "utf8",
  ),
) as FreshFixture;

const citationKey = ({ lawShort, articleNum }: GoldCitation) =>
  `${lawShort}|${articleNum}`;

const EXPECTED_SAFE_HOLDS = {
  6: "clarification-required",
  13: "clarification-required",
  15: "clarification-required",
  18: "clarification-required",
  25: "clarification-required",
  30: "source-gap",
  32: "clarification-required",
  35: "wrong-premise",
  44: "clarification-required",
  45: "wrong-premise",
  46: "wrong-premise",
  47: "source-gap",
  48: "clarification-required",
  51: "wrong-premise",
  62: "source-gap",
  64: "wrong-premise",
  74: "wrong-premise",
  78: "clarification-required",
  82: "clarification-required",
  83: "source-gap",
  84: "source-gap",
  85: "wrong-premise",
  86: "source-gap",
  87: "source-gap",
} satisfies Record<number, SafeDisposition>;

/**
 * 人手条文監査で「一部だけ取得しても回答を支持しない」と確認した組合せ。
 * fixtureから生成せず別定義で固定し、gold.some()への回帰を検出する。
 */
const REQUIRED_ALL = {
  1: ["安衛法|第1条", "安衛法|第3条"],
  5: ["安衛法|第10条", "安衛令|第2条"],
  7: ["安衛法|第12条", "安衛令|第4条"],
  9: ["安衛法|第14条", "安衛令|第6条"],
  10: ["安衛法|第17条", "安衛法|第18条", "安衛法|第19条"],
  12: ["安衛法|第60条", "安衛令|第19条"],
  21: ["安衛法|第66条", "安衛則|第43条"],
  22: ["安衛法|第66条", "安衛則|第44条"],
  24: ["安衛法|第66条の8", "安衛則|第52条の2"],
  31: ["安衛則|第518条", "安衛則|第520条"],
  40: ["安衛令|第6条", "安衛則|第565条"],
  52: ["クレーン則|第34条", "クレーン則|第35条"],
  75: ["安衛令|第12条", "クレーン則|第5条"],
  79: ["酸欠則|第5条", "酸欠則|第5条の2"],
  95: ["安衛法|第15条", "安衛令|第7条"],
  96: ["安衛法|第15条の3", "安衛則|第18条の6"],
  97: ["安衛令|第20条", "安衛法|第61条"],
} satisfies Record<number, string[]>;

const HIGH_CONFIDENCE_CORRECTIONS = {
  14: ["安衛則|第36条"],
  17: ["安衛則|第12条の5"],
  19: ["ボイラー則|第24条"],
  27: ["有機則|第29条"],
  28: ["特化則|第39条"],
  29: ["石綿則|第40条"],
  36: ["安衛則|第563条"],
  39: ["安衛則|第567条"],
  60: ["安衛則|第352条"],
} satisfies Record<number, string[]>;

describe("fresh 100問fixtureの独立整合性", () => {
  it("100件を連番で保持し、検索評価と安全保留を混ぜない", () => {
    expect(fixture.total).toBe(100);
    expect(fixture.questions).toHaveLength(100);
    expect(fixture.questions.map(({ id }) => id)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    );

    for (const testCase of fixture.questions) {
      if (testCase.disposition) {
        expect(testCase.gold, `Q${testCase.id} safe hold`).toEqual([]);
        expect(testCase.requiredAll).toBeUndefined();
      } else {
        expect(
          testCase.gold.length,
          `Q${testCase.id} retrieval evidence`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("人手監査した安全保留の種類と全件を固定する", () => {
    const actual = Object.fromEntries(
      fixture.questions
        .filter(({ disposition }) => disposition)
        .map(({ id, disposition }) => [id, disposition]),
    );
    expect(actual).toEqual(EXPECTED_SAFE_HOLDS);
  });

  it("複数の必須根拠をanyOfへ弱体化しない", () => {
    const questions = new Map(
      fixture.questions.map((testCase) => [testCase.id, testCase]),
    );
    const actualRequiredIds = fixture.questions
      .filter(({ requiredAll }) => requiredAll)
      .map(({ id }) => id)
      .sort((a, b) => a - b);

    expect(actualRequiredIds).toEqual(
      Object.keys(REQUIRED_ALL).map(Number).sort((a, b) => a - b),
    );
    for (const [rawId, expected] of Object.entries(REQUIRED_ALL)) {
      const testCase = questions.get(Number(rawId));
      expect(testCase?.requiredAll, `Q${rawId}`).toBe(true);
      expect(testCase?.gold.map(citationKey).sort()).toEqual(
        [...expected].sort(),
      );
    }
  });

  it("明白な誤条文を旧goldへ戻さない", () => {
    const questions = new Map(
      fixture.questions.map((testCase) => [testCase.id, testCase]),
    );
    for (const [rawId, expected] of Object.entries(
      HIGH_CONFIDENCE_CORRECTIONS,
    )) {
      expect(
        questions.get(Number(rawId))?.gold.map(citationKey).sort(),
        `Q${rawId}`,
      ).toEqual([...expected].sort());
    }

    expect(questions.get(60)?.question).toContain("第352条の表に掲げる");
  });

  it("検索評価する全goldをhash確認済みe-Gov本文へ突合する", () => {
    for (const testCase of fixture.questions.filter(
      ({ disposition }) => !disposition,
    )) {
      for (const gold of testCase.gold) {
        const article = verifiedLawArticles.find(
          (candidate) =>
            candidate.articleNum === gold.articleNum &&
            (candidate.lawShort === gold.lawShort ||
              isLawShortEquivalent(candidate.lawShort, gold.lawShort)),
        );
        expect(article, `Q${testCase.id}: ${citationKey(gold)}`).toBeDefined();
        expect(article?.verificationStatus).toBe("snapshot-hash-verified");
        expect(article?.sourceHash).toMatch(/^[a-f0-9]{64}$/);
        expect(article?.contentHash).toMatch(/^[a-f0-9]{64}$/);
      }
    }
  });
});
