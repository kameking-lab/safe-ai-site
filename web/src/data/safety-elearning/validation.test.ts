import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SAFETY_COURSES } from "./courses";
import { SAFETY_QUESTIONS } from "./questions";
import { SAFETY_SOURCE_ADAPTERS } from "./source-adapters";
import { SAFETY_SOURCE_FACTS } from "./source-facts";
import { SAFETY_SOURCE_REGISTRY } from "./source-registry";
import { validateSafetyLearningDataset } from "./validation";

describe("safety qualification learning publication gates", () => {
  it("passes schema, rights, answer, option evidence, law and duplicate validation before review promotion", () => {
    expect(
      validateSafetyLearningDataset({ requireIndependentReview: false }),
    ).toEqual([]);
  });

  it("has no auto-scored question without an authoritative primary-source fact", () => {
    const factIds = new Set<string>(
      SAFETY_SOURCE_FACTS.map((fact) => fact.factId),
    );
    for (const question of SAFETY_QUESTIONS) {
      expect(question.answerAuthority).toBe("official_primary_source_fact");
      expect(question.answerEvidenceIds.length).toBeGreaterThan(0);
      expect(
        question.answerEvidenceIds.every((factId) => factIds.has(factId)),
      ).toBe(true);
    }
  });

  it("gives every correct and incorrect choice verified official evidence", () => {
    for (const question of SAFETY_QUESTIONS) {
      expect(question.explanationByChoice).toHaveLength(question.choices.length);
      for (const entry of question.explanationByChoice) {
        expect(entry.verdict).toBe(
          question.officialCorrectChoiceIds.includes(entry.choiceId)
            ? "correct"
            : "incorrect",
        );
        expect(entry.verified).toBe(true);
        expect(entry.sourceFactIds.length).toBeGreaterThan(0);
        expect(entry.officialLinks.length).toBeGreaterThan(0);
      }
    }
  });

  it("ties answer evidence to the correct explanation and every used fact to one law source", () => {
    for (const question of SAFETY_QUESTIONS) {
      const correctFacts = new Set(
        question.explanationByChoice
          .filter((entry) =>
            question.officialCorrectChoiceIds.includes(entry.choiceId),
          )
          .flatMap((entry) => [...entry.sourceFactIds]),
      );
      expect(new Set(question.answerEvidenceIds)).toEqual(correctFacts);

      const declaredFacts = question.lawSources.flatMap((source) =>
        source.sourceFactIds.map((factId) => ({ factId, sourceId: source.sourceId })),
      );
      expect(new Set(declaredFacts.map(({ factId }) => factId)).size).toBe(
        declaredFacts.length,
      );
      for (const { factId, sourceId } of declaredFacts) {
        expect(
          SAFETY_SOURCE_FACTS.find((fact) => fact.factId === factId)?.sourceId,
        ).toBe(sourceId);
      }
    }
  });

  it("publishes only user-authored original questions and never association text", () => {
    for (const question of SAFETY_QUESTIONS) {
      expect(question.sourceMode).toBe("original_source_grounded");
      expect(question.rightsStatus).toBe("user_authored");
      expect(question.sourceQuestionId).toBeNull();
      expect(question.sourceQuestionNumber).toBeNull();
    }
  });

  it("keeps descriptive papers outside the scored question manifest", () => {
    const scoredIds = new Set(SAFETY_QUESTIONS.map((question) => question.questionId));
    for (const course of SAFETY_COURSES) {
      for (const resource of course.unscoredDescriptiveResources) {
        expect(scoredIds.has(resource.resourceId)).toBe(false);
        const source = SAFETY_SOURCE_REGISTRY.find(
          (entry) => entry.sourceId === resource.sourceId,
        );
        expect(source?.officialAnswerAvailable).toBe(false);
        expect(source?.sourceType).toBe("official_descriptive_question");
      }
    }
  });

  it("never treats a mixed exam index as an individual official answer source", () => {
    const consultantIndex = SAFETY_SOURCE_REGISTRY.find(
      (source) => source.sourceId === "consultant-question-index",
    );
    expect(consultantIndex?.sourceType).toBe("exam_index");
    expect(consultantIndex?.officialAnswerAvailable).toBe(false);
    for (const source of SAFETY_SOURCE_REGISTRY.filter(
      (candidate) => candidate.sourceType === "official_question_with_answer",
    )) {
      expect(source.qualificationId).not.toBeNull();
      expect(source.officialAnswerAvailable).toBe(true);
    }
  });

  it("contains none of the official-similarity collisions rejected in review", () => {
    const questionText = SAFETY_QUESTIONS.map((question) => question.questionText).join("\n");
    expect(questionText).not.toContain("常時80人の労働者を使用");
    expect(questionText).not.toContain("常時250人の労働者を使用");
  });

  it("never enables source-adapter auto publication", () => {
    for (const adapter of SAFETY_SOURCE_ADAPTERS) {
      expect(adapter.autoPublish).toBe(false);
      expect(adapter.pipeline.at(-2)).toBe("manualReviewManifest");
      expect(adapter.pipeline.at(-1)).toBe("publish");
    }
  });

  it("does not call runtime AI or external APIs from learning data", () => {
    const files = ["questions.ts", "courses.ts", "validation.ts"].map((name) =>
      readFileSync(resolve(process.cwd(), "src/data/safety-elearning", name), "utf8"),
    );
    expect(files.join("\n")).not.toMatch(
      /GoogleGenAI|generateContent|GEMINI_API_KEY|\/api\/quiz-explain|fetch\s*\(/,
    );
  });

  it("has no tracked raw exam PDF", () => {
    const tracked = execFileSync("git", ["ls-files"], {
      cwd: resolve(process.cwd(), ".."),
      encoding: "utf8",
    });
    expect(
      tracked
        .split(/\r?\n/)
        .filter((file) => /(?:exam|question|kakomon|過去問).*\.pdf$/i.test(file)),
    ).toEqual([]);
  });
});
