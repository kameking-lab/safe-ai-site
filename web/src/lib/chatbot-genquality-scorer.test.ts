/**
 * 生成品質採点器の単体テスト＋誤答検出の常設実証。
 *
 * F2（化学物質×法体系）の「誤区分を1件入れるとCIが落ちる」と同型の担保:
 * 診断04で実際に本番が返した誤答（Q20「派遣先の義務」型）・実質未回答（Q12型）・
 * 偽の範囲外警告（Q8型）・プレースホルダ漏出（Q10型）を再構成した応答を採点器に
 * 通し、全て検出されることをCIで固定する。採点器がこれらを見逃すよう劣化した場合も
 * このテストで落ちる（検出器自身の回帰も兼ねる）。
 */

import { describe, it, expect } from "vitest";
import {
  scoreGenQuality,
  summarizeScores,
  citesGoldArticle,
  type GenQualityResponse,
} from "@/lib/chatbot-genquality-scorer";
import {
  GEN_QUALITY_CASES,
  type GenQualityCase,
} from "@/lib/chatbot-genquality.fixture";
import {
  GEN_QUALITY_SOURCE_RECORDS,
  type GenQualitySourceRecord,
} from "@/lib/chatbot-genquality-source-records";

function caseById(id: string) {
  const tc = GEN_QUALITY_CASES.find((c) => c.id === id);
  if (!tc) throw new Error(`fixture欠落: ${id}`);
  return tc;
}

/** 診断04 Q20の正答形（#588是正後に期待される応答）を再構成 */
const Q20_CORRECT: GenQualityResponse = {
  answer:
    "派遣労働者の雇入れ時の安全衛生教育（労働安全衛生法第59条第1項）は、派遣元の義務です。" +
    "なお、作業内容変更時の教育・特別教育・特殊健康診断は派遣先が実施します。\n\n" +
    "根拠：労働者派遣法第45条（労働安全衛生法の適用に関する特例等）",
  confidence: "high",
  citations: [
    { lawShort: "派遣法", articleNum: "第45条" },
    { lawShort: "安衛法", articleNum: "第59条" },
  ],
};

/** 診断04 Q20で本番が実際に返した誤答型（派遣先と誤断定・confidence=high） */
const Q20_WRONG: GenQualityResponse = {
  answer:
    "派遣労働者の雇入れ時の安全衛生教育は、派遣先の義務です。" +
    "派遣先は作業環境を管理しているため、教育を実施しなければなりません。\n\n" +
    "根拠：労働者派遣法第45条",
  confidence: "high",
  confidenceScore: 1.0,
  citations: [{ lawShort: "派遣法", articleNum: "第45条" }],
};

