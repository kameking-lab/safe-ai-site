import { describe, it, expect } from "vitest";
import { buildFinderConclusion } from "./finder-conclusion";

describe("buildFinderConclusion", () => {
  it("0件を資格不要とは解釈せず未判定にする", () => {
    const c = buildFinderConclusion(0, 0);
    expect(c.tone).toBe("neutral");
    expect(c.value).toBe(0);
    expect(c.title).toBe("条件不足・未判定");
    expect(c.description).toContain("資格不要");
    expect(c.description).toContain("判断できません");
  });

  it("義務候補があっても確定せず条件確認を促す", () => {
    const c = buildFinderConclusion(3, 2);
    expect(c.tone).toBe("warning");
    expect(c.value).toBe(5);
    expect(c.title).toBe("資格候補を要確認");
    expect(c.description).toContain("条件確認が必要な候補 3件");
    expect(c.description).toContain("関連候補 2件");
    expect(c.description).not.toContain("就業させられません");
  });

  it("法令義務ゼロ・推奨のみは青（案内）＝黄を乱発しない", () => {
    const c = buildFinderConclusion(0, 4);
    expect(c.tone).toBe("info");
    expect(c.value).toBe(4);
    expect(c.title).toBe("関連資格候補");
    expect(c.description).toContain("4件");
  });

  it("デカ数字は法令義務＋推奨の合計", () => {
    expect(buildFinderConclusion(1, 0).value).toBe(1);
    expect(buildFinderConclusion(2, 7).value).toBe(9);
  });
});
