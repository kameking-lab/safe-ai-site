import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import trainingJson from "./ai-chat-work.json";
import claimsJson from "./claims.json";
import promptTemplateJson from "./prompt-template.json";
import quizJson from "./quiz.json";
import sourcesJson from "./source-registry.json";
import {
  AI_SEMINAR_THEMES,
  COMING_SOON_AI_SEMINARS,
  PUBLISHED_AI_SEMINARS,
} from "./themes";
import type {
  AiChatWorkTraining,
  AiPromptTemplate,
  AiQuiz,
  TrainingClaim,
  TrainingSource,
} from "./types";

const training = trainingJson as AiChatWorkTraining;
const claims = claimsJson as TrainingClaim[];
const sources = sourcesJson as TrainingSource[];
const quiz = quizJson as AiQuiz;
const promptTemplate = promptTemplateJson as AiPromptTemplate;
const claimById = new Map(claims.map((claim) => [claim.claimId, claim]));
const sourceById = new Map(sources.map((source) => [source.sourceId, source]));

const allReferencedClaimIds = () =>
  new Set([
    ...training.slides.flatMap((slide) => slide.claimIds),
    ...training.exercises.flatMap((exercise) => exercise.claimIds),
    ...quiz.questions.flatMap((question) => question.claimIds),
    ...promptTemplate.claimIds,
  ]);