describe("誤答検出の常設実証（F2の誤区分1件検出と同型）", () => {
  it("Q20正答形は correct と採点される", () => {
    const s = scoreGenQuality(caseById("GQ20"), Q20_CORRECT);
    expect(s.verdict).toBe("correct");
    expect(s.failures).toEqual([]);
  });

  it("Q20の実誤答（派遣先と誤断定）を incorrect として検出する", () => {
    const s = scoreGenQuality(caseById("GQ20"), Q20_WRONG);
    expect(s.verdict).toBe("incorrect");
    expect(s.checks.forbidden).toBe("fail");
    // 検索evalでは検出不能な点の確認: gold条文（派遣法45条）は正しく引用している
    expect(s.checks.citation).toBe("pass");
  });

  it("Q12型の実質未回答（条文は引くが結論に答えない）を incorrect として検出する", () => {
    const s = scoreGenQuality(caseById("GQ12"), {
      answer:
        "ストレスチェック制度は労働安全衛生法第66条の10に規定されていますが、" +
        "対象となる事業場規模（人数）の直接的な規定は提供データからは特定できませんでした。" +
        "公式情報でご確認ください。\n\n根拠：安衛法第66条の10",
      confidence: "medium",
      citations: [{ lawShort: "安衛法", articleNum: "第66条の10" }],
    });
    expect(s.verdict).toBe("incorrect");
    expect(s.checks.conclusion).toBe("fail");
    expect(s.checks.citation).toBe("pass"); // ← Recall系evalでは「正答」に見える失敗
  });

  it("Q8型の偽の範囲外警告（正答なのに信頼毀損）を partial として検出する", () => {
    const s = scoreGenQuality(caseById("GQ08"), {
      answer:
        "化学物質管理者は、リスクアセスメント対象物を製造・取扱う事業場ごとに選任が必要です。" +
        "選任事由の発生から14日以内に、製造事業場では講習修了者から選任します（安衛則第12条の5）。",
      confidence: "medium",
      citations: [{ lawShort: "安衛則", articleNum: "第12条の5" }],
      scopeWarnings: [
        "回答中の参照「労働安全衛生規則」は提供データ範囲外のため、内容の確からしさは保証できません。",
      ],
    });
    expect(s.verdict).toBe("partial");
    expect(s.checks.scope).toBe("fail");
    expect(s.failureKinds).toContain("false-scope-warning");
  });

  it("Q10型のプレースホルダ漏出を partial として検出する", () => {
    const s = scoreGenQuality(caseById("GQ10"), {
      answer:
        "つり上げ荷重5トン以上のクレーンは免許（クレーン則第22条・施行：YYYY年MM月）、" +
        "床上操作式は技能講習、5トン未満は特別教育（クレーン則第21条）が必要です。",
      confidence: "high",
      citations: [
        { lawShort: "クレーン則", articleNum: "第21条" },
        { lawShort: "クレーン則", articleNum: "第22条" },
      ],
    });
    expect(s.verdict).toBe("partial");
    expect(s.checks.placeholder).toBe("fail");
  });

  it("範囲外質問（天気）への条文引用つき断定回答を incorrect として検出する", () => {
    const s = scoreGenQuality(caseById("GQ21"), {
      answer: "明日の東京は晴れです。港湾労働法第2条により作業計画を立ててください。",
      confidence: "high",
      citations: [{ lawShort: "港湾労働法", articleNum: "第2条" }],
    });
    expect(s.verdict).toBe("incorrect");
    expect(s.checks.scope).toBe("fail");
  });

  it("範囲外質問への誠実なno-hit対応は correct と採点される", () => {
    const s = scoreGenQuality(caseById("GQ21"), {
      answer:
        "ご質問は本ツールの提供データ範囲（労働安全衛生関連法令）では確証ある回答が得られませんでした。" +
        "気象情報は気象庁の公式情報でご確認ください。",
      confidence: "low",
      citations: [],
    });
    expect(s.verdict).toBe("correct");
  });
});

describe("採点器の部品", () => {
  it("条番号の枝番を誤マッチしない（第44条 ≠ 第44条の2）", () => {
    const tc = caseById("GQ06");
    expect(
      citesGoldArticle(
        { answer: "安衛則第44条の2により…", citations: [] },
        tc.goldCitations[0]
      )
    ).toBe(false);
    expect(
      citesGoldArticle(
        { answer: "定期健康診断は安衛則第44条に基づき1年以内ごとに1回実施します。" },
        tc.goldCitations[0]
      )
    ).toBe(true);
  });

  it("正式名称の隣接引用も検出する（労働安全衛生規則第44条）", () => {
    const tc = caseById("GQ06");
    expect(
      citesGoldArticle(
        { answer: "労働安全衛生規則第44条第1項の定めにより実施します。" },
        tc.goldCitations[0]
      )
    ).toBe(true);
  });

  it("sources経由の引用も検出する", () => {
    const tc = caseById("GQ06");
    expect(
      citesGoldArticle(
        {
          answer: "1年以内ごとに1回実施が必要です。",
          sources: [{ law: "労働安全衛生規則（安衛則）", article: "第44条「定期健康診断」" }],
        },
        tc.goldCitations[0]
      )
    ).toBe(true);
  });

  it("mustIncludeの部分充足は partial（診断04の△と同型）", () => {
    // GQ02: 特別教育のみ言及・技能講習（作業主任者）欠落 → 診断04で△だった実例
    const s = scoreGenQuality(caseById("GQ02"), {
      answer:
        "酸素欠乏危険作業に労働者を就かせる場合、特別教育が必要です（酸欠則第12条）。",
      confidence: "medium",
      citations: [{ lawShort: "酸欠則", articleNum: "第12条" }],
    });
    expect(s.verdict).toBe("partial");
    expect(s.checks.conclusion).toBe("partial");
  });

  it("summarizeScoresが正しい分母（範囲内47問/範囲外4問・2026-07-11拡張後）で集計する", () => {
    const scores = GEN_QUALITY_CASES.map((tc) =>
      scoreGenQuality(tc, {
        answer: "ダミー",
        confidence: "low",
        citations: [],
      })
    );
    const summary = summarizeScores(GEN_QUALITY_CASES, scores);
    expect(summary.total).toBe(51);
    // in-scope 41 + boundary 6（労基法・労施法域は収録済のため採点対象）
    expect(summary.scorable).toBe(47);
    expect(summary.outOfScope.total).toBe(4);
  });
});

