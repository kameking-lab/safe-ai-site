import { describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => {
  const notFoundError = new Error("NEXT_NOT_FOUND");
  return {
    notFoundError,
    notFound: vi.fn((): never => {
      throw notFoundError;
    }),
  };
});

vi.mock("next/navigation", () => ({
  notFound: navigation.notFound,
}));

import CourtCaseDetailPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from "./page";

describe("/court-cases/[id] 公開隔離境界", () => {
  it("公開allowlistが空の間は静的詳細URLを1件も生成しない", () => {
    expect(generateStaticParams()).toEqual([]);
    expect(dynamicParams).toBe(false);
  });

  it.each([
    "rikujou-jieitai-hachinohe",
    "nihon-shoen-seizo",
    "___unknown-court-case___",
  ])("旧ID・未知ID %s はnotFoundで停止する", async (id) => {
    navigation.notFound.mockClear();
    await expect(
      CourtCaseDetailPage({ params: Promise.resolve({ id }) }),
    ).rejects.toBe(navigation.notFoundError);
    expect(navigation.notFound).toHaveBeenCalledTimes(1);
  });

  it("未知IDのmetadataに詳細canonicalやOGを生成しない", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "___unknown-court-case___" }),
    });
    expect(metadata).toEqual({
      title: "労災裁判例｜安全AIポータル",
    });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.openGraph).toBeUndefined();
  });

  it.each([
    "nihon-shoen-seizo",
    "shibuya-siespa-explosion-criminal",
  ])("隔離した旧ID %s にも詳細metadataを復活させない", async (id) => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ id }),
    });
    expect(metadata.title).toBe("労災裁判例｜安全AIポータル");
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.description).toBeUndefined();
    expect(metadata.openGraph).toBeUndefined();
  });
});
