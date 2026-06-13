import { describe, it, expect } from "vitest";
import { buildFinderConclusion } from "./finder-conclusion";

describe("buildFinderConclusion", () => {
  it("該当なし（0件）は無彩で条件変更を促す（偽の空状態にしない）", () => {
    const c = buildFinderConclusion(0, 0);
    expect(c.tone).toBe("neutral");
    expect(c.value).toBe(0);
    expect(c.title).toBe("該当なし");
  });

  it("法令義務が1件でもあれば黄（要対応）でデカ数字は総件数", () => {
    const c = buildFinderConclusion(3, 2);
    expect(c.tone).toBe("warning");
    expect(c.value).toBe(5);
    expect(c.description).toContain("法令義務 3件");
    expect(c.description).toContain("推奨 2件");
  });

  it("法令義務ゼロ・推奨のみは青（案内）＝黄を乱発しない", () => {
    const c = buildFinderConclusion(0, 4);
    expect(c.tone).toBe("info");
    expect(c.value).toBe(4);
    expect(c.title).toBe("推奨資格");
    expect(c.description).toContain("4件");
  });

  it("デカ数字は法令義務＋推奨の合計", () => {
    expect(buildFinderConclusion(1, 0).value).toBe(1);
    expect(buildFinderConclusion(2, 7).value).toBe(9);
  });
});
