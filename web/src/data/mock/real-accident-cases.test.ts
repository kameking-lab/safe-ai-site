import { describe, expect, it } from "vitest";
import { realAccidentCases } from "./real-accident-cases";

describe("real accident case legal threshold consistency", () => {
  it("keeps case 100003 at the official 2.3m fall height and the 2m regulatory threshold", () => {
    const item = realAccidentCases.find((entry) => entry.id === "mhlw-100003");
    expect(item?.title).toContain("約2.3m");
    expect(item?.summary).toContain("脚立8段目付近（高さ約2.3m）");
    expect(item?.severity).toBe("死亡");
    expect(item?.workCategory).toBe("その他の事業");
    expect(item?.mainCauses.join(" ")).not.toContain("安全ネット");
    expect(item?.preventionPoints.join(" ")).not.toContain("屋根作業");
    expect(item?.preventionPoints.join(" ")).toContain("高さ2m以上");
    expect(item?.preventionPoints.join(" ")).not.toContain("5m以上");
  });
});
