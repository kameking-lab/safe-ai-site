import { describe, expect, it } from "vitest";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import {
  RAG_100_QUESTIONS,
  type RagTestCase,
} from "@/lib/rag-100q.fixture";

type Disposition = NonNullable<RagTestCase["disposition"]>;

type ExpectedGold = {
  gold: string[];
  requiredAll?: true;
};

const goldKey = (lawShort: string, articleNum: string) =>
  `${lawShort}|${articleNum}`;

const EXPECTED_DISPOSITIONS = {
  6: "clarification-required",
  10: "wrong-premise",
  15: "clarification-required",
  16: "clarification-required",
  25: "clarification-required",
  30: "source-gap",
  31: "clarification-required",
  42: "clarification-required",
  51: "clarification-required",
  65: "clarification-required",
  69: "clarification-required",
  70: "source-gap",
  71: "source-gap",
  72: "source-gap",
  80: "clarification-required",
  83: "clarification-required",
  93: "source-gap",
  96: "source-gap",
  97: "source-gap",
  98: "source-gap",
  104: "wrong-premise",
  115: "clarification-required",
} satisfies Record<number, Disposition>;

/**
 * 2026-07-24 の人手監査で変更した、条文検索として採点する42問。
 * 配列順ではなく法令略称と条番号の集合を固定する。
 */
const AUDITED_GOLD = {
  5: {
    gold: ["安衛法|第10条", "安衛令|第2条"],
    requiredAll: true,
  },
  12: {
    gold: ["安衛法|第60条", "安衛令|第19条"],
    requiredAll: true,
  },
  14: { gold: ["安衛則|第36条"] },
  17: { gold: ["安衛則|第12条の5"] },
  21: { gold: ["安衛則|第43条"] },
  22: { gold: ["安衛則|第44条"] },
  27: { gold: ["有機則|第29条"] },
  28: { gold: ["特化則|第39条"] },
  29: { gold: ["石綿則|第40条"] },
  33: { gold: ["安衛則|第539条の2"] },
  36: { gold: ["安衛則|第563条", "安衛則|第574条"] },
  37: { gold: ["安衛則|第567条"] },
  38: { gold: ["安衛則|第574条"] },
  40: { gold: ["安衛則|第536条"] },
  41: {
    gold: ["クレーン則|第34条", "クレーン則|第35条"],
    requiredAll: true,
  },
  43: {
    gold: ["クレーン則|第221条", "クレーン則|第222条"],
    requiredAll: true,
  },
  44: { gold: ["クレーン則|第69条"] },
  48: { gold: ["クレーン則|第10条"] },
  49: { gold: ["有機則|第19条の2"] },
  55: { gold: ["石綿則|第4条"] },
  56: { gold: ["粉じん則|第4条"] },
  59: { gold: ["酸欠則|第2条"] },
  60: { gold: ["酸欠則|第5条"] },
  63: { gold: ["安衛法|第57条"] },
  68: {
    gold: [
      "安衛則|第600条",
      "安衛則|第601条",
      "安衛則|第605条",
      "安衛則|第606条",
    ],
    requiredAll: true,
  },
  73: { gold: ["安衛法|第65条"] },
  74: {
    gold: [
      "特化則|第36条の2",
      "有機則|第28条の2",
      "石綿則|第37条",
      "粉じん則|第26条の2",
      "鉛則|第52条の2",
    ],
  },
  75: { gold: ["作環測法|第7条"] },
  76: { gold: ["粉じん則|第26条"] },
  78: { gold: ["特化則|第36条"] },
  81: {
    gold: ["安衛法|第88条", "安衛則|第89条", "安衛則|第90条"],
    requiredAll: true,
  },
  82: { gold: ["安衛法|第89条", "安衛法|第89条の2"] },
  89: { gold: ["労基法|第61条"] },
  91: { gold: ["育介法|第5条"] },
  94: { gold: ["労災保険法|第12条の8"] },
  95: { gold: ["労災保険法|第7条"] },
  100: { gold: ["均等法|第9条"] },
  103: { gold: ["安衛則|第563条"] },
  106: { gold: ["安衛令|第20条"] },
  109: { gold: ["クレーン則|第221条"] },
  110: { gold: ["クレーン則|第68条"] },
  112: {
    gold: ["安衛法|第61条", "安衛令|第20条", "安衛則|第41条"],
    requiredAll: true,
  },
} satisfies Record<number, ExpectedGold>;

