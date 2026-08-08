import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HEAT_ILLNESS_2025_LEGAL_SOURCE } from "@/data/heat-illness-rules/legal-source";
import { findSourceRegistryRecord } from "@/data/source-registry";
import { HEAT_ILLNESS_KNOWLEDGE_CHECK } from "./questions";
import {
  HEAT_LEARNING_SOURCE_IDS,
  HEAT_LEARNING_SOURCES,
} from "./sources";
import { HEAT_ILLNESS_FIELD_BRIEFING } from "./slides";
import type { HeatLearningClaim } from "./types";

const sourceIds = new Set(HEAT_LEARNING_SOURCES.map((source) => source.id));
const allowedHosts = new Set([
  "laws.e-gov.go.jp",
  "www.mhlw.go.jp",
  "neccyusho.mhlw.go.jp",
  "www.wbgt.env.go.jp",
  "www.fdma.go.jp",
]);

describe("heat-illness learning integrity", () => {
  it("公式一次資料だけを参照し、確認日と確認待ち状態を保持する", () => {
    expect(sourceIds.size).toBe(HEAT_LEARNING_SOURCES.length);

    for (const source of HEAT_LEARNING_SOURCES) {
      const url = new URL(source.url);
      expect(url.protocol).toBe("https:");
      expect(allowedHosts.has(url.hostname), source.url).toBe(true);
      expect(source.sourceStatus).toBe(
        "url-confirmed-content-review-pending",
      );
      expect(source.verifiedAt).toBeNull();
      expect(source.reviewStatus).toMatch(/-review-pending$/);
      const registryRecord = findSourceRegistryRecord(source.registryId);
      expect(registryRecord?.url).toBe(source.url);
      expect(registryRecord?.status).toBe("snapshotConfirmed");
      if (source.registryId === "mhlw-heat-notice-0520-6") {
        expect(registryRecord?.verifiedAt).toBe("2026-08-02");
        expect(registryRecord?.reviewer).toContain("独立一次資料照合");
      } else {
        expect(registryRecord?.verifiedAt).toBeNull();
        expect(registryRecord?.reviewer).toBeNull();
      }
      expect(registryRecord?.hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("安衛則第612条の2の法定義務を既存一次資料レコードと同じ2件に固定する", () => {
    const allClaims = HEAT_ILLNESS_FIELD_BRIEFING.slides.reduce<
      HeatLearningClaim[]
    >((claims, slide) => {
      claims.push(...slide.claims);
      return claims;
    }, []);
    const statutoryDutyClaims = allClaims
      .filter((claim) => claim.kind === "statutory-duty");

    expect(statutoryDutyClaims).toHaveLength(2);
    expect(HEAT_ILLNESS_2025_LEGAL_SOURCE.duties).toHaveLength(2);
    for (const duty of HEAT_ILLNESS_2025_LEGAL_SOURCE.duties) {
      expect(
        statutoryDutyClaims.some(
          (claim) =>
            claim.text.includes(duty.title) &&
            claim.text.includes(duty.summary),
        ),
      ).toBe(true);
    }
  });

  it("全主張と全設問の出典参照が解決し、正答IDが選択肢に存在する", () => {
    for (const slide of HEAT_ILLNESS_FIELD_BRIEFING.slides) {
      expect(slide.claims.length).toBeGreaterThan(0);
      for (const claim of slide.claims) {
        expect(claim.sourceIds.length).toBeGreaterThan(0);
        for (const sourceId of claim.sourceIds) {
          expect(sourceIds.has(sourceId), `${claim.id}:${sourceId}`).toBe(true);
        }
      }
    }

    for (const question of HEAT_ILLNESS_KNOWLEDGE_CHECK) {
      expect(question.sourceIds.length).toBeGreaterThan(0);
      for (const sourceId of question.sourceIds) {
        expect(sourceIds.has(sourceId), `${question.id}:${sourceId}`).toBe(true);
      }
      expect(
        question.options.some(
          (option) => option.id === question.correctOptionId,
        ),
      ).toBe(true);
    }
  });

  it("2026年現行指針と廃止済み旧通知を明確に分離する", () => {
    const current = HEAT_LEARNING_SOURCES.find(
      (source) => source.id === HEAT_LEARNING_SOURCE_IDS.currentGuideline,
    );

    expect(current?.documentNumber).toBe("基発0318第1号");
    expect(current?.publishedAt).toBe("2026-03-18");
    expect(current?.supersedes).toContain("基発0420第3号");
    expect(current?.supersedes).toContain("廃止");
  });

  it("WBGTの実測・実況推定・予測と救急分岐を別項目で固定する", () => {
    const deckText = JSON.stringify(HEAT_ILLNESS_FIELD_BRIEFING);
    expect(deckText).toContain("実測値");
    expect(deckText).toContain("実況推定値");
    expect(deckText).toContain("予測値");
    expect(deckText).toContain("作業地点そのものの実測値とは限りません");

    const emergencyQuestions = HEAT_ILLNESS_KNOWLEDGE_CHECK.filter(
      (question) => question.emergency,
    );
    expect(emergencyQuestions).toHaveLength(2);
    expect(
      emergencyQuestions.find(
        (question) => question.id === "unclear-consciousness",
      )?.options.find((option) => option.id === "call-ambulance")?.label,
    ).toContain("119");
    expect(
      emergencyQuestions.find((question) => question.id === "unable-to-drink")
        ?.options.find((option) => option.id === "call-ambulance-no-force")
        ?.label,
    ).toContain("無理に飲ませない");
  });

  it("14テーマを重複しない番号で提供する", () => {
    expect(HEAT_ILLNESS_FIELD_BRIEFING.slides).toHaveLength(14);
    expect(
      HEAT_ILLNESS_FIELD_BRIEFING.slides.map((slide) => slide.number),
    ).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
  });

  it("実装ファイルに事故データ・外部通信・永続化・個人情報入力を持ち込まない", () => {
    const implementationFiles = [
      "src/data/heat-illness-learning/sources.ts",
      "src/data/heat-illness-learning/slides.ts",
      "src/data/heat-illness-learning/questions.ts",
      "src/app/(main)/heat-illness-prevention/slides/heat-illness-slides.tsx",
      "src/app/(main)/heat-illness-prevention/elearning/heat-illness-elearning.tsx",
    ];
    const implementation = implementationFiles
      .map((file) => readFileSync(resolve(process.cwd(), file), "utf8"))
      .join("\n");

    expect(implementation).not.toMatch(
      /data\/mock\/.*accident|accident-source|hazardSlug|fetch\s*\(|localStorage|sessionStorage|console\.(?:log|info|warn|error)|type=["'](?:email|tel)["']/i,
    );
    expect(implementation).not.toContain("修了証");
  });
});
