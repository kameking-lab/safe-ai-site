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
  it("個票100005を感電・重傷と誤分類せず、2個票の未記載の発生日を補わない", () => {
    const item = realAccidentCases.find((entry) => entry.id === "mhlw-100005");
    expect(item?.type).toBe("墜落");
    expect(item?.severity).toBe("死亡");
    expect(item?.workCategory).toBe("建設業");
    expect(item?.industry_detail).toBe("電気通信工事業");
    expect(item?.summary).toContain("固定側が鉄塔の脚の上端から外れ");
    expect(item?.preventionPoints.join(" ")).not.toContain("感電防護");
    for (const id of ["mhlw-100003", "mhlw-100005"]) expect(realAccidentCases.find((entry) => entry.id === id)?.occurredOn).toBe("");
  });
});
