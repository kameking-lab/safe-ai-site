import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/seo-metadata";
import {
  isPublicRouteAvailable,
  PUBLIC_SAFETY_LEARNING_PATHS,
} from "@/lib/public-content-policy";
import { SAFETY_COURSES } from "@/data/safety-elearning/courses";
import { generateMetadata, generateStaticParams } from "./[courseId]/page";
import { metadata as indexMetadata } from "./page";

const INDEX_PATH = "/e-learning/safety";
const publishedCourses = SAFETY_COURSES.filter((course) => course.published);

describe("safety learning SEO boundary", () => {
  it("indexes the reviewed hub with a self canonical", () => {
    expect(indexMetadata.alternates?.canonical).toBe(INDEX_PATH);
    expect(indexMetadata.robots).toMatchObject({ index: true, follow: true });
    expect(indexMetadata.title).toBeTruthy();
    expect(indexMetadata.description).toBeTruthy();
  });

  it("generates only published courses with distinct self canonicals", async () => {
    const params = generateStaticParams();
    expect(params).toEqual(
      publishedCourses.map(({ courseId }) => ({ courseId })),
    );

    const metadata = await Promise.all(
      params.map(({ courseId }) =>
        generateMetadata({ params: Promise.resolve({ courseId }) }),
      ),
    );
    expect(new Set(metadata.map((item) => item.title)).size).toBe(
      publishedCourses.length,
    );
    metadata.forEach((item, index) => {
      expect(item.alternates?.canonical).toBe(
        `${INDEX_PATH}/${publishedCourses[index].courseId}`,
      );
      expect(item.robots).toMatchObject({ index: true, follow: true });
      expect(item.description).toBeTruthy();
    });
  });

  it("lists only the indexable safety routes in the sitemap", () => {
    const urls = new Set(sitemap().map((entry) => String(entry.url)));
    const expected = [
      `${SITE_URL}${INDEX_PATH}`,
      ...publishedCourses.map(
        ({ courseId }) => `${SITE_URL}${INDEX_PATH}/${courseId}`,
      ),
    ];

    expected.forEach((url) => expect(urls.has(url)).toBe(true));
    expect(urls.has(`${SITE_URL}/e-learning`)).toBe(false);
    expect(PUBLIC_SAFETY_LEARNING_PATHS).toHaveLength(expected.length);
    PUBLIC_SAFETY_LEARNING_PATHS.forEach((path) =>
      expect(isPublicRouteAvailable(path)).toBe(true),
    );
    expect(isPublicRouteAvailable("/e-learning")).toBe(false);
    expect(isPublicRouteAvailable("/e-learning/safety/not-published")).toBe(
      false,
    );
  });
});
