import { describe, expect, it } from "vitest";
import { generateMetadata } from "./page";

describe("人手内容確認待ち記事のindexability", () => {
  it("熱中症記事をnoindex,followとし、外部確認前にindex候補へしない", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "heat-stroke-2025-mandatory" }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(
      "/articles/heat-stroke-2025-mandatory",
    );
  });
});
