import { describe, expect, it } from "vitest";
import trainingJson from "./chemicals-sds-risk-assessment.json";
import quizJson from "./chemicals-sds-risk-assessment-quiz.json";
import claimsJson from "./chemical-claims.json";
import sourcesJson from "./chemical-source-registry.json";
import type { TrainingClaim, TrainingCourse, TrainingQuiz, TrainingSource } from "./types";

const training = trainingJson as TrainingCourse;
const quiz = quizJson as TrainingQuiz;
const claims = claimsJson as TrainingClaim[];
const sources = sourcesJson as TrainingSource[];

describe("化学物質・SDS・リスクアセスメント入門の正本", () => {
  it("12枚を連番で持ち、生成した章固有画像だけを使用する", () => {
    expect(training.slideCount).toBe(12);
    expect(training.slides).toHaveLength(12);
    expect(training.slides.map((slide) => slide.number)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
    const images = training.slides.filter((slide) => slide.visual.type === "image");
    expect(images).toHaveLength(1);
    expect(images[0]?.visual.type === "image" && images[0].visual.src).toContain("chemicals-sds-risk-assessment");
    for (const slide of training.slides) {
      expect(slide.visual.type).not.toBe("ky");
      expect(slide.message.length, slide.id).toBeLessThanOrEqual(55);
      expect(slide.narration.length, slide.id).toBeLessThanOrEqual(190);
    }
  });

  it("全claimが公開一次資料へ追跡でき、私有Driveを含まない", () => {
    const claimById = new Map(claims.map((claim) => [claim.claimId, claim]));
    const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
    for (const slide of training.slides) {
      for (const claimId of slide.claimIds) expect(claimById.has(claimId), claimId).toBe(true);
    }
    for (const claim of claims) {
      for (const sourceId of claim.sourceIds) expect(sourceById.has(sourceId), sourceId).toBe(true);
    }
    for (const source of sources) {
      expect(source.url).toMatch(/^https:\/\/(laws\.e-gov\.go\.jp|www\.mhlw\.go\.jp)\//u);
      expect(source.url).not.toContain("drive.google.com");
      expect(source.checksum).toMatch(/^sha256:[a-f0-9]{64}$/u);
    }
  });

  it("義務・努力義務・行政指針を混同しない", () => {
    expect(claims.find((claim) => claim.claimId === "CHEM-RA-DUTY")?.statement).toContain("義務付ける");
    expect(claims.find((claim) => claim.claimId === "CHEM-RA-MEASURES")?.caveat).toContain("努力義務");
    expect(training.slides.find((slide) => slide.id === "minimum-exposure")?.message).toContain("省略");
  });

  it("5問4択に全肢理由と根拠を持たせる", () => {
    expect(quiz.questions).toHaveLength(5);
    for (const question of quiz.questions) {
      expect(question.choices).toHaveLength(4);
      expect(question.choiceRationales).toHaveLength(4);
      for (const rationale of question.choiceRationales) {
        expect(rationale.length).toBeGreaterThanOrEqual(20);
        expect(rationale.length).toBeLessThanOrEqual(80);
      }
      expect(question.refs.length).toBeGreaterThan(0);
    }
  });
});
