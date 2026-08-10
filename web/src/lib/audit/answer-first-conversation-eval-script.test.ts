import { describe, expect, it } from "vitest";

import {
  diagnoseCitationSupport,
  inspectCitationSupport,
  inspectNormal,
  inspectSafetyBoundary,
  reviewedCitationSnapshotSha256,
  summarize,
  validateReviewedCitationSnapshotConfig,
} from "../../../scripts/answer-first-conversation-eval.mjs";

const supportedCase = {
  answer: /特別教育/u,
  clarification: [0],
  supported: true,
};

const EXPECTED_LEGACY_EMERGENCY =
  "緊急対応を優先し、このチャットの回答を待たないでください。まず周囲の危険を確認し、自分や救助者が危険区域へ入らないでください。周囲へ助けを求め、直ちに119番へ通報して救急隊・通信指令員の指示を最優先にしてください。肩をやさしくたたきながら呼びかけて反応を確認し、反応がなければ呼吸を10秒以内で確認してください。普段どおりの呼吸がない、または判断できない場合はAEDを手配し、直ちに胸骨圧迫を開始してください。電源・機械の停止や退避は、二次災害なく安全にできる場合だけ行ってください。";
const EXPECTED_LEGACY_PRIVACY =
  "氏名、社員番号、連絡先、住所、病歴、診断名、健診結果などをこのチャットへ入力しないでください。必要な相談は『作業者A』『持病あり』のように、個人を特定できない最小限の情報へ置き換えてください。すでに入力した場合は、新しい相談を開始し、所属先の個人情報管理手順に従ってください。";

function legalPayload(overrides: Record<string, unknown> = {}) {
  const substantiveAnswer =
    "低圧の充電電路を修理する作業には特別教育が必要です。［1］";
  return {
    substantiveAnswer,
    answer: substantiveAnswer,
    conditions: [],
    clarificationQuestion: null,
    quickReplies: [],
    sources: [
      {
        law: "労働安全衛生規則",
        lawShort: "安衛則",
        article: "第36条「特別教育を必要とする業務」",
        snippet:
          "低圧の充電電路の敷設若しくは修理の業務について、特別の教育を行う。",
      },
    ],
    citations: [
      {
        lawShort: "安衛則",
        fullName: "労働安全衛生規則",
        articleNum: "第36条",
      },
    ],
    ...overrides,
  };
}

function legacyResult(
  message: string,
  errorOverrides: Record<string, unknown> = {},
  payloadOverrides: Record<string, unknown> = {},
) {
  return {
    status: 422,
    headers: {
      "content-type": "application/json",
      "x-ai-used": "false",
    },
    payload: {
      error: {
        code: "VALIDATION",
        message,
        retryable: false,
        ...errorOverrides,
      },
      ...payloadOverrides,
    },
  };
}