describe("GQ05 主張単位の一次資料支持", () => {
  const completeAnswer =
    "施行通達の基発0520第6号が対象作業の目安として示すのは、" +
    "WBGT28度以上又は気温31度以上で、連続1時間以上又は1日4時間を超えることが見込まれる作業です。" +
    "これは第612条の2の条文本文ではなく施行通達の対象作業の目安です。" +
    "第612条の2の法定2項目は、報告体制と悪化防止手順の整備・周知です。";

  it("28/31だけを第612条の2へ結び付けた回答をcorrectにしない", () => {
    const score = scoreGenQuality(caseById("GQ05"), {
      answer:
        "安衛則第612条の2により、WBGT28度以上または気温31度以上が一律の法定基準です。",
      confidence: "high",
      citations: [{ lawShort: "安衛則", articleNum: "第612条の2" }],
    });
    expect(score.verdict).toBe("incorrect");
    expect(score.checks.forbidden).toBe("fail");
    expect(score.failureKinds).toContain("conclusion-wrong");
    expect(score.failureKinds).toContain("unsupported-claim");
  });

  it("時間条件・通達上の目安・条文閾値でない旨が欠けると不合格", () => {
    const score = scoreGenQuality(caseById("GQ05"), {
      answer:
        "WBGT28度以上または気温31度以上です。根拠は安衛則第612条の2です。",
      confidence: "high",
      citations: [{ lawShort: "安衛則", articleNum: "第612条の2" }],
    });
    expect(score.verdict).toBe("incorrect");
    expect(score.checks.conclusion).toBe("partial");
    expect(score.failureKinds).toContain("unsupported-claim");
  });

  it("回答文が全条件を満たしても、通達の一次資料引用がなければ支持済みにしない", () => {
    const lawRecord = GEN_QUALITY_SOURCE_RECORDS.find(
      (record) => record.id === "egov-osh-rule-612-2",
    );
    if (!lawRecord?.excerpt || !lawRecord.locator) {
      throw new Error("第612条の2の独立一次資料recordがありません");
    }
    const score = scoreGenQuality(caseById("GQ05"), {
      answer: completeAnswer,
      confidence: "medium",
      citations: [{ lawShort: "安衛則", articleNum: "第612条の2" }],
      evidenceCitations: [
        {
          sourceId: lawRecord.id,
          documentNumber: lawRecord.documentNumber,
          url: lawRecord.url,
          locator: lawRecord.locator,
          excerpt: lawRecord.excerpt,
          sourceClass: "primary",
        },
      ],
    });
    expect(score.checks.conclusion).toBe("pass");
    expect(score.checks.citation).toBe("pass");
    expect(score.checks.support).toBe("fail");
    expect(score.failureKinds).toEqual(["unsupported-claim"]);
    expect(score.verdict).toBe("incorrect");
  });

  it("612条の2と基発0520第6号を別々の一次資料で引用した場合だけ支持済みになる", () => {
    const lawRecord = GEN_QUALITY_SOURCE_RECORDS.find(
      (record) => record.id === "egov-osh-rule-612-2",
    );
    const noticeRecord = GEN_QUALITY_SOURCE_RECORDS.find(
      (record) => record.id === "mhlw-heat-notice-0520-6",
    );
    if (
      !lawRecord?.excerpt ||
      !lawRecord.locator ||
      !noticeRecord?.excerpt ||
      !noticeRecord.locator
    ) {
      throw new Error("GQ05の独立一次資料recordが不足しています");
    }

    const score = scoreGenQuality(caseById("GQ05"), {
      answer: completeAnswer,
      confidence: "medium",
      citations: [{ lawShort: "安衛則", articleNum: "第612条の2" }],
      evidenceCitations: [lawRecord, noticeRecord].map((record) => ({
        sourceId: record.id,
        documentNumber: record.documentNumber,
        url: record.url,
        locator: record.locator ?? undefined,
        excerpt: record.excerpt ?? undefined,
        sourceClass: record.sourceClass,
      })),
    });

    expect(score.checks).toMatchObject({
      conclusion: "pass",
      forbidden: "pass",
      citation: "pass",
      support: "pass",
    });
    expect(score.failureKinds).toEqual([]);
    expect(score.verdict).toBe("correct");
  });
});

