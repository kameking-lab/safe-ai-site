import { describe, expect, it } from "vitest";
import { healthCheckupsFromTags } from "@/lib/chemical/health-checkup-from-tags";

describe("healthCheckupsFromTags", () => {
  it("タグ無しは空", () => {
    expect(healthCheckupsFromTags(undefined)).toEqual([]);
    expect(healthCheckupsFromTags([])).toEqual([]);
  });

  it("特化則タグ→特定化学物質健康診断", () => {
    const r = healthCheckupsFromTags(["tokutei-2"]);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("特定化学物質健康診断");
    expect(r[0].basis).toContain("第39条");
  });

  it("有機則タグ→有機溶剤等健康診断", () => {
    const r = healthCheckupsFromTags(["yuki-1"]);
    expect(r[0].name).toBe("有機溶剤等健康診断");
    expect(r[0].basis).toContain("第29条");
  });

  it("石綿則→石綿健康診断、粉じん則→じん肺健康診断", () => {
    expect(healthCheckupsFromTags(["sekimen"])[0].name).toBe("石綿健康診断");
    expect(healthCheckupsFromTags(["funjin"])[0].name).toBe("じん肺健康診断");
  });

  it("複数の特化則タグは1件に重複排除", () => {
    const r = healthCheckupsFromTags(["tokutei-1", "tokutei-2", "tokutei-3"]);
    expect(r).toHaveLength(1);
  });

  it("健診に無関係なタグ（nite/prtr1）は健診を生成しない", () => {
    expect(healthCheckupsFromTags(["nite", "prtr1", "cwc"])).toEqual([]);
  });

  it("特化則+有機則の併用は2件", () => {
    const r = healthCheckupsFromTags(["tokutei-2", "yuki-2"]);
    expect(r).toHaveLength(2);
  });
});
