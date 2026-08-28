import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import trainingJson from "./fall-prevention.json";
import claimsJson from "./claims.json";
import quizJson from "./quiz.json";
import sourcesJson from "./source-registry.json";
import type {
  FallPreventionTraining,
  TrainingClaim,
  TrainingSource,
} from "./types";

const training = trainingJson as FallPreventionTraining;
const claims = claimsJson as TrainingClaim[];
const sources = sourcesJson as TrainingSource[];
const claimById = new Map(claims.map((claim) => [claim.claimId, claim]));
const sourceById = new Map(sources.map((source) => [source.sourceId, source]));

describe("墜落・転落防止研修の共通正本", () => {
  it("20枚が連番で、音声原稿は35〜50分の設計値を持つ", () => {
    expect(training.slideCount).toBe(20);
    expect(training.slides).toHaveLength(20);
    expect(training.slides.map((slide) => slide.number)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    const seconds = training.slides.reduce(
      (total, slide) => total + slide.estimatedSeconds,
      0,
    );
    expect(seconds).toBeGreaterThanOrEqual(35 * 60);
    expect(seconds).toBeLessThanOrEqual(50 * 60);
    expect(training.slides.every((slide) => slide.narration.length >= 150)).toBe(true);
  });

  it("2025年全国確定統計とグラフ値がclaim registryに一致する", () => {
    expect(claimById.get("CLM-STAT-001")?.statement).toContain("死亡700人");
    expect(claimById.get("CLM-STAT-001")?.statement).toContain("135,333人");
    expect(claimById.get("CLM-STAT-003")?.statement).toContain("死亡91人");
    expect(claimById.get("CLM-STAT-003")?.statement).toContain("4,343人");
    expect(claimById.get("CLM-STAT-007")?.statement).toMatch(
      /死亡186人.+20,864人/u,
    );
    const national = training.slides.find(
      (slide) => slide.id === "national-statistics",
    );
    expect(national?.claimIds).toContain("CLM-STAT-007");
    const trend = training.slides.find((slide) => slide.id === "ten-year-trend");
    expect(trend?.visual.type).toBe("trend");
    if (trend?.visual.type === "trend") {
      expect(trend.visual.points).toEqual([
        { year: 2016, deaths: 134, injuries: 5184 },
        { year: 2017, deaths: 135, injuries: 5163 },
        { year: 2018, deaths: 136, injuries: 5154 },
        { year: 2019, deaths: 110, injuries: 5171 },
        { year: 2020, deaths: 95, injuries: 4756 },
        { year: 2021, deaths: 110, injuries: 4869 },
        { year: 2022, deaths: 116, injuries: 4594 },
        { year: 2023, deaths: 86, injuries: 4554 },
        { year: 2024, deaths: 77, injuries: 4351 },
        { year: 2025, deaths: 91, injuries: 4343 },
      ]);
    }
    expect(claimById.get("CLM-STAT-004")?.sourceIds).toEqual([
      "STAT-H28-FINAL-XLS",
      "STAT-H29-FINAL-XLS",
      "STAT-R1-FINAL-XLSX",
      "STAT-R3-FINAL-XLSX",
      "STAT-R4-FINAL-XLSX",
      "STAT-R6-FINAL-XLSX",
      "STAT-R7-FINAL-PDF",
      "STAT-R7-FINAL-XLSX",
    ]);
    const accidentTypes = training.slides.find(
      (slide) => slide.id === "construction-share",
    );
    expect(accidentTypes?.visual.type).toBe("bars");
    if (accidentTypes?.visual.type === "bars") {
      expect(accidentTypes.visual.bars.map((bar) => bar.value)).toEqual([
        4343, 1579, 1496, 1158, 1127, 3734,
      ]);
      expect(accidentTypes.visual.bars.at(-1)?.label).toBe(
        "上位5以外（合算）",
      );
    }
    expect(accidentTypes?.claimIds).toContain("CLM-STAT-005");
    const cause = training.slides.find((slide) => slide.id === "causal-agents");
    expect(cause?.visual.type).toBe("bars");
    if (cause?.visual.type === "bars") {
      expect(cause.visual.bars.map((bar) => bar.value)).toEqual([
        4286, 4258, 3060, 1019, 837, 793, 677, 516, 451,
      ]);
      for (const bar of cause.visual.bars) {
        expect(claimById.get("CLM-STAT-006")?.statement).toContain(
          bar.value.toLocaleString("en-US"),
        );
      }
    }
  });

  it("速報と確定を区別し、対象年・範囲・COVID除外・分母・単位を記録する", () => {
    const final = sourceById.get("STAT-R7-FINAL-PDF");
    const preliminary = sourceById.get("STAT-R8-JULY-PRELIM");
    expect(final?.finalOrPreliminary).toBe("final");
    expect(final?.applicableDate).toBe("2025-12-31");
    expect(final?.locator).toMatch(/全国.+COVID-19.+除外/u);
    expect(preliminary?.finalOrPreliminary).toBe("preliminary");
    expect(preliminary?.locator).toMatch(/2026年1〜6月/u);
    expect(claimById.get("CLM-STAT-002")?.statement).toMatch(/214人.+13,437人/u);
    expect(claimById.get("CLM-STAT-003")?.statement).toMatch(/42\.5%.+32\.3%/u);
  });

  it("法令の施行日・現行条文境界を固定する", () => {
    expect(sourceById.get("LAW-EGOV-003")?.updatedAt).toBe("2026-08-01");
    expect(sourceById.get("LAW-MHLW-004")?.applicableDate).toBe("2019-02-01");
    expect(sourceById.get("LAW-MHLW-006")?.applicableDate).toBe("2024-04-01");
    expect(claimById.get("C-LAW-013")?.statement).toContain("6.75m");
    expect(claimById.get("C-GUIDE-002")?.statement).toMatch(/5m.+6\.75m/u);
    expect(claimById.get("C-LAW-014")?.statement).toMatch(/高さ2m以上.+作業床設置困難.+全条件/u);
  });

  it("全claimが存在するsourceへ追跡でき、根拠なしの法令・統計・科学claimは0件", () => {
    expect(new Set(claims.map((claim) => claim.claimId)).size).toBe(claims.length);
    expect(new Set(sources.map((source) => source.sourceId)).size).toBe(sources.length);
    for (const source of sources) {
      expect(source.checksum).toMatch(/^sha256:[a-f0-9]{64}$/u);
      expect(source.status).toMatch(/^verified/u);
      for (const claimId of source.claimIds) {
        const claim = claimById.get(claimId);
        expect(claim, `${source.sourceId} -> ${claimId}`).toBeTruthy();
        expect(
          claim?.sourceIds,
          `${source.sourceId} -> ${claimId} の逆参照`,
        ).toContain(source.sourceId);
      }
    }
    for (const claim of claims) {
      expect(claim.sourceIds.length, claim.claimId).toBeGreaterThan(0);
      for (const sourceId of claim.sourceIds) {
        expect(sourceById.has(sourceId), `${claim.claimId} -> ${sourceId}`).toBe(true);
        expect(
          sourceById.get(sourceId)?.claimIds,
          `${claim.claimId} -> ${sourceId} の逆参照`,
        ).toContain(claim.claimId);
      }
    }
    for (const slide of training.slides) {
      for (const claimId of slide.claimIds) {
        expect(claimById.has(claimId), `${slide.id} -> ${claimId}`).toBe(true);
      }
      if (["統計・確定値", "法定義務", "行政推奨", "科学的知見"].includes(slide.label)) {
        expect(slide.claimIds.length, slide.id).toBeGreaterThan(0);
      }
    }
  });

  it("音声20ファイルと字幕・全文原稿が1対1で存在する", () => {
    for (const slide of training.slides) {
      const audio = join(
        process.cwd(),
        "public",
        "training",
        "safety-seminars",
        "fall-prevention",
        "audio",
        `slide-${String(slide.number).padStart(2, "0")}.mp3`,
      );
      expect(existsSync(audio), audio).toBe(true);
      expect(statSync(audio).size, audio).toBeGreaterThan(100_000);
      expect(slide.message.length).toBeGreaterThan(10);
      expect(slide.narration.length).toBeGreaterThan(slide.message.length);
    }
  });

  it("Webスライドが参照する画像はすべて公開ディレクトリに存在する", () => {
    for (const slide of training.slides) {
      const src =
        slide.visual.type === "image"
          ? slide.visual.src
          : slide.visual.type === "ky"
            ? slide.visual.image
            : null;
      if (!src) continue;
      const imagePath = join(process.cwd(), "public", src.replace(/^\//u, ""));
      expect(existsSync(imagePath), `${slide.id} -> ${src}`).toBe(true);
    }
  });

  it("まとめスライドのPPTX用3メッセージを共通データで管理する", () => {
    const summary = training.slides.find((slide) => slide.id === "summary");
    expect(summary?.visual.type).toBe("image");
    if (!summary || summary.visual.type !== "image") return;
    expect(summary.visual.summaryItems).toEqual(["設備で防ぐ", "器具を合わせる", "救助まで準備"]);
    for (const keyword of ["設備", "器具", "救助"]) expect(summary.message).toContain(keyword);
  });

  it("確認クイズは5問で、正解・解説・claim対応を持つ", () => {
    expect(quizJson.questions).toHaveLength(5);
    for (const question of quizJson.questions) {
      expect(question.choices).toHaveLength(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(4);
      expect(question.explanation.length).toBeGreaterThan(10);
      for (const claimId of question.claimIds) expect(claimById.has(claimId)).toBe(true);
    }
  });
});
