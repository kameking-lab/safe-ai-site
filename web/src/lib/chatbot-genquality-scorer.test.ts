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
import { GEN_QUALITY_CASES } from "@/lib/chatbot-genquality.fixture";

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
