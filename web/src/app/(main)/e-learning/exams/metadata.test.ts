import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import catalogJson from "@/data/exam-library/official-catalog.json";
import { FEATURES } from "@/data/features-catalog";
import { EXAM_CATALOG, findExamEntry } from "@/lib/exam-library-catalog";
import { examPath } from "@/lib/exam-library-model";
import { listAvailableExamIds, loadExamPaper } from "@/lib/exam-library-papers";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";
import { SITE_URL } from "@/lib/seo-metadata";
import ExamPage, { dynamicParams, generateMetadata, generateStaticParams } from "./[id]/page";
import { metadata as indexMetadata } from "./page";

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

describe("exam library routes and SEO boundary", () => {
  it("indexes the hub with a self canonical", () => {
    expect(indexMetadata.alternates?.canonical).toBe(INDEX_PATH);
    expect(indexMetadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("generates only catalog exams whose paper is available", async () => {
    expect(dynamicParams).toBe(false);
    const params = generateStaticParams();
    expect(params).toEqual(availableIds.map((id) => ({ id })));
    params.forEach(({ id }) => expect(findExamEntry(id)).toBeDefined());

    const metadata = await Promise.all(
      params.slice(0, 5).map(({ id }) => generateMetadata({ params: Promise.resolve({ id }) })),
    );
    metadata.forEach((item, index) => {
      const entry = findExamEntry(params[index].id)!;
      expect(item.alternates?.canonical).toBe(examPath(entry.id));
      expect(String(item.title)).toContain(entry.subject);
      // 公表時期と実施日を取り違えない
      expect(String(item.description)).toContain(
        entry.dateKind === "publication" ? "試験実施日ではありません" : "実施分",
      );
    });
  });

  it("returns 404 for ids outside the catalog", async () => {
    expect(await generateMetadata({ params: Promise.resolve({ id: "lckohyo-UNKNOWN" }) })).toEqual({});
    await expect(ExamPage({ params: Promise.resolve({ id: "lckohyo-UNKNOWN" }) })).rejects.toThrow();
  });

  it("publishes hub and available exams in sitemap, features and route policy", () => {
    const urls = new Set(sitemap().map((entry) => String(entry.url)));
    if (availableIds.length > 0) expect(urls.has(`${SITE_URL}${INDEX_PATH}`)).toBe(true);
    availableIds.forEach((id) => expect(urls.has(`${SITE_URL}${examPath(id)}`)).toBe(true));
    const unavailable = EXAM_CATALOG.filter((entry) => !availableIds.includes(entry.id));
    unavailable.forEach((entry) => expect(urls.has(`${SITE_URL}${examPath(entry.id)}`)).toBe(false));

    expect(FEATURES.some((feature) => feature.href === INDEX_PATH)).toBe(true);
    expect(isPublicRouteAvailable(INDEX_PATH)).toBe(true);
    availableIds.forEach((id) => expect(isPublicRouteAvailable(examPath(id))).toBe(true));
    expect(isPublicRouteAvailable("/e-learning/exams/not-an-exam")).toBe(false);
    expect(isPublicRouteAvailable("/e-learning/exams/lckohyo-A/extra")).toBe(false);
    expect(isPublicRouteAvailable("/e-learning")).toBe(false);
  });
});