describe("answer-first citation support evaluator", () => {
  it("fails closed on placeholder, missing, or extra reviewed snapshot routes", () => {
    const valid = {
      id: 1,
      citationSnapshotSha256: {
        json: "a".repeat(64),
        sse: "b".repeat(64),
        legacy: "c".repeat(64),
      },
    };
    expect(validateReviewedCitationSnapshotConfig([valid])).toBe(true);
    expect(() =>
      validateReviewedCitationSnapshotConfig([
        {
          ...valid,
          citationSnapshotSha256: {
            ...valid.citationSnapshotSha256,
            json: "__CASE_1_JSON__",
          },
        },
      ]),
    ).toThrow(/final SHA-256/u);
    expect(() =>
      validateReviewedCitationSnapshotConfig([
        {
          ...valid,
          citationSnapshotSha256: {
            json: valid.citationSnapshotSha256.json,
            legacy: valid.citationSnapshotSha256.legacy,
          },
        },
      ]),
    ).toThrow(/must cover json,legacy,sse/u);
    expect(() =>
      validateReviewedCitationSnapshotConfig([
        {
          ...valid,
          citationSnapshotSha256: {
            ...valid.citationSnapshotSha256,
            other: "d".repeat(64),
          },
        },
      ]),
    ).toThrow(/must cover json,legacy,sse/u);
  });

  it("requires claim marker, matching law/article, and lexical source support", () => {
    const support = inspectCitationSupport(legalPayload());
    const inspected = inspectNormal(supportedCase, legalPayload());

    expect(support).toEqual({
      structureAligned: true,
      claimEvidenceSupported: true,
    });
    expect(inspected.citationStructureAligned).toBe(true);
    expect(inspected.citationClaimEvidenceSupported).toBe(true);
    expect(inspected.sourceSupported).toBe(true);
  });

  it("rejects equal source/citation counts when the evidence is unrelated", () => {
    const payload = legalPayload({
      substantiveAnswer:
        "フォークリフトは技能講習を修了すれば運転できます。［1］",
      answer: "フォークリフトは技能講習を修了すれば運転できます。［1］",
      sources: [
        {
          law: "石綿障害予防規則",
          lawShort: "石綿則",
          article: "第3条「事前調査」",
          snippet: "建築物の解体前に石綿の使用の有無を事前に調査する。",
        },
      ],
      citations: [
        {
          lawShort: "石綿則",
          fullName: "石綿障害予防規則",
          articleNum: "第3条",
        },
      ],
    });

    const support = inspectCitationSupport(payload);
    const inspected = inspectNormal(supportedCase, payload);

    // The old evaluator passed this solely because both arrays had one item.
    expect(payload.sources).toHaveLength(payload.citations.length);
    expect(support.structureAligned).toBe(true);
    expect(support.claimEvidenceSupported).toBe(false);
    expect(inspected.sourceSupported).toBe(false);
  });

  it("keeps metadata alignment distinct from claim/evidence support", () => {
    const payload = legalPayload({
      citations: [
        {
          lawShort: "安衛則",
          fullName: "労働安全衛生規則",
          articleNum: "第999条",
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toEqual({
      structureAligned: false,
      claimEvidenceSupported: false,
    });
  });

  it.each([
    [
      {
        lawShort: "安衛則",
        fullName: "石綿障害予防規則",
        articleNum: "第36条",
      },
      {
        law: "労働安全衛生規則",
        lawShort: "安衛則",
        article: "第36条「特別教育を必要とする業務」",
        snippet: "低圧の充電電路の修理について、特別の教育を行う。",
      },
    ],
    [
      {
        lawShort: "安衛則",
        fullName: "労働安全衛生規則",
        articleNum: "第36条",
      },
      {
        law: "石綿障害予防規則",
        lawShort: "安衛則",
        article: "第36条「特別教育を必要とする業務」",
        snippet: "低圧の充電電路の修理について、特別の教育を行う。",
      },
    ],
  ])(
    "rejects contradictory short and full law-name metadata",
    (citation, source) => {
      const payload = legalPayload({
        citations: [citation],
        sources: [source],
      });

      expect(inspectCitationSupport(payload)).toEqual({
        structureAligned: false,
        claimEvidenceSupported: false,
      });
    },
  );

  it("uses the available exact law-name pair when one representation is absent", () => {
    const payload = legalPayload({
      citations: [{ lawShort: "安衛則", articleNum: "第36条" }],
    });

    expect(inspectCitationSupport(payload)).toEqual({
      structureAligned: true,
      claimEvidenceSupported: true,
    });
  });

  it("never lets matching law/article metadata replace excerpt support", () => {
    const payload = legalPayload({
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条「特別教育を必要とする業務」",
          snippet:
            "最大荷重一トン未満のフォークリフトの運転業務には特別教育が必要。",
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });
  });

  it.each([
    [
      "電気作業では作業主任者を選任する必要があります。［1］",
      "酸素欠乏危険作業に係る作業主任者を選任する。",
      false,
    ],
    [
      "酸素欠乏危険作業では作業主任者を選任する必要があります。［1］",
      "酸素欠乏危険作業に係る作業主任者を選任する。",
      true,
    ],
  ])(
    "requires the work category to match when a role predicate is shared",
    (claim, snippet, expected) => {
      const payload = legalPayload({
        substantiveAnswer: claim,
        answer: claim,
        sources: [
          {
            law: "労働安全衛生法施行令",
            lawShort: "安衛令",
            article: "第6条「作業主任者を選任すべき作業」",
            snippet,
          },
        ],
        citations: [
          {
            lawShort: "安衛令",
            fullName: "労働安全衛生法施行令",
            articleNum: "第6条",
          },
        ],
      });

      expect(inspectCitationSupport(payload)).toMatchObject({
        structureAligned: true,
        claimEvidenceSupported: expected,
      });
    },
  );

  it.each([
    [
      "フォークリフトの運転業務には特別教育が必要です。［1］",
      "高所作業車の運転業務には特別教育が必要である。",
      false,
    ],
    [
      "フォークリフトの運転業務には特別教育が必要です。［1］",
      "フォークリフトの運転業務には特別教育が必要である。",
      true,
    ],
    [
      "フォークリフトの運転業務には特別教育が必要です。［1］",
      "フオークリフトの運転業務には特別教育が必要である。",
      true,
    ],
  ])(
    "requires the equipment entity to match inside the same omnibus article",
    (claim, snippet, expected) => {
      const payload = legalPayload({
        substantiveAnswer: claim,
        answer: claim,
        sources: [
          {
            law: "労働安全衛生規則",
            lawShort: "安衛則",
            article: "第36条「特別教育を必要とする業務」",
            snippet,
          },
        ],
      });

      expect(inspectCitationSupport(payload)).toMatchObject({
        structureAligned: true,
        claimEvidenceSupported: expected,
      });
    },
  );

  it("keeps an article lead-in attached to its first threshold branch", () => {
    const substantiveAnswer =
      "安衛則36条5号は、最大荷重1トン未満のフォークリフト運転を掲げています。［1］";
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条「特別教育を必要とする業務」",
          snippet: "第5号 最大荷重一トン未満のフオークリフトの運転の業務",
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: true,
    });
  });

  it("does not split a provision sentence at punctuation inside parentheses", () => {
    const substantiveAnswer =
      "安衛令10条7号の高所作業車は、作業床最高高さが2m以上のものです。［1］";
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
      sources: [
        {
          law: "労働安全衛生法施行令",
          lawShort: "安衛令",
          article: "第10条「法第三十三条第一項の政令で定める機械等」",
          snippet:
            "第7号 作業床の高さ（作業床を最も高く上昇させた場合におけるその床面の高さをいう。以下同じ。）が二メートル以上の高所作業車",
        },
      ],
      citations: [
        {
          lawShort: "安衛令",
          fullName: "労働安全衛生法施行令",
          articleNum: "第10条",
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: true,
    });
  });

  it.each([
    [
      "低圧の充電電路を修理する作業に特別教育は不要です。［1］",
      "低圧の充電電路の修理について、特別の教育を行う。",
    ],
    [
      "この作業では特別教育が必要です。［1］",
      "この作業は特別教育を行わなくてもよく、適用しない。",
    ],
    [
      "この作業では特別教育は要りません。［1］",
      "この作業では特別の教育が必要であり、行う。",
    ],
    ["フォークリフトを運転できます。［1］", "フォークリフトを運転できません。"],
    ["フォークリフトを運転できません。［1］", "フォークリフトを運転できます。"],
  ])("rejects a legal-polarity inversion", (claim, snippet) => {
    const payload = legalPayload({
      substantiveAnswer: claim,
      answer: claim,
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条「特別教育を必要とする業務」",
          snippet,
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });
  });

  it("does not let an unrelated condition mask the cited conclusion", () => {
    const payload = legalPayload({
      substantiveAnswer: "フォークリフトはそのまま運転できます。［1］",
      answer: "フォークリフトはそのまま運転できます。［1］",
      conditions: ["低圧の充電電路を修理する作業には特別教育が必要です。"],
    });

    // The previous whole-response n-gram check borrowed terms from conditions.
    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });
  });

  it("does not let a supported sentence mask another sentence in a tail-cited field", () => {
    const substantiveAnswer =
      "低圧の充電電路修理には特別教育が必要です。フォークリフトは無資格で運転できます。［1］";
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });
  });

  it("rejects an uncited legal assertion before a separately cited sentence", () => {
    const substantiveAnswer =
      "フォークリフトは無資格で運転できます。低圧の充電電路修理には特別教育が必要です。［1］";
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });
    expect(diagnoseCitationSupport(payload)).toMatchObject({
      invalidCitationIndices: [],
      uncitedLegalAssertions: ["フォークリフトは無資格で運転できます。"],
      sourceChecks: [
        {
          citationIndex: 1,
          unsupportedClaims: [],
          evidencePresent: true,
        },
      ],
    });
  });

  it("does not require a citation for a non-legal signpost sentence", () => {
    const substantiveAnswer =
      "結論を先に説明します。低圧の充電電路修理には特別教育が必要です。［1］";
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: true,
    });
  });

  it("rejects an out-of-range marker even when every source has another claim", () => {
    const substantiveAnswer =
      "低圧の充電電路修理には特別教育が必要です。［1］［99］";
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
    });

    expect(inspectCitationSupport(payload)).toEqual({
      structureAligned: false,
      claimEvidenceSupported: false,
    });
  });

  it.each([
    ["最大荷重2トン以上", "最大荷重一トン以上"],
    ["最大荷重1トン未満", "最大荷重一トン以上"],
    ["最大荷重1トン以上", "最大荷重一トン"],
    ["最大荷重1トンを超えない", "最大荷重一トンを超える"],
    ["最大荷重1トン", "最大荷重一トン未満"],
  ])("rejects a numeric value or threshold reversal", (claim, evidence) => {
    const substantiveAnswer = `${claim}のフォークリフトは運転技能講習が必要です。［1］`;
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条「特別教育を必要とする業務」",
          snippet: `${evidence}のフォークリフトは運転技能講習を行う。`,
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });
  });

  it.each([
    ["最大荷重1トンを超えない", "最大荷重一トン以下"],
    ["最大荷重1トンから", "最大荷重一トン以上"],
    ["最大荷重1トン", "最大荷重一トン"],
  ])("recognizes equivalent inclusive threshold wording", (claim, evidence) => {
    const substantiveAnswer = `${claim}のフォークリフトは技能講習が必要です。［1］`;
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条「特別教育を必要とする業務」",
          snippet: `${evidence}のフォークリフトは技能講習が必要である。`,
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: true,
    });
  });

  it.each([
    [
      "手すりは35〜40センチメートルです。［1］",
      "手すりは35センチメートル以上。",
      false,
    ],
    [
      "手すりは35〜40センチメートルです。［1］",
      "手すりは35センチメートル以上40センチメートル以下。",
      true,
    ],
  ])(
    "requires evidence for every boundary in a claimed range",
    (claim, evidence, expected) => {
      const payload = legalPayload({
        substantiveAnswer: claim,
        answer: claim,
        sources: [
          {
            law: "労働安全衛生規則",
            lawShort: "安衛則",
            article: "第36条「特別教育を必要とする業務」",
            snippet: evidence,
          },
        ],
      });

      expect(inspectCitationSupport(payload)).toMatchObject({
        structureAligned: true,
        claimEvidenceSupported: expected,
      });
    },
  );

  it("rejects a numeric claim when the cited evidence has no same-unit value", () => {
    const substantiveAnswer = "手すりは85cm以上必要です。［1］";
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条「特別教育を必要とする業務」",
          snippet: "墜落防止のため手すりを設ける必要がある。",
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });
  });

  it.each([
    ["最大荷重1トンちょうど", "最大荷重一トン以上", true],
    ["最大荷重1トンちょうど", "最大荷重一トンを超える", false],
  ])(
    "supports an exact boundary only when the cited range includes it",
    (claim, evidence, expected) => {
      const substantiveAnswer = `${claim}のフォークリフトは技能講習が必要です。［1］`;
      const payload = legalPayload({
        substantiveAnswer,
        answer: substantiveAnswer,
        sources: [
          {
            law: "労働安全衛生規則",
            lawShort: "安衛則",
            article: "第36条「特別教育を必要とする業務」",
            snippet: `${evidence}のフォークリフトは技能講習を行う。`,
          },
        ],
      });

      expect(inspectCitationSupport(payload)).toMatchObject({
        structureAligned: true,
        claimEvidenceSupported: expected,
      });
    },
  );

  it("does not combine a predicate from one evidence branch with another branch's threshold", () => {
    const substantiveAnswer =
      "最大荷重1トン未満のフォークリフトも技能講習が必要です。［1］";
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条「特別教育を必要とする業務」",
          snippet:
            "最大荷重1トン以上のフォークリフトは技能講習、最大荷重1トン未満は特別教育を行う。",
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });
  });

  it("splits conjunction branches before pairing a threshold with its qualification predicate", () => {
    const substantiveAnswer =
      "最大荷重1トン以上のフォークリフトには技能講習が必要です。［1］";
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条「特別教育を必要とする業務」",
          snippet:
            "最大荷重1トン以上のフォークリフトには特別教育及び最大荷重1トン未満のフォークリフトには技能講習が必要である。",
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });
  });

  it.each([
    [
      "足場の手すりは85cm以上及び中桟は35cm以上必要です。［1］",
      "足場の手すりは35cm以上及び中桟は85cm以上とする。",
      false,
    ],
    [
      "足場の手すりは85cm以上及び中桟は35cm以上必要です。［1］",
      "足場の手すりは85cm以上及び中桟は35cm以上とする。",
      true,
    ],
  ])(
    "keeps each legal measure attached to its local regulated feature",
    (claim, snippet, expected) => {
      const payload = legalPayload({
        substantiveAnswer: claim,
        answer: claim,
        sources: [
          {
            law: "労働安全衛生規則",
            lawShort: "安衛則",
            article: "第36条「特別教育を必要とする業務」",
            snippet,
          },
        ],
      });

      expect(inspectCitationSupport(payload)).toMatchObject({
        structureAligned: true,
        claimEvidenceSupported: expected,
      });
    },
  );

  it("requires every controlled predicate in a compound claim", () => {
    const substantiveAnswer = "作業前の測定と必要な換気を行います。［1］";
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条「特別教育を必要とする業務」",
          snippet: "作業を開始する前に濃度を測定する。",
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });
  });

  it("binds separate markers in one field to their own preceding claims", () => {
    const substantiveAnswer =
      "フォークリフトは無資格で運転できます。［1］低圧の充電電路修理には特別教育が必要です。［2］";
    const lowVoltageEvidence = {
      law: "労働安全衛生規則",
      lawShort: "安衛則",
      article: "第36条「特別教育を必要とする業務」",
      snippet: "低圧の充電電路の敷設若しくは修理について、特別の教育を行う。",
    };
    const citation = {
      lawShort: "安衛則",
      fullName: "労働安全衛生規則",
      articleNum: "第36条",
    };
    const payload = legalPayload({
      substantiveAnswer,
      answer: substantiveAnswer,
      sources: [lowVoltageEvidence, lowVoltageEvidence],
      citations: [citation, citation],
    });

    // Source 2 must not lend its correct terms to unsupported claim 1.
    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });
  });

  it("requires an exact article boundary instead of a startsWith match", () => {
    const payload = legalPayload({
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条の2「別の条文」",
          snippet: "低圧の充電電路の修理について、特別の教育を行う。",
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toEqual({
      structureAligned: false,
      claimEvidenceSupported: false,
    });
  });

  it("accepts only an exact reviewed tail-cited multi-source snapshot", () => {
    const substantiveAnswer =
      "高所作業車は作業床最高高さで判定します。10m未満は特別教育、10m以上は技能講習です。［1］［2］";
    const caseDefinition = {
      answer: /特別教育.*技能講習/u,
      clarification: [0],
      supported: true,
      citationSnapshotSha256: {
        json: "",
        sse: "route-specific-sse-digest",
        legacy: "route-specific-digest",
      },
    };
    const payload = {
      directAnswer: substantiveAnswer,
      substantiveAnswer,
      answer: substantiveAnswer,
      reply: null,
      importantConditions: [] as string[],
      conditions: [] as string[],
      assumptions: [] as string[],
      clarificationQuestion: null,
      quickReplies: [] as Array<{ label: string; value: string }>,
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条",
          snippet:
            "作業床の高さが十メートル未満の高所作業車の運転には特別教育を行う。",
        },
        {
          law: "労働安全衛生法施行令",
          lawShort: "安衛令",
          article: "第20条",
          snippet:
            "作業床の高さが十メートル以上の高所作業車の運転には技能講習を修了した者を就かせる。",
        },
      ],
      citations: [
        {
          lawShort: "安衛則",
          fullName: "労働安全衛生規則",
          articleNum: "第36条",
        },
        {
          lawShort: "安衛令",
          fullName: "労働安全衛生法施行令",
          articleNum: "第20条",
        },
      ],
    };
    caseDefinition.citationSnapshotSha256.json =
      reviewedCitationSnapshotSha256(payload);

    expect(inspectCitationSupport(payload)).toMatchObject({
      structureAligned: true,
      claimEvidenceSupported: false,
    });

    expect(inspectNormal(caseDefinition, payload, "json")).toMatchObject({
      citationStructureAligned: true,
      citationClaimEvidenceSupported: true,
      citationSupportDiagnostics: {
        reviewedCitationSnapshotSupported: true,
      },
    });

    const poisons = [
      (candidate: typeof payload) => {
        candidate.substantiveAnswer = candidate.substantiveAnswer.replace(
          "10m未満は特別教育、10m以上は技能講習",
          "10m未満は技能講習、10m以上は特別教育",
        );
        candidate.directAnswer = candidate.substantiveAnswer;
        candidate.answer = candidate.substantiveAnswer;
      },
      (candidate: typeof payload) => {
        candidate.substantiveAnswer = candidate.substantiveAnswer.replace(
          "技能講習です",
          "技能講習は不要です",
        );
        candidate.directAnswer = candidate.substantiveAnswer;
        candidate.answer = candidate.substantiveAnswer;
      },
      (candidate: typeof payload) => {
        candidate.sources[1]!.snippet =
          "作業床の高さが十メートル以上の高所作業車を定義する。";
      },
      (candidate: typeof payload) => {
        Object.assign(candidate.sources[0]!, {
          articleTitle: "虚偽の条文見出し",
          lawNumber: "虚偽の法令番号",
          applicationStatus: "future",
          effectiveOn: "2099-01-01",
          asOf: "2099-01-01",
        });
      },
      (candidate: typeof payload) => {
        Object.assign(candidate.citations[0]!, {
          articleTitle: "虚偽の引用見出し",
          effectiveDate: "2099-01-01",
        });
      },
      (candidate: typeof payload) => {
        candidate.sources.reverse();
        candidate.citations.reverse();
      },
      (candidate: typeof payload) => {
        candidate.substantiveAnswer = candidate.substantiveAnswer.replace(
          "［1］［2］",
          "［2］［1］",
        );
        candidate.directAnswer = candidate.substantiveAnswer;
        candidate.answer = candidate.substantiveAnswer;
      },
      (candidate: typeof payload) => {
        candidate.substantiveAnswer = `フォークリフトは無資格で運転できます。${candidate.substantiveAnswer}`;
        candidate.directAnswer = candidate.substantiveAnswer;
        candidate.answer = candidate.substantiveAnswer;
      },
      (candidate: typeof payload) => {
        candidate.directAnswer =
          "10m未満は技能講習不要、10m以上も特別教育不要です。［1］［2］";
      },
      (candidate: typeof payload) => {
        candidate.importantConditions.push(
          "高所作業車は無資格で運転できます。［1］",
        );
      },
      (candidate: typeof payload) => {
        candidate.assumptions.push("資格は不要と仮定します。");
      },
      (candidate: typeof payload) => {
        candidate.clarificationQuestion = "無資格で運転してよいですか？";
      },
      (candidate: typeof payload) => {
        candidate.quickReplies.push({
          label: "無資格で運転",
          value: "無資格で運転できます",
        });
      },
    ];
    for (const poison of poisons) {
      const candidate = structuredClone(payload);
      poison(candidate);
      expect(inspectNormal(caseDefinition, candidate, "json")).toMatchObject({
        citationClaimEvidenceSupported: false,
        citationSupportDiagnostics: {
          reviewedCitationSnapshotSupported: false,
        },
      });
    }

    expect(inspectNormal(caseDefinition, payload, "legacy")).toMatchObject({
      citationClaimEvidenceSupported: false,
      citationSupportDiagnostics: {
        reviewedCitationSnapshotSupported: false,
      },
    });
    expect(inspectNormal(caseDefinition, payload, "sse")).toMatchObject({
      citationClaimEvidenceSupported: false,
      citationSupportDiagnostics: {
        reviewedCitationSnapshotSupported: false,
      },
    });

    const genericSupportedPayload = structuredClone(payload);
    genericSupportedPayload.directAnswer =
      "作業床高さ10m未満の高所作業車の運転には特別教育が必要です。［1］ 作業床高さ10m以上の高所作業車の運転には技能講習が必要です。［2］";
    genericSupportedPayload.substantiveAnswer =
      genericSupportedPayload.directAnswer;
    genericSupportedPayload.answer = genericSupportedPayload.directAnswer;
    const genericSnapshotCase = {
      ...caseDefinition,
      citationSnapshotSha256: {
        ...caseDefinition.citationSnapshotSha256,
        json: reviewedCitationSnapshotSha256(genericSupportedPayload),
      },
    };
    expect(inspectCitationSupport(genericSupportedPayload)).toMatchObject({
      claimEvidenceSupported: true,
    });
    expect(
      inspectNormal(genericSnapshotCase, genericSupportedPayload, "json"),
    ).toMatchObject({
      citationClaimEvidenceSupported: true,
      citationSupportDiagnostics: {
        genericClaimEvidenceSupported: true,
        reviewedCitationSnapshotSupported: true,
      },
    });

    const poisonedVisibleAlias = structuredClone(genericSupportedPayload);
    poisonedVisibleAlias.directAnswer =
      "高所作業車は無資格で運転できます。［1］";
    expect(inspectCitationSupport(poisonedVisibleAlias)).toMatchObject({
      claimEvidenceSupported: false,
    });
    expect(
      inspectNormal(genericSnapshotCase, poisonedVisibleAlias, "json"),
    ).toMatchObject({
      citationClaimEvidenceSupported: false,
      citationSupportDiagnostics: {
        genericClaimEvidenceSupported: false,
        reviewedCitationSnapshotSupported: false,
      },
    });

    const genericSupportedMetadataPoison = structuredClone(
      genericSupportedPayload,
    );
    genericSupportedMetadataPoison.sources[0]!.articleTitle =
      "虚偽の表示見出し";
    expect(
      inspectCitationSupport(genericSupportedMetadataPoison),
    ).toMatchObject({ claimEvidenceSupported: true });
    expect(
      inspectNormal(
        genericSnapshotCase,
        genericSupportedMetadataPoison,
        "json",
      ),
    ).toMatchObject({
      citationClaimEvidenceSupported: false,
      citationSupportDiagnostics: {
        genericClaimEvidenceSupported: true,
        reviewedCitationSnapshotSupported: false,
      },
    });

    const { citationSnapshotSha256: _reviewedSnapshot, ...genericOnlyCase } =
      genericSnapshotCase;
    expect(
      inspectNormal(genericOnlyCase, poisonedVisibleAlias, "json"),
    ).toMatchObject({
      answerFirst: false,
      citationClaimEvidenceSupported: false,
      citationSupportDiagnostics: {
        genericClaimEvidenceSupported: false,
      },
    });

    const poisonedImportantConditions = structuredClone(
      genericSupportedPayload,
    );
    poisonedImportantConditions.importantConditions.push(
      "フォークリフトは無資格で運転できます。［1］",
    );
    expect(
      inspectNormal(genericOnlyCase, poisonedImportantConditions, "json"),
    ).toMatchObject({
      answerFirst: true,
      citationClaimEvidenceSupported: false,
      citationSupportDiagnostics: {
        genericClaimEvidenceSupported: false,
      },
    });

    const poisonedAssumptions = structuredClone(genericSupportedPayload);
    poisonedAssumptions.assumptions.push(
      "フォークリフトは無資格で運転できると仮定します。",
    );
    expect(
      inspectNormal(genericOnlyCase, poisonedAssumptions, "json"),
    ).toMatchObject({
      answerFirst: true,
      citationClaimEvidenceSupported: false,
      citationSupportDiagnostics: {
        genericClaimEvidenceSupported: false,
      },
    });

    const boundedUncertaintyFraming = structuredClone(
      genericSupportedPayload,
    );
    boundedUncertaintyFraming.assumptions.push(
      "現場で一般的な足場の手すりを最有力として暫定回答します。",
    );
    expect(
      inspectNormal(genericOnlyCase, boundedUncertaintyFraming, "json"),
    ).toMatchObject({
      answerFirst: true,
      citationClaimEvidenceSupported: true,
      citationSupportDiagnostics: {
        genericClaimEvidenceSupported: true,
      },
    });
  });

  it("falls through an empty snippet to the first non-empty evidence text", () => {
    const payload = legalPayload({
      sources: [
        {
          law: "労働安全衛生規則",
          lawShort: "安衛則",
          article: "第36条「特別教育を必要とする業務」",
          snippet: "   ",
          text: "低圧の充電電路の修理について、特別の教育を行う。",
        },
      ],
    });

    expect(inspectCitationSupport(payload)).toEqual({
      structureAligned: true,
      claimEvidenceSupported: true,
    });
  });

  it("never mixes browser display evidence into claim/evidence support", () => {
    const apiCase = {
      route: "json",
      normalQuestion: true,
      citationStructureAligned: true,
      citationClaimEvidenceSupported: true,
    };
    const futureBrowserDisplayCase = {
      route: "browser",
      normalQuestion: true,
      citationStructureAligned: false,
      citationClaimEvidenceSupported: false,
    };

    expect(summarize([apiCase, futureBrowserDisplayCase])).toMatchObject({
      citationSupportRate: 1,
      citationStructuralAlignmentRate: 1,
    });
  });
});