const PREEXISTING_DISPOSITION_IDS = new Set([30, 70]);

describe("RAG 100問 fixture integrity", () => {
  it("keeps 124 contiguous unique IDs and separates retrieval from safe holds", () => {
    expect(RAG_100_QUESTIONS).toHaveLength(124);
    expect(RAG_100_QUESTIONS.map(({ id }) => id)).toEqual(
      Array.from({ length: 124 }, (_, index) => index + 1),
    );

    for (const testCase of RAG_100_QUESTIONS) {
      if (testCase.disposition) {
        expect(testCase.gold, `Q${testCase.id} safe hold`).toEqual([]);
        expect(
          testCase.requiredAll,
          `Q${testCase.id} safe hold requiredAll`,
        ).toBeUndefined();
        continue;
      }

      expect(testCase.gold.length, `Q${testCase.id} retrieval gold`).toBeGreaterThan(
        0,
      );
      if (testCase.requiredAll) {
        expect(
          testCase.gold.length,
          `Q${testCase.id} requiredAll evidence`,
        ).toBeGreaterThan(1);
      }
    }
  });

  it("locks the complete safe-hold inventory", () => {
    const actual = Object.fromEntries(
      RAG_100_QUESTIONS.filter(({ disposition }) => disposition).map(
        ({ id, disposition }) => [id, disposition],
      ),
    );
    expect(actual).toEqual(EXPECTED_DISPOSITIONS);
  });

  it("locks all 62 high-confidence audit corrections", () => {
    const questions = new Map(
      RAG_100_QUESTIONS.map((testCase) => [testCase.id, testCase]),
    );

    for (const [rawId, expected] of Object.entries(
      AUDITED_GOLD,
    ) as Array<[string, ExpectedGold]>) {
      const id = Number(rawId);
      const testCase = questions.get(id);
      expect(testCase, `Q${id}`).toBeDefined();
      expect(testCase?.disposition, `Q${id} disposition`).toBeUndefined();
      expect(
        testCase?.gold
          .map(({ lawShort, articleNum }) => goldKey(lawShort, articleNum))
          .sort(),
        `Q${id} gold`,
      ).toEqual([...expected.gold].sort());
      expect(Boolean(testCase?.requiredAll), `Q${id} requiredAll`).toBe(
        Boolean(expected.requiredAll),
      );
    }

    const newlyHeld = Object.keys(EXPECTED_DISPOSITIONS)
      .map(Number)
      .filter((id) => !PREEXISTING_DISPOSITION_IDS.has(id));
    expect(Object.keys(AUDITED_GOLD).length + newlyHeld.length).toBe(62);
  });

  it("keeps every retrieval gold in the hash-verified e-Gov corpus", () => {
    const corpus = new Map(
      verifiedLawArticles.map((article) => [
        goldKey(article.lawShort, article.articleNum),
        article,
      ]),
    );

    for (const testCase of RAG_100_QUESTIONS.filter(
      ({ disposition }) => !disposition,
    )) {
      for (const gold of testCase.gold) {
        const article = corpus.get(goldKey(gold.lawShort, gold.articleNum));
        expect(
          article,
          `Q${testCase.id}: ${gold.lawShort}${gold.articleNum}`,
        ).toBeDefined();
        expect(article?.verificationStatus).toBe("snapshot-hash-verified");
        expect(article?.sourceHash).toMatch(/^[a-f0-9]{64}$/);
        expect(article?.contentHash).toMatch(/^[a-f0-9]{64}$/);
      }
    }
  });
});
