import { describe, expect, it } from "vitest";
import { generateMetadata as generateHubMetadata } from "./page";
import { generateMetadata as generateScenarioMetadata } from "./[slug]/page";
import { PUBLIC_VISUAL_KY_SCENARIOS } from "@/data/visual-ky";

describe("visual KY metadata and canonical", () => {
  it("hub正本はindex、query派生は親canonicalのnoindex", async () => {
    const plain = await generateHubMetadata({
      searchParams: Promise.resolve({}),
    });
    const query = await generateHubMetadata({
      searchParams: Promise.resolve({ mode: "facilitator" }),
    });
    expect(plain.alternates?.canonical).toBe("/training/visual-ky");
    expect(plain.robots).toMatchObject({ index: true, follow: true });
    expect(query.alternates?.canonical).toBe("/training/visual-ky");
    expect(query.robots).toMatchObject({ index: false, follow: true });
  });

  it("reviewed問題だけindex候補にし、queryは同じcanonicalでnoindex", async () => {
    const scenario = PUBLIC_VISUAL_KY_SCENARIOS[0];
    const plain = await generateScenarioMetadata({
      params: Promise.resolve({ slug: scenario.slug }),
      searchParams: Promise.resolve({}),
    });
    const query = await generateScenarioMetadata({
      params: Promise.resolve({ slug: scenario.slug }),
      searchParams: Promise.resolve({ result: "complete" }),
    });
    expect(plain.alternates?.canonical).toBe(
      `/training/visual-ky/${scenario.slug}`,
    );
    expect(plain.robots).toMatchObject({ index: true, follow: true });
    expect(query.robots).toMatchObject({ index: false, follow: true });
  });
});
