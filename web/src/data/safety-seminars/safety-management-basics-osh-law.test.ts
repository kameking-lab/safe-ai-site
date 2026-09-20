import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import claimsJson from "./safety-management-basics-osh-law-claims.json";
import quizJson from "./safety-management-basics-osh-law-quiz.json";
import sourcesJson from "./safety-management-basics-osh-law-source-registry.json";
import trainingJson from "./safety-management-basics-osh-law.json";
import type { TrainingClaim, TrainingCourse, TrainingSource } from "./types";

const training = trainingJson as TrainingCourse;
const claims = claimsJson as TrainingClaim[];
const sources = sourcesJson as TrainingSource[];
const claimById = new Map(claims.map((claim) => [claim.claimId, claim]));
const sourceById = new Map(sources.map((source) => [source.sourceId, source]));

describe("安全管理の基本と安衛法研修の共通正本", () => {
  it("12枚が連番で、12〜15分の設計値と十分な音声原稿を持つ", () => {
    expect(training.slideCount).toBe(12);
    expect(training.slides).toHaveLength(12);
    expect(training.slides.map((slide) => slide.number)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
    const seconds = training.slides.reduce(
      (total, slide) => total + slide.estimatedSeconds,
      0,
    );
    expect(seconds).toBeGreaterThanOrEqual(12 * 60);
    expect(seconds).toBeLessThanOrEqual(15 * 60);
    expect(training.slides.every((slide) => slide.narration.length >= 150)).toBe(true);
  });

  it("救助を本章の研修データへ混在させない", () => {
    const serialized = JSON.stringify(training);
    for (const term of ["応急手当", "CPR", "搬送", "宙づり", "救出", "救助"]) {
      expect(serialized).not.toContain(term);
    }
  });

  it("現行法と将来施行を区別する", () => {
    expect(training.asOf).toBe("2026-09-20");
    expect(claimById.get("C-LAW-WORKER")?.statement).toContain("2026年4月1日施行");
    expect(claimById.get("C-LAW-FUTURE")?.statement).toContain("2027年4月1日施行予定");
    expect(claimById.get("C-LAW-COORDINATION")?.statement).toContain(
      "すべての元方へ一律に当てはめない",
    );
    expect(claimById.get("C-LAW-TRAINING")?.caveat).toContain(
      "法定教育や資格要件を満たすものではない",
    );
  });

  it("全claimとsourceが相互参照できる", () => {
    expect(new Set(claims.map((claim) => claim.claimId)).size).toBe(claims.length);
    expect(new Set(sources.map((source) => source.sourceId)).size).toBe(sources.length);
    for (const claim of claims) {
      expect(claim.sourceIds.length).toBeGreaterThan(0);
      for (const sourceId of claim.sourceIds) {
        expect(sourceById.has(sourceId), `${claim.claimId} -> ${sourceId}`).toBe(true);
        expect(sourceById.get(sourceId)?.claimIds).toContain(claim.claimId);
      }
    }
    for (const source of sources) {
      expect(source.checksum).toMatch(/^sha256:[a-f0-9]{64}$/u);
      expect(source.status).toMatch(/^verified/u);
      for (const claimId of source.claimIds) {
        expect(claimById.has(claimId), `${source.sourceId} -> ${claimId}`).toBe(true);
        expect(claimById.get(claimId)?.sourceIds).toContain(source.sourceId);
      }
    }
    for (const slide of training.slides) {
      for (const claimId of slide.claimIds) {
        expect(claimById.has(claimId), `${slide.id} -> ${claimId}`).toBe(true);
      }
    }
  });

  it("Webスライドが参照する画像は公開ディレクトリに存在する", () => {
    for (const slide of training.slides) {
      if (slide.visual.type !== "image") continue;
      const imagePath = join(
        process.cwd(),
        "public",
        slide.visual.src.replace(/^\//u, ""),
      );
      expect(existsSync(imagePath), `${slide.id} -> ${slide.visual.src}`).toBe(true);
    }
  });

  it("確認クイズは5問で、正解・解説・claim対応を持つ", () => {
    expect(quizJson.questions).toHaveLength(5);
    for (const question of quizJson.questions) {
      expect(question.choices).toHaveLength(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(4);
      expect(question.explanation.length).toBeGreaterThan(20);
      for (const claimId of question.claimIds) {
        expect(claimById.has(claimId), `${question.id} -> ${claimId}`).toBe(true);
      }
    }
  });
});