describe("AIチャット仕事術の共通正本", () => {
  it("テーマは公開1件とComing Soon 24件の計25件", () => {
    expect(AI_SEMINAR_THEMES).toHaveLength(25);
    expect(PUBLISHED_AI_SEMINARS).toHaveLength(1);
    expect(PUBLISHED_AI_SEMINARS[0]).toMatchObject({
      id: "ai-chat-work",
      status: "published",
      slideCount: 20,
    });
    expect(COMING_SOON_AI_SEMINARS).toHaveLength(24);
    expect(
      COMING_SOON_AI_SEMINARS.every(
        (theme) => theme.status === "coming-soon" && theme.href === undefined,
      ),
    ).toBe(true);
  });

  it("20枚が連番で、実測音声に合わせた音声設計は正確に2140秒かつ35〜50分", () => {
    expect(training).toMatchObject({
      id: "ai-chat-work",
      asOf: "2026-08-27",
      version: "1.0.0",
      slideCount: 20,
      standardMinutes: { audioMin: 35, audioMax: 50, workshop: 60 },
    });
    expect(training.boundary).toContain("資格・認定講座ではなく");
    expect(training.slides).toHaveLength(20);
    expect(training.slides.map((slide) => slide.number)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(new Set(training.slides.map((slide) => slide.id)).size).toBe(20);

    const totalSeconds = training.slides.reduce(
      (total, slide) => total + slide.estimatedSeconds,
      0,
    );
    expect(totalSeconds).toBe(2140);
    expect(totalSeconds).toBeGreaterThanOrEqual(35 * 60);
    expect(totalSeconds).toBeLessThanOrEqual(50 * 60);
    expect(
      training.slides.every(
        (slide) =>
          slide.estimatedSeconds >= 60 &&
          slide.estimatedSeconds <= 150 &&
          Array.isArray(slide.body) &&
          slide.narration.length > slide.message.length &&
          Array.isArray(slide.instructorNotes),
      ),
    ).toBe(true);
  });

  it("全visualはWebとPPTXでnative表示できる許可済みschemaだけを使う", () => {
    const allowedVisualTypes = new Set(["steps", "checklist", "metrics", "bars"]);
    for (const slide of training.slides) {
      expect(allowedVisualTypes.has(slide.visual.type), slide.id).toBe(true);
      if (slide.visual.type === "steps") {
        expect(slide.visual.steps.length, slide.id).toBeGreaterThan(0);
        expect(
          slide.visual.steps.every(
            (step) => step.label.trim().length > 0 && step.detail.trim().length > 0,
          ),
        ).toBe(true);
      }
      if (slide.visual.type === "checklist") {
        expect(slide.visual.items.length, slide.id).toBeGreaterThan(0);
      }
    }
  });

  it("claimとsourceは双方向に追跡でき、unsupported claimは0件", () => {
    expect(new Set(claims.map((claim) => claim.claimId)).size).toBe(claims.length);
    expect(new Set(sources.map((source) => source.sourceId)).size).toBe(sources.length);

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

    for (const source of sources) {
      expect(source.claimIds.length, source.sourceId).toBeGreaterThan(0);
      for (const claimId of source.claimIds) {
        expect(claimById.has(claimId), `${source.sourceId} -> ${claimId}`).toBe(true);
        expect(
          claimById.get(claimId)?.sourceIds,
          `${source.sourceId} -> ${claimId} の逆参照`,
        ).toContain(source.sourceId);
      }
    }

    const referenced = allReferencedClaimIds();
    const unsupported = [...referenced].filter((claimId) => !claimById.has(claimId));
    expect(unsupported).toEqual([]);
    expect([...claimById.keys()].filter((claimId) => !referenced.has(claimId))).toEqual([]);
    expect(
      training.slides
        .filter((slide) => slide.label !== "導入")
        .every((slide) => slide.claimIds.length > 0),
    ).toBe(true);
  });

  it("source registryのsha256-id-v1 checksumを正規化仕様どおり再計算できる", () => {
    for (const source of sources) {
      expect(source.checksumMethod).toBe(
        "SHA-256 of trim(url) + LF + trim(locator) + LF + checkedAt",
      );
      const identity = [source.url.trim(), source.locator.trim(), source.checkedAt].join(
        "\n",
      );
      const expectedChecksum = `sha256-id-v1:${createHash("sha256")
        .update(identity, "utf8")
        .digest("hex")}`;
      expect(source.checksum, source.sourceId).toBe(expectedChecksum);
    }
  });

  it("3演習は考えてから解説を表示でき、全claimを追跡できる", () => {
    expect(training.exercises).toHaveLength(3);
    expect(training.exercises.map((exercise) => exercise.number)).toEqual([1, 2, 3]);
    expect(training.exercises.map((exercise) => exercise.id)).toEqual([
      "exercise-ambiguous-request",
      "exercise-primary-source",
      "exercise-confidential-request",
    ]);
    for (const exercise of training.exercises) {
      expect(exercise.task).toMatch(/解説|書き換え|依頼/u);
      expect(exercise.revealLabel).toMatch(/見る/u);
      expect(exercise.modelAnswer.length).toBeGreaterThanOrEqual(4);
      expect(exercise.explanation.length).toBeGreaterThan(30);
      for (const claimId of exercise.claimIds) expect(claimById.has(claimId)).toBe(true);
    }
  });

  it("確認クイズは5問で、選択肢・正解・解説・claim対応を持つ", () => {
    expect(quiz.title).toContain("AIチャット仕事術");
    expect(quiz.questions).toHaveLength(5);
    for (const question of quiz.questions) {
      expect(question.choices).toHaveLength(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.choices.length);
      expect(question.explanation.length).toBeGreaterThan(30);
      expect(question.claimIds.length).toBeGreaterThan(0);
      for (const claimId of question.claimIds) expect(claimById.has(claimId)).toBe(true);
    }
  });

  it("依頼テンプレートは4要素と根拠・未確認・人の確認点を共通正本化する", () => {
    expect(promptTemplate.elements.map((element) => element.id)).toEqual([
      "goal",
      "context",
      "output",
      "boundary",
    ]);
    expect(promptTemplate.elements).toHaveLength(4);
    expect(promptTemplate.verification.evidenceRequest).toContain("一次資料");
    expect(promptTemplate.verification.unresolvedRequest).toContain("未確認");
    expect(promptTemplate.verification.humanCheckpoint).toContain("人が確認");
    expect(promptTemplate.copyTemplate).toMatch(/【目的】[\s\S]+【背景】/u);
    expect(promptTemplate.copyTemplate).toMatch(/【根拠】[\s\S]+【未確認事項】/u);
    expect(promptTemplate.copyTemplate).toContain("【人の確認点】");
    expect(promptTemplate.safeUseNotes.length).toBeGreaterThanOrEqual(5);
    for (const claimId of promptTemplate.claimIds) expect(claimById.has(claimId)).toBe(true);
  });
});