describe("一次資料の未支持・間接・失効を区別する", () => {
  const testCase: GenQualityCase = {
    id: "SUPPORT-TEST",
    category: "in-scope",
    diagVerdict: "未",
    question: "条件Aは何ですか？",
    mustInclude: [["条件A"]],
    goldCitations: [],
    sourceRequirements: [
      {
        claimId: "condition-a",
        label: "条件A",
        sourceId: "primary-a",
        sourceMustContain: ["条件A", "対象"],
      },
    ],
    expectRetrievable: false,
  };
  const primaryRecord: GenQualitySourceRecord = {
    id: "primary-a",
    title: "一次資料A",
    publisher: "公的機関",
    documentNumber: "文書A",
    url: "https://example.go.jp/document-a",
    sourceClass: "primary",
    retrievedAt: "2026-07-24",
    locator: "第2 1",
    excerpt: "第2 1 条件Aの対象を定める。",
    hash: "a".repeat(64),
    status: "snapshot-hash-verified",
    humanReviewStatus: "not-reviewed",
    successorSourceId: null,
  };

  const supportedResponse: GenQualityResponse = {
    answer: "条件Aの対象です。",
    evidenceCitations: [
      {
        sourceId: "primary-a",
        documentNumber: "文書A",
        url: "https://example.go.jp/document-a",
        locator: "第2 1",
        excerpt: "第2 1 条件Aの対象を定める。",
        sourceClass: "primary",
      },
    ],
  };

  it("独立recordと公式URL・locator・excerptが一致すると支持済みになる", () => {
    const score = scoreGenQuality(testCase, supportedResponse, [primaryRecord]);
    expect(score.checks.support).toBe("pass");
    expect(score.verdict).toBe("correct");
  });

  it("文書名だけで引用箇所がない場合はunsupported-claim", () => {
    const score = scoreGenQuality(
      testCase,
      {
        answer: "条件Aです。",
        evidenceCitations: [
          {
            documentNumber: "文書A",
            url: primaryRecord.url,
          },
        ],
      },
      [primaryRecord],
    );
    expect(score.verdict).toBe("incorrect");
    expect(score.failureKinds).toContain("unsupported-claim");
  });

  it("同じ文書番号でも二次掲載URLだけならindirect-source", () => {
    const score = scoreGenQuality(
      testCase,
      {
        answer: "条件Aです。",
        evidenceCitations: [
          {
            documentNumber: "文書A",
            url: "https://secondary.example/document-a",
            locator: "第2 1",
            excerpt: primaryRecord.excerpt ?? undefined,
            sourceClass: "secondary",
          },
        ],
      },
      [primaryRecord],
    );
    expect(score.verdict).toBe("incorrect");
    expect(score.failureKinds).toContain("indirect-source");
  });

  it("失効recordは現行根拠として採用せずsuperseded-source", () => {
    const score = scoreGenQuality(testCase, supportedResponse, [
      {
        ...primaryRecord,
        status: "superseded",
        successorSourceId: "primary-a-current",
      },
    ]);
    expect(score.verdict).toBe("incorrect");
    expect(score.failureKinds).toContain("superseded-source");
  });
});
