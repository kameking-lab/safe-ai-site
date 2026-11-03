import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import audioManifest from "../../../scripts/training/audio-manifests/safety-management-basics-osh-law.json";
import claimsJson from "./safety-management-basics-osh-law-claims.json";
import quizJson from "./safety-management-basics-osh-law-quiz.json";
import sourcesJson from "./safety-management-basics-osh-law-source-registry.json";
import trainingJson from "./safety-management-basics-osh-law.json";
import { resolveLawNaviEntry } from "@/lib/law-navi/permalink";
import type {
  TrainingArticleRef,
  TrainingClaim,
  TrainingCourse,
  TrainingQuiz,
  TrainingSource,
} from "./types";

const training = trainingJson as TrainingCourse;
const claims = claimsJson as TrainingClaim[];
const sources = sourcesJson as TrainingSource[];
const claimById = new Map(claims.map((claim) => [claim.claimId, claim]));
const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
const quiz = quizJson as TrainingQuiz;

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

  it("公開する根拠は公的資料に限定し、個人の参照資料を出典にしない", () => {
    expect(sources.every((source) =>
      /^https:\/\/(laws\.e-gov\.go\.jp|www\.mhlw\.go\.jp)\//u.test(source.url),
    )).toBe(true);
    expect(JSON.stringify(sources)).not.toContain("drive.google.com");
    expect(claimById.get("C-REF-MULTI")?.statement).toContain("第28条の2");
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

  it("投影面は文字量上限、限定条件、固有の透過マスコットを満たす", () => {
    const mascotPaths = new Set<string>();
    const caveatRequired = new Set(["legal-hierarchy", "roles-and-contact", "control-hierarchy", "start-conditions"]);
    for (const slide of training.slides) {
      expect(slide.title.length, `${slide.id}: title`).toBeLessThanOrEqual(14);
      expect(slide.stage, `${slide.id}: stage`).toBeTruthy();
      const stage = slide.stage!;
      expect(stage.headline.length, `${slide.id}: headline`).toBeLessThanOrEqual(36);
      expect(stage.keyPoints.length, `${slide.id}: keyPoints`).toBeLessThanOrEqual(3);
      for (const point of stage.keyPoints) {
        expect(point.length, `${slide.id}: ${point}`).toBeLessThanOrEqual(16);
      }
      expect(stage.caveat?.length ?? 0, `${slide.id}: caveat`).toBeLessThanOrEqual(30);
      if (caveatRequired.has(slide.id)) expect(stage.caveat, `${slide.id}: caveat required`).toBeTruthy();
      expect(stage.mascot, `${slide.id}: mascot`).toBeTruthy();
      expect(stage.mascot?.src).toMatch(/^\/mascot\/mascot-[a-z0-9-]+\.webp$/u);
      expect(mascotPaths.has(stage.mascot!.src), `${slide.id}: duplicate mascot`).toBe(false);
      mascotPaths.add(stage.mascot!.src);
      expect(existsSync(join(process.cwd(), "public", stage.mascot!.src.replace(/^\//u, "")))).toBe(true);
      const evidenceText = (slide.articleRefs ?? []).slice(0, 2).map((ref) => `${ref.lawShort}${ref.article}`).join("");
      const stageCharacters = slide.title.length + stage.headline.length
        + stage.keyPoints.join("").length + (stage.caveat?.length ?? 0) + evidenceText.length;
      expect(stageCharacters, `${slide.id}: stage total`).toBeLessThanOrEqual(120);
    }
    expect(mascotPaths.size).toBe(12);
  });

  it("12枚のマスコットは透過画像で、宣言した実寸と一致する", async () => {
    for (const slide of training.slides) {
      const mascot = slide.stage!.mascot!;
      const metadata = await sharp(join(process.cwd(), "public", mascot.src.replace(/^\//u, ""))).metadata();
      expect(metadata.hasAlpha, `${slide.id}: alpha`).toBe(true);
      expect(metadata.width, `${slide.id}: width`).toBe(mascot.width);
      expect(metadata.height, `${slide.id}: height`).toBe(mascot.height);
    }
  });

  it("原稿は音声マニフェストのSHA-256と全12枚一致する", () => {
    expect(audioManifest.slides).toHaveLength(training.slides.length);
    for (const slide of training.slides) {
      const manifestSlide = audioManifest.slides.find((item) => item.slide === slide.number);
      expect(manifestSlide, `slide ${slide.number}`).toBeTruthy();
      expect(createHash("sha256").update(slide.narration, "utf8").digest("hex"))
        .toBe(manifestSlide?.narration_sha256);
    }
  });

  it("条文参照は既存sourceと実在する法令ナビまたはe-Gov基条へ着地する", () => {
    const validate = (ref: TrainingArticleRef) => {
      const source = sourceById.get(ref.sourceId);
      expect(source, `${ref.lawShort} ${ref.article}: source`).toBeTruthy();
      expect(ref.egovUrl.startsWith(source!.url), `${ref.article}: e-Gov prefix`).toBe(true);
      if (ref.article.includes("の")) {
        // 2026-09-24、Astra監査でこの枝番の実ブラウザ着地を確認済み。
        expect(ref.article).toBe("第28条の2");
        expect(ref.egovUrl).toBe(`${source!.url}#Mp-At_28_2`);
        expect(ref.naviPath).toBeUndefined();
      } else {
        expect(ref.egovUrl).toMatch(/^https:\/\/laws\.e-gov\.go\.jp\/law\/347AC0000000057#Mp-At_\d+$/u);
      }
      if (ref.naviPath) {
        const [, , lawId, slug] = ref.naviPath.split("/");
        expect(resolveLawNaviEntry(lawId!, slug!), ref.naviPath).toBeTruthy();
      }
    };
    for (const slide of training.slides) for (const ref of slide.articleRefs ?? []) validate(ref);
    for (const question of quiz.questions) {
      for (const ref of question.refs) if ("article" in ref) validate(ref);
    }
  });

  it("確認クイズは5問で、選択肢別理由とレビュー済み根拠を持つ", () => {
    expect(quiz.version).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(quiz.questions).toHaveLength(5);
    for (const question of quiz.questions) {
      expect(question.choices).toHaveLength(4);
      expect(question.choiceRationales).toHaveLength(4);
      for (const rationale of question.choiceRationales) {
        expect(rationale.length).toBeGreaterThanOrEqual(20);
        expect(rationale.length).toBeLessThanOrEqual(80);
      }
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(4);
      expect(question.explanation.length).toBeGreaterThan(20);
      expect(question.refs.length).toBeGreaterThan(0);
      for (const claimId of question.claimIds) {
        expect(claimById.has(claimId), `${question.id} -> ${claimId}`).toBe(true);
      }
      for (const ref of question.refs) {
        expect(sourceById.has(ref.sourceId), `${question.id} -> ${ref.sourceId}`).toBe(true);
        const source = sourceById.get(ref.sourceId)!;
        expect(source.url).toMatch(/^https:\/\/(laws\.e-gov\.go\.jp|www\.mhlw\.go\.jp)\//u);
        if (!("article" in ref)) expect(source.locator).toContain(ref.locator.split("、")[0]);
      }
    }
  });
});
