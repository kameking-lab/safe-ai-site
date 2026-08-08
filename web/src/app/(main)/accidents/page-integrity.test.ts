import { describe, expect, it } from "vitest";

import { metadata } from "./page";

describe("/accidents metadata quarantine", () => {
  it("一次資料照合待ちの間はindexさせず、Datasetを名乗らない", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.description).toContain("一次資料照合");
    expect(metadata.description).toContain("index対象にせず");
  });
});
