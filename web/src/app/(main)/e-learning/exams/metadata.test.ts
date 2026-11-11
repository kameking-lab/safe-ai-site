import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import catalogJson from "@/data/exam-library/official-catalog.json";
import { FEATURES } from "@/data/features-catalog";
import { EXAM_CATALOG } from "@/lib/exam-library-catalog";
import { examPath } from "@/lib/exam-library-model";
import { listAvailableExamIds, loadExamPaper } from "@/lib/exam-library-papers";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";
import { SITE_URL } from "@/lib/seo-metadata";

const INDEX_PATH = "/e-learning/exams";
const availableIds = listAvailableExamIds();

describe("exam library data contract", () => {
  it("accepts every catalog entry supplied by the importer", () => {
    expect(Array.isArray(catalogJson)).toBe(true);
    expect(EXAM_CATALOG).toHaveLength((catalogJson as unknown[]).length);
    for (const entry of EXAM_CATALOG) {
      if (entry.group === "lckohyo") expect(entry.dateKind).toBe("publication");
    }
  });

  it("loads each available paper without dropping questions and with local images", () => {
    for (const id of availableIds) {
      const raw = JSON.parse(
        readFileSync(join(process.cwd(), "src/data/exam-library/papers", `${id}.json`), "utf8"),
      ) as unknown[];
      const questions = loadExamPaper(id);
      expect(questions, id).not.toBeNull();
      expect(questions?.length, id).toBe(raw.length);
      for (const question of questions ?? []) {
        for (const image of question.images) {
          expect(existsSync(join(process.cwd(), "public", image)), image).toBe(true);
        }
      }
    }
  });

  it("does not read papers for ids outside the catalog", () => {
    expect(loadExamPaper("lckohyo-NOT-IN-CATALOG")).toBeNull();
    expect(loadExamPaper("../official-catalog")).toBeNull();
  });
});

describe("owner-excluded exam routes", () => {
  it("keeps route entrypoints absent without deleting question source data", () => {
    expect(existsSync(join(process.cwd(), "src/app/(main)/e-learning/exams/page.tsx"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/app/(main)/e-learning/exams/[id]/page.tsx"))).toBe(false);
    expect(availableIds.length).toBeGreaterThan(0);
  });

  it("does not publish the hub or individual exams in sitemap, features or navigation", () => {
    const urls = new Set(sitemap().map((entry) => String(entry.url)));
    expect(urls.has(`${SITE_URL}${INDEX_PATH}`)).toBe(false);
    expect(FEATURES.some((feature) => feature.href === INDEX_PATH)).toBe(false);
    expect(isPublicRouteAvailable(INDEX_PATH)).toBe(false);
    for (const id of availableIds) {
      expect(urls.has(`${SITE_URL}${examPath(id)}`)).toBe(false);
      expect(isPublicRouteAvailable(examPath(id))).toBe(false);
    }
  });
});
