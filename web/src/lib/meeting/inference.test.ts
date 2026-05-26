import { describe, expect, it } from "vitest";
import { estimateQualifications, inferChecklist } from "@/lib/meeting/inference";
import { buildDefaultChecklist } from "@/lib/meeting/schema";

describe("estimateQualifications", () => {
  it("足場・高所 → フルハーネス／足場主任者", () => {
    const q = estimateQualifications("外壁足場の組立");
    expect(q.some((x) => x.includes("フルハーネス"))).toBe(true);
    expect(q.some((x) => x.includes("足場の組立て等作業主任者"))).toBe(true);
  });
  it("掘削 → 掘削主任者・車両系", () => {
    const q = estimateQualifications("バックホウで掘削");
    expect(q.some((x) => x.includes("土止め支保工"))).toBe(true);
    expect(q.some((x) => x.includes("車両系建設機械"))).toBe(true);
  });
  it("該当なしは空", () => {
    expect(estimateQualifications("書類整理")).toEqual([]);
  });
});

describe("inferChecklist", () => {
  it("掘削作業で 掘削カテゴリと一般事項が ok 候補に", () => {
    const cl = inferChecklist(buildDefaultChecklist(), "バックホウで掘削、土留");
    const excavation = cl.find((c) => c.key === "excavation")!;
    const general = cl.find((c) => c.key === "general")!;
    const crane = cl.find((c) => c.key === "crane")!;
    expect(excavation.items.every((i) => i.status === "ok")).toBe(true);
    expect(general.items.every((i) => i.status === "ok")).toBe(true);
    // 無関係カテゴリは na のまま
    expect(crane.items.every((i) => i.status === "na")).toBe(true);
  });
  it("user設定の ng は尊重（na のみ ok 化）", () => {
    const base = buildDefaultChecklist();
    const ex = base.find((c) => c.key === "excavation")!;
    ex.items[0].status = "ng";
    const cl = inferChecklist(base, "掘削");
    const after = cl.find((c) => c.key === "excavation")!;
    expect(after.items[0].status).toBe("ng");
    expect(after.items[1].status).toBe("ok");
  });
});