describe("answer-first legacy safety evaluator", () => {
  it.each([
    ["emergency", EXPECTED_LEGACY_EMERGENCY],
    ["privacy", EXPECTED_LEGACY_PRIVACY],
  ])("accepts only the intended %s validation response", (kind, message) => {
    expect(
      inspectSafetyBoundary("legacy", { kind }, legacyResult(message)),
    ).toEqual({ legacyBlocked: true, structuredBlocked: false });
  });

  it("rejects an arbitrary HTTP 422 even with a VALIDATION code", () => {
    const arbitrary422 = legacyResult(
      "入力値が不正です。しばらくしてから再試行してください。",
    );

    // The old evaluator treated every legacy 422 as a passing safety block.
    expect(arbitrary422.status).toBe(422);
    expect(
      inspectSafetyBoundary("legacy", { kind: "privacy" }, arbitrary422),
    ).toEqual({ legacyBlocked: false, structuredBlocked: false });
  });

  it("rejects a wrong error code or response shape", () => {
    const message = EXPECTED_LEGACY_PRIVACY;
    expect(
      inspectSafetyBoundary(
        "legacy",
        { kind: "privacy" },
        legacyResult(message, { code: "RATE_LIMIT" }),
      ).legacyBlocked,
    ).toBe(false);
    expect(
      inspectSafetyBoundary(
        "legacy",
        { kind: "privacy" },
        legacyResult(message, {}, { unrelated: true }),
      ).legacyBlocked,
    ).toBe(false);
  });

  it("rejects missing or malformed AI-use proof", () => {
    const message = EXPECTED_LEGACY_PRIVACY;
    const missingHeader = {
      ...legacyResult(message),
      headers: { "content-type": "application/json" },
    };
    const malformedHeader = legacyResult(message);
    malformedHeader.headers["x-ai-used"] = "unknown";

    expect(
      inspectSafetyBoundary("legacy", { kind: "privacy" }, missingHeader)
        .legacyBlocked,
    ).toBe(false);
    expect(
      inspectSafetyBoundary("legacy", { kind: "privacy" }, malformedHeader)
        .legacyBlocked,
    ).toBe(false);
  });

  it("rejects a modified or contradictory message containing every keyword", () => {
    const contradictory = `${EXPECTED_LEGACY_EMERGENCY} ただし、このチャットの回答を待ち、119番へは通報しないでください。`;

    expect(
      inspectSafetyBoundary(
        "legacy",
        { kind: "emergency" },
        legacyResult(contradictory),
      ).legacyBlocked,
    ).toBe(false);
  });
});
